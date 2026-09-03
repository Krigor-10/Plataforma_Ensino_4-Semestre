using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class CursoDesempenhoServiceTests
{
    private static CursoDesempenhoService CriarService(PlataformaContext context) => new(context);

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

    private static Coordenador CriarCoordenador(PlataformaContext context)
    {
        var coordenador = new Coordenador
        {
            Nome = "Coordenador Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "33344455566",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            CodigoRegistro = $"COORD-{Guid.NewGuid():N}"[..10]
        };
        coordenador.ConfigurarAcesso("Coordenador", "hash-fake");

        context.Coordenadores.Add(coordenador);
        context.SaveChanges();
        return coordenador;
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

    private static Curso CriarCurso(PlataformaContext context, int? coordenadorId = null)
    {
        var curso = new Curso
        {
            Titulo = "Curso Teste",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            CoordenadorId = coordenadorId
        };
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

    private static Turma CriarTurma(PlataformaContext context, int cursoId, int professorId)
    {
        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = $"TUR-{Guid.NewGuid():N}"[..9], CursoId = cursoId, ProfessorId = professorId };
        context.Turmas.Add(turma);
        context.SaveChanges();
        return turma;
    }

    private static Matricula CriarMatriculaAprovada(PlataformaContext context, int alunoId, int cursoId, int turmaId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.VincularTurma(turmaId);
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static ConteudoDidatico CriarConteudoPublicado(PlataformaContext context, int turmaId, int moduloId, int professorId)
    {
        var conteudo = new ConteudoDidatico
        {
            Titulo = "Material Teste",
            TurmaId = turmaId,
            ModuloId = moduloId,
            PesoProgresso = 1
        };
        conteudo.DefinirProfessorAutor(professorId);
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado);

        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    // ---------- Isolamento por papel (limite de seguranca) ----------

    [Fact]
    public async Task ObterDesempenhoPorProfessorAsync_NaoRetornaCursosDeOutroProfessor()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var professorA = CriarProfessor(context);
        var cursoA = CriarCurso(context);
        CriarTurma(context, cursoA.Id, professorA.Id);

        var professorB = CriarProfessor(context);
        var cursoB = CriarCurso(context);
        CriarTurma(context, cursoB.Id, professorB.Id);

        var resultado = (await service.ObterDesempenhoPorProfessorAsync(professorA.Id)).ToList();

        var cursoRetornado = Assert.Single(resultado);
        Assert.Equal(cursoA.Id, cursoRetornado.CursoId);
        Assert.DoesNotContain(resultado, c => c.CursoId == cursoB.Id);
    }

    [Fact]
    public async Task ObterDesempenhoPorProfessorAsync_ProfessorSemTurmas_RetornaVazio()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);

        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        CriarTurma(context, curso.Id, outroProfessor.Id);

        var resultado = await service.ObterDesempenhoPorProfessorAsync(professor.Id);

        Assert.Empty(resultado);
    }

    [Fact]
    public async Task ObterDesempenhoPorCoordenadorAsync_NaoRetornaCursosDeOutroCoordenador()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var coordenadorA = CriarCoordenador(context);
        var cursoA = CriarCurso(context, coordenadorA.Id);

        var coordenadorB = CriarCoordenador(context);
        var cursoB = CriarCurso(context, coordenadorB.Id);

        var resultado = (await service.ObterDesempenhoPorCoordenadorAsync(coordenadorA.Id)).ToList();

        var cursoRetornado = Assert.Single(resultado);
        Assert.Equal(cursoA.Id, cursoRetornado.CursoId);
        Assert.DoesNotContain(resultado, c => c.CursoId == cursoB.Id);
    }

    // ---------- Correcao da agregacao ----------

    [Fact]
    public async Task ObterDesempenhoPorProfessorAsync_AgregaProgressoDoMaterialEDoModuloCorretamente()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, professor.Id);

        var aluno = CriarAluno(context);
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);

        context.ProgressosConteudosAlunos.Add(new ProgressoConteudoAluno
        {
            MatriculaId = matricula.Id,
            ConteudoDidaticoId = conteudo.Id,
            ModuloId = modulo.Id,
            StatusProgresso = StatusProgressoAprendizagem.Concluido,
            PercentualConclusao = 100m
        });
        context.ProgressosModulosAlunos.Add(new ProgressoModuloAluno
        {
            MatriculaId = matricula.Id,
            ModuloId = modulo.Id,
            StatusProgresso = StatusProgressoAprendizagem.Concluido,
            PercentualConclusao = 100m
        });
        context.ProgressosCursosAlunos.Add(new ProgressoCursoAluno
        {
            MatriculaId = matricula.Id,
            CursoId = curso.Id,
            StatusProgresso = StatusProgressoAprendizagem.Concluido,
            PercentualConclusao = 100m
        });
        context.SaveChanges();

        var resultado = (await new CursoDesempenhoService(context).ObterDesempenhoPorProfessorAsync(professor.Id)).ToList();

        var cursoDto = Assert.Single(resultado);
        Assert.Equal(1, cursoDto.TotalAlunos);
        Assert.Equal(100m, cursoDto.ProgressoMedio);
        Assert.Equal(100m, cursoDto.PercentualConclusao);

        var moduloDto = Assert.Single(cursoDto.Modulos);
        Assert.Equal(100m, moduloDto.ProgressoMedio);

        var materialDto = Assert.Single(moduloDto.Materiais);
        Assert.Equal(conteudo.Id, materialDto.ConteudoDidaticoId);
        Assert.Equal(100m, materialDto.PercentualConclusao);
        Assert.Equal(1, materialDto.AlunosConcluiram);
    }

    [Fact]
    public async Task ObterDesempenhoPorProfessorAsync_SemProgressoRegistrado_RetornaZeroEmVezDeErro()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarConteudoPublicado(context, turma.Id, modulo.Id, professor.Id);

        var aluno = CriarAluno(context);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);

        var resultado = (await CriarService(context).ObterDesempenhoPorProfessorAsync(professor.Id)).ToList();

        var cursoDto = Assert.Single(resultado);
        Assert.Equal(1, cursoDto.TotalAlunos);
        Assert.Equal(0m, cursoDto.ProgressoMedio);

        var moduloDto = Assert.Single(cursoDto.Modulos);
        var materialDto = Assert.Single(moduloDto.Materiais);
        Assert.Equal(0m, materialDto.PercentualConclusao);
        Assert.Equal(0, materialDto.AlunosConcluiram);
    }
}
