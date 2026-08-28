namespace PlataformaEnsino.API.DTOs;

public class CertificadoResponseDto
{
    public string CodigoVerificacao { get; set; } = string.Empty;
    public string AlunoNome { get; set; } = string.Empty;
    public string CursoTitulo { get; set; } = string.Empty;
    public string? TurmaNome { get; set; }
    public decimal NotaFinal { get; set; }
    public DateTime EmitidoEm { get; set; }
}
