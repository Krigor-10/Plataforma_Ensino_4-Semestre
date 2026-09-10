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

public async Task<List<Matricula>> ObterMatriculasPendentesAsync(int? coordenadorId)
    {
        var query = Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Turma)
            .Where(m => m.Status == StatusMatricula.Pendente);

        if (coordenadorId.HasValue)
        {
            query = query.Where(m => m.Curso!.CoordenadorId == coordenadorId.Value);
        }

        return await query.ToListAsync();
    }

    public async Task<(List<Matricula> Itens, int TotalItens)> ListarPaginadoAsync(int? pagina, int? tamanhoPagina, int? coordenadorId)
    {
        var query = Context.Set<Matricula>()
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Turma)
            .AsQueryable();

        if (coordenadorId.HasValue)
        {
            query = query.Where(m => m.Curso!.CoordenadorId == coordenadorId.Value);
        }

        var queryOrdenada = query.OrderByDescending(m => m.DataSolicitacao);

        var totalItens = await queryOrdenada.CountAsync();

        if (!pagina.HasValue)
        {
            return (await queryOrdenada.ToListAsync(), totalItens);
        }

        var tamanho = Math.Clamp(tamanhoPagina ?? 20, 1, 100);
        var pular = Math.Max(0, (pagina.Value - 1) * tamanho);

        var itensDaPagina = await queryOrdenada.Skip(pular).Take(tamanho).ToListAsync();
        return (itensDaPagina, totalItens);
    }

    public async Task<int?> ObterCursoIdAsync(int matriculaId)
    {
        return await Context.Set<Matricula>()
            .AsNoTracking()
            .Where(m => m.Id == matriculaId)
            .Select(m => (int?)m.CursoId)
            .FirstOrDefaultAsync();
    }
}