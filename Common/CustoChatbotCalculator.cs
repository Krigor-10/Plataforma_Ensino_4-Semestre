using System.Globalization;
using Microsoft.Extensions.Configuration;

namespace PlataformaEnsino.API.Common;

/* Calcula o custo em USD de uma chamada ao Assistente CodeRyse (fluxo-chatbot
   Fase 1). O Haiku 5.5 tem preco em DUAS faixas pelo tamanho total do prompt
   da chamada (diferente dos modelos Opus/Sonnet 4.6+, que tem preco fixo no
   contexto de 1M) - abaixo de 100 mil tokens o preco e bem menor. A faixa e
   decidida pelo tamanho REAL desta chamada (entrada + cache, sem contar
   saida), nao por um acumulado. So usa o preco de cache de escrita de 5
   minutos porque o cache_control desta integracao nunca define "ttl" (fica
   no padrao efemero de 5 min - ver ChatbotIAService). Valores em config
   (appsettings "IA:Chat:Precos") pra nao exigir redeploy se o preco mudar;
   os literais abaixo so entram se a chave especifica estiver ausente. */
public static class CustoChatbotCalculator
{
    private const decimal EntradaFaixaBaixaPadrao = 0.10m;
    private const decimal SaidaFaixaBaixaPadrao = 0.50m;
    private const decimal CacheEscritaFaixaBaixaPadrao = 0.125m;
    private const decimal CacheLeituraFaixaBaixaPadrao = 0.01m;

    private const decimal EntradaFaixaAltaPadrao = 0.50m;
    private const decimal SaidaFaixaAltaPadrao = 2.50m;
    private const decimal CacheEscritaFaixaAltaPadrao = 0.625m;
    private const decimal CacheLeituraFaixaAltaPadrao = 0.05m;

    private const int LimiarTokensFaixaAltaPadrao = 100_000;

    public static decimal CalcularUsd(
        IConfiguration configuracao,
        int tokensEntrada,
        int tokensSaida,
        int tokensCacheEscrita,
        int tokensCacheLeitura)
    {
        var tamanhoTotalDoPrompt = tokensEntrada + tokensCacheEscrita + tokensCacheLeitura;
        var ehFaixaAlta = tamanhoTotalDoPrompt > LerInt(configuracao, "LimiarTokensFaixaAlta", LimiarTokensFaixaAltaPadrao);
        var faixa = ehFaixaAlta ? "FaixaAlta" : "FaixaBaixa";

        var precoEntrada = LerDecimal(configuracao, $"{faixa}:EntradaPorMilhao", ehFaixaAlta ? EntradaFaixaAltaPadrao : EntradaFaixaBaixaPadrao);
        var precoSaida = LerDecimal(configuracao, $"{faixa}:SaidaPorMilhao", ehFaixaAlta ? SaidaFaixaAltaPadrao : SaidaFaixaBaixaPadrao);
        var precoCacheEscrita = LerDecimal(configuracao, $"{faixa}:CacheEscrita5mPorMilhao", ehFaixaAlta ? CacheEscritaFaixaAltaPadrao : CacheEscritaFaixaBaixaPadrao);
        var precoCacheLeitura = LerDecimal(configuracao, $"{faixa}:CacheLeituraPorMilhao", ehFaixaAlta ? CacheLeituraFaixaAltaPadrao : CacheLeituraFaixaBaixaPadrao);

        var custo =
            tokensEntrada * precoEntrada +
            tokensSaida * precoSaida +
            tokensCacheEscrita * precoCacheEscrita +
            tokensCacheLeitura * precoCacheLeitura;

        return custo / 1_000_000m;
    }

    private static decimal LerDecimal(IConfiguration configuracao, string chave, decimal padrao)
    {
        var valor = configuracao[$"IA:Chat:Precos:{chave}"];
        return decimal.TryParse(valor, NumberStyles.Number, CultureInfo.InvariantCulture, out var resultado) ? resultado : padrao;
    }

    private static int LerInt(IConfiguration configuracao, string chave, int padrao)
    {
        var valor = configuracao[$"IA:Chat:Precos:{chave}"];
        return int.TryParse(valor, out var resultado) ? resultado : padrao;
    }
}
