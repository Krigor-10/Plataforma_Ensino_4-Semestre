using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class TurmaDesempenhoResponseDto
{
    public int TurmaId { get; set; }
    public string NomeTurma { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int TotalAlunos { get; set; }
    public int AlunosAtivos { get; set; }
    public decimal ProgressoMedio { get; set; }
    public decimal PercentualConclusao { get; set; }
    public decimal DesempenhoMedio { get; set; }
    public List<AlunoDesempenhoResponseDto> Alunos { get; set; } = new();
    public List<AvaliacaoDesempenhoResponseDto> Avaliacoes { get; set; } = new();
}

public class AlunoDesempenhoResponseDto
{
    public int MatriculaId { get; set; }
    public int AlunoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public StatusMatricula Status { get; set; }
    public decimal NotaFinal { get; set; }
    public decimal PercentualConclusao { get; set; }
}

public class AvaliacaoDesempenhoResponseDto
{
    public int AvaliacaoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public TipoAvaliacao TipoAvaliacao { get; set; }
    public StatusPublicacao StatusPublicacao { get; set; }
    public int TotalParticipantes { get; set; }
    public decimal MediaNota { get; set; }
    public decimal NotaMaxima { get; set; }
    public decimal PercentualConclusao { get; set; }
    public decimal PercentualAproveitamento { get; set; }
}
