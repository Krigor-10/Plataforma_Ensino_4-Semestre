using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class RedefinirSenhaDto
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "A nova senha deve ter ao menos 6 caracteres.")]
    public string NovaSenha { get; set; } = string.Empty;
}
