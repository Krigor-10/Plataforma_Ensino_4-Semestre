using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// A logica de vencimento em si, separada de <see cref="PagamentoVencimentoService"/>
/// (o BackgroundService/timer) pra poder ser testada direto com um
/// PlataformaContext, sem esperar 1h nem orquestrar um IHostedService -
/// mesmo molde de ChatbotExpurgoExecutor.
/// </summary>
public static class PagamentoVencimentoExecutor
{
    public const int DiasParaVencerPadrao = 3;

    public static async Task<int> ExecutarAsync(PlataformaContext context, int diasParaVencer = DiasParaVencerPadrao, CancellationToken cancellationToken = default)
    {
        var limite = DateTime.UtcNow.AddDays(-diasParaVencer);

        var pagamentosVencidos = await context.Pagamentos
            .Where(pagamento => pagamento.Status == StatusPagamento.Pendente && pagamento.CriadoEm < limite)
            .ToListAsync(cancellationToken);

        foreach (var pagamento in pagamentosVencidos)
        {
            pagamento.Cancelar();
        }

        if (pagamentosVencidos.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }

        return pagamentosVencidos.Count;
    }
}
