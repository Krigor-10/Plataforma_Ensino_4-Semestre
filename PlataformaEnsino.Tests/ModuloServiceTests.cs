using Microsoft.EntityFrameworkCore;
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
        var progressoAlunoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        return (new ModuloService(new ModuloRepository(context), new GenericRepository<Curso>(context), cursoService, progressoAlunoService, context), context);
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

    private static Avaliacao CriarAvaliacao(PlataformaContext context, int moduloId, int cursoId, TipoAvaliacao tipo, StatusPublicacao status)
    {
        var avaliacao = new Avaliacao { Titulo = "Avaliacao Teste", ModuloId = moduloId, TipoAvaliacao = tipo };
        avaliacao.DefinirAutor(1);
        avaliacao.DefinirCurso(cursoId);
        if (status == StatusPublicacao.Publicado || status == StatusPublicacao.Arquivado)
        {
            avaliacao.Publicar();
        }
        if (status == StatusPublicacao.Arquivado)
        {
            avaliacao.Arquivar();
        }
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();
        return avaliacao;
    }

    private static Matricula CriarMatricula(PlataformaContext context, int cursoId, int alunoId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static Aluno CriarAluno(PlataformaContext context)
    {
        var aluno = new Aluno { Nome = "Aluno Teste", Email = $"{Guid.NewGuid():N}@teste.local", Cpf = "12345678900", Matricula = $"MAT-{Guid.NewGuid():N}"[..10] };
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static void CriarProgressoModulo(PlataformaContext context, int moduloId, int matriculaId, decimal percentual, StatusProgressoAprendizagem status)
    {
        context.ProgressosModulosAlunos.Add(new ProgressoModuloAluno
        {
            MatriculaId = matriculaId,
            ModuloId = moduloId,
            PercentualConclusao = percentual,
            StatusProgresso = status
        });
        context.SaveChanges();
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

    // docs/TelaConteudosProfessor/PROMPT-agente-excluir-modulo-vazio.md: o
    // ProgressoModuloAluno 0% automatico (RecalcularProgressoDoCursoAsync cria
    // um por matricula em TODO modulo, mesmo vazio) nao pode prender a
    // exclusao, senao nenhum modulo novo seria excluivel num curso com alunos.
    [Fact]
    public async Task ExcluirModuloAsync_ModuloVazioComProgresso0PorCentoDeDoisAlunos_Exclui()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var aluno1 = CriarAluno(context);
        var aluno2 = CriarAluno(context);
        var matricula1 = CriarMatricula(context, curso.Id, aluno1.Id);
        var matricula2 = CriarMatricula(context, curso.Id, aluno2.Id);
        CriarProgressoModulo(context, modulo.Id, matricula1.Id, 0, StatusProgressoAprendizagem.NaoIniciado);
        CriarProgressoModulo(context, modulo.Id, matricula2.Id, 0, StatusProgressoAprendizagem.NaoIniciado);

        await service.ExcluirModuloAsync(modulo.Id);

        Assert.Null(await context.Modulos.FindAsync(modulo.Id));
        Assert.False(await context.ProgressosModulosAlunos.AnyAsync(item => item.ModuloId == modulo.Id));
    }

    [Fact]
    public async Task ExcluirModuloAsync_QuizArquivado_LancaInvalidOperationCitandoArquivado()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarAvaliacao(context, modulo.Id, curso.Id, TipoAvaliacao.Quiz, StatusPublicacao.Arquivado);

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
        Assert.Contains("arquivado", excecao.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExcluirModuloAsync_ConteudoEmRascunho_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarConteudo(context, modulo.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
    }

    [Fact]
    public async Task ExcluirModuloAsync_NotaLancada_LancaInvalidOperationCitandoNotas()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var avaliacao = CriarAvaliacao(context, modulo.Id, curso.Id, TipoAvaliacao.Prova, StatusPublicacao.Publicado);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, curso.Id, aluno.Id);
        context.LancamentosNotasAlunos.Add(new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id, ModuloId = modulo.Id });
        context.SaveChanges();

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
        Assert.Contains("notas", excecao.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExcluirModuloAsync_ProgressoModuloComAvanco_LancaInvalidOperationCitandoProgresso()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, curso.Id, aluno.Id);
        CriarProgressoModulo(context, modulo.Id, matricula.Id, 40, StatusProgressoAprendizagem.EmAndamento);

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirModuloAsync(modulo.Id));
        Assert.Contains("progresso", excecao.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExcluirModuloAsync_NaoAlteraOutrosModulosDoMesmoCurso()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var moduloComMaterial = CriarModulo(context, curso.Id);
        var conteudoDoOutroModulo = CriarConteudo(context, moduloComMaterial.Id, curso.Id);
        var moduloVazio = CriarModulo(context, curso.Id);

        await service.ExcluirModuloAsync(moduloVazio.Id);

        Assert.Null(await context.Modulos.FindAsync(moduloVazio.Id));
        Assert.NotNull(await context.Modulos.FindAsync(moduloComMaterial.Id));
        Assert.NotNull(await context.ConteudosDidaticos.FindAsync(conteudoDoOutroModulo.Id));
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
