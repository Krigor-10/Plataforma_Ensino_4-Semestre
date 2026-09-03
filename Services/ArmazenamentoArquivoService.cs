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

    /* Assinatura binaria (magic bytes) por extensao — evita que um arquivo
       renomeado (ex.: um .html/.exe salvo como .jpg) passe so por ter a
       extensao certa no nome. .mp4/.mov compartilham o formato de container
       ISO-BMFF: o tipo do box vem no offset 4 ("ftyp"), nao no inicio do
       arquivo como os demais formatos. */
    private static readonly Dictionary<string, Func<byte[], bool>> ValidadoresAssinatura = new()
    {
        [".jpg"] = bytes => TemPrefixo(bytes, 0, 0xFF, 0xD8, 0xFF),
        [".jpeg"] = bytes => TemPrefixo(bytes, 0, 0xFF, 0xD8, 0xFF),
        [".png"] = bytes => TemPrefixo(bytes, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
        [".gif"] = bytes => TemPrefixo(bytes, 0, 0x47, 0x49, 0x46, 0x38),
        [".webp"] = bytes => TemPrefixo(bytes, 0, 0x52, 0x49, 0x46, 0x46) && TemPrefixo(bytes, 8, 0x57, 0x45, 0x42, 0x50),
        [".pdf"] = bytes => TemPrefixo(bytes, 0, 0x25, 0x50, 0x44, 0x46, 0x2D),
        [".webm"] = bytes => TemPrefixo(bytes, 0, 0x1A, 0x45, 0xDF, 0xA3),
        [".mp4"] = bytes => TemPrefixo(bytes, 4, (byte)'f', (byte)'t', (byte)'y', (byte)'p'),
        [".mov"] = bytes => TemPrefixo(bytes, 4, (byte)'f', (byte)'t', (byte)'y', (byte)'p')
    };

    private static bool TemPrefixo(byte[] bytes, int offset, params byte[] assinatura)
    {
        if (bytes.Length < offset + assinatura.Length)
        {
            return false;
        }

        for (var i = 0; i < assinatura.Length; i++)
        {
            if (bytes[offset + i] != assinatura[i])
            {
                return false;
            }
        }

        return true;
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

        if (ValidadoresAssinatura.TryGetValue(extensao, out var validador))
        {
            var cabecalho = new byte[12];
            int totalLido;
            await using (var streamLeitura = arquivo.OpenReadStream())
            {
                totalLido = await streamLeitura.ReadAsync(cabecalho.AsMemory(0, (int)Math.Min(cabecalho.Length, arquivo.Length)));
            }

            if (totalLido < cabecalho.Length)
            {
                Array.Resize(ref cabecalho, totalLido);
            }

            if (!validador(cabecalho))
            {
                throw new ArgumentException("O conteudo do arquivo nao corresponde a extensao informada.");
            }
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
