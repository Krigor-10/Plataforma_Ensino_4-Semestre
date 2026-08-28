using System.Security.Cryptography;

namespace PlataformaEnsino.API.Common;

public static class CodigoRegistroGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 6;

    public static string GerarAluno() => Gerar("ALU");

    public static string GerarCurso() => Gerar("CUR");

    public static string GerarCoordenador() => Gerar("COORD");

    public static string GerarModulo() => Gerar("MOD");

    public static string GerarMatricula() => Gerar("MAT");

    public static string GerarProfessor() => Gerar("PROF");

    public static string GerarTurma() => Gerar("TUR");

    private static string Gerar(string prefixo)
    {
        Span<char> token = stackalloc char[CodeLength];

        for (var index = 0; index < token.Length; index++)
        {
            token[index] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return $"{prefixo}-{new string(token)}";
    }

    /// <summary>
    /// Gera um código com <paramref name="gerarCodigo"/> e tenta até 10 vezes até encontrar
    /// um que não esteja em uso segundo <paramref name="codigoEmUsoAsync"/>.
    /// </summary>
    public static async Task<string> GerarCodigoUnicoAsync(
        Func<string> gerarCodigo,
        Func<string, Task<bool>> codigoEmUsoAsync,
        string descricaoEntidade)
    {
        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = gerarCodigo();

            if (!await codigoEmUsoAsync(codigo))
            {
                return codigo;
            }
        }

        throw new InvalidOperationException($"Nao foi possivel gerar um codigo de registro unico para {descricaoEntidade}.");
    }
}
