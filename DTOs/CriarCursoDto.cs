using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

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

    /// <summary>
    /// Opcional — se nao informado, e inferido a partir do Preco (Gratuito se
    /// Preco&lt;=0, senao PagoPacote). "Acompanhado" so e definido explicitamente.
    /// </summary>
    public ModeloCurso? ModeloCurso { get; set; }
}
