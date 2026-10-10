using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class AvaliacaoIAServiceTests
{
    private static IConfiguration CriarConfiguracao(string? apiKey = "chave-de-teste") =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["IA:ApiKey"] = apiKey })
            .Build();

    private static GerarQuestoesIaRequestDto ConfiguracaoPadrao() => new()
    {
        QuantidadeQuestoes = 3,
        Dificuldade = 2,
        TiposPermitidos = new List<TipoQuestao> { TipoQuestao.MultiplaEscolha }
    };

    [Fact]
    public async Task GerarQuestoesAsync_SemApiKeyConfigurada_LancaInvalidOperationException()
    {
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(new FakeHttpMessageHandler(_ => throw new Exception("Nao deveria chamar a rede sem api key."))),
            CriarConfiguracao(apiKey: null),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GerarQuestoesAsync("texto de um material qualquer", ConfiguracaoPadrao(), CancellationToken.None));
    }

    [Fact]
    public async Task GerarQuestoesAsync_RespostaValida_RetornaQuestoesMapeadas()
    {
        const string jsonModelo = """
            {
              "questoes": [
                {
                  "tituloInterno": "Questao sobre fotossintese",
                  "contexto": "",
                  "enunciado": "O que a fotossintese produz?",
                  "tipoQuestao": "MultiplaEscolha",
                  "dificuldade": 2,
                  "explicacaoPosResposta": "A fotossintese converte luz em energia quimica.",
                  "pontos": 1,
                  "alternativas": [
                    { "letra": "A", "texto": "Glicose e oxigenio", "ehCorreta": true, "justificativa": "Correto." },
                    { "letra": "B", "texto": "Apenas dioxido de carbono", "ehCorreta": false, "justificativa": "Incorreto." }
                  ],
                  "afirmativas": [],
                  "paginaReferencia": 2,
                  "trechoReferencia": "paragrafo sobre fotossintese"
                }
              ],
              "avisos": [],
              "limitacaoDetectada": false
            }
            """;
        var handler = new FakeHttpMessageHandler(_ => CriarRespostaAnthropic(jsonModelo));
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(handler),
            CriarConfiguracao(),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        var resultado = await service.GerarQuestoesAsync("Texto sobre fotossintese...", ConfiguracaoPadrao(), CancellationToken.None);

        Assert.Single(resultado.Questoes);
        Assert.False(resultado.LimitacaoDetectada);
        var questao = resultado.Questoes[0];
        Assert.Equal("Questao sobre fotossintese", questao.TituloInterno);
        Assert.Equal(2, questao.Alternativas.Count);
        Assert.Equal(2, questao.PaginaReferencia);
    }

    [Fact]
    public async Task GerarQuestoesAsync_RespostaComJsonInvalido_LancaArgumentException()
    {
        var handler = new FakeHttpMessageHandler(_ => CriarRespostaAnthropic("isso nao e um json valido"));
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(handler),
            CriarConfiguracao(),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GerarQuestoesAsync("texto qualquer", ConfiguracaoPadrao(), CancellationToken.None));
    }

    [Fact]
    public async Task GerarQuestoesAsync_UmaQuestaoInvalidaEntreDuasValidas_DescartaSoAInvalida()
    {
        const string jsonModelo = """
            {
              "questoes": [
                {
                  "tituloInterno": "Questao valida",
                  "enunciado": "Enunciado valido",
                  "tipoQuestao": "MultiplaEscolha",
                  "dificuldade": 2,
                  "pontos": 1,
                  "alternativas": [
                    { "letra": "A", "texto": "Certa", "ehCorreta": true },
                    { "letra": "B", "texto": "Errada", "ehCorreta": false }
                  ],
                  "afirmativas": []
                },
                {
                  "tituloInterno": "Questao invalida",
                  "enunciado": "",
                  "tipoQuestao": "MultiplaEscolha",
                  "dificuldade": 2,
                  "pontos": 1,
                  "alternativas": [
                    { "letra": "A", "texto": "Certa", "ehCorreta": true },
                    { "letra": "B", "texto": "Errada", "ehCorreta": false }
                  ],
                  "afirmativas": []
                }
              ],
              "avisos": [],
              "limitacaoDetectada": false
            }
            """;
        var handler = new FakeHttpMessageHandler(_ => CriarRespostaAnthropic(jsonModelo));
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(handler),
            CriarConfiguracao(),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        var resultado = await service.GerarQuestoesAsync("texto qualquer", ConfiguracaoPadrao(), CancellationToken.None);

        Assert.Single(resultado.Questoes);
        Assert.Equal("Questao valida", resultado.Questoes[0].TituloInterno);
        Assert.Contains(resultado.Avisos, aviso => aviso.Contains("descartada"));
    }

    [Fact]
    public async Task GerarQuestoesAsync_QuestaoSemGabaritoIdentificavel_NaoDescarta_MarcaComoIncerta()
    {
        const string jsonModelo = """
            {
              "questoes": [
                {
                  "tituloInterno": "Questao sem gabarito no material",
                  "enunciado": "Enunciado presente, mas o material nao indica a resposta certa",
                  "tipoQuestao": "MultiplaEscolha",
                  "dificuldade": 2,
                  "pontos": 1,
                  "gabaritoIncerto": true,
                  "alternativas": [
                    { "letra": "A", "texto": "Opcao 1", "ehCorreta": false },
                    { "letra": "B", "texto": "Opcao 2", "ehCorreta": false }
                  ],
                  "afirmativas": []
                }
              ],
              "avisos": [],
              "limitacaoDetectada": false
            }
            """;
        var handler = new FakeHttpMessageHandler(_ => CriarRespostaAnthropic(jsonModelo));
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(handler),
            CriarConfiguracao(),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        var resultado = await service.GerarQuestoesAsync("texto qualquer", ConfiguracaoPadrao(), CancellationToken.None);

        Assert.Single(resultado.Questoes);
        Assert.True(resultado.Questoes[0].GabaritoIncerto);
    }

    [Fact]
    public async Task GerarQuestoesAsync_ProvedorRetornaErro_LancaInvalidOperationException()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("erro interno do provedor")
        });
        var service = new AvaliacaoIAService(
            new FakeHttpClientFactory(handler),
            CriarConfiguracao(),
            new ValidadorQuestaoIaService(),
            NullLogger<AvaliacaoIAService>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GerarQuestoesAsync("texto qualquer", ConfiguracaoPadrao(), CancellationToken.None));
    }

    private static HttpResponseMessage CriarRespostaAnthropic(string textoDoModelo)
    {
        var jsonEscapado = System.Text.Json.JsonSerializer.Serialize(textoDoModelo);
        var corpo = $"{{\"content\":[{{\"type\":\"text\",\"text\":{jsonEscapado}}}]}}";
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(corpo, System.Text.Encoding.UTF8, "application/json")
        };
    }

    private class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_responder(request));
    }

    private class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public FakeHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name) => new(_handler) { BaseAddress = new Uri("https://api.anthropic.com/") };
    }
}
