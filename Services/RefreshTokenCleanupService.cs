using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Services;

// RefreshTokens nunca sao apagados no fluxo normal (Revogar() so marca RevogadoEm) -
// sem essa rotina a tabela cresce pra sempre. Roda uma vez ao subir e depois a cada
// 24h, apagando tokens ja revogados ou expirados (achado da auditoria de banco de
// 2026-09-04: 418 linhas acumuladas pra 56 usuarios, 221 ja revogadas).
public class RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Intervalo);

        do
        {
            await LimparAsync(stoppingToken);
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task LimparAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var agora = DateTime.UtcNow;

            var apagados = await context.RefreshTokens
                .Where(token => token.RevogadoEm != null || token.ExpiraEm < agora)
                .ExecuteDeleteAsync(cancellationToken);

            if (apagados > 0)
            {
                logger.LogInformation("Limpeza de RefreshTokens: {Quantidade} registros revogados/expirados removidos.", apagados);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Falha ao limpar RefreshTokens revogados/expirados.");
        }
    }
}
