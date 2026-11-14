using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public record ResultadoMensagemChatbotIA(
    string Texto,
    List<AcaoChatbotDto> Acoes,
    bool SemResposta,
    bool Recusado,
    List<string> FerramentasUsadas,
    int TokensEntrada,
    int TokensSaida,
    int TokensCacheLeitura,
    int TokensCacheEscrita);

/// <summary>
/// Uma "rodada" de conversa completa com o Assistente CodeRyse - inclui, por
/// dentro, as ate 4 idas-e-voltas de ferramenta (ver FASE-1). Atras de uma
/// interface pra ChatbotServiceTests poder mockar sem bater na API de
/// verdade.
/// </summary>
public interface IChatbotIAService
{
    Task<ResultadoMensagemChatbotIA> ObterRespostaAsync(
        int alunoId,
        IReadOnlyList<(string Papel, string Texto)> historico,
        string textoNovaMensagem,
        ContextoTelaChatbotDto? contexto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken);

    /// <summary>Resumo curto (ate 2 frases) de uma conversa do chat, usado ao abrir um chamado - chamada de IA separada, sem ferramentas nem cache.</summary>
    Task<string> ResumirConversaAsync(IReadOnlyList<(string Papel, string Texto)> mensagens, CancellationToken cancellationToken);
}
