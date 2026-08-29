using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class EsqueciSenhaDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
