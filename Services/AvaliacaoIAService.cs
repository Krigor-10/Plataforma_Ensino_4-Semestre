using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class AvaliacaoIAService : IAvaliacaoIAService
{
    public const string NomeHttpClient = "Anthropic";
    private const string VersaoApiAnthropic = "2023-06-01";
    private const int MaxTokensResposta = 8000;
    // Limite grosseiro de caracteres enviados por chamada - protege custo/tempo
    // contra um material muito grande (risco #3 da proposta aprovada).
    private const int TamanhoMaximoTextoFonte = 60_000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IValidadorQuestaoIaService _validador;
    private readonly ILogger<AvaliacaoIAService> _logger;

    public AvaliacaoIAService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IValidadorQuestaoIaService validador,
        ILogger<AvaliacaoIAService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _validador = validador;
        _logger = logger;
    }

    public async Task<ResultadoGeracaoIA> GerarQuestoesAsync(MaterialParaIaDto material, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(material);
        ArgumentNullException.ThrowIfNull(configuracao);

        var apiKey = _configuration["IA:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // Degrada graciosamente (molde de EmailService): feature opcional, nao
            // derruba o boot da aplicacao - so fica indisponivel quando chamada.
            throw new InvalidOperationException("A geracao de avaliacoes por IA nao esta configurada neste ambiente.");
        }

        object conteudoMensagem;
        if (material.EhDocumento)
        {
            var promptDocumento = PromptGeracaoQuestoesIa.MontarParaDocumentoAnexado(configuracao);
            conteudoMensagem = new object[]
            {
                new
                {
                    type = "document",
                    source = new
                    {
                        type = "base64",
                        media_type = material.MediaType,
                        data = Convert.ToBase64String(material.DocumentoBytes!)
                    }
                },
                new { type = "text", text = promptDocumento }
            };
        }
        else
        {
            if (string.IsNullOrWhiteSpace(material.TextoFonte))
            {
                throw new ArgumentException("Nao ha texto extraido do material para gerar questoes.");
            }

            var textoTruncado = material.TextoFonte.Length > TamanhoMaximoTextoFonte
                ? material.TextoFonte[..TamanhoMaximoTextoFonte]
                : material.TextoFonte;

            conteudoMensagem = PromptGeracaoQuestoesIa.MontarComTexto(textoTruncado, configuracao);
        }

        var modelo = _configuration["IA:Modelo"] ?? "claude-sonnet-5";
        var corpoRequisicao = new
        {
            model = modelo,
            max_tokens = MaxTokensResposta,
            messages = new[]
            {
                new { role = "user", content = conteudoMensagem }
            }
        };

        var cliente = _httpClientFactory.CreateClient(NomeHttpClient);
        cliente.DefaultRequestHeaders.Remove("x-api-key");
        cliente.DefaultRequestHeaders.Add("x-api-key", apiKey);
        cliente.DefaultRequestHeaders.Remove("anthropic-version");
        cliente.DefaultRequestHeaders.Add("anthropic-version", VersaoApiAnthropic);

        using var conteudo = new StringContent(JsonSerializer.Serialize(corpoRequisicao), Encoding.UTF8);
        conteudo.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        HttpResponseMessage resposta;
        try
        {
            resposta = await cliente.PostAsync("v1/messages", conteudo, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Falha de rede ao chamar o provedor de IA.");
            throw new InvalidOperationException("O servico de geracao por IA esta indisponivel agora. Tente novamente em alguns minutos.");
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout ao chamar o provedor de IA.");
            throw new InvalidOperationException("O servico de geracao por IA demorou demais para responder. Tente novamente.");
        }

        if (!resposta.IsSuccessStatusCode)
        {
            var corpoErro = await RespostaIaUtil.LerCorpoSeguramenteAsync(resposta, cancellationToken);
            _logger.LogWarning("Provedor de IA retornou {StatusCode}: {Corpo}", resposta.StatusCode, corpoErro);
            throw new InvalidOperationException("O servico de geracao por IA esta indisponivel agora. Tente novamente em alguns minutos.");
        }

        var textoResposta = await ExtrairTextoDaRespostaAsync(resposta, cancellationToken);
        var bruto = RespostaIaUtil.Desserializar(textoResposta, _logger);

        return RespostaIaUtil.ValidarEFiltrar(bruto, _validador);
    }

    // Formato de resposta especifico da Anthropic: content e um array de blocos
    // tipados, so os do tipo "text" interessam aqui (o modelo nao usa tool-use nem
    // outros tipos de bloco nessa chamada).
    private static async Task<string> ExtrairTextoDaRespostaAsync(HttpResponseMessage resposta, CancellationToken cancellationToken)
    {
        var json = await resposta.Content.ReadAsStringAsync(cancellationToken);

        using var documento = JsonDocument.Parse(json);
        var blocos = documento.RootElement.GetProperty("content");

        var construtor = new StringBuilder();
        foreach (var bloco in blocos.EnumerateArray())
        {
            if (bloco.TryGetProperty("type", out var tipo) && tipo.GetString() == "text" &&
                bloco.TryGetProperty("text", out var texto))
            {
                construtor.Append(texto.GetString());
            }
        }

        return construtor.ToString();
    }
}
