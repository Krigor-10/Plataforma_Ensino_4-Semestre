namespace PlataformaEnsino.API.DTOs;

public class CursoResponseDto
{
    public int Id { get; set; }
    public string CodigoRegistro { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Preco { get; set; }
    public string? ImagemUrl { get; set; }
    public int? CoordenadorId { get; set; }
    public int CriadoPor { get; set; }
}
