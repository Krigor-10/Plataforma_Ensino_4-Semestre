using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class ArmazenamentoArquivoService : IArmazenamentoArquivoService
{
    private readonly IWebHostEnvironment _ambiente;

    public ArmazenamentoArquivoService(IWebHostEnvironment ambiente)
    {
        _ambiente = ambiente;
    }

    public async Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes)
    {
        if (arquivo is null || arquivo.Length == 0)
        {
            throw new ArgumentException("Nenhum arquivo foi enviado.");
        }

        var extensao = Path.GetExtension(arquivo.FileName).ToLowerInvariant();
        if (!extensoesPermitidas.Contains(extensao))
        {
            throw new ArgumentException($"Extensao de arquivo nao permitida. Extensoes aceitas: {string.Join(", ", extensoesPermitidas)}.");
        }

        if (arquivo.Length > tamanhoMaximoBytes)
        {
            throw new ArgumentException($"Arquivo excede o tamanho maximo permitido de {tamanhoMaximoBytes / 1_000_000}MB.");
        }

        var pastaDestino = Path.Combine(_ambiente.ContentRootPath, "Storage", "Uploads", subpasta);
        Directory.CreateDirectory(pastaDestino);

        var nomeArquivo = $"{Guid.NewGuid()}{extensao}";
        var caminhoCompleto = Path.Combine(pastaDestino, nomeArquivo);

        await using (var stream = new FileStream(caminhoCompleto, FileMode.Create))
        {
            await arquivo.CopyToAsync(stream);
        }

        return $"/uploads/{subpasta}/{nomeArquivo}";
    }
}
