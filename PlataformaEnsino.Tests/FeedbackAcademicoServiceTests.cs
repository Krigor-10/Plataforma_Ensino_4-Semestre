using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class FeedbackAcademicoServiceTests
{
    private static FeedbackAcademicoService CriarService(PlataformaContext context) => new(context);

    private static Professor CriarProfessor(PlataformaContext context)
    {
        var professor = new Professor
        {
            Nome = "Professor Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", "hash-fake");

        context.Professores.Add(professor);
        context.SaveChanges();
        return professor;
    }

    private static Aluno CriarAluno(PlataformaContext context)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "22233344455",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = "ALU-0001"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9] };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static void VincularProfessorCurso(PlataformaContext context, int professorId, int cursoId)
    {
        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
    }

    // Espelha o fluxo real de producao (MatriculaService.AprovarMatriculaAsync),
    // que nunca vincula TurmaId — ver pendencia_fase_b_remocao_turma na memoria.
    private static Matricula CriarMatriculaAprovadaSemTurma(PlataformaContext context, int alunoId, int cursoId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static CriarFeedbackAcademicoDto NovoFeedbackDto() => new()
    {
        Origem = "Avaliacao",
        Mensagem = "Precisa reforcar o conteudo do modulo 2."
    };

    [Fact]
    public async Task CriarFeedbackAsync_MatriculaSemTurma_PermiteEnvio()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar permitindo que o professor do curso envie feedback.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        var resultado = await service.CriarFeedbackAsync(professor.Id, aluno.Id, NovoFeedbackDto());

        Assert.Equal("Avaliacao", resultado.Origem);
    }

    [Fact]
    public async Task CriarFeedbackAsync_ProfessorSemVinculoAoCurso_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarFeedbackAsync(professor.Id, aluno.Id, NovoFeedbackDto()));
    }

    [Fact]
    public async Task ListarPorAlunoAsync_ComoAlunoDono_RetornaFeedback()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);
        await service.CriarFeedbackAsync(professor.Id, aluno.Id, NovoFeedbackDto());

        var resultado = await service.ListarPorAlunoAsync(aluno.Id, aluno.Id, "Aluno");

        Assert.Single(resultado);
    }

    [Fact]
    public async Task MarcarComoLidoAsync_MarcaFeedbackComoLido()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);
        var feedback = await service.CriarFeedbackAsync(professor.Id, aluno.Id, NovoFeedbackDto());

        await service.MarcarComoLidoAsync(feedback.Id, aluno.Id);

        var resultado = (await service.ListarPorAlunoAsync(aluno.Id, aluno.Id, "Aluno")).Single();
        Assert.True(resultado.Lido);
    }
}
