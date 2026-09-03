using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Repositories;

public class ConteudoDidaticoRepository : GenericRepository<ConteudoDidatico>, IConteudoDidaticoRepository
{
    public ConteudoDidaticoRepository(PlataformaContext context) : base(context)
    {
    }

    public async Task<ConteudoDidatico?> ObterDetalhePorIdAsync(int id)
    {
        return await Context.ConteudosDidaticos
            .Include(conteudo => conteudo.Turma)
            .Include(conteudo => conteudo.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .FirstOrDefaultAsync(conteudo => conteudo.Id == id);
    }

    public async Task<List<ConteudoDidatico>> ListarPorProfessorAsync(int professorId)
    {
        return await Context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo => conteudo.ProfessorAutorId == professorId)
            .Include(conteudo => conteudo.Turma)
            .Include(conteudo => conteudo.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .OrderBy(conteudo => conteudo.Turma!.NomeTurma)
            .ThenBy(conteudo => conteudo.Modulo!.Titulo)
            .ThenBy(conteudo => conteudo.OrdemExibicao)
            .ThenBy(conteudo => conteudo.Titulo)
            .ToListAsync();
    }

    public async Task<List<ConteudoDidatico>> ListarPublicadosPorAlunoAsync(int alunoId)
    {
        // Curso pago so libera conteudo com pagamento confirmado (Preco <= 0
        // e sempre liberado — curso gratuito nunca gera Pagamento).
        return await Context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo =>
                conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
                Context.Matriculas.Any(matricula =>
                    matricula.AlunoId == alunoId &&
                    matricula.Status == StatusMatricula.Aprovada &&
                    matricula.TurmaId.HasValue &&
                    matricula.TurmaId == conteudo.TurmaId &&
                    (matricula.Curso!.Preco <= 0 ||
                     Context.Pagamentos.Any(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago))))
            .Include(conteudo => conteudo.Turma)
            .Include(conteudo => conteudo.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .OrderBy(conteudo => conteudo.Turma!.NomeTurma)
            .ThenBy(conteudo => conteudo.Modulo!.Titulo)
            .ThenBy(conteudo => conteudo.OrdemExibicao)
            .ThenBy(conteudo => conteudo.Titulo)
            .ToListAsync();
    }
}
