using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class CursoDesempenhoResponseDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int? TurmaId { get; set; }
    public string? ProfessorNome { get; set; }
    public int TotalAlunos { get; set; }
    public int AlunosAtivos { get; set; }
    public decimal ProgressoMedio { get; set; }
    public decimal PercentualConclusao { get; set; }
    public decimal DesempenhoMedio { get; set; }
    public List<ModuloDesempenhoResponseDto> Modulos { get; set; } = new();
    public List<AvaliacaoDesempenhoResponseDto> AvaliacoesSemModulo { get; set; } = new();
}

public class ModuloDesempenhoResponseDto
{
    public int ModuloId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public int TotalMateriais { get; set; }
    public decimal ProgressoMedio { get; set; }
    public decimal PercentualConclusao { get; set; }
    public decimal DesempenhoMedio { get; set; }
    public List<MaterialDesempenhoResponseDto> Materiais { get; set; } = new();
    public List<AvaliacaoDesempenhoResponseDto> Avaliacoes { get; set; } = new();
}

public class MaterialDesempenhoResponseDto
{
    public int ConteudoDidaticoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public TipoConteudoDidatico TipoConteudo { get; set; }
    public StatusPublicacao StatusPublicacao { get; set; }
    public int AlunosConcluiram { get; set; }
    public decimal PercentualConclusao { get; set; }
}
