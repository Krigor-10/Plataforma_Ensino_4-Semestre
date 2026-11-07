using PlataformaEnsino.API.Common;
using Xunit;

namespace PlataformaEnsino.Tests;

public class UsuarioValidacaoTests
{
    [Theory]
    [InlineData("000.000.000-00")]
    [InlineData("111.111.111-11")]
    [InlineData("99999999999")]
    public async Task NormalizarEGarantirDisponivelAsync_CpfComDigitosIguais_LancaArgumentException(string cpfComDigitosIguais)
    {
        var context = TestContextFactory.Criar();

        var excecao = await Assert.ThrowsAsync<ArgumentException>(() =>
            UsuarioValidacao.NormalizarEGarantirDisponivelAsync(context, "pessoa@teste.local", cpfComDigitosIguais));

        Assert.Contains("digitos sao iguais", excecao.Message);
    }

    [Fact]
    public async Task NormalizarEGarantirDisponivelAsync_CpfComDigitosDiferentes_NaoLancaPelaSequenciaRepetida()
    {
        var context = TestContextFactory.Criar();

        var (_, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(
            context, "pessoa@teste.local", "123.456.789-09");

        Assert.Equal("12345678909", cpfNormalizado);
    }

    [Theory]
    [InlineData("52998224725", true)]
    [InlineData("11144477735", true)]
    [InlineData("12345678909", true)]
    [InlineData("52998224726", false)]
    [InlineData("11111111111", false)]
    [InlineData("1234567890", false)]
    [InlineData("123456789012", false)]
    [InlineData("1234567890a", false)]
    public void PossuiDigitosVerificadoresValidos_CalculaAlgoritmoOficial(string cpf, bool esperado)
    {
        Assert.Equal(esperado, UsuarioValidacao.PossuiDigitosVerificadoresValidos(cpf));
    }
}
