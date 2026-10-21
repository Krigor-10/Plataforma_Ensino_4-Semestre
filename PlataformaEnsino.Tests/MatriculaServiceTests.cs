using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class MatriculaServiceTests
{
    private static (MatriculaService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        var service = new MatriculaService(
            new MatriculaRepository(context),
            new GenericRepository<Aluno>(context),
            context,
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance));

        return (service, context);
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 0)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..10], Preco = preco };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Aluno CriarAluno(PlataformaContext context, string matricula = "Pendente")
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = matricula
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Matricula CriarMatriculaPendente(PlataformaContext context, int alunoId, int cursoId)
    {
        var matricula = new Matricula
        {
            AlunoId = alunoId,
            CursoId = cursoId,
            CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..10]
        };

        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    [Fact]
    public async Task AprovarMatriculaAsync_AprovaSemDependerDeTurmaEAtualizaCodigoDoAluno()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatriculaPendente(context, aluno.Id, curso.Id);

        await service.AprovarMatriculaAsync(matricula.Id);

        var matriculaAtualizada = await service.ObterMatriculaPorIdAsync(matricula.Id);
        Assert.Equal(StatusMatricula.Aprovada, matriculaAtualizada.Status);
        Assert.Null(matriculaAtualizada.TurmaId);

        var alunoAtualizado = context.Alunos.Single(a => a.Id == aluno.Id);
        Assert.NotEqual("Pendente", alunoAtualizado.Matricula);
    }

    [Fact]
    public async Task RejeitarMatriculaAsync_MarcaComoRejeitada()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatriculaPendente(context, aluno.Id, curso.Id);

        await service.RejeitarMatriculaAsync(matricula.Id);

        var matriculaAtualizada = await service.ObterMatriculaPorIdAsync(matricula.Id);
        Assert.Equal(StatusMatricula.Rejeitada, matriculaAtualizada.Status);
    }

    [Fact]
    public async Task AprovarMatriculasAutomaticamenteAsync_AprovaValidasEReportaErros()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatriculaPendente(context, aluno.Id, curso.Id);

        var resultado = await service.AprovarMatriculasAutomaticamenteAsync(new[] { matricula.Id, 999 });

        Assert.Equal(2, resultado.TotalSolicitado);
        Assert.Single(resultado.Aprovadas);
        Assert.Single(resultado.Erros);
        Assert.Equal(matricula.Id, resultado.Aprovadas[0].MatriculaId);
        Assert.Equal(curso.Titulo, resultado.Aprovadas[0].CursoTitulo);
        Assert.Equal(999, resultado.Erros[0].MatriculaId);
    }

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_SemNenhumaTurmaCadastrada_AprovaComSucesso()
    {
        // Prova a correcao do bug original: matricula automatica nao pode mais
        // depender de uma turma existir pra aprovar o aluno no curso.
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);

        Assert.Equal(StatusMatricula.Aprovada, matricula.Status);
        Assert.Null(matricula.TurmaId);
        Assert.Equal(curso.Id, matricula.CursoId);
        Assert.NotEmpty(matricula.CodigoRegistro);

        var alunoAtualizado = context.Alunos.Single(a => a.Id == aluno.Id);
        Assert.NotEqual("Pendente", alunoAtualizado.Matricula);
    }

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_CursoPago_CriaPagamentoPendente()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);

        var pagamento = context.Pagamentos.Single(p => p.MatriculaId == matricula.Id);
        Assert.Equal(StatusPagamento.Pendente, pagamento.Status);
        Assert.Equal(199.90m, pagamento.Valor);
    }

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_CursoGratuito_NaoCriaPagamento()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);

        Assert.False(context.Pagamentos.Any(p => p.MatriculaId == matricula.Id));
    }

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_AlunoJaAprovadoNoCurso_ConsolidaSemDuplicar()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);

        await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);
        await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);

        var aprovadas = context.Matriculas.Count(m =>
            m.AlunoId == aluno.Id && m.CursoId == curso.Id && m.Status == StatusMatricula.Aprovada);
        Assert.Equal(1, aprovadas);
    }
}
