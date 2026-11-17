using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface ICursoInscricoesService
{
    /// <summary>
    /// Por curso: inscritos, começaram, concluíram, com certificado,
    /// pendentes e receita (simulada) - ver as definições exatas no
    /// PROMPT-agente-tela-inscricoes.md. "de"/"ate" filtram pela data da
    /// inscrição (Matricula.DataSolicitacao); a receita usa Pagamento.PagoEm
    /// em vez disso. Ambos opcionais - sem nenhum dos dois, vale todo o
    /// período.
    /// </summary>
    Task<IEnumerable<CursoInscricoesResponseDto>> ObterInscricoesAsync(DateTime? de, DateTime? ate);
}
