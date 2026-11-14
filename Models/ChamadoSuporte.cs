using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public enum StatusChamadoSuporte
{
    Aberto = 1,
    Respondido = 2,
    Resolvido = 3
}

// Fluxo-chatbot Fase 1: o aluno abre quando o Assistente nao resolve.
// CoordenadorDestinoId null = foi pra Admin (conta/pagamento/plataforma ou
// curso sem coordenador); preenchido = foi pro Coordenador daquele curso.
// Admin sempre ve todos, independente de CoordenadorDestinoId (ver
// ChamadoSuporteService). Reabertura so dentro de 7 dias de ResolvidoEm.
public class ChamadoSuporte
{
    public int Id { get; set; }

    public int AlunoId { get; set; }

    public int? CursoId { get; set; }

    public int? CoordenadorDestinoId { get; private set; }

    public int? ConversaId { get; private set; }

    public StatusChamadoSuporte Status { get; private set; } = StatusChamadoSuporte.Aberto;

    public string Resumo { get; private set; } = string.Empty;

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;

    public DateTime AtualizadoEm { get; private set; } = DateTime.UtcNow;

    public DateTime? ResolvidoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Aluno? Aluno { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Curso? Curso { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Coordenador? CoordenadorDestino { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<MensagemChamado> Mensagens { get; set; } = new();

    public static ChamadoSuporte Abrir(int alunoId, int? cursoId, int? coordenadorDestinoId, string resumo, int? conversaId)
    {
        if (alunoId <= 0)
        {
            throw new ArgumentException("O aluno informado e invalido.");
        }

        if (string.IsNullOrWhiteSpace(resumo))
        {
            throw new ArgumentException("O resumo do chamado nao pode ser vazio.");
        }

        var agora = DateTime.UtcNow;
        return new ChamadoSuporte
        {
            AlunoId = alunoId,
            CursoId = cursoId,
            CoordenadorDestinoId = coordenadorDestinoId,
            Resumo = resumo,
            ConversaId = conversaId,
            Status = StatusChamadoSuporte.Aberto,
            CriadoEm = agora,
            AtualizadoEm = agora
        };
    }

    public void MarcarComoRespondido(DateTime? momento = null)
    {
        Status = StatusChamadoSuporte.Respondido;
        AtualizadoEm = momento ?? DateTime.UtcNow;
    }

    public void MarcarComoAberto(DateTime? momento = null)
    {
        Status = StatusChamadoSuporte.Aberto;
        AtualizadoEm = momento ?? DateTime.UtcNow;
    }

    public void Resolver(DateTime? momento = null)
    {
        var agora = momento ?? DateTime.UtcNow;
        Status = StatusChamadoSuporte.Resolvido;
        ResolvidoEm = agora;
        AtualizadoEm = agora;
    }

    // Prazo de 7 dias contado de ResolvidoEm, igual a regra combinada com o
    // usuario - depois disso o aluno precisa abrir um chamado novo.
    public void Reabrir(DateTime? momento = null)
    {
        if (Status != StatusChamadoSuporte.Resolvido || ResolvidoEm is null)
        {
            throw new InvalidOperationException("So e possivel reabrir um chamado resolvido.");
        }

        var agora = momento ?? DateTime.UtcNow;
        if ((agora - ResolvidoEm.Value).TotalDays > 7)
        {
            throw new InvalidOperationException("O prazo de 7 dias para reabrir este chamado ja passou.");
        }

        Status = StatusChamadoSuporte.Aberto;
        ResolvidoEm = null;
        AtualizadoEm = agora;
    }
}
