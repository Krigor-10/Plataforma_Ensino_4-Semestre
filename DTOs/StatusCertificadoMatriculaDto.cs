namespace PlataformaEnsino.API.DTOs;

public class StatusCertificadoMatriculaDto
{
    public int MatriculaId { get; set; }
    public int CursoId { get; set; }
    public bool CertificadoDisponivel { get; set; }
    public List<string> PendenciasCertificado { get; set; } = new();
}
