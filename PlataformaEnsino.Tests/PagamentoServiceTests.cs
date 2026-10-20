using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class PagamentoServiceTests
{
    private static (PagamentoService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        var service = new PagamentoService(
            context,
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance));

        return (service, context);
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 199.90m)
    {
        var curso = new Curso { Titulo = "Curso Pago", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..10], Preco = preco };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Aluno CriarAluno(PlataformaContext context)
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
            Matricula = "Pendente"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Matricula CriarMatricula(PlataformaContext context, int alunoId, int cursoId)
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

    private static Pagamento CriarPagamentoPendente(PlataformaContext context, int matriculaId, decimal valor)
    {
        var pagamento = Pagamento.CriarPendente(matriculaId, valor);
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();
        return pagamento;
    }

    [Fact]
    public async Task ListarPagamentosDoAlunoAsync_RetornaSomenteOsPagamentosDoAluno()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var outroAluno = CriarAluno(context);
        var matriculaDoAluno = CriarMatricula(context, aluno.Id, curso.Id);
        var matriculaDeOutroAluno = CriarMatricula(context, outroAluno.Id, curso.Id);
        CriarPagamentoPendente(context, matriculaDoAluno.Id, 199.90m);
        CriarPagamentoPendente(context, matriculaDeOutroAluno.Id, 199.90m);

        var pagamentos = (await service.ListarPagamentosDoAlunoAsync(aluno.Id)).ToList();

        Assert.Single(pagamentos);
        Assert.Equal(matriculaDoAluno.Id, pagamentos[0].MatriculaId);
        Assert.Equal(curso.Id, pagamentos[0].CursoId);
        Assert.Equal(curso.Titulo, pagamentos[0].CursoTitulo);
    }

    [Fact]
    public async Task ConfirmarPagamentoAsync_MarcaComoPagoENotificaOAluno()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        var pagamento = CriarPagamentoPendente(context, matricula.Id, 199.90m);

        var resultado = await service.ConfirmarPagamentoAsync(matricula.Id, aluno.Id);

        Assert.Equal(StatusPagamento.Pago, resultado.Status);
        Assert.NotNull(resultado.PagoEm);

        var pagamentoAtualizado = context.Pagamentos.Single(p => p.Id == pagamento.Id);
        Assert.Equal(StatusPagamento.Pago, pagamentoAtualizado.Status);

        var notificacao = context.Notificacoes.Single(n => n.UsuarioId == aluno.Id);
        Assert.Equal(TipoNotificacao.PagamentoConfirmado, notificacao.Tipo);
    }

    [Fact]
    public async Task ConfirmarPagamentoAsync_MatriculaDeOutroAluno_LancaKeyNotFound()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var outroAluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        CriarPagamentoPendente(context, matricula.Id, 199.90m);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ConfirmarPagamentoAsync(matricula.Id, outroAluno.Id));
    }

    [Fact]
    public async Task ConfirmarPagamentoAsync_MatriculaSemPagamento_LancaKeyNotFound()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ConfirmarPagamentoAsync(matricula.Id, aluno.Id));
    }

    [Fact]
    public async Task ConfirmarPagamentoAsync_PagamentoJaConfirmado_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        CriarPagamentoPendente(context, matricula.Id, 199.90m);

        await service.ConfirmarPagamentoAsync(matricula.Id, aluno.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConfirmarPagamentoAsync(matricula.Id, aluno.Id));
    }
}
