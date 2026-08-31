using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IMatriculaRepository : IGenericRepository<Matricula>
{
    Task<Matricula?> ObterMatriculaCompletaAsync(int id);
    Task<List<Matricula>> ObterMatriculasPorAlunoAsync(int alunoId);
    Task<bool> ExisteMatriculaAsync(int alunoId, int turmaId);
    Task<List<Matricula>> ObterMatriculasPendentesAsync();
    Task<(List<Matricula> Itens, int TotalItens)> ListarPaginadoAsync(int? pagina, int? tamanhoPagina);
}