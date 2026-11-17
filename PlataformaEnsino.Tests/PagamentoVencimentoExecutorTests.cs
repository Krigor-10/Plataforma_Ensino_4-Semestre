using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class PagamentoVencimentoExecutorTests
{
    private static int _contadorAluno;

    private static Aluno CriarAluno(PlataformaContext context)
    {
        var sufixo = System.Threading.Interlocked.Increment(ref _contadorAluno);
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = $"{sufixo:D11}",
            Matricula = $"ALU-{sufixo:D4}"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 199.90m)
    {
        var curso = new Curso { Titulo = "Curso Pago", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..10], Preco = preco, ModeloCurso = ModeloCurso.PagoPacote };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Matricula CriarMatricula(PlataformaContext context, int alunoId, int cursoId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..10] };
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static Pagamento CriarPagamentoPendente(PlataformaContext context, int matriculaId, decimal valor, DateTime criadoEm)
    {
        var pagamento = Pagamento.CriarPendente(matriculaId, valor);
        pagamento.RegistrarCriacao(criadoEm);
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();
        return pagamento;
    }

    [Fact]
    public async Task ExecutarAsync_PendenteCriadoHaMenosDoQueODiasParaVencer_NaoVence()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        var pagamento = CriarPagamentoPendente(context, matricula.Id, 199.90m, DateTime.UtcNow.AddDays(-2));

        var vencidos = await PagamentoVencimentoExecutor.ExecutarAsync(context, diasParaVencer: 3);

        Assert.Equal(0, vencidos);
        Assert.Equal(StatusPagamento.Pendente, context.Pagamentos.Single(p => p.Id == pagamento.Id).Status);
    }

    [Fact]
    public async Task ExecutarAsync_PendenteCriadoHaMaisDoQueODiasParaVencer_CancelaOPagamento()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        var pagamento = CriarPagamentoPendente(context, matricula.Id, 199.90m, DateTime.UtcNow.AddDays(-4));

        var vencidos = await PagamentoVencimentoExecutor.ExecutarAsync(context, diasParaVencer: 3);

        Assert.Equal(1, vencidos);
        Assert.Equal(StatusPagamento.Cancelado, context.Pagamentos.Single(p => p.Id == pagamento.Id).Status);
    }

    [Fact]
    public async Task ExecutarAsync_PagamentoJaPago_NuncaECancelado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        var pagamento = CriarPagamentoPendente(context, matricula.Id, 199.90m, DateTime.UtcNow.AddDays(-10));
        pagamento.ConfirmarPagamento();
        context.SaveChanges();

        var vencidos = await PagamentoVencimentoExecutor.ExecutarAsync(context, diasParaVencer: 3);

        Assert.Equal(0, vencidos);
        Assert.Equal(StatusPagamento.Pago, context.Pagamentos.Single(p => p.Id == pagamento.Id).Status);
    }

    [Fact]
    public async Task ExecutarAsync_UsaOParametroDiasParaVencer_NaoOPadrao()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id);
        var pagamento = CriarPagamentoPendente(context, matricula.Id, 199.90m, DateTime.UtcNow.AddDays(-2));

        var vencidos = await PagamentoVencimentoExecutor.ExecutarAsync(context, diasParaVencer: 1);

        Assert.Equal(1, vencidos);
        Assert.Equal(StatusPagamento.Cancelado, context.Pagamentos.Single(p => p.Id == pagamento.Id).Status);
    }
}
