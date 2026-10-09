using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class PosicaoQuestaoDto
{
    [Required]
    public int QuestaoId { get; set; }

    [Range(1, int.MaxValue)]
    public int NovaOrdem { get; set; }
}

public class ReordenarQuestoesDto
{
    [Required]
    [MinLength(1)]
    public List<PosicaoQuestaoDto> Posicoes { get; set; } = new();
}
