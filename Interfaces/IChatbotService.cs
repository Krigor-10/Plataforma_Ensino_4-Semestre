using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Lancada quando o Assistente CodeRyse nao pode responder agora por um
/// motivo que nao e erro do aluno - desligado pelo Admin, teto mensal de
/// gasto atingido ou limite diario de perguntas excedido. O controller usa
/// <see cref="Codigo"/> pra decidir o codigo HTTP certo.
/// </summary>
public class ChatbotIndisponivelException : Exception
{
    public string Codigo { get; }

    public ChatbotIndisponivelException(string codigo, string mensagem) : base(mensagem)
    {
        Codigo = codigo;
    }
}

public record ResultadoEnvioMensagemChatbot(int ConversaId, int MensagemId, string Texto, List<AcaoChatbotDto> Acoes, bool SemResposta);

public interface IChatbotService
{
    Task<ConversaChatbotResponseDto?> ObterConversaAtualAsync(int alunoId);

    Task<ResultadoEnvioMensagemChatbot> EnviarMensagemAsync(
        int alunoId,
        EnviarMensagemChatbotDto dto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken);

    Task RegistrarFeedbackAsync(int alunoId, int mensagemId, bool util);

    Task<ConfiguracaoChatbotResponseDto> ObterConfiguracaoAsync();
    Task AtualizarConfiguracaoAsync(AtualizarConfiguracaoChatbotDto dto);
    Task<UsoChatbotResponseDto> ObterUsoDoMesAsync();
}
