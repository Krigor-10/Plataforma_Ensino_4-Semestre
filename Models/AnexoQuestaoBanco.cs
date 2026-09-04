using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class AnexoQuestaoBanco
{
    public int Id { get; set; }
    public int QuestaoBancoId { get; set; }

    [Required]
    [StringLength(160)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(40)]
    public string TipoAnexo { get; set; } = string.Empty;

    [StringLength(500)]
    public string ArquivoUrl { get; set; } = string.Empty;

    public int Ordem { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public QuestaoBanco? QuestaoBanco { get; set; }
}
