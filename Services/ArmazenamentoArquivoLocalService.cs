using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

/* Usado em Development e no docker-compose local (volume uploads-data).
   Nao usar em Azure App Service/Container Apps: o disco e efemero e nao e
   compartilhado entre instancias - ver ArmazenamentoArquivoBlobService. */
public class ArmazenamentoArquivoLocalService : ArmazenamentoArquivoServiceBase
{
    private readonly IWebHostEnvironment _ambiente;

    public ArmazenamentoArquivoLocalService(IWebHostEnvironment ambiente)
    {
        _ambiente = ambiente;
    }

    protected override async Task PersistirAsync(IFormFile arquivo, string subpasta, string nomeArquivo)
    {
        var pastaDestino = CaminhoPasta(subpasta);
        Directory.CreateDirectory(pastaDestino);

        var caminhoCompleto = Path.Combine(pastaDestino, nomeArquivo);
        await using var stream = new FileStream(caminhoCompleto, FileMode.Create);
        await arquivo.CopyToAsync(stream);
    }

    public override Task<ArquivoArmazenado?> AbrirArquivoAsync(string subpasta, string nomeArquivo)
    {
        var caminhoCompleto = Path.Combine(CaminhoPasta(subpasta), nomeArquivo);

        if (!File.Exists(caminhoCompleto))
        {
            return Task.FromResult<ArquivoArmazenado?>(null);
        }

        Stream stream = new FileStream(caminhoCompleto, FileMode.Open, FileAccess.Read);
        return Task.FromResult<ArquivoArmazenado?>(new ArquivoArmazenado(stream, ResolverContentType(nomeArquivo)));
    }

    private string CaminhoPasta(string subpasta) =>
        Path.Combine(_ambiente.ContentRootPath, "Storage", "Uploads", subpasta);
}
