using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// Provedor alternativo de geracao por IA, usando a Generative Language API do
/// Google (Gemini) em vez da Anthropic - mesmo prompt (PromptGeracaoQuestoesIa),
/// mesma validacao/filtragem (RespostaIaUtil), so muda a chamada HTTP e como o
/// texto vem envelopado na resposta. Qual provedor fica ativo e decidido em
/// Program.cs via configuracao "IA:Provedor", nao aqui.
/// </summary>
public class GeminiAvaliacaoIAService : IAvaliacaoIAService
{
    public const string NomeHttpClient = "Gemini";
    private const int TamanhoMaximoTextoFonte = 60_000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IValidadorQuestaoIaService _validador;
    private readonly ILogger<GeminiAvaliacaoIAService> _logger;

    public GeminiAvaliacaoIAService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IValidadorQuestaoIaService validador,
        ILogger<GeminiAvaliacaoIAService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _validador = validador;
        _logger = logger;
    }

    public async Task<ResultadoGeracaoIA> GerarQuestoesAsync(string textoFonte, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(configuracao);

        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("A geracao de avaliacoes por IA nao esta configurada neste ambiente.");
        }

        if (string.IsNullOrWhiteSpace(textoFonte))
        {
            throw new ArgumentException("Nao ha texto extraido do material para gerar questoes.");
        }

        var textoTruncado = textoFonte.Length > TamanhoMaximoTextoFonte
            ? textoFonte[..TamanhoMaximoTextoFonte]
            : textoFonte;

        var modelo = _configuration["Gemini:Modelo"] ?? "gemini-3.8-flash";
        var prompt = PromptGeracaoQuestoesIa.Montar(textoTruncado, configuracao);
        var corpoRequisicao = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[] { new { text = prompt } }
                }
            }
        };

        var cliente = _httpClientFactory.CreateClient(NomeHttpClient);
        cliente.DefaultRequestHeaders.Remove("x-goog-api-key");
        cliente.DefaultRequestHeaders.Add("x-goog-api-key", apiKey);

        using var conteudo = new StringContent(JsonSerializer.Serialize(corpoRequisicao), Encoding.UTF8);
        conteudo.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        HttpResponseMessage resposta;
        try
        {
            resposta = await cliente.PostAsync($"v1beta/models/{modelo}:generateContent", conteudo, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Falha de rede ao chamar o provedor de IA (Gemini).");
            throw new InvalidOperationException("O servico de geracao por IA esta indisponivel agora. Tente novamente em alguns minutos.");
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout ao chamar o provedor de IA (Gemini).");
            throw new InvalidOperationException("O servico de geracao por IA demorou demais para responder. Tente novamente.");
        }

        if (!resposta.IsSuccessStatusCode)
        {
            var corpoErro = await RespostaIaUtil.LerCorpoSeguramenteAsync(resposta, cancellationToken);
            _logger.LogWarning("Provedor de IA (Gemini) retornou {StatusCode}: {Corpo}", resposta.StatusCode, corpoErro);
            throw new InvalidOperationException("O servico de geracao por IA esta indisponivel agora. Tente novamente em alguns minutos.");
        }

        var textoResposta = await ExtrairTextoDaRespostaAsync(resposta, cancellationToken);
        var bruto = RespostaIaUtil.Desserializar(textoResposta, _logger);

        return RespostaIaUtil.ValidarEFiltrar(bruto, _validador);
    }

    // Formato de resposta especifico do Gemini: texto gerado fica em
    // candidates[0].content.parts[*].text (varios blocos de texto possiveis,
    // concatenados, mesmo padrao defensivo usado no parsing da Anthropic).
    private static async Task<string> ExtrairTextoDaRespostaAsync(HttpResponseMessage resposta, CancellationToken cancellationToken)
    {
        var json = await resposta.Content.ReadAsStringAsync(cancellationToken);

        using var documento = JsonDocument.Parse(json);

        if (!documento.RootElement.TryGetProperty("candidates", out var candidatos) || candidatos.GetArrayLength() == 0)
        {
            return string.Empty;
        }

        var primeiroCandidato = candidatos[0];
        if (!primeiroCandidato.TryGetProperty("content", out var conteudoResposta) ||
            !conteudoResposta.TryGetProperty("parts", out var partes))
        {
            return string.Empty;
        }

        var construtor = new StringBuilder();
        foreach (var parte in partes.EnumerateArray())
        {
            if (parte.TryGetProperty("text", out var texto))
            {
                construtor.Append(texto.GetString());
            }
        }

        return construtor.ToString();
    }
}
