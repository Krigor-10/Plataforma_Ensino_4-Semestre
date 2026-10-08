using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class CriarQuestaoAvaliacaoDto
{
    [Required]
    [StringLength(180)]
    public string TituloInterno { get; set; } = string.Empty;

    public string Contexto { get; set; } = string.Empty;

    [Required]
    public string Enunciado { get; set; } = string.Empty;

    [Required]
    public TipoQuestao TipoQuestao { get; set; } = TipoQuestao.MultiplaEscolha;

    [StringLength(120)]
    public string Tema { get; set; } = string.Empty;

    [StringLength(120)]
    public string Subtema { get; set; } = string.Empty;

    [Range(1, 5)]
    public byte Dificuldade { get; set; } = 1;

    public string ExplicacaoPosResposta { get; set; } = string.Empty;

    public string ReferenciasBibliograficas { get; set; } = string.Empty;

    public decimal Pontos { get; set; } = 1;

    public List<CriarAlternativaAvaliacaoDto> Alternativas { get; set; } = new();

    public List<CriarAfirmativaQuestaoDto> Afirmativas { get; set; } = new();
}
