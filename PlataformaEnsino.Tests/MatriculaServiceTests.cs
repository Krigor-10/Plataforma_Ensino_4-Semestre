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
            new CursoService(
                context,
                new GenericRepository<Curso>(context),
                new GenericRepository<Coordenador>(context),
                new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
                new CertificadoService(context, new AcessoAcademicoService(context))));

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

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_CursoAcompanhadoEncerrado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id));
    }

    [Fact]
    public async Task ComprarCursoAsync_CursoPago_AprovaMatriculaEConfirmaPagamento()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);

        var matricula = await service.ComprarCursoAsync(aluno.Id, curso.Id);

        Assert.Equal(StatusMatricula.Aprovada, matricula.Status);
        var pagamento = context.Pagamentos.Single(p => p.MatriculaId == matricula.Id);
        Assert.Equal(StatusPagamento.Pago, pagamento.Status);
        Assert.NotNull(pagamento.PagoEm);
    }

    [Fact]
    public async Task ComprarCursoAsync_CursoGratuito_AprovaSemCriarPagamento()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);

        var matricula = await service.ComprarCursoAsync(aluno.Id, curso.Id);

        Assert.Equal(StatusMatricula.Aprovada, matricula.Status);
        Assert.False(context.Pagamentos.Any(p => p.MatriculaId == matricula.Id));
    }

    [Fact]
    public async Task ComprarCursoAsync_PagamentoJaPendente_ConcluiCompraSemDuplicarMatricula()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);

        await service.MatricularComAprovacaoAutomaticaAsync(aluno.Id, curso.Id);

        var matricula = await service.ComprarCursoAsync(aluno.Id, curso.Id);

        var aprovadas = context.Matriculas.Count(m =>
            m.AlunoId == aluno.Id && m.CursoId == curso.Id && m.Status == StatusMatricula.Aprovada);
        Assert.Equal(1, aprovadas);

        var pagamentos = context.Pagamentos.Where(p => p.MatriculaId == matricula.Id).ToList();
        Assert.Single(pagamentos);
        Assert.Equal(StatusPagamento.Pago, pagamentos[0].Status);
    }

    [Fact]
    public async Task ComprarCursoAsync_CursoJaCompradoETotalmentePago_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);

        await service.ComprarCursoAsync(aluno.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ComprarCursoAsync(aluno.Id, curso.Id));
    }

    [Fact]
    public async Task ComprarCursoAsync_CursoGratuitoJaIniciado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);

        await service.ComprarCursoAsync(aluno.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ComprarCursoAsync(aluno.Id, curso.Id));
    }

    [Fact]
    public async Task ComprarCursoAsync_CursoAcompanhadoEncerrado_RecusaCompra()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ComprarCursoAsync(aluno.Id, curso.Id));
    }

    // Provider InMemory nao faz rollback real de transacao (so SqlServer, em
    // producao) — por isso este teste de atomicidade usa uma falha que
    // acontece ANTES de qualquer SaveChanges (curso inexistente), ponto em
    // que "nada gravado" e garantido independente do provider.
    [Fact]
    public async Task ComprarCursoAsync_CursoInexistente_NaoGravaNadaELancaKeyNotFound()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);
        var cursoInexistenteId = 999999;

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ComprarCursoAsync(aluno.Id, cursoInexistenteId));

        Assert.False(context.Matriculas.Any(m => m.AlunoId == aluno.Id));
        Assert.False(context.Pagamentos.Any());
    }
}
