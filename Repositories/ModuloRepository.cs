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
        // Curso pago (na matricula, ver Matricula.ValorNaMatricula - a fonte de
        // verdade centralizada em AcessoAcademicoService.MatriculaTemAcessoLiberado)
        // so libera modulo com pagamento confirmado.
        return await Context.Modulos
            .Where(modulo => Context.Matriculas.Any(matricula =>
                matricula.AlunoId == alunoId &&
                matricula.Status == StatusMatricula.Aprovada &&
                matricula.CursoId == modulo.CursoId &&
                (matricula.ValorNaMatricula <= 0 ||
                 Context.Pagamentos.Any(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago))))
            .OrderBy(modulo => modulo.CursoId)
            .ThenBy(modulo => modulo.DataCriacao)
            .ThenBy(modulo => modulo.Titulo)
            .ToListAsync();
    }

    public async Task<BloqueiosExclusaoModulo> ObterBloqueiosExclusaoAsync(int moduloId)
    {
        // ExcluidoEm == null: conteudo soft-deletado (dado legado - ExcluirConteudoAsync
        // arquiva em vez de soft-deletar desde a pendencia "Painel de arquivados") fica
        // de fora da contagem visivel, igual o resto do app ja trata (ex.:
        // ConteudoDidaticoRepository). O que prende exclusao nesse caso legado e
        // SEMPRE o ProgressosConteudosAlunos.Any abaixo, sem excecao - nao filtrar
        // ExcluidoEm ali de novo (ja tentado e revertido, ver ModuloServiceTests.
        // ExcluirModuloAsync_ComConteudoSoftDeletadoQueTemProgresso_ContinuaBloqueado):
        // apagar esse conteudo pra desbloquear estoura FK Restrict contra o progresso
        // que o soft-delete existe pra preservar.
        var conteudosAtivos = await Context.ConteudosDidaticos.CountAsync(item =>
            item.ModuloId == moduloId && item.ExcluidoEm == null && item.StatusPublicacao != StatusPublicacao.Arquivado);
        var conteudosArquivados = await Context.ConteudosDidaticos.CountAsync(item =>
            item.ModuloId == moduloId && item.ExcluidoEm == null && item.StatusPublicacao == StatusPublicacao.Arquivado);

        var quizzesAtivos = await Context.Avaliacoes.CountAsync(item =>
            item.ModuloId == moduloId && item.TipoAvaliacao == TipoAvaliacao.Quiz && item.StatusPublicacao != StatusPublicacao.Arquivado);
        var quizzesArquivados = await Context.Avaliacoes.CountAsync(item =>
            item.ModuloId == moduloId && item.TipoAvaliacao == TipoAvaliacao.Quiz && item.StatusPublicacao == StatusPublicacao.Arquivado);
        var avaliacoesAtivas = await Context.Avaliacoes.CountAsync(item =>
            item.ModuloId == moduloId && item.TipoAvaliacao != TipoAvaliacao.Quiz && item.StatusPublicacao != StatusPublicacao.Arquivado);
        var avaliacoesArquivadas = await Context.Avaliacoes.CountAsync(item =>
            item.ModuloId == moduloId && item.TipoAvaliacao != TipoAvaliacao.Quiz && item.StatusPublicacao == StatusPublicacao.Arquivado);

        var temNotasLancadas = await Context.LancamentosNotasAlunos.AnyAsync(item => item.ModuloId == moduloId);
        var temProgressoConteudo = await Context.ProgressosConteudosAlunos.AnyAsync(item => item.ModuloId == moduloId);

        // So o progresso com avanco de verdade bloqueia - o 0% automatico que
        // RecalcularProgressoDoCursoAsync cria pra cada matricula em TODO modulo
        // (mesmo vazio) nao conta, senao nenhum modulo novo seria excluivel num
        // curso com alunos.
        var temProgressoModuloComAvanco = await Context.ProgressosModulosAlunos.AnyAsync(item =>
            item.ModuloId == moduloId &&
            (item.PercentualConclusao > 0 || item.StatusProgresso == StatusProgressoAprendizagem.Concluido));

        return new BloqueiosExclusaoModulo(
            conteudosAtivos,
            conteudosArquivados,
            quizzesAtivos,
            quizzesArquivados,
            avaliacoesAtivas,
            avaliacoesArquivadas,
            temNotasLancadas,
            temProgressoConteudo,
            temProgressoModuloComAvanco);
    }

    public async Task RemoverProgressosModuloAsync(int moduloId)
    {
        var progressos = await Context.ProgressosModulosAlunos.Where(item => item.ModuloId == moduloId).ToListAsync();
        Context.ProgressosModulosAlunos.RemoveRange(progressos);
    }
}
