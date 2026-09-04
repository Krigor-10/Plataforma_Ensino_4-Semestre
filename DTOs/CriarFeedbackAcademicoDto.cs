using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class CriarFeedbackAcademicoDto
{
    [Required]
    [StringLength(120)]
    public string Origem { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Mensagem { get; set; } = string.Empty;
}
