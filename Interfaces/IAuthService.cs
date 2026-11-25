using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(string email, string senha);
    Task<AuthResponseDto?> RefreshAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task SolicitarRecuperacaoSenhaAsync(string email);
    Task RedefinirSenhaAsync(string token, string novaSenha);
    Task<AuthResponseDto> BootstrapAdminAsync(BootstrapAdminDto dto);

    /// <summary>
    /// Revoga todos os refresh tokens ainda ativos de um usuário - extraído
    /// de RedefinirSenhaAsync (docs/alunos-admin/PROMPT-agente-editar-e-
    /// inativar-aluno.md, item A1) para ser reaproveitado também ao editar
    /// o e-mail de um aluno e ao inativá-lo (AlunoService).
    /// </summary>
    Task RevogarTodosOsTokensAsync(int usuarioId);
}
