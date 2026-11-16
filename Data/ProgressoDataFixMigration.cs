using Microsoft.Extensions.Logging;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Data;

/// <summary>
/// Correcao historica (achado da auditoria de progresso, 2026-11-16): antes de
/// AvaliacaoService.CriarAvaliacaoAsync recusar nascer Publicada sem questao,
/// alguns quizzes foram publicados vazios, e o progresso de matriculas nunca
/// era recalculado quando o professor mudava conteudo/quiz publicado depois
/// da matricula - algumas ficaram com PercentualConclusao desatualizado
/// (ex.: 100% com um item novo pendente). Roda em todo ambiente (nao so
/// Development, ao contrario de DevelopmentDataSeeder) porque o problema e
/// de dados reais de producao. Idempotente - chamar de novo sem nada
/// desatualizado so recalcula os mesmos valores.
/// </summary>
public static class ProgressoDataFixMigration
{
    public static async Task AplicarAsync(
        IAvaliacaoService avaliacaoService,
        IProgressoAlunoService progressoAlunoService,
        ILogger logger)
    {
        var avaliacoesCorrigidas = await avaliacaoService.CorrigirAvaliacoesPublicadasSemQuestaoAsync();
        if (avaliacoesCorrigidas > 0)
        {
            logger.LogWarning(
                "[Correcao de dados] {Quantidade} avaliacao(oes) publicada(s) sem questao voltaram para Rascunho.",
                avaliacoesCorrigidas);
        }

        await progressoAlunoService.RecalcularProgressoDeCursosNaoEncerradosAsync();
    }
}
