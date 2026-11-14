using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

// Assistente CodeRyse (fluxo-chatbot Fase 1): uma conversa por "sessao" do
// painel do aluno. So guarda as ultimas - o chat nao lembra de conversas
// anteriores (GET /Chatbot/conversas/atual sempre devolve a mais recente).
// Expurgo automatico apos 90 dias (ver ChatbotExpurgoService).
public class ConversaChatbot
{
    public int Id { get; set; }

    public int AlunoId { get; set; }

    public DateTime CriadaEm { get; private set; } = DateTime.UtcNow;

    public DateTime AtualizadaEm { get; private set; } = DateTime.UtcNow;

    [JsonIgnore]
    [ValidateNever]
    public Aluno? Aluno { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<MensagemChatbot> Mensagens { get; set; } = new();

    public static ConversaChatbot Criar(int alunoId)
    {
        if (alunoId <= 0)
        {
            throw new ArgumentException("O aluno informado e invalido.");
        }

        var agora = DateTime.UtcNow;
        return new ConversaChatbot
        {
            AlunoId = alunoId,
            CriadaEm = agora,
            AtualizadaEm = agora
        };
    }

    public void RegistrarAtividade(DateTime? momento = null)
    {
        AtualizadaEm = momento ?? DateTime.UtcNow;
    }
}
