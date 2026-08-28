using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly PlataformaContext Context;
    protected readonly DbSet<T> DbSet;

    public GenericRepository(PlataformaContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public async Task<T?> ObterPorIdAsync(int id) => await DbSet.FindAsync(id);

    public async Task<List<T>> ObterTodosAsync() => await DbSet.ToListAsync();

    public async Task<T> AdicionarAsync(T entidade)
    {
        await DbSet.AddAsync(entidade);
        return entidade;
    }

    public void Atualizar(T entidade) => DbSet.Update(entidade);

    public void Deletar(T entidade) => DbSet.Remove(entidade);

    public async Task<bool> SalvarAlteracoesAsync() => (await Context.SaveChangesAsync()) > 0;
}
