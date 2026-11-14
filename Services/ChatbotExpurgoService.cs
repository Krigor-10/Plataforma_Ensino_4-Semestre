using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Services;

// Assistente CodeRyse (fluxo-chatbot Fase 1) - agenda ChatbotExpurgoExecutor
// (guarda de 90 dias) uma vez ao subir e depois a cada 24h, mesmo molde de
// RefreshTokenCleanupService. A logica de apagar em si fica no executor
// (testavel sem esperar o timer).
public class ChatbotExpurgoService(IServiceScopeFactory scopeFactory, ILogger<ChatbotExpurgoService> logger) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Intervalo);

        do
        {
            await ExpurgarAsync(stoppingToken);
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ExpurgarAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();

            var (conversasApagadas, chamadosApagados) = await ChatbotExpurgoExecutor.ExecutarAsync(context, cancellationToken);

            if (conversasApagadas > 0 || chamadosApagados > 0)
            {
                logger.LogInformation(
                    "Expurgo do Assistente CodeRyse: {Conversas} conversas e {Chamados} chamados resolvidos (>90 dias) removidos.",
                    conversasApagadas, chamadosApagados);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Falha ao expurgar conversas/chamados do Assistente CodeRyse.");
        }
    }
}
