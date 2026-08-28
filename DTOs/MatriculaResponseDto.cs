using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class MatriculaResponseDto
{
    public int Id { get; set; }
    public string CodigoRegistro { get; set; } = string.Empty;
    public int AlunoId { get; set; }
    public int CursoId { get; set; }
    public int? TurmaId { get; set; }
    public DateTime DataSolicitacao { get; set; }
    public decimal NotaFinal { get; set; }
    public StatusMatricula Status { get; set; }
}
