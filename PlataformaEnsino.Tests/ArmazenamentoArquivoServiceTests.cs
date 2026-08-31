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

    private static IFormFile CriarArquivoFake(string nomeArquivo, string conteudo = "conteudo de teste")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(conteudo);
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
