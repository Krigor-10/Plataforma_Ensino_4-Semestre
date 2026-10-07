using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ArmazenamentoArquivoServiceTests : IDisposable
{
    private readonly string _pastaTemporaria;
    private readonly ArmazenamentoArquivoService _service;

    public ArmazenamentoArquivoServiceTests()
    {
        _pastaTemporaria = Path.Combine(Path.GetTempPath(), $"plataforma-ensino-testes-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_pastaTemporaria);
        _service = new ArmazenamentoArquivoService(new AmbienteFake(_pastaTemporaria));
    }

    public void Dispose()
    {
        if (Directory.Exists(_pastaTemporaria))
        {
            Directory.Delete(_pastaTemporaria, recursive: true);
        }
    }

    // Assinatura real de PDF (%PDF-) na frente do conteudo — necessario desde
    // que SalvarArquivoAsync passou a validar magic bytes, nao so extensao.
    private static IFormFile CriarArquivoFake(string nomeArquivo, string conteudo = "%PDF-1.4\nconteudo de teste")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(conteudo);
        return CriarArquivoFakeComBytes(nomeArquivo, bytes);
    }

    private static IFormFile CriarArquivoFakeComBytes(string nomeArquivo, byte[] bytes)
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "arquivo", nomeArquivo)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream"
        };
    }

    [Fact]
    public async Task SalvarArquivoAsync_ArquivoValido_SalvaNoDiscoERetornaUrlRelativa()
    {
        var arquivo = CriarArquivoFake("prova.pdf");

        var url = await _service.SalvarArquivoAsync(arquivo, "conteudos", new[] { ".pdf" }, tamanhoMaximoBytes: 1_000_000);

        Assert.StartsWith("/uploads/conteudos/", url);
        Assert.EndsWith(".pdf", url);

        var caminhoFisico = Path.Combine(_pastaTemporaria, "Storage", "Uploads", "conteudos", Path.GetFileName(url));
        Assert.True(File.Exists(caminhoFisico));
    }

    [Fact]
    public async Task SalvarArquivoAsync_NomesIguais_GeraArquivosComNomesUnicos()
    {
        var primeiroArquivo = CriarArquivoFake("mesmo-nome.pdf");
        var segundoArquivo = CriarArquivoFake("mesmo-nome.pdf");

        var primeiraUrl = await _service.SalvarArquivoAsync(primeiroArquivo, "conteudos", new[] { ".pdf" }, 1_000_000);
        var segundaUrl = await _service.SalvarArquivoAsync(segundoArquivo, "conteudos", new[] { ".pdf" }, 1_000_000);

        Assert.NotEqual(primeiraUrl, segundaUrl);
    }

    [Fact]
    public async Task SalvarArquivoAsync_ExtensaoNaoPermitida_LancaArgumentException()
    {
        var arquivo = CriarArquivoFake("virus.exe");

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(arquivo, "conteudos", new[] { ".pdf", ".png" }, 1_000_000));
    }

    [Fact]
    public async Task SalvarArquivoAsync_ConteudoNaoBateComExtensao_LancaArgumentException()
    {
        // Nome/extensao dizem PDF, mas o conteudo binario nao tem a assinatura %PDF- —
        // simula um arquivo renomeado pra escapar do filtro de extensao.
        var arquivo = CriarArquivoFakeComBytes("disfarcado.pdf", System.Text.Encoding.UTF8.GetBytes("isso nao e um pdf de verdade"));

        var excecao = await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(arquivo, "conteudos", new[] { ".pdf" }, 1_000_000));
        Assert.Contains("conteudo do arquivo", excecao.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SalvarArquivoAsync_ImagemRenomeadaComExtensaoDeOutroTipo_LancaArgumentException()
    {
        // Um JPEG de verdade (assinatura FF D8 FF) renomeado pra .png deve ser rejeitado,
        // mesmo passando no filtro de extensao.
        var bytesJpeg = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };
        var arquivo = CriarArquivoFakeComBytes("foto.png", bytesJpeg);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(arquivo, "cursos", new[] { ".png" }, 1_000_000));
    }

    [Fact]
    public async Task SalvarArquivoAsync_AssinaturaValida_SalvaComSucesso()
    {
        var bytesPng = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
        var arquivo = CriarArquivoFakeComBytes("capa.png", bytesPng);

        var url = await _service.SalvarArquivoAsync(arquivo, "cursos", new[] { ".png" }, 1_000_000);

        Assert.StartsWith("/uploads/cursos/", url);
    }

    [Fact]
    public async Task SalvarArquivoAsync_ArquivoMaiorQueOLimite_LancaArgumentException()
    {
        var arquivo = CriarArquivoFake("grande.pdf", conteudo: new string('a', 1000));

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(arquivo, "conteudos", new[] { ".pdf" }, tamanhoMaximoBytes: 100));
    }

    [Fact]
    public async Task SalvarArquivoAsync_ArquivoNulo_LancaArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(null!, "conteudos", new[] { ".pdf" }, 1_000_000));
    }

    [Fact]
    public async Task SalvarArquivoAsync_ArquivoVazio_LancaArgumentException()
    {
        var arquivoVazio = new FormFile(new MemoryStream(), 0, 0, "arquivo", "vazio.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream"
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.SalvarArquivoAsync(arquivoVazio, "conteudos", new[] { ".pdf" }, 1_000_000));
    }

    private class AmbienteFake : IWebHostEnvironment
    {
        public AmbienteFake(string contentRootPath)
        {
            ContentRootPath = contentRootPath;
            ContentRootFileProvider = new PhysicalFileProvider(contentRootPath);
        }

        public string ApplicationName { get; set; } = "PlataformaEnsino.Testes";
        public IFileProvider ContentRootFileProvider { get; set; }
        public string ContentRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Testing";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
    }
}
