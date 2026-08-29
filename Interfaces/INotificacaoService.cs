using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface INotificacaoService
{
    Task NotificarAsync(int usuarioId, string titulo, string mensagem, TipoNotificacao tipo, string? link = null);
    Task NotificarVariosAsync(IEnumerable<int> usuarioIds, string titulo, string mensagem, TipoNotificacao tipo, string? link = null);
    Task<IEnumerable<Notificacao>> ListarPorUsuarioAsync(int usuarioId, int limite = 50);
    Task<int> ContarNaoLidasAsync(int usuarioId);
    Task MarcarComoLidaAsync(int notificacaoId, int usuarioId);
    Task MarcarTodasComoLidasAsync(int usuarioId);
}
