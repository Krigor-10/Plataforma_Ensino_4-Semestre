using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarPacoteCursoDto
{
    [Range(0, double.MaxValue)]
    public decimal Preco { get; set; }

    [StringLength(1000)]
    public string? Descricao { get; set; }
}
