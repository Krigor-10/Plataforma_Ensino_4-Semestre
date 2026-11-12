using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ModuloServiceTests
{
    private static (ModuloService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        var cursoService = new CursoService(
            context,
            new GenericRepository<Curso>(context),
            new GenericRepository<Coordenador>(context),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new CertificadoService(context, new AcessoAcademicoService(context)));
        return (new ModuloService(new ModuloRepository(context), new GenericRepository<Curso>(context), cursoService, context), context);
    }

    private static Curso CriarCurso(PlataformaContext context)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9] };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Modulo CriarModulo(PlataformaContext context, int cursoId)
    {
        var modulo = new Modulo { Titulo = "Modulo Teste", CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9], CursoId = cursoId };
        context.Modulos.Add(modulo);
        context.SaveChanges();
        return modulo;
    }

    private static ConteudoDidatico CriarConteudo(PlataformaContext context, int moduloId, int cursoId)
    {
        var conteudo = new ConteudoDidatico { Titulo = "Aula", ModuloId = moduloId, PesoProgresso = 1 };
        conteudo.DefinirProfessorAutor(1);
        conteudo.DefinirCurso(cursoId);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    [Fact]
    public async Task ExcluirModuloAsync_ComConteudoNaoExcluido_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarConteudo(context, modulo.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
    }

    // Investigado na auditoria de lixeira de conteudos (05/11), mas NAO corrigido
    // de proposito: este teste simula dado legado (ExcluidoEm preenchido direto no
    // banco, sem passar pelo service - desde a pendencia "Painel de arquivados" o
    // caminho de ExcluirConteudoAsync arquiva em vez de soft-deletar, mas linhas
    // antigas com ExcluidoEm ainda existem e precisam continuar bloqueando a
    // exclusao do modulo). A condicao "ProgressosConteudosAlunos.Any(ModuloId ==
    // moduloId)" ja bloqueia a exclusao do modulo nesse caso, com mensagem amigavel
    // - e correto, porque excluir o modulo exigiria tambem apagar essa linha de
    // conteudo (FK Restrict), o que cascataria e apagaria o progresso do aluno que
    // o soft-delete existe pra preservar. Tentei "corrigir" filtrando ExcluidoEm em
    // PossuiDependenciasAsync e isso so troca o erro amigavel por uma excecao feia
    // do EF Core (FK Restrict nao satisfeita) - nao revertido.
    [Fact]
    public async Task ExcluirModuloAsync_ComConteudoSoftDeletadoQueTemProgresso_ContinuaBloqueado()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var conteudo = CriarConteudo(context, modulo.Id, curso.Id);
        conteudo.MarcarComoExcluido();
        context.ProgressosConteudosAlunos.Add(new ProgressoConteudoAluno
        {
            MatriculaId = 1,
            ConteudoDidaticoId = conteudo.Id,
            ModuloId = modulo.Id,
            StatusProgresso = StatusProgressoAprendizagem.Concluido,
            PercentualConclusao = 100m
        });
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
    }

    [Fact]
    public async Task CriarModuloAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        var novoModulo = new Modulo { Titulo = "Modulo Novo", CursoId = curso.Id };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CriarModuloAsync(novoModulo));
    }

    [Fact]
    public async Task AtualizarModuloAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AtualizarModuloAsync(modulo.Id, "Titulo novo"));
    }

    [Fact]
    public async Task ExcluirModuloAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
    }

    [Fact]
    public async Task CriarModuloAsync_CursoReabertoAposEncerrar_VoltaAFuncionar()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        curso.Reabrir();
        context.SaveChanges();

        var novoModulo = new Modulo { Titulo = "Modulo Novo", CursoId = curso.Id };

        var moduloCriado = await service.CriarModuloAsync(novoModulo);

        Assert.NotEqual(0, moduloCriado.Id);
    }
}
