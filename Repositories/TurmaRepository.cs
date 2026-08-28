using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Repositories;

public class TurmaRepository : GenericRepository<Turma>, ITurmaRepository
{
    public TurmaRepository(PlataformaContext context) : base(context)
    {
    }

    public async Task<bool> ExisteTurmaComMesmoNomeAsync(string nomeTurma, int cursoId)
    {
        return await Context.Turmas
            .AnyAsync(t => t.NomeTurma == nomeTurma && t.CursoId == cursoId);
    }

    public async Task<List<Turma>> ObterPorProfessorAsync(int professorId)
    {
        return await Context.Turmas
            .Where(turma => turma.ProfessorId == professorId)
            .OrderBy(turma => turma.CursoId)
            .ThenBy(turma => turma.NomeTurma)
            .ToListAsync();
    }
}
