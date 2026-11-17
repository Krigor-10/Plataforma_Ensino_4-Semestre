using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Services;

// Hoje quem nao paga fica Pendente pra sempre (PROMPT-agente-inscricoes-v3.md,
// item 5): roda uma vez ao subir e depois a cada 1h, cancelando todo
// pagamento Pendente criado ha mais de Pagamentos:DiasParaVencer dias
// (padrao 3) - mesmo molde de RefreshTokenCleanupService/ChatbotExpurgoService.
public class PagamentoVencimentoService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<PagamentoVencimentoService> logger) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Intervalo);

        do
        {
            await VencerAsync(stoppingToken);
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task VencerAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var diasParaVencer = configuration.GetValue("Pagamentos:DiasParaVencer", PagamentoVencimentoExecutor.DiasParaVencerPadrao);

            var vencidos = await PagamentoVencimentoExecutor.ExecutarAsync(context, diasParaVencer, cancellationToken);

            if (vencidos > 0)
            {
                logger.LogInformation(
                    "Vencimento de pagamentos: {Quantidade} pagamento(s) pendente(s) cancelado(s) por vencimento (> {Dias} dias).",
                    vencidos, diasParaVencer);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Falha ao processar vencimento de pagamentos pendentes.");
        }
    }
}
