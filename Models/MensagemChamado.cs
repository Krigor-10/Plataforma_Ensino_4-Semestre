using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

// Uma linha por mensagem na conversa do chamado (aluno, Coordenador ou
// Admin) - AutorId e generico (Usuario), o perfil de quem respondeu vem do
// TipoUsuario do autor, nao de um campo proprio aqui.
public class MensagemChamado
{
    public int Id { get; set; }

    public int ChamadoId { get; set; }

    public int AutorId { get; set; }

    public string Texto { get; private set; } = string.Empty;

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;

    [JsonIgnore]
    [ValidateNever]
    public ChamadoSuporte? Chamado { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Usuario? Autor { get; set; }

    public static MensagemChamado Criar(int chamadoId, int autorId, string texto)
    {
        if (autorId <= 0)
        {
            throw new ArgumentException("O autor informado e invalido.");
        }

        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ArgumentException("A mensagem nao pode ser vazia.");
        }

        return new MensagemChamado
        {
            ChamadoId = chamadoId,
            AutorId = autorId,
            Texto = texto,
            CriadoEm = DateTime.UtcNow
        };
    }
}
