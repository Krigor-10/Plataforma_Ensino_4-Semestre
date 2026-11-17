using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class PagamentoAlunoResponseDto
{
    public int Id { get; set; }
    public int MatriculaId { get; set; }
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public StatusPagamento Status { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime? PagoEm { get; set; }

    /// <summary>
    /// CriadoEm + Pagamentos:DiasParaVencer - so preenchido pra pagamentos
    /// Pendentes (PagamentoVencimentoExecutor cancela sozinho depois disso).
    /// Pago/Cancelado nao tem prazo, por isso ficam null.
    /// </summary>
    public DateTime? VenceEm { get; set; }
}
