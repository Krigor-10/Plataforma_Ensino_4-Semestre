using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Pede geracao de questoes por IA a partir de um ConteudoDidatico ja
/// cadastrado no curso (texto ou PDF), sem exigir um novo upload — usado pelo
/// fluxo "gerar quiz com IA a partir do material" em Conteudos.
/// </summary>
public class GerarQuestoesDeConteudoRequestDto
{
    [Range(1, int.MaxValue)]
    public int ConteudoDidaticoId { get; set; }

    [Range(1, 20)]
    public int QuantidadeQuestoes { get; set; } = 5;

    [Range(1, 5)]
    public byte Dificuldade { get; set; } = 3;

    [Required]
    public string TiposPermitidos { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Assunto { get; set; }
}
