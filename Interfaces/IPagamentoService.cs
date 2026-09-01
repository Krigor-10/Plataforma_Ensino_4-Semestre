using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IPagamentoService
{
    Task<IEnumerable<PagamentoAlunoResponseDto>> ListarPagamentosDoAlunoAsync(int alunoId);
    Task<PagamentoAlunoResponseDto> ConfirmarPagamentoAsync(int matriculaId, int alunoId);
}
