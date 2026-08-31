using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class EmailServiceTests
{
    private static IConfiguration CriarConfiguracaoSemSmtp() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Smtp:Host"] = ""
            })
            .Build();

    [Fact]
    public async Task EnviarAsync_SemSmtpConfigurado_ApenasLogaENaoLancaExcecao()
    {
        var service = new EmailService(CriarConfiguracaoSemSmtp(), NullLogger<EmailService>.Instance);

        var excecao = await Record.ExceptionAsync(
            () => service.EnviarAsync("destinatario@teste.local", "Assunto de teste", "<p>Corpo</p>"));

        Assert.Null(excecao);
    }

    [Fact]
    public async Task EnviarAsync_SmtpHostNaoDefinido_NaoTentaAbrirConexaoDeRede()
    {
        var configuracao = new ConfigurationBuilder().Build(); // nenhuma chave Smtp:* definida
        var service = new EmailService(configuracao, NullLogger<EmailService>.Instance);

        // Se tentasse conectar de verdade num host inexistente, isso levaria segundos/minutos
        // (timeout de rede) ou lancaria SocketException. Completar rapido confirma o fallback.
        var tarefa = service.EnviarAsync("destinatario@teste.local", "Assunto", "<p>Corpo</p>");
        var tarefaConcluida = await Task.WhenAny(tarefa, Task.Delay(TimeSpan.FromSeconds(2)));

        Assert.Same(tarefa, tarefaConcluida);
        await tarefa;
    }
}
