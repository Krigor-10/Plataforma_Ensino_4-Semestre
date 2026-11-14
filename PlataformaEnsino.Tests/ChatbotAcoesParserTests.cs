using PlataformaEnsino.API.Common;

namespace PlataformaEnsino.Tests;

public class ChatbotAcoesParserTests
{
    [Fact]
    public void Processar_AcaoComRotaPermitida_ExtraiEAcoesLimpaDoTexto()
    {
        var (textoLimpo, acoes, semResposta) = ChatbotAcoesParser.Processar(
            "Seu certificado ja esta disponivel. [[ir:certificados|Ir para Certificados]]");

        Assert.Equal("Seu certificado ja esta disponivel.", textoLimpo);
        Assert.Single(acoes);
        Assert.Equal("certificados", acoes[0].Rota);
        Assert.Equal("Ir para Certificados", acoes[0].Rotulo);
        Assert.False(semResposta);
    }

    [Fact]
    public void Processar_RotaForaDaListaPermitida_AcaoERemovidaMasTextoFicaLimpo()
    {
        var (textoLimpo, acoes, _) = ChatbotAcoesParser.Processar(
            "Veja mais detalhes. [[ir:pagina-que-nao-existe|Ver mais]]");

        Assert.Empty(acoes);
        Assert.Equal("Veja mais detalhes.", textoLimpo);
    }

    [Fact]
    public void Processar_MaisDeDuasAcoes_LimitaEmDuas()
    {
        var texto =
            "Resposta. [[ir:certificados|Certificados]] [[ir:avaliacoes|Avaliacoes]] [[ir:conteudos|Conteudos]]";

        var (_, acoes, _) = ChatbotAcoesParser.Processar(texto);

        Assert.Equal(2, acoes.Count);
        Assert.Equal("certificados", acoes[0].Rota);
        Assert.Equal("avaliacoes", acoes[1].Rota);
    }

    [Fact]
    public void Processar_MarcadorSemResposta_EhDetectadoERemovidoDoTexto()
    {
        var (textoLimpo, acoes, semResposta) = ChatbotAcoesParser.Processar(
            "Nao encontrei essa informacao na base de suporte. [[sem_resposta]] Abra um chamado se precisar.");

        Assert.True(semResposta);
        Assert.Empty(acoes);
        Assert.DoesNotContain("sem_resposta", textoLimpo);
        Assert.Contains("Abra um chamado", textoLimpo);
    }

    [Fact]
    public void Processar_SemMarcadores_TextoPermaneceIgualESemAcoes()
    {
        var (textoLimpo, acoes, semResposta) = ChatbotAcoesParser.Processar("Resposta direta, sem marcadores.");

        Assert.Equal("Resposta direta, sem marcadores.", textoLimpo);
        Assert.Empty(acoes);
        Assert.False(semResposta);
    }
}
