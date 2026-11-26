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

    protected override async Task<ArquivoArmazenado?> AbrirArquivoValidadoAsync(string subpasta, string nomeArquivo)
    {
        var blobCliente = _containerCliente.GetBlobClient(CaminhoBlob(subpasta, nomeArquivo));

        if (!await blobCliente.ExistsAsync())
        {
            return null;
        }

        var propriedades = await blobCliente.GetPropertiesAsync();
        var contentType = propriedades.Value.ContentType ?? ResolverContentType(nomeArquivo);

        // OpenReadAsync (em vez de DownloadStreamingAsync) devolve um stream
        // navegavel (CanSeek) - o DownloadStreamingAsync so entrega o arquivo
        // inteiro em sequencia, sem suporte a Range, e o player de video
        // (web e expo-video) depende de Range/206 pra ler os metadados do
        // MP4 (moov no fim do arquivo) e pra avancar/voltar (ver docs/bugs/
        // PROMPT-agente-video-nao-carrega-producao.md).
        var stream = await blobCliente.OpenReadAsync();

        return new ArquivoArmazenado(
            stream,
            contentType,
            propriedades.Value.ContentLength,
            propriedades.Value.LastModified,
            propriedades.Value.ETag.ToString());
    }

    private static string CaminhoBlob(string subpasta, string nomeArquivo) => $"{subpasta}/{nomeArquivo}";
}
