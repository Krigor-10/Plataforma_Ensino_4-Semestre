using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class CriarQuestoesEmLoteDto
{
    [Required]
    [MinLength(1)]
    public List<CriarQuestaoAvaliacaoDto> Questoes { get; set; } = new();
}
