using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;

namespace PlataformaEnsino.Tests;

public class ChatbotExpurgoExecutorTests
{
    private static Aluno CriarAluno(PlataformaEnsino.API.Data.PlataformaContext context)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"aluno.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
            Matricula = $"MAT-{Guid.NewGuid():N}"[..10]
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    [Fact]
    public async Task ExecutarAsync_ConversaComMaisDe90Dias_EApagadaComAsMensagens()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversaAntiga = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversaAntiga);
        context.SaveChanges();
        context.MensagensChatbot.Add(MensagemChatbot.CriarDoUsuario(conversaAntiga.Id, "pergunta antiga"));
        context.SaveChanges();
        conversaAntiga.RegistrarAtividade(DateTime.UtcNow.AddDays(-91));
        context.SaveChanges();

        var (conversasApagadas, _) = await ChatbotExpurgoExecutor.ExecutarAsync(context);

        Assert.Equal(1, conversasApagadas);
        Assert.False(context.ConversasChatbot.Any(conversa => conversa.Id == conversaAntiga.Id));
        Assert.False(context.MensagensChatbot.Any(mensagem => mensagem.ConversaId == conversaAntiga.Id));
    }

    [Fact]
    public async Task ExecutarAsync_ConversaRecente_NaoEApagada()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversaRecente = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversaRecente);
        context.SaveChanges();

        var (conversasApagadas, _) = await ChatbotExpurgoExecutor.ExecutarAsync(context);

        Assert.Equal(0, conversasApagadas);
        Assert.True(context.ConversasChatbot.Any(conversa => conversa.Id == conversaRecente.Id));
    }

    [Fact]
    public async Task ExecutarAsync_ChamadoResolvidoHaMaisDe90Dias_EApagadoComAsMensagens()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var chamadoAntigo = ChamadoSuporte.Abrir(aluno.Id, cursoId: null, coordenadorDestinoId: null, "Resumo antigo.", conversaId: null);
        chamadoAntigo.Resolver(DateTime.UtcNow.AddDays(-91));
        context.ChamadosSuporte.Add(chamadoAntigo);
        context.SaveChanges();
        context.MensagensChamado.Add(MensagemChamado.Criar(chamadoAntigo.Id, aluno.Id, "mensagem antiga"));
        context.SaveChanges();

        var (_, chamadosApagados) = await ChatbotExpurgoExecutor.ExecutarAsync(context);

        Assert.Equal(1, chamadosApagados);
        Assert.False(context.ChamadosSuporte.Any(chamado => chamado.Id == chamadoAntigo.Id));
        Assert.False(context.MensagensChamado.Any(mensagem => mensagem.ChamadoId == chamadoAntigo.Id));
    }

    [Fact]
    public async Task ExecutarAsync_ChamadoAbertoMesmoQueAntigo_NuncaEApagado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var chamadoAberto = ChamadoSuporte.Abrir(aluno.Id, cursoId: null, coordenadorDestinoId: null, "Resumo em aberto.", conversaId: null);
        context.ChamadosSuporte.Add(chamadoAberto);
        context.SaveChanges();

        var (_, chamadosApagados) = await ChatbotExpurgoExecutor.ExecutarAsync(context);

        Assert.Equal(0, chamadosApagados);
        Assert.True(context.ChamadosSuporte.Any(chamado => chamado.Id == chamadoAberto.Id));
    }

    [Fact]
    public async Task ExecutarAsync_ChamadoResolvidoDentroDoPrazo_NaoEApagado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var chamadoRecente = ChamadoSuporte.Abrir(aluno.Id, cursoId: null, coordenadorDestinoId: null, "Resumo recente.", conversaId: null);
        chamadoRecente.Resolver(DateTime.UtcNow.AddDays(-10));
        context.ChamadosSuporte.Add(chamadoRecente);
        context.SaveChanges();

        var (_, chamadosApagados) = await ChatbotExpurgoExecutor.ExecutarAsync(context);

        Assert.Equal(0, chamadosApagados);
        Assert.True(context.ChamadosSuporte.Any(chamado => chamado.Id == chamadoRecente.Id));
    }
}
