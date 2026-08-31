using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Repositories;

public class MatriculaRepository : GenericRepository<Matricula>, IMatriculaRepository
{
    public MatriculaRepository(PlataformaContext context) : base(context)
    {
    }

    public async Task<Matricula?> ObterMatriculaCompletaAsync(int id)
    {
        return await Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Turma)
            .FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<List<Matricula>> ObterMatriculasPorAlunoAsync(int alunoId)
    {
        return await Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Turma)
            .Where(m => m.AlunoId == alunoId)
            .ToListAsync();
    }

    public async Task<bool> ExisteMatriculaAsync(int alunoId, int turmaId)
    {
        return await Context.Set<Matricula>()
            .AnyAsync(m => m.AlunoId == alunoId && m.TurmaId == turmaId);
    }

    public async Task<List<Matricula>> ObterMatriculasPendentesAsync()
    {
        return await Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Turma)
            .Where(m => m.Status == StatusMatricula.Pendente)
            .ToListAsync();
    }

    public async Task<(List<Matricula> Itens, int TotalItens)> ListarPaginadoAsync(int? pagina, int? tamanhoPagina)
    {
        var query = Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Turma)
            .OrderByDescending(m => m.DataSolicitacao);

        var totalItens = await query.CountAsync();

        if (!pagina.HasValue)
        {
            return (await query.ToListAsync(), totalItens);
        }

        var tamanho = Math.Clamp(tamanhoPagina ?? 20, 1, 100);
        var pular = Math.Max(0, (pagina.Value - 1) * tamanho);

        var itensDaPagina = await query.Skip(pular).Take(tamanho).ToListAsync();
        return (itensDaPagina, totalItens);
    }
}