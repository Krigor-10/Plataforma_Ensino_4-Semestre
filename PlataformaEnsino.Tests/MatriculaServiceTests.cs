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
            new GenericRepository<Turma>(context),
            context,
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance));

        return (service, context);
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 0)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = "CUR-0001", Preco = preco };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Turma CriarTurma(PlataformaContext context, int cursoId)
    {
        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = "TUR-0001", CursoId = cursoId };
        context.Turmas.Add(turma);
        context.SaveChanges();
        return turma;
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

    [Fact]
    public async Task MatricularAlunoAsync_CriaMatriculaPendente()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularAlunoAsync(aluno.Id, turma.Id);

        Assert.Equal(StatusMatricula.Pendente, matricula.Status);
        Assert.Equal(curso.Id, matricula.CursoId);
        Assert.NotEmpty(matricula.CodigoRegistro);
    }

    [Fact]
    public async Task MatricularAlunoAsync_ImpedeMatriculaDuplicadaNaMesmaTurma()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);

        await service.MatricularAlunoAsync(aluno.Id, turma.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MatricularAlunoAsync(aluno.Id, turma.Id));
    }

    [Fact]
    public async Task MatricularAlunoAsync_AlunoInexistente_LancaKeyNotFound()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.MatricularAlunoAsync(alunoId: 999, turma.Id));
    }

    [Fact]
    public async Task AprovarMatriculaAsync_AprovaEAtualizaTurmaDoAluno()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);
        var matricula = await service.MatricularAlunoAsync(aluno.Id, turma.Id);

        await service.AprovarMatriculaAsync(matricula.Id, turma.Id);

        var matriculaAtualizada = await service.ObterMatriculaPorIdAsync(matricula.Id);
        Assert.Equal(StatusMatricula.Aprovada, matriculaAtualizada.Status);
        Assert.Equal(turma.Id, matriculaAtualizada.TurmaId);

        var alunoAtualizado = context.Alunos.Single(a => a.Id == aluno.Id);
        Assert.NotEqual("Pendente", alunoAtualizado.Matricula);
    }

    [Fact]
    public async Task AprovarMatriculaAsync_TurmaDeOutroCurso_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var outroCurso = new Curso { Titulo = "Outro Curso", CodigoRegistro = "CUR-0002" };
        context.Cursos.Add(outroCurso);
        context.SaveChanges();

        var turmaDoCurso = CriarTurma(context, curso.Id);
        var turmaDeOutroCurso = CriarTurma(context, outroCurso.Id);
        var aluno = CriarAluno(context);
        var matricula = await service.MatricularAlunoAsync(aluno.Id, turmaDoCurso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AprovarMatriculaAsync(matricula.Id, turmaDeOutroCurso.Id));
    }

    [Fact]
    public async Task RejeitarMatriculaAsync_MarcaComoRejeitada()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);
        var matricula = await service.MatricularAlunoAsync(aluno.Id, turma.Id);

        await service.RejeitarMatriculaAsync(matricula.Id);

        var matriculaAtualizada = await service.ObterMatriculaPorIdAsync(matricula.Id);
        Assert.Equal(StatusMatricula.Rejeitada, matriculaAtualizada.Status);
    }

    [Fact]
    public async Task AprovarMatriculasAutomaticamenteAsync_AprovaValidasEReportaErros()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);
        var matricula = await service.MatricularAlunoAsync(aluno.Id, turma.Id);

        var resultado = await service.AprovarMatriculasAutomaticamenteAsync(new[] { matricula.Id, 999 });

        Assert.Equal(2, resultado.TotalSolicitado);
        Assert.Single(resultado.Aprovadas);
        Assert.Single(resultado.Erros);
        Assert.Equal(matricula.Id, resultado.Aprovadas[0].MatriculaId);
        Assert.Equal(999, resultado.Erros[0].MatriculaId);
    }

    [Fact]
    public async Task MatricularViaCadastroAsync_CriaMatriculaJaAprovadaComTurma()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularViaCadastroAsync(aluno.Id, curso.Id);

        Assert.Equal(StatusMatricula.Aprovada, matricula.Status);
        Assert.Equal(turma.Id, matricula.TurmaId);
        Assert.Equal(curso.Id, matricula.CursoId);
        Assert.NotEmpty(matricula.CodigoRegistro);

        var alunoAtualizado = context.Alunos.Single(a => a.Id == aluno.Id);
        Assert.NotEqual("Pendente", alunoAtualizado.Matricula);
    }

    [Fact]
    public async Task MatricularViaCadastroAsync_CursoSemTurma_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context); // sem CriarTurma
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MatricularViaCadastroAsync(aluno.Id, curso.Id));
    }

    [Fact]
    public async Task MatricularViaCadastroAsync_CursoPago_CriaPagamentoPendente()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularViaCadastroAsync(aluno.Id, curso.Id);

        var pagamento = context.Pagamentos.Single(p => p.MatriculaId == matricula.Id);
        Assert.Equal(StatusPagamento.Pendente, pagamento.Status);
        Assert.Equal(199.90m, pagamento.Valor);
    }

    [Fact]
    public async Task MatricularViaCadastroAsync_CursoGratuito_NaoCriaPagamento()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        CriarTurma(context, curso.Id);
        var aluno = CriarAluno(context);

        var matricula = await service.MatricularViaCadastroAsync(aluno.Id, curso.Id);

        Assert.False(context.Pagamentos.Any(p => p.MatriculaId == matricula.Id));
    }
}
