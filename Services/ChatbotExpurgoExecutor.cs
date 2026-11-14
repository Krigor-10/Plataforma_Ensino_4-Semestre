using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// A logica de expurgo em si, separada de <see cref="ChatbotExpurgoService"/>
/// (o BackgroundService/timer) pra poder ser testada direto com um
/// PlataformaContext, sem esperar 24h nem orquestrar um IHostedService.
/// </summary>
public static class ChatbotExpurgoExecutor
{
    public const int DiasDeGuarda = 90;

    public static async Task<(int ConversasApagadas, int ChamadosApagados)> ExecutarAsync(PlataformaContext context, CancellationToken cancellationToken = default)
    {
        var limite = DateTime.UtcNow.AddDays(-DiasDeGuarda);

        var conversasExpiradas = await context.ConversasChatbot
            .Include(conversa => conversa.Mensagens)
            .Where(conversa => conversa.AtualizadaEm < limite)
            .ToListAsync(cancellationToken);

        if (conversasExpiradas.Count > 0)
        {
            context.MensagensChatbot.RemoveRange(conversasExpiradas.SelectMany(conversa => conversa.Mensagens));
            context.ConversasChatbot.RemoveRange(conversasExpiradas);
        }

        // So resolvidos ha mais de 90 dias - Aberto/Respondido nunca entram aqui.
        var chamadosExpirados = await context.ChamadosSuporte
            .Include(chamado => chamado.Mensagens)
            .Where(chamado => chamado.Status == StatusChamadoSuporte.Resolvido && chamado.ResolvidoEm != null && chamado.ResolvidoEm < limite)
            .ToListAsync(cancellationToken);

        if (chamadosExpirados.Count > 0)
        {
            context.MensagensChamado.RemoveRange(chamadosExpirados.SelectMany(chamado => chamado.Mensagens));
            context.ChamadosSuporte.RemoveRange(chamadosExpirados);
        }

        if (conversasExpiradas.Count > 0 || chamadosExpirados.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }

        return (conversasExpiradas.Count, chamadosExpirados.Count);
    }
}
