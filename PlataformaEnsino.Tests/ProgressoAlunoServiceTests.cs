using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ProgressoAlunoServiceTests
{
    private static (ProgressoAlunoService Service, PlataformaContext Context) CriarService()
    {
        var context = TestContextFactory.Criar();
        return (new ProgressoAlunoService(context, new AcessoAcademicoService(context)), context);
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
            Matricula = "ALU-0001"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static (Curso Curso, Modulo Modulo, Turma Turma, Matricula Matricula, Aluno Aluno) CriarCenarioAprovado(PlataformaContext context)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = "CUR-0001" };
        context.Cursos.Add(curso);
        context.SaveChanges();

        var modulo = new Modulo { Titulo = "Modulo 1", CodigoRegistro = "MOD-0001", CursoId = curso.Id };
        context.Modulos.Add(modulo);

        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = "TUR-0001", CursoId = curso.Id };
        context.Turmas.Add(turma);
        context.SaveChanges();

        var aluno = CriarAluno(context);

        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = "MAT-0001" };
        matricula.VincularTurma(turma.Id);
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        return (curso, modulo, turma, matricula, aluno);
    }

    private static ConteudoDidatico CriarConteudoPublicado(PlataformaContext context, int turmaId, int moduloId, string titulo)
    {
        var conteudo = new ConteudoDidatico
        {
            Titulo = titulo,
            TurmaId = turmaId,
            ModuloId = moduloId,
            PesoProgresso = 1
        };
        conteudo.DefinirProfessorAutor(1);
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado);

        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_UmDeDoisConteudos_DeixaModuloEmAndamentoNaMetade()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, "Aula 1");
        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, "Aula 2");

        var snapshot = await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);

        var moduloProgresso = Assert.Single(snapshot.Modulos);
        Assert.Equal(50m, moduloProgresso.PercentualConclusao);
        Assert.Equal(StatusProgressoAprendizagem.EmAndamento, moduloProgresso.StatusProgresso);
        Assert.Equal(1, moduloProgresso.ConteudosConcluidos);
        Assert.Equal(2, moduloProgresso.TotalConteudos);

        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(50m, cursoProgresso.PercentualConclusao);
        Assert.Equal(0, cursoProgresso.ModulosConcluidos);
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_TodosConteudosDoModulo_ConcluiModuloECurso()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, "Aula 1");
        var conteudo2 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, "Aula 2");

        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);
        var snapshot = await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo2.Id);

        var moduloProgresso = Assert.Single(snapshot.Modulos);
        Assert.Equal(100m, moduloProgresso.PercentualConclusao);
        Assert.Equal(StatusProgressoAprendizagem.Concluido, moduloProgresso.StatusProgresso);

        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
        Assert.Equal(1, cursoProgresso.ModulosConcluidos);
        Assert.Equal(StatusProgressoAprendizagem.Concluido, cursoProgresso.StatusProgresso);
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_ConteudoNaoPublicado_LancaKeyNotFound()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo = new ConteudoDidatico
        {
            Titulo = "Rascunho",
            TurmaId = cenario.Turma.Id,
            ModuloId = cenario.Modulo.Id,
            PesoProgresso = 1
        };
        conteudo.DefinirProfessorAutor(1);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo.Id));
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_AlunoSemMatriculaAprovadaNaTurma_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, "Aula 1");

        var outroAluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MarcarConteudoConcluidoAsync(outroAluno.Id, conteudo.Id));
    }

    [Fact]
    public async Task ObterSnapshotAsync_AlunoInexistente_LancaKeyNotFound()
    {
        var (service, _) = CriarService();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterSnapshotAsync(999));
    }

    [Fact]
    public async Task ObterSnapshotAsync_AlunoSemMatriculaAprovada_RetornaSnapshotVazio()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);

        var snapshot = await service.ObterSnapshotAsync(aluno.Id);

        Assert.Empty(snapshot.Conteudos);
        Assert.Empty(snapshot.Modulos);
        Assert.Empty(snapshot.Cursos);
    }
}
