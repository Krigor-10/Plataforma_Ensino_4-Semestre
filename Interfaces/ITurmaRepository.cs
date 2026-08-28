using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface ITurmaRepository : IGenericRepository<Turma>
{
    Task<bool> ExisteTurmaComMesmoNomeAsync(string nomeTurma, int cursoId);
    Task<List<Turma>> ObterPorProfessorAsync(int professorId);
}
