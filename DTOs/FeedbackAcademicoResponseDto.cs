namespace PlataformaEnsino.API.DTOs;

public class FeedbackAcademicoResponseDto
{
    public int Id { get; set; }
    public string AutorNome { get; set; } = string.Empty;
    public string Origem { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
    public DateTime CriadoEm { get; set; }
    public bool Lido { get; set; }
}
