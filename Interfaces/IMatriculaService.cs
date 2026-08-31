using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IMatriculaService
{
    Task<Matricula> MatricularAlunoAsync(int alunoId, int turmaId);
    Task<Matricula> SolicitarMatriculaAsync(int alunoId, int cursoId);
    Task<Matricula> ObterMatriculaPorIdAsync(int id);
    Task<IEnumerable<Matricula>> ListarMatriculasPorAlunoAsync(int alunoId);
    Task<IEnumerable<MatriculaPendenteDto>> ListarMatriculasPendentesAsync();
    Task<IEnumerable<Matricula>> ListarMatriculasAsync();
    Task AprovarMatriculaAsync(int matriculaId, int turmaId);
    Task<AprovacaoMatriculasLoteResultadoDto> AprovarMatriculasAutomaticamenteAsync(IEnumerable<int> matriculaIds);
    Task RejeitarMatriculaAsync(int matriculaId);
    Task CancelarMatriculaAsync(int matriculaId);
    Task ReabrirMatriculaAsync(int matriculaId);
}
