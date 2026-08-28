using Microsoft.AspNetCore.Http;

namespace PlataformaEnsino.API.Interfaces;

public interface IArmazenamentoArquivoService
{
    Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes);
}
