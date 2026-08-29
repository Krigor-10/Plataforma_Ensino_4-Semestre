using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public enum TipoNotificacao
{
    MatriculaAprovada,
    MatriculaRejeitada,
    AvaliacaoCorrigida,
    ConteudoPublicado
}

public class Notificacao
{
    public int Id { get; set; }

    public int UsuarioId { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public string Mensagem { get; set; } = string.Empty;

    public TipoNotificacao Tipo { get; set; }

    public string? Link { get; set; }

    public bool Lida { get; private set; }

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;

    public DateTime? LidaEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Usuario? Usuario { get; set; }

    public static Notificacao Criar(int usuarioId, string titulo, string mensagem, TipoNotificacao tipo, string? link)
    {
        return new Notificacao
        {
            UsuarioId = usuarioId,
            Titulo = titulo,
            Mensagem = mensagem,
            Tipo = tipo,
            Link = link,
            CriadoEm = DateTime.UtcNow
        };
    }

    public void MarcarComoLida(DateTime agora)
    {
        if (Lida)
        {
            return;
        }

        Lida = true;
        LidaEm = agora;
    }
}
