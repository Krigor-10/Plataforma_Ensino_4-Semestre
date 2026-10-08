using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class AfirmativaQuestaoBanco
{
    public int Id { get; set; }
    public int QuestaoBancoId { get; set; }

    [Required]
    [StringLength(10)]
    public string Numero { get; set; } = string.Empty;

    public string Texto { get; set; } = string.Empty;
    public bool EhCorreta { get; set; }
    public string Justificativa { get; set; } = string.Empty;
    public int Ordem { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public QuestaoBanco? QuestaoBanco { get; set; }
}
