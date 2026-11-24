namespace PlataformaEnsino.API.DTOs;

public class StatusCertificadoMatriculaDto
{
    public int MatriculaId { get; set; }
    public int CursoId { get; set; }
    public bool CertificadoDisponivel { get; set; }
    public List<string> PendenciasCertificado { get; set; } = new();
    public DateTime? CertificadoEmitidoEm { get; set; }

    /// <summary>
    /// Situacao resumida pra tela, calculada no servidor (docs/certificados-
    /// mobile/PROMPT-agente-certificados-mobile.md, item 1): Emitido,
    /// AguardandoPagamento, EmAndamento, AguardandoCorrecao,
    /// NotaAbaixoDoMinimo, AguardandoEncerramento ou Disponivel.
    /// </summary>
    public string Situacao { get; set; } = string.Empty;
}
