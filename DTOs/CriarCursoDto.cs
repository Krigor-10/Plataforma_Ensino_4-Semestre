using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class CriarCursoDto
{
    [Required]
    [StringLength(150)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(1000)]
    public string Descricao { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Preco { get; set; }
}
