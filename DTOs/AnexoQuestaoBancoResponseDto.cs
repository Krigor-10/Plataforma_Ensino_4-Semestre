namespace PlataformaEnsino.API.DTOs;

public class AnexoQuestaoBancoResponseDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string TipoAnexo { get; set; } = string.Empty;
    public string ArquivoUrl { get; set; } = string.Empty;
    public int Ordem { get; set; }
}
