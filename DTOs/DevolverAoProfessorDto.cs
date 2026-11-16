using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class DevolverAoProfessorDto
{
    [StringLength(500)]
    public string? Motivo { get; set; }
}
