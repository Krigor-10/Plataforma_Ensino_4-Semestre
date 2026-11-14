using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ChatbotService : IChatbotService
{
    private const int LimiteMensagensPorDia = 100;
    private const int LimiteCaracteresPergunta = 1000;
    private const int MensagensDeHistoricoParaContexto = 10;

    private readonly PlataformaContext _context;
    private readonly IChatbotIAService _chatbotIAService;
    private readonly INotificacaoService _notificacaoService;
    private readonly IConfiguration _configuration;

    public ChatbotService(
        PlataformaContext context,
        IChatbotIAService chatbotIAService,
        INotificacaoService notificacaoService,
        IConfiguration configuration)
    {
        _context = context;
        _chatbotIAService = chatbotIAService;
        _notificacaoService = notificacaoService;
        _configuration = configuration;
    }

    public async Task<ConversaChatbotResponseDto?> ObterConversaAtualAsync(int alunoId)
    {
        var conversa = await _context.ConversasChatbot
            .AsNoTracking()
            .Include(c => c.Mensagens)
            .Where(c => c.AlunoId == alunoId)
            .OrderByDescending(c => c.AtualizadaEm)
            .FirstOrDefaultAsync();

        if (conversa is null)
        {
            return null;
        }

        return new ConversaChatbotResponseDto
        {
            Id = conversa.Id,
            Mensagens = conversa.Mensagens
                .OrderBy(mensagem => mensagem.CriadoEm)
                .Select(MapearMensagem)
                .ToList()
        };
    }

    public async Task<ResultadoEnvioMensagemChatbot> EnviarMensagemAsync(
        int alunoId,
        EnviarMensagemChatbotDto dto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Texto))
        {
            throw new ArgumentException("A pergunta nao pode ser vazia.");
        }

        if (dto.Texto.Length > LimiteCaracteresPergunta)
        {
            throw new ArgumentException($"A pergunta e muito longa (maximo de {LimiteCaracteresPergunta} caracteres).");
        }

        await VerificarDisponibilidadeAsync(cancellationToken);
        await VerificarLimiteDiarioAsync(alunoId, cancellationToken);

        var conversa = await ObterOuCriarConversaAsync(alunoId, dto.ConversaId, cancellationToken);

        // Historico ANTES da pergunta atual - ultimas 10, na ordem cronologica
        // (o chat nao lembra de conversas anteriores, so desta).
        var historicoEntidades = await _context.MensagensChatbot
            .AsNoTracking()
            .Where(mensagem => mensagem.ConversaId == conversa.Id)
            .OrderByDescending(mensagem => mensagem.CriadoEm)
            .Take(MensagensDeHistoricoParaContexto)
            .ToListAsync(cancellationToken);
        historicoEntidades.Reverse();

        var historico = historicoEntidades
            .Select(mensagem => (
                Papel: mensagem.Papel == PapelMensagemChatbot.Usuario ? "user" : "assistant",
                mensagem.Texto))
            .ToList();

        var mensagemDoUsuario = MensagemChatbot.CriarDoUsuario(conversa.Id, dto.Texto);
        _context.MensagensChatbot.Add(mensagemDoUsuario);
        conversa.RegistrarAtividade();
        await _context.SaveChangesAsync(cancellationToken);

        var resultado = await _chatbotIAService.ObterRespostaAsync(
            alunoId, historico, dto.Texto, dto.Contexto, aoReceberTrechoDeTexto, cancellationToken);

        var custoUsd = CustoChatbotCalculator.CalcularUsd(
            _configuration, resultado.TokensEntrada, resultado.TokensSaida, resultado.TokensCacheEscrita, resultado.TokensCacheLeitura);

        var mensagemDoAssistente = MensagemChatbot.CriarDoAssistente(
            conversa.Id,
            resultado.Texto,
            resultado.Acoes.Count > 0 ? JsonSerializer.Serialize(resultado.Acoes) : null,
            resultado.FerramentasUsadas.Count > 0 ? JsonSerializer.Serialize(resultado.FerramentasUsadas) : null,
            resultado.SemResposta,
            resultado.TokensEntrada,
            resultado.TokensSaida,
            resultado.TokensCacheLeitura,
            resultado.TokensCacheEscrita,
            custoUsd);

        _context.MensagensChatbot.Add(mensagemDoAssistente);
        conversa.RegistrarAtividade();
        await _context.SaveChangesAsync(cancellationToken);

        await VerificarTetoDeGastoAsync(cancellationToken);

        return new ResultadoEnvioMensagemChatbot(conversa.Id, mensagemDoAssistente.Id, resultado.Texto, resultado.Acoes, resultado.SemResposta);
    }

    public async Task RegistrarFeedbackAsync(int alunoId, int mensagemId, bool util)
    {
        var mensagem = await _context.MensagensChatbot
            .Include(mensagem => mensagem.Conversa)
            .FirstOrDefaultAsync(mensagem => mensagem.Id == mensagemId)
            ?? throw new KeyNotFoundException("Mensagem nao encontrada.");

        if (mensagem.Conversa?.AlunoId != alunoId)
        {
            // Mesma mensagem de 404 de "nao encontrada" de proposito - nao revela
            // pra quem pediu que a mensagem existe e e de outro aluno.
            throw new KeyNotFoundException("Mensagem nao encontrada.");
        }

        mensagem.RegistrarFeedback(util);
        await _context.SaveChangesAsync();
    }

    public async Task<ConfiguracaoChatbotResponseDto> ObterConfiguracaoAsync()
    {
        var configuracao = await ObterOuCriarConfiguracaoAsync();
        return new ConfiguracaoChatbotResponseDto { Ativo = configuracao.Ativo, TetoMensalUsd = configuracao.TetoMensalUsd };
    }

    public async Task AtualizarConfiguracaoAsync(AtualizarConfiguracaoChatbotDto dto)
    {
        var configuracao = await ObterOuCriarConfiguracaoAsync();
        configuracao.Atualizar(dto.Ativo, dto.TetoMensalUsd);
        await _context.SaveChangesAsync();
    }

    public async Task<UsoChatbotResponseDto> ObterUsoDoMesAsync()
    {
        var configuracao = await ObterOuCriarConfiguracaoAsync();
        var inicioDoMes = ObterInicioDoMesAtual();

        var gastoMes = await _context.MensagensChatbot
            .Where(mensagem => mensagem.CriadoEm >= inicioDoMes)
            .SumAsync(mensagem => mensagem.CustoUsd);

        var quantidadePerguntas = await _context.MensagensChatbot
            .Where(mensagem => mensagem.Papel == PapelMensagemChatbot.Usuario && mensagem.CriadoEm >= inicioDoMes)
            .CountAsync();

        return new UsoChatbotResponseDto
        {
            GastoMesUsd = gastoMes,
            TetoMensalUsd = configuracao.TetoMensalUsd,
            QuantidadePerguntasMes = quantidadePerguntas
        };
    }

    private async Task<ConversaChatbot> ObterOuCriarConversaAsync(int alunoId, int? conversaIdDesejada, CancellationToken cancellationToken)
    {
        if (conversaIdDesejada.HasValue)
        {
            var conversaExistente = await _context.ConversasChatbot
                .FirstOrDefaultAsync(conversa => conversa.Id == conversaIdDesejada.Value && conversa.AlunoId == alunoId, cancellationToken);

            if (conversaExistente is not null)
            {
                return conversaExistente;
            }
        }

        var novaConversa = ConversaChatbot.Criar(alunoId);
        _context.ConversasChatbot.Add(novaConversa);
        await _context.SaveChangesAsync(cancellationToken);
        return novaConversa;
    }

    private async Task<ConfiguracaoChatbot> ObterOuCriarConfiguracaoAsync()
    {
        var configuracao = await _context.ConfiguracoesChatbot.FirstOrDefaultAsync();
        if (configuracao is not null)
        {
            return configuracao;
        }

        configuracao = ConfiguracaoChatbot.CriarPadrao();
        _context.ConfiguracoesChatbot.Add(configuracao);
        await _context.SaveChangesAsync();
        return configuracao;
    }

    private async Task VerificarDisponibilidadeAsync(CancellationToken cancellationToken)
    {
        var configuracao = await ObterOuCriarConfiguracaoAsync();
        if (!configuracao.Ativo)
        {
            throw new ChatbotIndisponivelException(
                "desligado",
                "O Assistente CodeRyse esta temporariamente desligado. Tente novamente mais tarde ou abra um chamado com o suporte.");
        }

        var gastoDoMes = await _context.MensagensChatbot
            .Where(mensagem => mensagem.CriadoEm >= ObterInicioDoMesAtual())
            .SumAsync(mensagem => mensagem.CustoUsd, cancellationToken);

        if (gastoDoMes >= configuracao.TetoMensalUsd)
        {
            throw new ChatbotIndisponivelException(
                "teto_atingido",
                "O Assistente CodeRyse atingiu o limite de uso deste mes. Tente novamente mais tarde ou abra um chamado com o suporte.");
        }
    }

    // Limite de 30/hora fica na policy de rate limit "chatbot" (Program.cs);
    // o diario (100/dia) nao tem um RateLimiter pronto pra "janela deslizante
    // de 24h contada por aluno" - checagem simples direto no banco.
    private async Task VerificarLimiteDiarioAsync(int alunoId, CancellationToken cancellationToken)
    {
        var desde = DateTime.UtcNow.AddHours(-24);
        var quantidadeHoje = await _context.MensagensChatbot
            .Where(mensagem => mensagem.Papel == PapelMensagemChatbot.Usuario
                && mensagem.Conversa!.AlunoId == alunoId
                && mensagem.CriadoEm >= desde)
            .CountAsync(cancellationToken);

        if (quantidadeHoje >= LimiteMensagensPorDia)
        {
            throw new ChatbotIndisponivelException("limite_diario", "Voce atingiu o limite de perguntas por hoje. Tente novamente mais tarde.");
        }
    }

    private async Task VerificarTetoDeGastoAsync(CancellationToken cancellationToken)
    {
        var configuracao = await ObterOuCriarConfiguracaoAsync();
        if (!configuracao.Ativo)
        {
            return;
        }

        var gastoDoMes = await _context.MensagensChatbot
            .Where(mensagem => mensagem.CriadoEm >= ObterInicioDoMesAtual())
            .SumAsync(mensagem => mensagem.CustoUsd, cancellationToken);

        if (gastoDoMes < configuracao.TetoMensalUsd)
        {
            return;
        }

        var agora = DateTime.UtcNow;
        var jaAvisouEsteMes = configuracao.UltimoAvisoTetoEm is { } ultimoAviso
            && ultimoAviso.Year == agora.Year && ultimoAviso.Month == agora.Month;
        if (jaAvisouEsteMes)
        {
            return;
        }

        configuracao.Atualizar(ativo: false, configuracao.TetoMensalUsd);
        configuracao.RegistrarAvisoTeto(agora);
        await _context.SaveChangesAsync(cancellationToken);

        var idsDosAdmins = await _context.Admins.Select(admin => admin.Id).ToListAsync(cancellationToken);
        if (idsDosAdmins.Count > 0)
        {
            await _notificacaoService.NotificarVariosAsync(
                idsDosAdmins,
                "Assistente CodeRyse atingiu o teto de gasto",
                $"O gasto deste mes com o Assistente CodeRyse atingiu o teto de {configuracao.TetoMensalUsd:F2} USD. O chat foi desligado automaticamente - reative em Configuracoes do Assistente quando quiser.",
                TipoNotificacao.ChatbotTetoAtingido,
                null);
        }
    }

    private static DateTime ObterInicioDoMesAtual()
    {
        var agora = DateTime.UtcNow;
        return new DateTime(agora.Year, agora.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private static MensagemChatbotResponseDto MapearMensagem(MensagemChatbot mensagem)
    {
        return new MensagemChatbotResponseDto
        {
            Id = mensagem.Id,
            Papel = mensagem.Papel,
            Texto = mensagem.Texto,
            Acoes = string.IsNullOrWhiteSpace(mensagem.AcoesJson)
                ? new List<AcaoChatbotDto>()
                : JsonSerializer.Deserialize<List<AcaoChatbotDto>>(mensagem.AcoesJson) ?? new List<AcaoChatbotDto>(),
            SemResposta = mensagem.SemResposta,
            Util = mensagem.Util,
            CriadoEm = mensagem.CriadoEm
        };
    }
}
