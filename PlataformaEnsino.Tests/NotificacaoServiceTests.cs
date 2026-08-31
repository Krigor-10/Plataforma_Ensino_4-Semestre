using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class NotificacaoServiceTests
{
    private static (NotificacaoService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        var service = new NotificacaoService(context, NullLogger<NotificacaoService>.Instance);
        return (service, context);
    }

    [Fact]
    public async Task NotificarAsync_CriaNotificacaoParaOUsuario()
    {
        var (service, context) = CriarService();

        await service.NotificarAsync(1, "Titulo", "Mensagem", TipoNotificacao.MatriculaAprovada, "/app/cursos");

        var notificacao = Assert.Single(context.Notificacoes);
        Assert.Equal(1, notificacao.UsuarioId);
        Assert.Equal("Titulo", notificacao.Titulo);
        Assert.False(notificacao.Lida);
    }

    [Fact]
    public async Task NotificarVariosAsync_CriaUmaNotificacaoPorUsuarioUnico()
    {
        var (service, context) = CriarService();

        await service.NotificarVariosAsync(new[] { 1, 2, 2, 3 }, "Titulo", "Mensagem", TipoNotificacao.ConteudoPublicado);

        Assert.Equal(3, context.Notificacoes.Count());
    }

    [Fact]
    public async Task NotificarVariosAsync_ListaVazia_NaoCriaNadaENaoLancaExcecao()
    {
        var (service, context) = CriarService();

        var excecao = await Record.ExceptionAsync(
            () => service.NotificarVariosAsync(Array.Empty<int>(), "Titulo", "Mensagem", TipoNotificacao.ConteudoPublicado));

        Assert.Null(excecao);
        Assert.Empty(context.Notificacoes);
    }

    [Fact]
    public async Task ListarPorUsuarioAsync_RetornaSoAsNotificacoesDoUsuario()
    {
        var (service, context) = CriarService();
        context.Notificacoes.AddRange(
            Notificacao.Criar(1, "Notificacao 1", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(1, "Notificacao 2", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(2, "De outro usuario", "m", TipoNotificacao.ConteudoPublicado, null));
        context.SaveChanges();

        var resultado = (await service.ListarPorUsuarioAsync(1)).ToList();

        Assert.Equal(2, resultado.Count);
        Assert.All(resultado, n => Assert.Equal(1, n.UsuarioId));
    }

    [Fact]
    public async Task ListarPorUsuarioAsync_RespeitaOLimite()
    {
        var (service, context) = CriarService();
        for (var i = 0; i < 5; i++)
        {
            context.Notificacoes.Add(Notificacao.Criar(1, $"Notificacao {i}", "m", TipoNotificacao.ConteudoPublicado, null));
        }
        context.SaveChanges();

        var resultado = await service.ListarPorUsuarioAsync(1, limite: 3);

        Assert.Equal(3, resultado.Count());
    }

    [Fact]
    public async Task ContarNaoLidasAsync_ContaSoAsNaoLidasDoUsuario()
    {
        var (service, context) = CriarService();
        var lida = Notificacao.Criar(1, "Lida", "m", TipoNotificacao.ConteudoPublicado, null);
        lida.MarcarComoLida(DateTime.UtcNow);
        context.Notificacoes.AddRange(
            lida,
            Notificacao.Criar(1, "Nao lida 1", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(1, "Nao lida 2", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(2, "De outro usuario", "m", TipoNotificacao.ConteudoPublicado, null));
        context.SaveChanges();

        var total = await service.ContarNaoLidasAsync(1);

        Assert.Equal(2, total);
    }

    [Fact]
    public async Task MarcarComoLidaAsync_MarcaANotificacaoComoLida()
    {
        var (service, context) = CriarService();
        var notificacao = Notificacao.Criar(1, "Titulo", "m", TipoNotificacao.ConteudoPublicado, null);
        context.Notificacoes.Add(notificacao);
        context.SaveChanges();

        await service.MarcarComoLidaAsync(notificacao.Id, 1);

        var atualizada = context.Notificacoes.Single(n => n.Id == notificacao.Id);
        Assert.True(atualizada.Lida);
        Assert.NotNull(atualizada.LidaEm);
    }

    [Fact]
    public async Task MarcarComoLidaAsync_NotificacaoDeOutroUsuario_LancaKeyNotFoundException()
    {
        var (service, context) = CriarService();
        var notificacao = Notificacao.Criar(1, "Titulo", "m", TipoNotificacao.ConteudoPublicado, null);
        context.Notificacoes.Add(notificacao);
        context.SaveChanges();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.MarcarComoLidaAsync(notificacao.Id, usuarioId: 999));
    }

    [Fact]
    public async Task MarcarTodasComoLidasAsync_MarcaTodasAsNaoLidasDoUsuario()
    {
        var (service, context) = CriarService();
        context.Notificacoes.AddRange(
            Notificacao.Criar(1, "Nao lida 1", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(1, "Nao lida 2", "m", TipoNotificacao.ConteudoPublicado, null),
            Notificacao.Criar(2, "De outro usuario", "m", TipoNotificacao.ConteudoPublicado, null));
        context.SaveChanges();

        await service.MarcarTodasComoLidasAsync(1);

        Assert.All(context.Notificacoes.Where(n => n.UsuarioId == 1), n => Assert.True(n.Lida));
        Assert.False(context.Notificacoes.Single(n => n.UsuarioId == 2).Lida);
    }

    [Fact]
    public async Task MarcarTodasComoLidasAsync_SemNotificacoesPendentes_NaoLancaExcecao()
    {
        var (service, _) = CriarService();

        var excecao = await Record.ExceptionAsync(() => service.MarcarTodasComoLidasAsync(1));

        Assert.Null(excecao);
    }
}
