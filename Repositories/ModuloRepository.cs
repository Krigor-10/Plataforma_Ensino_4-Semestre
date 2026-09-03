using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Repositories;

public class ModuloRepository : GenericRepository<Modulo>, IModuloRepository
{
    public ModuloRepository(PlataformaContext context) : base(context)
    {
    }

    public async Task<bool> ExisteModuloComMesmoTituloAsync(string titulo, int cursoId, int? ignorarId = null)
    {
        return await Context.Modulos.AnyAsync(modulo =>
            modulo.CursoId == cursoId &&
            modulo.Titulo == titulo &&
            (!ignorarId.HasValue || modulo.Id != ignorarId.Value));
    }

    public async Task<List<Modulo>> ObterPorCursoAsync(int cursoId)
    {
        return await Context.Modulos
            .Where(modulo => modulo.CursoId == cursoId)
            .OrderBy(modulo => modulo.DataCriacao)
            .ToListAsync();
    }

    public async Task<List<Modulo>> ObterPorProfessorAsync(int professorId)
    {
        return await Context.Modulos
            .Where(modulo => Context.Turmas.Any(turma =>
                turma.ProfessorId == professorId &&
                turma.CursoId == modulo.CursoId))
            .OrderBy(modulo => modulo.CursoId)
            .ThenBy(modulo => modulo.Titulo)
            .ToListAsync();
    }

    public async Task<List<Modulo>> ObterPorAlunoAsync(int alunoId)
    {
        // Curso pago so libera modulo com pagamento confirmado (Preco <= 0
        // e sempre liberado — curso gratuito nunca gera Pagamento).
        return await Context.Modulos
            .Where(modulo => Context.Matriculas.Any(matricula =>
                matricula.AlunoId == alunoId &&
                matricula.Status == StatusMatricula.Aprovada &&
                matricula.CursoId == modulo.CursoId &&
                (matricula.Curso!.Preco <= 0 ||
                 Context.Pagamentos.Any(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago))))
            .OrderBy(modulo => modulo.CursoId)
            .ThenBy(modulo => modulo.DataCriacao)
            .ThenBy(modulo => modulo.Titulo)
            .ToListAsync();
    }

    public async Task<bool> PossuiDependenciasAsync(int moduloId)
    {
        return await Context.ConteudosDidaticos.AnyAsync(item => item.ModuloId == moduloId) ||
               await Context.Avaliacoes.AnyAsync(item => item.ModuloId == moduloId) ||
               await Context.LancamentosNotasAlunos.AnyAsync(item => item.ModuloId == moduloId) ||
               await Context.ProgressosConteudosAlunos.AnyAsync(item => item.ModuloId == moduloId) ||
               await Context.ProgressosModulosAlunos.AnyAsync(item => item.ModuloId == moduloId) ||
               await Context.MarcosProgressosAlunos.AnyAsync(item => item.ModuloId == moduloId);
    }
}
