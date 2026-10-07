using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Http;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

/* Backend de producao na Azure: App Service e Container Apps tem disco
   efemero e nao compartilhado entre instancias, entao o upload precisa
   sobreviver em algo fora do container - Azure Blob Storage.
   O container e privado (sem leitura anonima); o controle de acesso
   continua sendo o mesmo gate de autenticacao que ja existia pra "/uploads"
   em Program.cs - esta classe so troca onde os bytes ficam guardados. */
public class ArmazenamentoArquivoBlobService : ArmazenamentoArquivoServiceBase
{
    private readonly BlobContainerClient _containerCliente;

    public ArmazenamentoArquivoBlobService(BlobServiceClient blobServiceClient, IConfiguration configuration)
    {
        var nomeContainer = configuration["AzureStorage:ContainerName"];
        if (string.IsNullOrWhiteSpace(nomeContainer))
        {
            throw new InvalidOperationException(
                "AzureStorage:ContainerName nao foi configurado. Defina via variavel de ambiente AzureStorage__ContainerName.");
        }

        _containerCliente = blobServiceClient.GetBlobContainerClient(nomeContainer);
        _containerCliente.CreateIfNotExists(PublicAccessType.None);
    }

    protected override async Task PersistirAsync(IFormFile arquivo, string subpasta, string nomeArquivo)
    {
        var blobCliente = _containerCliente.GetBlobClient(CaminhoBlob(subpasta, nomeArquivo));

        await using var stream = arquivo.OpenReadStream();
        await blobCliente.UploadAsync(stream, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = ResolverContentType(nomeArquivo) }
        });
    }

    public override async Task<ArquivoArmazenado?> AbrirArquivoAsync(string subpasta, string nomeArquivo)
    {
        var blobCliente = _containerCliente.GetBlobClient(CaminhoBlob(subpasta, nomeArquivo));

        if (!await blobCliente.ExistsAsync())
        {
            return null;
        }

        var download = await blobCliente.DownloadStreamingAsync();
        var contentType = download.Value.Details.ContentType ?? ResolverContentType(nomeArquivo);

        return new ArquivoArmazenado(download.Value.Content, contentType);
    }

    private static string CaminhoBlob(string subpasta, string nomeArquivo) => $"{subpasta}/{nomeArquivo}";
}
