using System.Text.Json;
using System.Text.Json.Serialization;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// Formato cru esperado dentro do bloco JSON que qualquer provedor de IA devolve -
/// identico pros dois provedores, ja que os dois recebem o mesmo prompt
/// (PromptGeracaoQuestoesIa). So muda como cada provedor envelopa esse texto na
/// propria resposta HTTP (isso fica a cargo de cada *AvaliacaoIAService).
/// </summary>
internal class RespostaIaBruta
{
    public List<QuestaoGeradaIaDto> Questoes { get; set; } = new();
    public List<string> Avisos { get; set; } = new();
    public bool LimitacaoDetectada { get; set; }
}

/// <summary>
/// Extracao do JSON de dentro do texto livre da IA, desserializacao e validacao -
/// compartilhado entre todos os provedores (AvaliacaoIAService/Anthropic,
/// GeminiAvaliacaoIAService/Gemini) pra que a regra de "descartar so a questao
/// invalida, nunca a chamada inteira" e o calculo de GabaritoIncerto
/// (ValidadorQuestaoIaService) nunca fiquem divergentes entre provedores.
/// </summary>
internal static class RespostaIaUtil
{
    public static string ExtrairJsonDoTexto(string texto)
    {
        // Defesa extra: mesmo instruindo "so JSON", o modelo as vezes envolve a
        // resposta em texto/markdown - pega so o primeiro bloco { ... } balanceado.
        var inicio = texto.IndexOf('{');
        var fim = texto.LastIndexOf('}');

        return inicio >= 0 && fim > inicio
            ? texto[inicio..(fim + 1)]
            : texto;
    }

    public static RespostaIaBruta Desserializar(string textoResposta, ILogger logger)
    {
        var jsonLimpo = ExtrairJsonDoTexto(textoResposta);

        try
        {
            var opcoes = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            };

            return JsonSerializer.Deserialize<RespostaIaBruta>(jsonLimpo, opcoes)
                ?? throw new ArgumentException("A IA retornou uma resposta vazia.");
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Resposta da IA nao e um JSON valido: {Trecho}", jsonLimpo.Length > 500 ? jsonLimpo[..500] : jsonLimpo);
            throw new ArgumentException("A IA retornou uma resposta em formato invalido.");
        }
    }

    public static ResultadoGeracaoIA ValidarEFiltrar(RespostaIaBruta bruto, IValidadorQuestaoIaService validador)
    {
        var questoesValidas = new List<QuestaoGeradaIaDto>();
        var avisos = new List<string>(bruto.Avisos ?? new List<string>());

        foreach (var questao in bruto.Questoes ?? new List<QuestaoGeradaIaDto>())
        {
            try
            {
                validador.ValidarOuLancar(questao);
                questoesValidas.Add(questao);
            }
            catch (ArgumentException ex)
            {
                // Descarta so a questao problematica em vez de falhar a chamada
                // inteira - evita desperdicar uma chamada paga por causa de 1 item
                // malformado entre varios bons.
                avisos.Add($"Uma questao gerada foi descartada por nao passar na validacao: {ex.Message}");
            }
        }

        var limitacaoDetectada = bruto.LimitacaoDetectada || questoesValidas.Count == 0;
        if (questoesValidas.Count == 0 && avisos.Count == 0)
        {
            avisos.Add("A IA nao conseguiu gerar nenhuma questao valida a partir deste material.");
        }

        return new ResultadoGeracaoIA(questoesValidas, avisos, limitacaoDetectada);
    }

    public static async Task<string> LerCorpoSeguramenteAsync(HttpResponseMessage resposta, CancellationToken cancellationToken)
    {
        try
        {
            return await resposta.Content.ReadAsStringAsync(cancellationToken);
        }
        catch
        {
            return string.Empty;
        }
    }
}
