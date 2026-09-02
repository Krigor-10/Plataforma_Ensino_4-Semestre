namespace PlataformaEnsino.API.DTOs;

public class ModuloResponseDto
{
    public int Id { get; set; }
    public string CodigoRegistro { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public DateTime DataCriacao { get; set; }
    public int TotalConteudos { get; set; }
    public int TotalAvaliacoes { get; set; }
}
