using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarConteudoDidaticoDto
{
    [Required]
    [StringLength(180)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(500)]
    public string Descricao { get; set; } = string.Empty;

    [Required]
    public TipoConteudoDidatico TipoConteudo { get; set; } = TipoConteudoDidatico.Texto;

    public string CorpoTexto { get; set; } = string.Empty;

    [StringLength(500)]
    public string ArquivoUrl { get; set; } = string.Empty;

    [StringLength(500)]
    public string LinkUrl { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int ModuloId { get; set; }

    [Required]
    public StatusPublicacao StatusPublicacao { get; set; } = StatusPublicacao.Rascunho;

    [Range(0, int.MaxValue)]
    public int OrdemExibicao { get; set; }

    public decimal PesoProgresso { get; set; } = 1;
}
