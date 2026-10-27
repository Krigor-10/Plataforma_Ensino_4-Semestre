using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

// Valores fixados explicitamente: matricula nunca e mais rejeitada
// manualmente, mas ha notificacoes historicas gravadas com Tipo=1
// (MatriculaRejeitada). Sem valor explicito, remover o nome deslocaria o
// int de todo membro seguinte e corromperia essas notificacoes antigas.
public enum TipoNotificacao
{
    MatriculaAprovada = 0,
    AvaliacaoCorrigida = 2,
    ConteudoPublicado = 3,
    PagamentoConfirmado = 4,
    CursoConcluidoPeloProfessor = 5
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
