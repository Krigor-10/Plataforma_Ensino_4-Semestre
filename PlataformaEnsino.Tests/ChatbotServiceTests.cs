using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;

namespace PlataformaEnsino.Tests;

public class ChatbotServiceTests
{
    private static readonly Func<string, CancellationToken, Task> SemCallback = (_, _) => Task.CompletedTask;

    private static ChatbotService CriarService(PlataformaContext context, ChatbotIAServiceFake iaFake, Microsoft.Extensions.Configuration.IConfiguration? configuracao = null)
    {
        var config = configuracao ?? new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build();
        var notificacao = new NotificacaoService(context, Microsoft.Extensions.Logging.Abstractions.NullLogger<NotificacaoService>.Instance);
        return new ChatbotService(context, iaFake, notificacao, config);
    }

    private static Aluno CriarAluno(PlataformaContext context, string sufixo = "A")
    {
        var aluno = new Aluno
        {
            Nome = $"Aluno {sufixo}",
            Email = $"aluno.{sufixo}.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
            Matricula = $"MAT-{Guid.NewGuid():N}"[..10]
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Admin CriarAdmin(PlataformaContext context)
    {
        var admin = new Admin
        {
            Nome = "Admin Teste",
            Email = $"admin.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}"
        };
        admin.ConfigurarAcesso("Admin", "hash-fake");
        context.Admins.Add(admin);
        context.SaveChanges();
        return admin;
    }

    [Fact]
    public async Task EnviarMensagemAsync_PerguntaVazia_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var service = CriarService(context, new ChatbotIAServiceFake());

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = "   " }, SemCallback, CancellationToken.None));
    }

    [Fact]
    public async Task EnviarMensagemAsync_PerguntaMuitoLonga_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var service = CriarService(context, new ChatbotIAServiceFake());

        var textoGigante = new string('a', 1001);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = textoGigante }, SemCallback, CancellationToken.None));
    }

    [Fact]
    public async Task EnviarMensagemAsync_ChatDesligadoPeloAdmin_LancaChatbotIndisponivelComCodigoDesligado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        context.ConfiguracoesChatbot.Add(ConfiguracaoChatbot.CriarPadrao());
        context.SaveChanges();
        context.ConfiguracoesChatbot.First().Atualizar(ativo: false, tetoMensalUsd: 20m);
        context.SaveChanges();

        var service = CriarService(context, new ChatbotIAServiceFake());

        var excecao = await Assert.ThrowsAsync<ChatbotIndisponivelException>(() =>
            service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = "Oi" }, SemCallback, CancellationToken.None));

        Assert.Equal("desligado", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarMensagemAsync_TetoMensalJaAtingido_LancaChatbotIndisponivelComCodigoTetoAtingido()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var outraConversa = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(outraConversa);
        context.SaveChanges();

        // Uma mensagem do Assistente ja custou mais do que o teto (1 centavo) -
        // a verificacao de disponibilidade deve bloquear antes de chamar a IA.
        context.MensagensChatbot.Add(MensagemChatbot.CriarDoAssistente(
            outraConversa.Id, "resposta anterior", null, null, false, 1000, 500, 0, 0, custoUsd: 5m));
        context.ConfiguracoesChatbot.Add(ConfiguracaoChatbot.CriarPadrao());
        context.SaveChanges();

        var configuracaoDoTeste = context.ConfiguracoesChatbot.First();
        configuracaoDoTeste.Atualizar(ativo: true, tetoMensalUsd: 1m);
        context.SaveChanges();

        var service = CriarService(context, new ChatbotIAServiceFake());

        var excecao = await Assert.ThrowsAsync<ChatbotIndisponivelException>(() =>
            service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = "Oi" }, SemCallback, CancellationToken.None));

        Assert.Equal("teto_atingido", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarMensagemAsync_CentesimaPrimeiraPerguntaNoDia_LancaChatbotIndisponivelComCodigoLimiteDiario()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversa = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversa);
        context.SaveChanges();

        for (var indice = 0; indice < 100; indice++)
        {
            context.MensagensChatbot.Add(MensagemChatbot.CriarDoUsuario(conversa.Id, $"pergunta {indice}"));
        }
        context.SaveChanges();

        var service = CriarService(context, new ChatbotIAServiceFake());

        var excecao = await Assert.ThrowsAsync<ChatbotIndisponivelException>(() =>
            service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = "101a pergunta do dia" }, SemCallback, CancellationToken.None));

        Assert.Equal("limite_diario", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarMensagemAsync_NonagesimaNonaPerguntaNoDia_AindaEhPermitida()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversa = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversa);
        context.SaveChanges();

        for (var indice = 0; indice < 99; indice++)
        {
            context.MensagensChatbot.Add(MensagemChatbot.CriarDoUsuario(conversa.Id, $"pergunta {indice}"));
        }
        context.SaveChanges();

        var iaFake = new ChatbotIAServiceFake();
        var service = CriarService(context, iaFake);

        var resultado = await service.EnviarMensagemAsync(
            aluno.Id, new EnviarMensagemChatbotDto { ConversaId = conversa.Id, Texto = "100a pergunta do dia" }, SemCallback, CancellationToken.None);

        Assert.NotEqual(0, resultado.MensagemId);
    }

    [Fact]
    public async Task EnviarMensagemAsync_Sucesso_PersisteMensagemDoUsuarioEDoAssistenteComAcoesETokens()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);

        var iaFake = new ChatbotIAServiceFake
        {
            ProximaResposta = new ResultadoMensagemChatbotIA(
                "Seu certificado esta disponivel.",
                new List<AcaoChatbotDto> { new() { Rota = "certificados", Rotulo = "Ir para Certificados" } },
                SemResposta: false,
                Recusado: false,
                new List<string> { "situacao_certificado" },
                TokensEntrada: 500,
                TokensSaida: 80,
                TokensCacheLeitura: 400,
                TokensCacheEscrita: 0)
        };

        var service = CriarService(context, iaFake);

        var resultado = await service.EnviarMensagemAsync(
            aluno.Id, new EnviarMensagemChatbotDto { Texto = "Cadê meu certificado?" }, SemCallback, CancellationToken.None);

        Assert.Single(resultado.Acoes);
        Assert.Equal("certificados", resultado.Acoes[0].Rota);

        var mensagens = context.MensagensChatbot.Where(mensagem => mensagem.ConversaId == resultado.ConversaId).OrderBy(mensagem => mensagem.CriadoEm).ToList();
        Assert.Equal(2, mensagens.Count);
        Assert.Equal(PapelMensagemChatbot.Usuario, mensagens[0].Papel);
        Assert.Equal("Cadê meu certificado?", mensagens[0].Texto);
        Assert.Equal(PapelMensagemChatbot.Assistente, mensagens[1].Papel);
        Assert.Equal("Seu certificado esta disponivel.", mensagens[1].Texto);
        Assert.Equal(500, mensagens[1].TokensEntrada);
        Assert.True(mensagens[1].CustoUsd > 0);
    }

    [Fact]
    public async Task EnviarMensagemAsync_AoAtingirTetoDepoisDaResposta_DesligaEAvisaAdminsUmaVezPorMes()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        context.ConfiguracoesChatbot.Add(ConfiguracaoChatbot.CriarPadrao());
        context.SaveChanges();
        context.ConfiguracoesChatbot.First().Atualizar(ativo: true, tetoMensalUsd: 0.0001m);
        context.SaveChanges();

        var iaFake = new ChatbotIAServiceFake
        {
            ProximaResposta = new ResultadoMensagemChatbotIA(
                "Resposta.", new List<AcaoChatbotDto>(), false, false, new List<string>(),
                TokensEntrada: 10000, TokensSaida: 5000, TokensCacheLeitura: 0, TokensCacheEscrita: 0)
        };

        var service = CriarService(context, iaFake);
        await service.EnviarMensagemAsync(aluno.Id, new EnviarMensagemChatbotDto { Texto = "Oi" }, SemCallback, CancellationToken.None);

        var configuracaoDepois = context.ConfiguracoesChatbot.First();
        Assert.False(configuracaoDepois.Ativo);
        Assert.NotNull(configuracaoDepois.UltimoAvisoTetoEm);

        var notificacaoDoAdmin = context.Notificacoes.FirstOrDefault(notificacao => notificacao.UsuarioId == admin.Id);
        Assert.NotNull(notificacaoDoAdmin);
        Assert.Equal(TipoNotificacao.ChatbotTetoAtingido, notificacaoDoAdmin!.Tipo);
    }

    [Fact]
    public async Task RegistrarFeedbackAsync_MensagemDeOutroAluno_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var alunoDono = CriarAluno(context, "Dono");
        var outroAluno = CriarAluno(context, "Outro");
        var conversa = ConversaChatbot.Criar(alunoDono.Id);
        context.ConversasChatbot.Add(conversa);
        context.SaveChanges();
        var mensagem = MensagemChatbot.CriarDoAssistente(conversa.Id, "resposta", null, null, false, 1, 1, 0, 0, 0m);
        context.MensagensChatbot.Add(mensagem);
        context.SaveChanges();

        var service = CriarService(context, new ChatbotIAServiceFake());

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.RegistrarFeedbackAsync(outroAluno.Id, mensagem.Id, util: true));
    }

    [Fact]
    public async Task RegistrarFeedbackAsync_Sucesso_GravaUtil()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversa = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversa);
        context.SaveChanges();
        var mensagem = MensagemChatbot.CriarDoAssistente(conversa.Id, "resposta", null, null, false, 1, 1, 0, 0, 0m);
        context.MensagensChatbot.Add(mensagem);
        context.SaveChanges();

        var service = CriarService(context, new ChatbotIAServiceFake());
        await service.RegistrarFeedbackAsync(aluno.Id, mensagem.Id, util: true);

        Assert.True(context.MensagensChatbot.First(item => item.Id == mensagem.Id).Util);
    }
}

/// <summary>Fake da IA do chat - ChatbotServiceTests nunca bate na API de verdade.</summary>
public sealed class ChatbotIAServiceFake : IChatbotIAService
{
    public ResultadoMensagemChatbotIA ProximaResposta { get; set; } =
        new("Resposta padrao de teste.", new List<AcaoChatbotDto>(), false, false, new List<string>(), 10, 5, 0, 0);

    public List<(int AlunoId, string Texto)> ChamadasRecebidas { get; } = new();

    public Task<ResultadoMensagemChatbotIA> ObterRespostaAsync(
        int alunoId,
        IReadOnlyList<(string Papel, string Texto)> historico,
        string textoNovaMensagem,
        ContextoTelaChatbotDto? contexto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken)
    {
        ChamadasRecebidas.Add((alunoId, textoNovaMensagem));
        return Task.FromResult(ProximaResposta);
    }

    public Task<string> ResumirConversaAsync(IReadOnlyList<(string Papel, string Texto)> mensagens, CancellationToken cancellationToken) =>
        Task.FromResult("Resumo de teste.");
}
