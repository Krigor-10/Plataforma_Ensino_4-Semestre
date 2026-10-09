using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ValidadorQuestaoIaServiceTests
{
    private readonly ValidadorQuestaoIaService _service = new();

    private static QuestaoGeradaIaDto CriarQuestaoValida() => new()
    {
        TituloInterno = "Questao gerada por IA",
        Enunciado = "Qual e a capital do Brasil?",
        TipoQuestao = TipoQuestao.MultiplaEscolha,
        Pontos = 1,
        Alternativas = new List<CriarAlternativaAvaliacaoDto>
        {
            new() { Letra = "A", Texto = "Brasilia", EhCorreta = true },
            new() { Letra = "B", Texto = "Rio de Janeiro", EhCorreta = false },
            new() { Letra = "C", Texto = "Sao Paulo", EhCorreta = false }
        }
    };

    [Fact]
    public void ValidarOuLancar_QuestaoValida_NaoLanca()
    {
        var questao = CriarQuestaoValida();

        _service.ValidarOuLancar(questao);
    }

    [Fact]
    public void ValidarOuLancar_SemEnunciado_LancaArgumentException()
    {
        var questao = CriarQuestaoValida();
        questao.Enunciado = "";

        Assert.Throws<ArgumentException>(() => _service.ValidarOuLancar(questao));
    }

    [Fact]
    public void ValidarOuLancar_LetrasDuplicadas_LancaArgumentException()
    {
        var questao = CriarQuestaoValida();
        questao.Alternativas[1].Letra = "A";

        var excecao = Assert.Throws<ArgumentException>(() => _service.ValidarOuLancar(questao));
        Assert.Contains("letras repetidas", excecao.Message);
    }

    [Fact]
    public void ValidarOuLancar_EnunciadoMuitoLongo_LancaArgumentException()
    {
        var questao = CriarQuestaoValida();
        questao.Enunciado = new string('a', 4001);

        var excecao = Assert.Throws<ArgumentException>(() => _service.ValidarOuLancar(questao));
        Assert.Contains("tamanho maximo", excecao.Message);
    }

    [Fact]
    public void ValidarOuLancar_MaisAlternativasQuePermitido_LancaArgumentException()
    {
        var questao = CriarQuestaoValida();
        for (var i = 0; i < 10; i++)
        {
            questao.Alternativas.Add(new CriarAlternativaAvaliacaoDto { Letra = ((char)('D' + i)).ToString(), Texto = $"Opcao {i}" });
        }

        var excecao = Assert.Throws<ArgumentException>(() => _service.ValidarOuLancar(questao));
        Assert.Contains("mais alternativas", excecao.Message);
    }

    [Fact]
    public void ValidarOuLancar_AfirmativasCombinadasComNumerosDuplicados_LancaArgumentException()
    {
        var questao = CriarQuestaoValida();
        questao.TipoQuestao = TipoQuestao.AfirmativasCombinadas;
        questao.Afirmativas = new List<CriarAfirmativaQuestaoDto>
        {
            new() { Numero = "I", Texto = "Primeira afirmativa", EhCorreta = true },
            new() { Numero = "I", Texto = "Segunda afirmativa", EhCorreta = false }
        };

        var excecao = Assert.Throws<ArgumentException>(() => _service.ValidarOuLancar(questao));
        Assert.Contains("numeros repetidos", excecao.Message);
    }

    [Fact]
    public void ValidarOuLancar_MetadadosEfemerosNaoInterferemNaValidacao()
    {
        var questao = CriarQuestaoValida();
        questao.PaginaReferencia = 3;
        questao.TrechoReferencia = "trecho qualquer do material";
        questao.Aviso = "confianca baixa";

        _service.ValidarOuLancar(questao);
    }
}
