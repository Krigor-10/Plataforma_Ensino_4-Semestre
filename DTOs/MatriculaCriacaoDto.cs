using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class MatriculaCriacaoDto
{
    [Required]
    public int AlunoId { get; set; }

    [Required]
    public int CursoId { get; set; }
}
