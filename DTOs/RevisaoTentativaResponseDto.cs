using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class RevisaoAlternativaResponseDto
{
    public int Id { get; set; }
    public string Letra { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public bool EhCorreta { get; set; }
    public string Justificativa { get; set; } = string.Empty;
}

public class RevisaoAfirmativaResponseDto
{
    public string Numero { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public bool EhCorreta { get; set; }
    public string Justificativa { get; set; } = string.Empty;
}

public class RevisaoQuestaoResponseDto
{
    public int QuestaoId { get; set; }
    public int Ordem { get; set; }
    public string Contexto { get; set; } = string.Empty;
    public string Enunciado { get; set; } = string.Empty;
    public TipoQuestao TipoQuestao { get; set; }
    public decimal Pontos { get; set; }
    public decimal PontosObtidos { get; set; }
    public bool? Correta { get; set; }
    public int? AlternativaEscolhidaId { get; set; }
    public string RespostaTexto { get; set; } = string.Empty;
    public string Explicacao { get; set; } = string.Empty;
    public string ReferenciasBibliograficas { get; set; } = string.Empty;
    public List<RevisaoAlternativaResponseDto> Alternativas { get; set; } = new();
    public List<RevisaoAfirmativaResponseDto> Afirmativas { get; set; } = new();
}

public class RevisaoTentativaResponseDto
{
    public int TentativaId { get; set; }
    public int AvaliacaoId { get; set; }
    public StatusTentativaAvaliacao StatusTentativa { get; set; }
    public decimal NotaBruta { get; set; }
    public decimal NotaMaxima { get; set; }
    public List<RevisaoQuestaoResponseDto> Questoes { get; set; } = new();
}
