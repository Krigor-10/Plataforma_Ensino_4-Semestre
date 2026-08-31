using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class RefreshToken
{
    public int Id { get; set; }

    public string TokenHash { get; private set; } = string.Empty;

    public int UsuarioId { get; set; }

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;
    public DateTime ExpiraEm { get; private set; }
    public DateTime? RevogadoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Usuario? Usuario { get; set; }

    [JsonIgnore]
    public bool EstaAtivo => RevogadoEm is null && ExpiraEm > DateTime.UtcNow;

    public static RefreshToken Emitir(int usuarioId, string tokenHash, int expiraEmDias)
    {
        return new RefreshToken
        {
            UsuarioId = usuarioId,
            TokenHash = tokenHash,
            CriadoEm = DateTime.UtcNow,
            ExpiraEm = DateTime.UtcNow.AddDays(expiraEmDias)
        };
    }

    public void Revogar()
    {
        RevogadoEm = DateTime.UtcNow;
    }
}
