using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(string email, string senha);
    Task<AuthResponseDto?> RefreshAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task SolicitarRecuperacaoSenhaAsync(string email);
    Task RedefinirSenhaAsync(string token, string novaSenha);
}
