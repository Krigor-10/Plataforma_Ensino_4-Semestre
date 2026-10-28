using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class ComprarCursoDto
{
    [Required]
    public int CursoId { get; set; }
}
