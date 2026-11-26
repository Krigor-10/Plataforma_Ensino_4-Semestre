using Microsoft.AspNetCore.Http;

namespace PlataformaEnsino.API.Interfaces;

public record ArquivoArmazenado(
    Stream Conteudo,
    string ContentType,
    long? Tamanho = null,
    DateTimeOffset? UltimaModificacao = null,
    string? ETag = null);

public interface IArmazenamentoArquivoService
{
    Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes);

    Task<ArquivoArmazenado?> AbrirArquivoAsync(string subpasta, string nomeArquivo);
}
