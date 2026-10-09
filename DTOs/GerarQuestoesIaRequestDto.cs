using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class GerarQuestoesIaRequestDto
{
    [Range(1, 20)]
    public int QuantidadeQuestoes { get; set; } = 5;

    [Range(1, 5)]
    public byte Dificuldade { get; set; } = 3;

    [MinLength(1)]
    public List<TipoQuestao> TiposPermitidos { get; set; } = new() { TipoQuestao.MultiplaEscolha };

    [StringLength(200)]
    public string? Assunto { get; set; }
}
