using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
