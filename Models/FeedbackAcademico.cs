using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class FeedbackAcademico
{
    public int Id { get; set; }

    public int DestinatarioId { get; set; }
    public int? AutorId { get; set; }

    [Required]
    [StringLength(120)]
    public string Origem { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Mensagem { get; set; } = string.Empty;

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;
    public bool Lido { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Usuario? Destinatario { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Usuario? Autor { get; set; }

    public void RegistrarCriacao(DateTime? criadoEm = null)
    {
        CriadoEm = criadoEm ?? DateTime.UtcNow;
    }

    public void MarcarComoLido()
    {
        Lido = true;
    }
}
