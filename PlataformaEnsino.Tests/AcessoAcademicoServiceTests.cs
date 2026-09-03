using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class AcessoAcademicoServiceTests
{
    private static (AcessoAcademicoService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        return (new AcessoAcademicoService(context), context);
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 0)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = "CUR-0001", Preco = preco };
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

    [Fact]
    public async Task TemAcessoLiberadoAsync_MatriculaNaoAprovada_RetornaFalse()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context);
        var aluno = CriarAluno(context);
        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, Curso = curso, CodigoRegistro = "MAT-0001" };
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        var temAcesso = await service.TemAcessoLiberadoAsync(matricula);

        Assert.False(temAcesso);
    }

    [Fact]
    public async Task TemAcessoLiberadoAsync_CursoGratuitoAprovada_RetornaTrue()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 0);
        var aluno = CriarAluno(context);
        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, Curso = curso, CodigoRegistro = "MAT-0001" };
        matricula.AprovarComTurma(1, curso.Id);
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        var temAcesso = await service.TemAcessoLiberadoAsync(matricula);

        Assert.True(temAcesso);
    }

    [Fact]
    public async Task TemAcessoLiberadoAsync_CursoPagoSemPagamentoConfirmado_RetornaFalse()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);
        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, Curso = curso, CodigoRegistro = "MAT-0001" };
        matricula.AprovarComTurma(1, curso.Id);
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        context.Pagamentos.Add(Pagamento.CriarPendente(matricula.Id, curso.Preco));
        context.SaveChanges();

        var temAcesso = await service.TemAcessoLiberadoAsync(matricula);

        Assert.False(temAcesso);
    }

    [Fact]
    public async Task TemAcessoLiberadoAsync_CursoPagoComPagamentoConfirmado_RetornaTrue()
    {
        var (service, context) = CriarService();
        var curso = CriarCurso(context, preco: 199.90m);
        var aluno = CriarAluno(context);
        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, Curso = curso, CodigoRegistro = "MAT-0001" };
        matricula.AprovarComTurma(1, curso.Id);
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        var pagamento = Pagamento.CriarPendente(matricula.Id, curso.Preco);
        pagamento.ConfirmarPagamento();
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();

        var temAcesso = await service.TemAcessoLiberadoAsync(matricula);

        Assert.True(temAcesso);
    }
}
