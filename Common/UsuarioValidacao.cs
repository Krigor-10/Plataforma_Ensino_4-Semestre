using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Common;

public static class UsuarioValidacao
{
    /// <summary>
    /// Normaliza e-mail (trim + minusculas) e CPF (so digitos), e garante que
    /// nenhum usuario ja cadastrado usa esse e-mail ou CPF.
    /// </summary>
    public static async Task<(string Email, string Cpf)> NormalizarEGarantirDisponivelAsync(
        PlataformaContext context, string email, string cpf)
    {
        var emailNormalizado = email.Trim().ToLower();
        var cpfNormalizado = new string(cpf.Where(char.IsDigit).ToArray());

        if (await context.Usuarios.AnyAsync(usuario => usuario.Email.ToLower() == emailNormalizado))
        {
            throw new ArgumentException("Ja existe um usuario com este e-mail.");
        }

        if (await context.Usuarios.AnyAsync(usuario => usuario.Cpf == cpfNormalizado))
        {
            throw new ArgumentException("Ja existe um usuario com este CPF.");
        }

        return (emailNormalizado, cpfNormalizado);
    }
}
