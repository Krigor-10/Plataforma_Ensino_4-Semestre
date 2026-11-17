using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IPagamentoService
{
    Task<IEnumerable<PagamentoAlunoResponseDto>> ListarPagamentosDoAlunoAsync(int alunoId);
    Task<PagamentoAlunoResponseDto> ConfirmarPagamentoAsync(int matriculaId, int alunoId);

    /// <summary>
    /// O aluno desiste da compra: cancela o pagamento Pendente da sua
    /// matricula. 404 se a matricula nao existir/nao for do aluno; 409 se
    /// nao houver pagamento pendente (ConflitoDeNegocioException).
    /// </summary>
    Task<PagamentoAlunoResponseDto> CancelarAsync(int matriculaId, int alunoId);
}
