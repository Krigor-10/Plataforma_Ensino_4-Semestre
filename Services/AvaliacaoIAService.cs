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
    private const int MaxTokensResposta = 16000;
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

        var modelo = _configuration["IA:Modelo"] ?? "claude-opus-5";
        var esforco = _configuration["IA:Esforco"] ?? "high";
        var corpoRequisicao = new
        {
            model = modelo,
            max_tokens = MaxTokensResposta,
            output_config = new { effort = esforco },
            fallbacks = "default",
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
        cliente.DefaultRequestHeaders.Remove("anthropic-beta");
        // Habilita o fallback automatico server-side (fallbacks: "default" no corpo):
        // se o Opus 5 recusar o pedido por politica (stop_reason "refusal"), a API
        // reexecuta na mesma chamada em outro modelo, sem o professor precisar tentar de novo.
        cliente.DefaultRequestHeaders.Add("anthropic-beta", "server-side-fallback-2026-07-01");

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

        var json = await resposta.Content.ReadAsStringAsync(cancellationToken);
        using var documento = JsonDocument.Parse(json);
        var raiz = documento.RootElement;

        var stopReason = raiz.TryGetProperty("stop_reason", out var stopReasonEl) ? stopReasonEl.GetString() : null;
        _logger.LogInformation(
            "Resposta do provedor de IA: modelo={Modelo} stopReason={StopReason} usage={Usage}",
            raiz.TryGetProperty("model", out var modeloEl) ? modeloEl.GetString() : null,
            stopReason,
            raiz.TryGetProperty("usage", out var usageEl) ? usageEl.GetRawText() : null);

        // Antes de ler o texto: "refusal" e o modelo recusando o pedido por politica
        // (nao ha JSON pra interpretar), "max_tokens" e resposta cortada no meio -
        // em nenhum dos dois faz sentido tentar desserializar o que veio em "content".
        if (stopReason == "refusal")
        {
            throw new InvalidOperationException("A IA nao pode gerar questoes para este material. Tente outro texto.");
        }

        if (stopReason == "max_tokens")
        {
            throw new InvalidOperationException("Resposta da IA incompleta. Tente gerar menos questoes.");
        }

        var textoResposta = ExtrairTextoDaResposta(raiz);
        var bruto = RespostaIaUtil.Desserializar(textoResposta, _logger);

        return RespostaIaUtil.ValidarEFiltrar(bruto, _validador);
    }

    // Formato de resposta especifico da Anthropic: content e um array de blocos
    // tipados. So os do tipo "text" interessam aqui - "thinking" (raciocinio, texto
    // vazio por padrao) e "fallback" (marcador de troca de modelo) sao ignorados.
    private static string ExtrairTextoDaResposta(JsonElement raiz)
    {
        var blocos = raiz.GetProperty("content");

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
