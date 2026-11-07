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

        if (EhSequenciaRepetida(cpfNormalizado))
        {
            throw new ArgumentException("CPF invalido: todos os digitos sao iguais.");
        }

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

    /// <summary>
    /// CPF com os 11 digitos iguais (ex.: "111.111.111-11") - matematicamente
    /// "valido" pelo calculo do digito verificador abaixo, mas nunca e um CPF
    /// real emitido. Rejeitado sempre, independente do digito verificador
    /// estar ativado ou nao.
    /// </summary>
    private static bool EhSequenciaRepetida(string cpf)
    {
        return cpf.Length == 11 && cpf.Distinct().Count() == 1;
    }

    /// <summary>
    /// Calcula os dois digitos verificadores do CPF (algoritmo oficial Mod 11)
    /// e confere se batem com os dois ultimos digitos informados. Implementado
    /// e coberto por teste, mas intencionalmente NAO chamado em
    /// NormalizarEGarantirDisponivelAsync ainda - pedido explicito do usuario
    /// (07/11/2026) pra nao ativar essa checagem agora. Pra ativar: chamar
    /// este metodo logo apos EhSequenciaRepetida acima e lancar
    /// ArgumentException quando retornar false.
    /// </summary>
    public static bool PossuiDigitosVerificadoresValidos(string cpf)
    {
        if (cpf is null || cpf.Length != 11 || !cpf.All(char.IsDigit) || EhSequenciaRepetida(cpf))
        {
            return false;
        }

        var digitos = cpf.Select(caractere => caractere - '0').ToArray();

        if (CalcularDigitoVerificador(digitos, 9) != digitos[9])
        {
            return false;
        }

        return CalcularDigitoVerificador(digitos, 10) == digitos[10];
    }

    private static int CalcularDigitoVerificador(int[] digitos, int quantidadeDigitosBase)
    {
        var soma = 0;
        var peso = quantidadeDigitosBase + 1;

        for (var indice = 0; indice < quantidadeDigitosBase; indice++)
        {
            soma += digitos[indice] * peso;
            peso--;
        }

        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
