using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarCursoDto
{
    [Required]
    [StringLength(150)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Descricao { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Preco { get; set; }

    /// <summary>Opcional — se nao informado, o modelo atual do curso e mantido.</summary>
    public ModeloCurso? ModeloCurso { get; set; }
}
