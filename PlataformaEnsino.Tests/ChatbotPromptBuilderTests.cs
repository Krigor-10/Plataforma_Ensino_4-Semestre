using System.Text.Json;
using PlataformaEnsino.API.Common;

namespace PlataformaEnsino.Tests;

public class ChatbotPromptBuilderTests
{
    [Fact]
    public void MontarBlocosDeSistema_DuasChamadas_SaoByteAByteIguais()
    {
        // Pra bater o cache (prompt caching), "system" nao pode mudar nada
        // entre pedidos - nem um espaco, nem a ordem dos campos.
        var primeiraChamada = JsonSerializer.Serialize(ChatbotPromptBuilder.MontarBlocosDeSistema());
        var segundaChamada = JsonSerializer.Serialize(ChatbotPromptBuilder.MontarBlocosDeSistema());

        Assert.Equal(primeiraChamada, segundaChamada);
    }

    [Fact]
    public void MontarBlocosDeSistema_CacheControlSoNoUltimoBloco()
    {
        var blocos = ChatbotPromptBuilder.MontarBlocosDeSistema();
        var json = JsonSerializer.SerializeToDocument(blocos).RootElement;

        Assert.Equal(3, json.GetArrayLength());

        for (var indice = 0; indice < json.GetArrayLength() - 1; indice++)
        {
            Assert.False(json[indice].TryGetProperty("cache_control", out _), $"Bloco {indice} nao deveria ter cache_control.");
        }

        var ultimoBloco = json[json.GetArrayLength() - 1];
        Assert.True(ultimoBloco.TryGetProperty("cache_control", out var cacheControl));
        Assert.Equal("ephemeral", cacheControl.GetProperty("type").GetString());
    }

    [Fact]
    public void MontarFerramentas_DuasChamadas_MesmaOrdemEMesmoConteudo()
    {
        var primeira = JsonSerializer.Serialize(ChatbotPromptBuilder.MontarFerramentas());
        var segunda = JsonSerializer.Serialize(ChatbotPromptBuilder.MontarFerramentas());

        Assert.Equal(primeira, segunda);
    }

    [Fact]
    public void MontarFerramentas_TodasTemStrictTrueEAdditionalPropertiesFalse()
    {
        var json = JsonSerializer.SerializeToDocument(ChatbotPromptBuilder.MontarFerramentas()).RootElement;

        foreach (var ferramenta in json.EnumerateArray())
        {
            Assert.True(ferramenta.GetProperty("strict").GetBoolean());
            Assert.False(ferramenta.GetProperty("input_schema").GetProperty("additionalProperties").GetBoolean());
        }
    }

    [Fact]
    public void MontarTextoDoUsuario_ComContexto_PrefixoVemAntesDaPergunta()
    {
        var texto = ChatbotPromptBuilder.MontarTextoDoUsuario("certificados", cursoId: 7, cursoTitulo: "Curso Teste", pergunta: "Cadê meu certificado?");

        Assert.StartsWith("[Tela: certificados | Curso: Curso Teste]", texto);
        Assert.EndsWith("Cadê meu certificado?", texto);
    }

    [Fact]
    public void MontarTextoDoUsuario_SemTela_DevolveSoAPergunta()
    {
        var texto = ChatbotPromptBuilder.MontarTextoDoUsuario(null, null, null, "Pergunta sem contexto.");

        Assert.Equal("Pergunta sem contexto.", texto);
    }

    [Fact]
    public void MontarCorpoRequisicao_NaoContemFallbacksNemParametrosDeAmostragem()
    {
        var corpo = ChatbotPromptBuilder.MontarCorpoRequisicao(
            "claude-haiku-5-5", "medium", 1024, stream: true,
            new List<object> { new { role = "user", content = "Oi" } });

        var json = JsonSerializer.Serialize(corpo);

        // Decisao do FASE-1: Haiku 5.5 nao tem troca automatica de modelo em
        // recusa, entao "fallbacks" nunca deve aparecer aqui (so no AvaliacaoIAService,
        // que usa Opus). temperature/top_p/top_k tambem nunca sao enviados.
        Assert.DoesNotContain("\"fallbacks\"", json);
        Assert.DoesNotContain("\"temperature\"", json);
        Assert.DoesNotContain("\"top_p\"", json);
        Assert.DoesNotContain("\"top_k\"", json);
    }

    [Fact]
    public void MontarCorpoRequisicao_SystemETools_IguaisEntrePedidosComMensagensDiferentes()
    {
        var corpoA = ChatbotPromptBuilder.MontarCorpoRequisicao(
            "claude-haiku-5-5", "medium", 1024, stream: true,
            new List<object> { new { role = "user", content = "Primeira pergunta" } });

        var corpoB = ChatbotPromptBuilder.MontarCorpoRequisicao(
            "claude-haiku-5-5", "medium", 1024, stream: true,
            new List<object> { new { role = "user", content = "Pergunta completamente diferente, bem mais longa" } });

        var jsonA = JsonSerializer.SerializeToDocument(corpoA).RootElement;
        var jsonB = JsonSerializer.SerializeToDocument(corpoB).RootElement;

        Assert.Equal(jsonA.GetProperty("system").GetRawText(), jsonB.GetProperty("system").GetRawText());
        Assert.Equal(jsonA.GetProperty("tools").GetRawText(), jsonB.GetProperty("tools").GetRawText());
        Assert.NotEqual(jsonA.GetProperty("messages").GetRawText(), jsonB.GetProperty("messages").GetRawText());
    }

    [Fact]
    public void MontarCorpoRequisicao_ToolsVemAntesDoSystemNoJson()
    {
        // Ordem de renderizacao que a propria Anthropic recomenda pro cache:
        // tools -> system -> messages (prompt-caching.md da skill da Anthropic).
        var corpo = ChatbotPromptBuilder.MontarCorpoRequisicao(
            "claude-haiku-5-5", "medium", 1024, stream: true,
            new List<object> { new { role = "user", content = "Oi" } });

        var json = JsonSerializer.Serialize(corpo);

        Assert.True(json.IndexOf("\"tools\"", StringComparison.Ordinal) < json.IndexOf("\"system\"", StringComparison.Ordinal));
        Assert.True(json.IndexOf("\"system\"", StringComparison.Ordinal) < json.IndexOf("\"messages\"", StringComparison.Ordinal));
    }
}
