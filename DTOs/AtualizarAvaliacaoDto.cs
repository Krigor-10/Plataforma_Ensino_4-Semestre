using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarAvaliacaoDto
{
    [Required]
    [StringLength(180)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(500)]
    public string Descricao { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TurmaId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ModuloId { get; set; }

    public int? ConteudoDidaticoId { get; set; }

    [Required]
    public TipoAvaliacao TipoAvaliacao { get; set; } = TipoAvaliacao.Quiz;

    [Required]
    public StatusPublicacao StatusPublicacao { get; set; } = StatusPublicacao.Rascunho;

    public DateTime? DataAbertura { get; set; }
    public DateTime? DataFechamento { get; set; }

    [Range(1, int.MaxValue)]
    public int TentativasPermitidas { get; set; } = 1;

    public int? TempoLimiteMinutos { get; set; }

    public decimal NotaMaxima { get; set; } = 10;
    public decimal PesoNota { get; set; } = 1;
    public decimal PesoProgresso { get; set; } = 1;
}
