namespace PlataformaEnsino.API.DTOs;

public class BloqueiosExclusaoModuloResponseDto
{
    public bool PodeExcluir { get; set; }
    public string? Motivo { get; set; }
    public bool TemItemArquivado { get; set; }
}
