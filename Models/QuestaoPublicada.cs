using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class QuestaoPublicada
{
    public int Id { get; set; }
    public int AvaliacaoId { get; set; }
    public int QuestaoBancoId { get; set; }
    public int Ordem { get; set; }
    public string ContextoSnapshot { get; set; } = string.Empty;
    public string EnunciadoSnapshot { get; set; } = string.Empty;
    public TipoQuestao TipoQuestao { get; set; } = TipoQuestao.MultiplaEscolha;
    public string ExplicacaoSnapshot { get; set; } = string.Empty;
    public string ReferenciasBibliograficasSnapshot { get; set; } = string.Empty;
    public decimal Pontos { get; set; } = 1;

    [JsonIgnore]
    [ValidateNever]
    public Avaliacao? Avaliacao { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public QuestaoBanco? QuestaoBanco { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<AlternativaQuestaoPublicada> Alternativas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<AfirmativaQuestaoPublicada> Afirmativas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<RespostaAluno> Respostas { get; set; } = new();
}
