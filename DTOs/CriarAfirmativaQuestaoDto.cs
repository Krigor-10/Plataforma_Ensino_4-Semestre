using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class CriarAfirmativaQuestaoDto
{
    [Required]
    [StringLength(10)]
    public string Numero { get; set; } = string.Empty;

    [Required]
    public string Texto { get; set; } = string.Empty;

    public bool EhCorreta { get; set; }

    public string Justificativa { get; set; } = string.Empty;
}
