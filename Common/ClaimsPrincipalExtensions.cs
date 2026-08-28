using System.Security.Claims;

namespace PlataformaEnsino.API.Common;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Id do usuário autenticado, extraído das claims do JWT.
    /// </summary>
    public static int? ObterUsuarioId(this ClaimsPrincipal usuario)
    {
        var rawId = usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? usuario.FindFirstValue("usuarioId");
        return int.TryParse(rawId, out var usuarioId) ? usuarioId : null;
    }

    /// <summary>
    /// Admin/Coordenador podem acessar dados de qualquer aluno; qualquer outro usuário só os seus próprios.
    /// </summary>
    public static bool PodeAcessarAluno(this ClaimsPrincipal usuario, int alunoId)
    {
        if (usuario.IsInRole("Admin") || usuario.IsInRole("Coordenador"))
        {
            return true;
        }

        return usuario.ObterUsuarioId() == alunoId;
    }
}
