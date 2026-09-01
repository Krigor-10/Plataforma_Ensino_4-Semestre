using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AvaliacaoAlunoResponseDto
{
    public int Id { get; set; }
    public int MatriculaId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int TurmaId { get; set; }
    public string TurmaNome { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int ModuloId { get; set; }
    public string ModuloTitulo { get; set; } = string.Empty;
    public int? ConteudoDidaticoId { get; set; }
    public string ConteudoDidaticoTitulo { get; set; } = string.Empty;
    public TipoAvaliacao TipoAvaliacao { get; set; }
    public StatusPublicacao StatusPublicacao { get; set; }
    public DateTime? DataAbertura { get; set; }
    public DateTime? DataFechamento { get; set; }
    public int TentativasPermitidas { get; set; }
    public int TentativasRealizadas { get; set; }
    public int TentativasRestantes { get; set; }
    public int? TempoLimiteMinutos { get; set; }
    public decimal NotaMaxima { get; set; }
    public int TotalQuestoes { get; set; }
    public decimal? UltimaNota { get; set; }
    public StatusTentativaAvaliacao? UltimoStatusTentativa { get; set; }
    public DateTime? PublicadoEm { get; set; }
}

public class AlternativaQuestaoAlunoResponseDto
{
    public int Id { get; set; }
    public string Letra { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public int Ordem { get; set; }
}

public class QuestaoAvaliacaoAlunoResponseDto
{
    public int Id { get; set; }
    public int AvaliacaoId { get; set; }
    public int Ordem { get; set; }
    public string Contexto { get; set; } = string.Empty;
    public string Enunciado { get; set; } = string.Empty;
    public TipoQuestao TipoQuestao { get; set; }
    public decimal Pontos { get; set; }
    public List<AlternativaQuestaoAlunoResponseDto> Alternativas { get; set; } = new();
}

public class RespostaAvaliacaoAlunoDto
{
    [Required]
    public int QuestaoId { get; set; }

    public int? AlternativaId { get; set; }

    public string RespostaTexto { get; set; } = string.Empty;
}

public class EnviarAvaliacaoAlunoDto
{
    [MinLength(1)]
    public List<RespostaAvaliacaoAlunoDto> Respostas { get; set; } = new();
}

public class TentativaAvaliacaoAlunoResponseDto
{
    public int Id { get; set; }
    public int AvaliacaoId { get; set; }
    public int MatriculaId { get; set; }
    public int NumeroTentativa { get; set; }
    public StatusTentativaAvaliacao StatusTentativa { get; set; }
    public decimal NotaBruta { get; set; }
    public decimal NotaMaxima { get; set; }
    public DateTime IniciadaEm { get; set; }
    public DateTime? EnviadaEm { get; set; }
    public DateTime? CorrigidaEm { get; set; }
}
