using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class QuestaoAvaliacaoResponseDto
{
    public int Id { get; set; }
    public int AvaliacaoId { get; set; }
    public int QuestaoBancoId { get; set; }
    public int Ordem { get; set; }
    public string TituloInterno { get; set; } = string.Empty;
    public string Tema { get; set; } = string.Empty;
    public string Subtema { get; set; } = string.Empty;
    public byte Dificuldade { get; set; }
    public string Contexto { get; set; } = string.Empty;
    public string Enunciado { get; set; } = string.Empty;
    public TipoQuestao TipoQuestao { get; set; }
    public string Explicacao { get; set; } = string.Empty;
    public string ReferenciasBibliograficas { get; set; } = string.Empty;
    public decimal Pontos { get; set; }
    public List<AlternativaAvaliacaoResponseDto> Alternativas { get; set; } = new();
    public List<AfirmativaQuestaoResponseDto> Afirmativas { get; set; } = new();
    public List<AnexoQuestaoBancoResponseDto> Anexos { get; set; } = new();
}
