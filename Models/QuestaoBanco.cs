using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class QuestaoBanco
{
    public int Id { get; set; }
    public int ProfessorAutorId { get; set; }

    [Required]
    [StringLength(180)]
    public string TituloInterno { get; set; } = string.Empty;

    public string Contexto { get; set; } = string.Empty;
    public string Enunciado { get; set; } = string.Empty;

    public TipoQuestao TipoQuestao { get; set; } = TipoQuestao.MultiplaEscolha;

    [StringLength(120)]
    public string Tema { get; set; } = string.Empty;

    [StringLength(120)]
    public string Subtema { get; set; } = string.Empty;

    [Range(1, 5)]
    public byte Dificuldade { get; set; } = 1;

    public string ExplicacaoPosResposta { get; set; } = string.Empty;
    public string ReferenciasBibliograficas { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? AtualizadoEm { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Professor? ProfessorAutor { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<AlternativaQuestaoBanco> Alternativas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<AfirmativaQuestaoBanco> Afirmativas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<AnexoQuestaoBanco> Anexos { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<QuestaoPublicada> QuestoesPublicadas { get; set; } = new();
}
