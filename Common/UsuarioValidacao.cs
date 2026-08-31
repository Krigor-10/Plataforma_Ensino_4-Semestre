using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Common;

public static class UsuarioValidacao
{
    /// <summary>
    /// Normaliza e-mail (trim + minusculas) e CPF (so digitos), e garante que
    /// nenhum outro usuario ja cadastrado usa esse e-mail ou CPF. Passe
    /// <paramref name="excludingId"/> ao validar uma edicao, para nao rejeitar
    /// o proprio e-mail/CPF do usuario que esta sendo atualizado.
    /// </summary>
    public static async Task<(string Email, string Cpf)> NormalizarEGarantirDisponivelAsync(
        PlataformaContext context, string email, string cpf, int? excludingId = null)
    {
        var emailNormalizado = email.Trim().ToLower();
        var cpfNormalizado = new string(cpf.Where(char.IsDigit).ToArray());

        if (await context.Usuarios.AnyAsync(usuario => usuario.Email.ToLower() == emailNormalizado && usuario.Id != excludingId))
        {
            throw new ArgumentException("Ja existe um usuario com este e-mail.");
        }

        if (await context.Usuarios.AnyAsync(usuario => usuario.Cpf == cpfNormalizado && usuario.Id != excludingId))
        {
            throw new ArgumentException("Ja existe um usuario com este CPF.");
        }

        return (emailNormalizado, cpfNormalizado);
    }
}
