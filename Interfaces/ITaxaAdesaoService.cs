using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface ITaxaAdesaoService
{
    Task<TaxaAdesaoResponseDto> ObterParaAdminAsync(DateTime dataInicio, DateTime dataFim, string agrupamento);
    Task<TaxaAdesaoResponseDto> ObterParaCoordenadorAsync(int coordenadorId, DateTime dataInicio, DateTime dataFim, string agrupamento);
}
