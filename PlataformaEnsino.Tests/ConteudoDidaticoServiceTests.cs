using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ConteudoDidaticoServiceTests
{
    private static ConteudoDidaticoService CriarService(PlataformaContext context) => new(
        new ConteudoDidaticoRepository(context),
        new GenericRepository<Aluno>(context),
        new GenericRepository<Professor>(context),
        new GenericRepository<Turma>(context),
        new GenericRepository<Modulo>(context),
        new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
        new CursoService(
            context,
            new GenericRepository<Curso>(context),
            new GenericRepository<Coordenador>(context),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new CertificadoService(context, new AcessoAcademicoService(context))),
        context);

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

    private static void VincularProfessorCurso(PlataformaContext context, int professorId, int cursoId)
    {
        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
    }

    // Espelha o fluxo real de producao (MatriculaService.AprovarNoCursoAsync),
    // que nunca vincula TurmaId — ver pendencia_fase_b_remocao_turma na memoria.
    private static Matricula CriarMatriculaAprovadaSemTurma(PlataformaContext context, int alunoId, int cursoId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static CriarConteudoDidaticoDto NovoConteudoDto(int turmaId, int moduloId, StatusPublicacao status = StatusPublicacao.Publicado) => new()
    {
        Titulo = "Conteudo Teste",
        Descricao = "Descricao",
        TipoConteudo = TipoConteudoDidatico.Texto,
        CorpoTexto = "Corpo do conteudo",
        TurmaId = turmaId,
        ModuloId = moduloId,
        StatusPublicacao = status,
        OrdemExibicao = 1,
        PesoProgresso = 1
    };

    [Fact]
    public async Task CriarConteudoAsync_ProfessorVinculadoAoCurso_SetaCursoIdDoModulo()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));

        Assert.Equal(curso.Id, conteudo.CursoId);
    }

    [Fact]
    public async Task CriarConteudoAsync_ProfessorSemVinculoAoCurso_LancaInvalidOperation()
    {
        // O professor e dono da Turma (Turma.ProfessorId) mas NAO tem vinculo
        // em ProfessorCurso — a autorizacao agora e por curso, nao por turma.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id)));
    }

    [Fact]
    public async Task CriarConteudoAsync_CursoAcompanhadoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id)));
    }

    [Fact]
    public async Task ListarConteudosPorAlunoAsync_MatriculaSemTurma_RetornaConteudoDoCurso()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar liberando o conteudo publicado do curso.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));

        var resultado = await service.ListarConteudosPorAlunoAsync(aluno.Id);

        Assert.Single(resultado);
    }

    [Fact]
    public async Task AtualizarConteudoAsync_PublicaConteudo_NotificaAlunosMatriculadosNoCurso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id, StatusPublicacao.Rascunho));
        await service.AtualizarConteudoAsync(conteudo.Id, professor.Id, new AtualizarConteudoDidaticoDto
        {
            Titulo = conteudo.Titulo,
            Descricao = conteudo.Descricao,
            TipoConteudo = conteudo.TipoConteudo,
            CorpoTexto = conteudo.CorpoTexto,
            TurmaId = turma.Id,
            ModuloId = modulo.Id,
            StatusPublicacao = StatusPublicacao.Publicado,
            OrdemExibicao = conteudo.OrdemExibicao,
            PesoProgresso = conteudo.PesoProgresso
        });

        var notificacoes = context.Notificacoes.Where(n => n.UsuarioId == aluno.Id).ToList();
        Assert.Single(notificacoes);
    }

    [Fact]
    public async Task ExcluirConteudoAsync_SemDependencias_Exclui()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));

        await service.ExcluirConteudoAsync(conteudo.Id, professor.Id);

        Assert.Null(context.ConteudosDidaticos.Find(conteudo.Id));
    }

    [Fact]
    public async Task ExcluirConteudoAsync_OutroProfessor_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ExcluirConteudoAsync(conteudo.Id, outroProfessor.Id));
    }

    [Fact]
    public async Task ExcluirConteudoAsync_ComAvaliacaoVinculada_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));

        var quiz = new Avaliacao { Titulo = "Quiz do material", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Quiz };
        quiz.DefinirCurso(curso.Id);
        quiz.ConteudoDidaticoId = conteudo.Id;
        context.Avaliacoes.Add(quiz);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ExcluirConteudoAsync(conteudo.Id, professor.Id));
    }

    [Fact]
    public async Task ExcluirConteudoAsync_ComProgressoDeAluno_LancaInvalidOperation()
    {
        // Achado da Fase 6 da auditoria geral: ProgressoConteudoAluno->ConteudoDidatico
        // e Cascade (ver ProgressoConfiguration) - sem este bloqueio, o historico de
        // conclusao do aluno seria apagado junto, sem recalcular o progresso agregado.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var conteudo = await service.CriarConteudoAsync(professor.Id, NovoConteudoDto(turma.Id, modulo.Id));
        var matricula = CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        context.ProgressosConteudosAlunos.Add(new ProgressoConteudoAluno
        {
            MatriculaId = matricula.Id,
            ConteudoDidaticoId = conteudo.Id,
            ModuloId = modulo.Id,
            PercentualConclusao = 100
        });
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ExcluirConteudoAsync(conteudo.Id, professor.Id));
    }
}
