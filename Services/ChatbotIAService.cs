using System.Text;
using System.Text.Json;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

/* Chama a Messages API da Anthropic via HTTP direto (decisao 3 da proposta
   aprovada - mesmo padrao de AvaliacaoIAService), em streaming (SSE),
   executando o loop de ferramentas por dentro (ate 4 rodadas) - de fora,
   ObterRespostaAsync parece uma unica chamada. Sem fallbacks (Haiku 5.5 nao
   tem troca automatica de modelo em recusa) e sem temperature/top_p/top_k. */
public class ChatbotIAService : IChatbotIAService
{
    public const string NomeHttpClient = "AnthropicChat";
    private const string VersaoApiAnthropic = "2023-06-01";
    private const int MaximoRodadasDeFerramenta = 4;
    private const int MaximoMensagensDeHistorico = 10;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IChatbotFerramentasService _ferramentas;
    private readonly ILogger<ChatbotIAService> _logger;

    public ChatbotIAService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IChatbotFerramentasService ferramentas,
        ILogger<ChatbotIAService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _ferramentas = ferramentas;
        _logger = logger;
    }

    public async Task<ResultadoMensagemChatbotIA> ObterRespostaAsync(
        int alunoId,
        IReadOnlyList<(string Papel, string Texto)> historico,
        string textoNovaMensagem,
        ContextoTelaChatbotDto? contexto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken)
    {
        var apiKey = _configuration["IA:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // Degrada graciosamente (molde de EmailService/AvaliacaoIAService):
            // feature opcional, nao derruba o boot da aplicacao.
            throw new InvalidOperationException("O Assistente CodeRyse nao esta configurado neste ambiente.");
        }

        var textoDoUsuario = ChatbotPromptBuilder.MontarTextoDoUsuario(contexto?.Tela, contexto?.CursoId, contexto?.CursoTitulo, textoNovaMensagem);

        var mensagens = new List<object>();
        foreach (var (papel, texto) in historico.TakeLast(MaximoMensagensDeHistorico))
        {
            mensagens.Add(new { role = papel, content = texto });
        }
        mensagens.Add(new { role = "user", content = textoDoUsuario });

        var modelo = _configuration["IA:Chat:Modelo"] ?? "claude-haiku-5-5";
        // Padrao "low" pedido no FASE-1 pra respostas rapidas (o Haiku 5.5 por
        // si so default pra "medium" quando omitido - aqui o padrao explicito
        // da config vence, ajustavel depois pelo resultado dos 27 casos de teste).
        var esforco = _configuration["IA:Chat:Esforco"] ?? "low";
        var maxTokens = int.TryParse(_configuration["IA:Chat:MaxTokens"], out var maxTokensConfig) ? maxTokensConfig : 1024;

        var tokensEntradaTotal = 0;
        var tokensSaidaTotal = 0;
        var tokensCacheLeituraTotal = 0;
        var tokensCacheEscritaTotal = 0;
        var textoCompleto = new StringBuilder();
        var ferramentasUsadas = new List<string>();

        for (var rodada = 0; rodada <= MaximoRodadasDeFerramenta; rodada++)
        {
            // Ferramentas (fixas, ordem fixa, strict:true) vem antes do system
            // no pedido; system e tools iguais entre rodadas e entre pedidos
            // diferentes - so "messages" cresce - pra bater o cache.
            var corpoRequisicao = ChatbotPromptBuilder.MontarCorpoRequisicao(modelo, esforco, maxTokens, stream: true, mensagens);

            var resultadoRodada = await ExecutarChamadaEmStreamAsync(apiKey, corpoRequisicao, aoReceberTrechoDeTexto, cancellationToken);

            tokensEntradaTotal += resultadoRodada.TokensEntrada;
            tokensSaidaTotal += resultadoRodada.TokensSaida;
            tokensCacheLeituraTotal += resultadoRodada.TokensCacheLeitura;
            tokensCacheEscritaTotal += resultadoRodada.TokensCacheEscrita;

            if (resultadoRodada.StopReason == "refusal")
            {
                return new ResultadoMensagemChatbotIA(
                    "Não consigo ajudar com isso por aqui. Se quiser, fale com o suporte.",
                    new List<AcaoChatbotDto>(),
                    SemResposta: false,
                    Recusado: true,
                    ferramentasUsadas,
                    tokensEntradaTotal, tokensSaidaTotal, tokensCacheLeituraTotal, tokensCacheEscritaTotal);
            }

            textoCompleto.Append(resultadoRodada.TextoDaRodada);

            var temChamadaDeFerramentaPendente = resultadoRodada.StopReason == "tool_use" && resultadoRodada.ChamadasDeFerramenta.Count > 0;
            if (!temChamadaDeFerramentaPendente || rodada == MaximoRodadasDeFerramenta)
            {
                break;
            }

            // Eco do turno do assistente (texto + tool_use) + os tool_results de
            // TODAS as chamadas desta rodada numa unica mensagem de usuario -
            // tool use em paralelo exige isso (nao dividir entre mensagens).
            mensagens.Add(new { role = "assistant", content = resultadoRodada.ConteudoBruto });

            var toolResults = new List<object>();
            foreach (var chamada in resultadoRodada.ChamadasDeFerramenta)
            {
                ferramentasUsadas.Add(chamada.Nome);
                var (conteudoResultado, ehErro) = await ExecutarFerramentaAsync(alunoId, chamada.Nome, chamada.Input);
                toolResults.Add(new { type = "tool_result", tool_use_id = chamada.Id, content = conteudoResultado, is_error = ehErro });
            }
            mensagens.Add(new { role = "user", content = toolResults });
        }

        var (textoLimpo, acoes, semResposta) = ChatbotAcoesParser.Processar(textoCompleto.ToString());

        return new ResultadoMensagemChatbotIA(
            textoLimpo, acoes, semResposta, Recusado: false,
            ferramentasUsadas.Distinct().ToList(),
            tokensEntradaTotal, tokensSaidaTotal, tokensCacheLeituraTotal, tokensCacheEscritaTotal);
    }

    public async Task<string> ResumirConversaAsync(IReadOnlyList<(string Papel, string Texto)> mensagens, CancellationToken cancellationToken)
    {
        var apiKey = _configuration["IA:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("O Assistente CodeRyse nao esta configurado neste ambiente.");
        }

        var transcricao = string.Join(
            "\n",
            mensagens.Select(mensagem => $"{(mensagem.Papel == "user" ? "Aluno" : "Assistente")}: {mensagem.Texto}"));

        var modelo = _configuration["IA:Chat:Modelo"] ?? "claude-haiku-5-5";
        var corpoRequisicao = new
        {
            model = modelo,
            max_tokens = 200,
            stream = true,
            output_config = new { effort = "low" },
            system = "Resuma, em portugues e em no maximo 2 frases, o problema que o aluno trouxe nesta conversa de suporte. Responda so com o resumo, sem introducao.",
            messages = new object[] { new { role = "user", content = transcricao } }
        };

        var resultado = await ExecutarChamadaEmStreamAsync(apiKey, corpoRequisicao, (_, _) => Task.CompletedTask, cancellationToken);
        return resultado.TextoDaRodada.Trim();
    }

    private async Task<(string Conteudo, bool EhErro)> ExecutarFerramentaAsync(int alunoId, string nome, JsonElement input)
    {
        try
        {
            object resultado = nome switch
            {
                "meus_cursos" => await _ferramentas.ObterMeusCursosAsync(alunoId),
                "progresso_do_curso" => await _ferramentas.ObterProgressoDoCursoAsync(alunoId, input.GetProperty("cursoId").GetInt32()),
                "situacao_avaliacoes" => await _ferramentas.ObterSituacaoAvaliacoesAsync(alunoId, input.GetProperty("cursoId").GetInt32()),
                "situacao_certificado" => await _ferramentas.ObterSituacaoCertificadoAsync(alunoId, input.GetProperty("cursoId").GetInt32()),
                "meus_pagamentos" => await _ferramentas.ObterMeusPagamentosAsync(alunoId),
                "buscar_no_catalogo" => await _ferramentas.BuscarNoCatalogoAsync(input.TryGetProperty("termo", out var termoEl) ? termoEl.GetString() ?? string.Empty : string.Empty),
                _ => throw new ArgumentException($"Ferramenta desconhecida: {nome}")
            };

            return (JsonSerializer.Serialize(resultado), false);
        }
        catch (KeyNotFoundException)
        {
            return ("curso nao encontrado nas matriculas do aluno", true);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Falha ao executar a ferramenta {Ferramenta} do Assistente CodeRyse.", nome);
            return ("Nao foi possivel consultar esta informacao agora.", true);
        }
    }

    private sealed record ChamadaDeFerramenta(string Id, string Nome, JsonElement Input);

    private sealed record ResultadoRodadaStream(
        string StopReason,
        string TextoDaRodada,
        List<ChamadaDeFerramenta> ChamadasDeFerramenta,
        List<object> ConteudoBruto,
        int TokensEntrada,
        int TokensSaida,
        int TokensCacheLeitura,
        int TokensCacheEscrita);

    // Formato de eventos SSE da Messages API: cada evento vem como uma linha
    // "event: <tipo>" seguida de uma linha "data: {...}" e uma linha vazia -
    // so a linha "data: " interessa, o "type" dentro do JSON ja identifica o
    // evento. input_json_delta chega em pedacos (partial_json) que precisam
    // ser concatenados e so dao um JSON valido quando o bloco termina
    // (content_block_stop).
    private async Task<ResultadoRodadaStream> ExecutarChamadaEmStreamAsync(
        string apiKey,
        object corpoRequisicao,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken)
    {
        var cliente = _httpClientFactory.CreateClient(NomeHttpClient);
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "v1/messages")
        {
            Content = new StringContent(JsonSerializer.Serialize(corpoRequisicao), Encoding.UTF8, "application/json")
        };
        requisicao.Headers.Add("x-api-key", apiKey);
        requisicao.Headers.Add("anthropic-version", VersaoApiAnthropic);

        HttpResponseMessage resposta;
        try
        {
            resposta = await cliente.SendAsync(requisicao, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Falha de rede ao chamar o Assistente CodeRyse.");
            throw new InvalidOperationException("O Assistente CodeRyse esta indisponivel agora. Tente novamente em alguns minutos.");
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout ao chamar o Assistente CodeRyse.");
            throw new InvalidOperationException("O Assistente CodeRyse demorou demais para responder. Tente novamente.");
        }

        if (!resposta.IsSuccessStatusCode)
        {
            var corpoErro = await RespostaIaUtil.LerCorpoSeguramenteAsync(resposta, cancellationToken);
            _logger.LogWarning("Assistente CodeRyse retornou {StatusCode}: {Corpo}", resposta.StatusCode, corpoErro);
            throw new InvalidOperationException("O Assistente CodeRyse esta indisponivel agora. Tente novamente em alguns minutos.");
        }

        string? stopReason = null;
        var tokensEntrada = 0;
        var tokensSaida = 0;
        var tokensCacheLeitura = 0;
        var tokensCacheEscrita = 0;
        var textoDaRodada = new StringBuilder();
        var conteudoBruto = new List<object>();
        var chamadasDeFerramenta = new List<ChamadaDeFerramenta>();

        var tipoPorIndice = new Dictionary<int, string>();
        var textoPorIndice = new Dictionary<int, StringBuilder>();
        var jsonParcialPorIndice = new Dictionary<int, StringBuilder>();
        var idPorIndice = new Dictionary<int, string>();
        var nomePorIndice = new Dictionary<int, string>();

        using var stream = await resposta.Content.ReadAsStreamAsync(cancellationToken);
        using var leitor = new StreamReader(stream);

        string? linha;
        while ((linha = await leitor.ReadLineAsync(cancellationToken)) != null)
        {
            if (!linha.StartsWith("data: ", StringComparison.Ordinal))
            {
                continue;
            }

            using var documento = JsonDocument.Parse(linha["data: ".Length..]);
            var evento = documento.RootElement;
            var tipoEvento = evento.GetProperty("type").GetString();

            switch (tipoEvento)
            {
                case "message_start":
                    var usageInicial = evento.GetProperty("message").GetProperty("usage");
                    tokensEntrada = LerIntOuZero(usageInicial, "input_tokens");
                    tokensCacheLeitura = LerIntOuZero(usageInicial, "cache_read_input_tokens");
                    tokensCacheEscrita = LerIntOuZero(usageInicial, "cache_creation_input_tokens");
                    break;

                case "content_block_start":
                    {
                        var indice = evento.GetProperty("index").GetInt32();
                        var blocoInicial = evento.GetProperty("content_block");
                        var tipoBloco = blocoInicial.GetProperty("type").GetString()!;
                        tipoPorIndice[indice] = tipoBloco;

                        if (tipoBloco == "text")
                        {
                            textoPorIndice[indice] = new StringBuilder();
                        }
                        else if (tipoBloco == "tool_use")
                        {
                            idPorIndice[indice] = blocoInicial.GetProperty("id").GetString()!;
                            nomePorIndice[indice] = blocoInicial.GetProperty("name").GetString()!;
                            jsonParcialPorIndice[indice] = new StringBuilder();
                        }

                        break;
                    }

                case "content_block_delta":
                    {
                        var indice = evento.GetProperty("index").GetInt32();
                        var delta = evento.GetProperty("delta");
                        var tipoDelta = delta.GetProperty("type").GetString();

                        if (tipoDelta == "text_delta")
                        {
                            var trecho = delta.GetProperty("text").GetString() ?? string.Empty;
                            textoPorIndice[indice].Append(trecho);
                            textoDaRodada.Append(trecho);
                            await aoReceberTrechoDeTexto(trecho, cancellationToken);
                        }
                        else if (tipoDelta == "input_json_delta")
                        {
                            jsonParcialPorIndice[indice].Append(delta.GetProperty("partial_json").GetString() ?? string.Empty);
                        }

                        break;
                    }

                case "content_block_stop":
                    {
                        var indice = evento.GetProperty("index").GetInt32();
                        var tipoBloco = tipoPorIndice[indice];

                        if (tipoBloco == "text")
                        {
                            conteudoBruto.Add(new { type = "text", text = textoPorIndice[indice].ToString() });
                        }
                        else if (tipoBloco == "tool_use")
                        {
                            var jsonBruto = jsonParcialPorIndice[indice].ToString();
                            var input = string.IsNullOrWhiteSpace(jsonBruto)
                                ? JsonDocument.Parse("{}").RootElement
                                : JsonDocument.Parse(jsonBruto).RootElement;
                            var id = idPorIndice[indice];
                            var nomeFerramenta = nomePorIndice[indice];

                            conteudoBruto.Add(new { type = "tool_use", id, name = nomeFerramenta, input });
                            chamadasDeFerramenta.Add(new ChamadaDeFerramenta(id, nomeFerramenta, input));
                        }

                        break;
                    }

                case "message_delta":
                    if (evento.TryGetProperty("delta", out var deltaMensagem) &&
                        deltaMensagem.TryGetProperty("stop_reason", out var stopReasonEl) &&
                        stopReasonEl.ValueKind == JsonValueKind.String)
                    {
                        stopReason = stopReasonEl.GetString();
                    }

                    if (evento.TryGetProperty("usage", out var usageFinal))
                    {
                        tokensSaida = LerIntOuZero(usageFinal, "output_tokens");
                    }

                    break;

                case "error":
                    var mensagemErro = evento.TryGetProperty("error", out var erroEl) && erroEl.TryGetProperty("message", out var msgEl)
                        ? msgEl.GetString()
                        : "erro desconhecido";
                    _logger.LogWarning("Erro no stream do Assistente CodeRyse: {Mensagem}", mensagemErro);
                    throw new InvalidOperationException("O Assistente CodeRyse esta indisponivel agora. Tente novamente em alguns minutos.");

                // "message_stop" e "ping" nao precisam de tratamento.
            }
        }

        return new ResultadoRodadaStream(
            stopReason ?? "end_turn",
            textoDaRodada.ToString(),
            chamadasDeFerramenta,
            conteudoBruto,
            tokensEntrada, tokensSaida, tokensCacheLeitura, tokensCacheEscrita);
    }

    private static int LerIntOuZero(JsonElement elemento, string propriedade) =>
        elemento.TryGetProperty(propriedade, out var valor) && valor.ValueKind == JsonValueKind.Number ? valor.GetInt32() : 0;
}
