namespace PlataformaEnsino.API.DTOs;

public class AfirmativaQuestaoResponseDto
{
    public int Id { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public bool EhCorreta { get; set; }
    public string Justificativa { get; set; } = string.Empty;
    public int Ordem { get; set; }
}
