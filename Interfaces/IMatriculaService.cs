using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IMatriculaService
{
    Task<Matricula> MatricularComAprovacaoAutomaticaAsync(int alunoId, int cursoId);
    Task<Matricula> ObterMatriculaPorIdAsync(int id);
    Task<IEnumerable<Matricula>> ListarMatriculasPorAlunoAsync(int alunoId);
    Task<(IEnumerable<Matricula> Itens, int TotalItens)> ListarMatriculasAsync(int? pagina, int? tamanhoPagina, int? coordenadorId);
    Task CancelarMatriculaAsync(int matriculaId);
    Task ReabrirMatriculaAsync(int matriculaId);
}
