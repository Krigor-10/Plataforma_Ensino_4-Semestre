using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class NotificacaoService : INotificacaoService
{
    private readonly PlataformaContext _context;
    private readonly ILogger<NotificacaoService> _logger;

    public NotificacaoService(PlataformaContext context, ILogger<NotificacaoService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Notificacoes sao um efeito colateral best-effort de operacoes de negocio ja
    /// commitadas (aprovar matricula, corrigir avaliacao, publicar conteudo). Uma
    /// falha aqui (ex.: FK invalida, timeout do banco) nunca deve virar um 500 pra
    /// uma operacao que ja foi concluida com sucesso — so registra o erro e segue.
    /// </summary>
    public async Task NotificarAsync(int usuarioId, string titulo, string mensagem, TipoNotificacao tipo, string? link = null)
    {
        try
        {
            _context.Notificacoes.Add(Notificacao.Criar(usuarioId, titulo, mensagem, tipo, link));
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Falha ao criar notificacao para o usuario {UsuarioId}.", usuarioId);
        }
    }

    public async Task NotificarVariosAsync(IEnumerable<int> usuarioIds, string titulo, string mensagem, TipoNotificacao tipo, string? link = null)
    {
        var idsUnicos = usuarioIds.Distinct().ToList();
        if (idsUnicos.Count == 0)
        {
            return;
        }

        foreach (var usuarioId in idsUnicos)
        {
            _context.Notificacoes.Add(Notificacao.Criar(usuarioId, titulo, mensagem, tipo, link));
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Falha ao criar notificacoes em lote para {Quantidade} usuarios.", idsUnicos.Count);
        }
    }

    public async Task<IEnumerable<Notificacao>> ListarPorUsuarioAsync(int usuarioId, int limite = 50)
    {
        return await _context.Notificacoes
            .AsNoTracking()
            .Where(n => n.UsuarioId == usuarioId)
            .OrderByDescending(n => n.CriadoEm)
            .Take(limite)
            .ToListAsync();
    }

    public async Task<int> ContarNaoLidasAsync(int usuarioId)
    {
        return await _context.Notificacoes
            .AsNoTracking()
            .CountAsync(n => n.UsuarioId == usuarioId && !n.Lida);
    }

    public async Task MarcarComoLidaAsync(int notificacaoId, int usuarioId)
    {
        var notificacao = await _context.Notificacoes
            .FirstOrDefaultAsync(n => n.Id == notificacaoId && n.UsuarioId == usuarioId)
            ?? throw new KeyNotFoundException("Notificacao nao encontrada.");

        notificacao.MarcarComoLida(DateTime.UtcNow);
        await _context.SaveChangesAsync();
    }

    public async Task MarcarTodasComoLidasAsync(int usuarioId)
    {
        var naoLidas = await _context.Notificacoes
            .Where(n => n.UsuarioId == usuarioId && !n.Lida)
            .ToListAsync();

        if (naoLidas.Count == 0)
        {
            return;
        }

        var agora = DateTime.UtcNow;
        foreach (var notificacao in naoLidas)
        {
            notificacao.MarcarComoLida(agora);
        }

        await _context.SaveChangesAsync();
    }
}
