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

    protected override Task<ArquivoArmazenado?> AbrirArquivoValidadoAsync(string subpasta, string nomeArquivo)
    {
        var pastaBase = Path.GetFullPath(CaminhoPasta(subpasta));
        var caminhoCompleto = Path.GetFullPath(Path.Combine(pastaBase, nomeArquivo));

        /* Segunda camada de defesa alem do allowlist/GetFileName da classe base:
           garante que o caminho resolvido continua dentro da pasta esperada mesmo
           que algum backend futuro pare de usar a validacao da classe base. */
        if (!caminhoCompleto.StartsWith(pastaBase + Path.DirectorySeparatorChar, StringComparison.Ordinal) ||
            !File.Exists(caminhoCompleto))
        {
            return Task.FromResult<ArquivoArmazenado?>(null);
        }

        Stream stream = new FileStream(caminhoCompleto, FileMode.Open, FileAccess.Read);
        return Task.FromResult<ArquivoArmazenado?>(new ArquivoArmazenado(stream, ResolverContentType(nomeArquivo)));
    }

    private string CaminhoPasta(string subpasta) =>
        Path.Combine(_ambiente.ContentRootPath, "Storage", "Uploads", subpasta);
}
