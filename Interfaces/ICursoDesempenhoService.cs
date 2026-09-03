using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface ICursoDesempenhoService
{
    Task<IEnumerable<CursoDesempenhoResponseDto>> ObterDesempenhoPorCoordenadorAsync(int coordenadorId);
    Task<CursoDesempenhoResponseDto> ObterDesempenhoPorCursoAsync(int cursoId, int coordenadorId);
    Task<IEnumerable<CursoDesempenhoResponseDto>> ObterDesempenhoPorProfessorAsync(int professorId);
}
