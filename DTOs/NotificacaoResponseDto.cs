namespace PlataformaEnsino.API.DTOs;

public class NotificacaoResponseDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool Lida { get; set; }
    public DateTime CriadoEm { get; set; }
}
