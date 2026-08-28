namespace PlataformaEnsino.API.DTOs;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public UsuarioSessaoDto Usuario { get; set; } = new();
}
