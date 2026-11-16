using Microsoft.EntityFrameworkCore;
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

    private static ConteudoDidatico CriarConteudoPublicado(PlataformaContext context, int turmaId, int moduloId, int cursoId, string titulo)
    {
        var conteudo = new ConteudoDidatico
        {
            Titulo = titulo,
            TurmaId = turmaId,
            ModuloId = moduloId,
            PesoProgresso = 1
        };
        conteudo.DefinirProfessorAutor(1);
        conteudo.DefinirCurso(cursoId);
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado);

        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    // Achado da auditoria de lixeira de conteudos (05/11): RecalcularModuloAsync/
    // RecalcularCursoAsync nao filtravam ExcluidoEm - um material excluido (soft-
    // delete, usado quando ja ha progresso de ALGUM aluno) continuava contando no
    // denominador do progresso de OUTROS alunos, que nunca conseguiriam completar
    // 100% porque o material "excluido" e invisivel. Corrigido adicionando o
    // filtro nas duas queries.
    [Fact]
    public async Task MarcarConteudoConcluidoAsync_ComOutroConteudoExcluidoNoModulo_IgnoraOExcluidoNoCalculo()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        var conteudo2 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2 (excluida)");
        conteudo2.MarcarComoExcluido();
        context.SaveChanges();

        var snapshot = await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);

        var moduloProgresso = Assert.Single(snapshot.Modulos);
        Assert.Equal(100m, moduloProgresso.PercentualConclusao);
        Assert.Equal(StatusProgressoAprendizagem.Concluido, moduloProgresso.StatusProgresso);
        Assert.Equal(1, moduloProgresso.TotalConteudos);

        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
    }

    // Regressao do risco critico do plano fluxo-venda-cursos (achado 1): o
    // aluno matriculou quando o curso era gratuito - ValorNaMatricula ficou
    // congelado em 0 na matricula (ver CriarCenarioAprovado, que cria o curso
    // com Preco=0 e nao chama DefinirValorNaMatricula, equivalente ao
    // default 0). O curso depois vira pago (ex.: fluxo Gratuito -> pacote).
    // O snapshot continua liberado pra essa matricula antiga, porque o
    // predicado le ValorNaMatricula, nunca o Curso.Preco atual.
    [Fact]
    public async Task ObterSnapshotAsync_CursoViraPagoDepoisDaMatricula_MatriculaAntigaContinuaLiberada()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");

        // Progresso registrado AINDA com o curso gratuito.
        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo.Id);

        // Curso vira pago DEPOIS - ValorNaMatricula da matricula ja existente
        // continua 0, entao o snapshot precisa continuar mostrando o progresso.
        cenario.Curso.Preco = 29.90m;
        context.SaveChanges();

        var snapshot = await service.ObterSnapshotAsync(cenario.Aluno.Id);

        Assert.Contains(snapshot.Conteudos, item => item.ConteudoDidaticoId == conteudo.Id);
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_MatriculaNovaEmCursoJaPagoSemPagamento_LancaInvalidOperation()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");

        cenario.Curso.Preco = 29.90m;
        context.SaveChanges();

        var alunoNovo = CriarAluno(context);
        var matriculaNova = new Matricula { AlunoId = alunoNovo.Id, CursoId = cenario.Curso.Id, CodigoRegistro = "MAT-0002" };
        matriculaNova.DefinirValorNaMatricula(cenario.Curso.Preco);
        matriculaNova.VincularTurma(cenario.Turma.Id);
        matriculaNova.Aprovar();
        context.Matriculas.Add(matriculaNova);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MarcarConteudoConcluidoAsync(alunoNovo.Id, conteudo.Id));
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_UmDeDoisConteudos_DeixaModuloEmAndamentoNaMetade()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2");

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
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        var conteudo2 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2");

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
        var conteudo = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");

        var outroAluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.MarcarConteudoConcluidoAsync(outroAluno.Id, conteudo.Id));
    }

    [Fact]
    public async Task MarcarConteudoConcluidoAsync_MatriculaSemTurma_ConcluiModuloECurso()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar permitindo marcar conteudo concluido e calcular progresso.
        var (service, context) = CriarService();

        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = "CUR-0002" };
        context.Cursos.Add(curso);
        context.SaveChanges();

        var modulo = new Modulo { Titulo = "Modulo 1", CodigoRegistro = "MOD-0002", CursoId = curso.Id };
        context.Modulos.Add(modulo);

        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = "TUR-0002", CursoId = curso.Id };
        context.Turmas.Add(turma);
        context.SaveChanges();

        var aluno = CriarAluno(context);

        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = "MAT-0002" };
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, curso.Id, "Aula 1");

        var snapshot = await service.MarcarConteudoConcluidoAsync(aluno.Id, conteudo.Id);

        var moduloProgresso = Assert.Single(snapshot.Modulos);
        Assert.Equal(100m, moduloProgresso.PercentualConclusao);

        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
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

    // PROMPT-agente-progresso-e-trava-ao-concluir.md, Parte B: o professor
    // publica conteudo novo depois do aluno ja estar em 100% - o progresso
    // precisa cair na hora, sem o aluno fazer nada.
    [Fact]
    public async Task RecalcularProgressoDoCursoAsync_ConteudoNovoPublicadoDepoisDe100Porcento_FazPercentualCair()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);

        // Professor publica um segundo conteudo - simula o caminho que
        // ConteudoDidaticoService.CriarConteudoAsync chama depois de salvar.
        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2 (nova)");

        await service.RecalcularProgressoDoCursoAsync(cenario.Curso.Id);

        var snapshot = await service.ObterSnapshotAsync(cenario.Aluno.Id);
        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(50m, cursoProgresso.PercentualConclusao);
    }

    [Fact]
    public async Task RecalcularProgressoDoCursoAsync_CursoEncerrado_NaoRecalcula()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);

        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2 (nova)");
        cenario.Curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await service.RecalcularProgressoDoCursoAsync(cenario.Curso.Id);

        var snapshot = await service.ObterSnapshotAsync(cenario.Aluno.Id);
        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
    }

    [Fact]
    public async Task RecalcularProgressoDoCursoAsync_CursoConcluidoPeloProfessorAguardandoEncerramento_NaoRecalcula()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        cenario.Curso.ModeloCurso = ModeloCurso.Gratuito;
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);

        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2 (nova)");
        cenario.Curso.ConcluirPeloProfessor(professorId: 1);
        context.SaveChanges();

        await service.RecalcularProgressoDoCursoAsync(cenario.Curso.Id);

        var snapshot = await service.ObterSnapshotAsync(cenario.Aluno.Id);
        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
    }

    [Fact]
    public async Task RecalcularProgressoDoCursoAsync_CertificadoJaEmitido_ContinuaPreservado()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);
        var conteudo1 = CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenario.Aluno.Id, conteudo1.Id);
        cenario.Matricula.EmitirCertificado();
        context.SaveChanges();
        var certificadoEmitidoEm = cenario.Matricula.CertificadoEmitidoEm;

        CriarConteudoPublicado(context, cenario.Turma.Id, cenario.Modulo.Id, cenario.Curso.Id, "Aula 2 (nova)");
        await service.RecalcularProgressoDoCursoAsync(cenario.Curso.Id);

        var matriculaAtualizada = context.Matriculas.Single(m => m.Id == cenario.Matricula.Id);
        Assert.Equal(certificadoEmitidoEm, matriculaAtualizada.CertificadoEmitidoEm);
        Assert.NotNull(matriculaAtualizada.CertificadoEmitidoEm);
    }

    // Migracao de dados: roda em curso concluido-pelo-professor-aguardando
    // (excecao deliberada, so pra esta correcao historica), mas nao em
    // curso encerrado.
    [Fact]
    public async Task RecalcularProgressoDeCursosNaoEncerradosAsync_CorrigeConcluidoAguardandoMasIgnoraEncerrado()
    {
        var (service, context) = CriarService();

        var cenarioAguardando = CriarCenarioAprovado(context);
        cenarioAguardando.Curso.ModeloCurso = ModeloCurso.Gratuito;
        var conteudoAguardando1 = CriarConteudoPublicado(context, cenarioAguardando.Turma.Id, cenarioAguardando.Modulo.Id, cenarioAguardando.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenarioAguardando.Aluno.Id, conteudoAguardando1.Id);
        CriarConteudoPublicado(context, cenarioAguardando.Turma.Id, cenarioAguardando.Modulo.Id, cenarioAguardando.Curso.Id, "Aula 2 (nova)");
        cenarioAguardando.Curso.ConcluirPeloProfessor(professorId: 1);

        var cenarioEncerrado = CriarCenarioAprovado(context);
        var conteudoEncerrado1 = CriarConteudoPublicado(context, cenarioEncerrado.Turma.Id, cenarioEncerrado.Modulo.Id, cenarioEncerrado.Curso.Id, "Aula 1");
        await service.MarcarConteudoConcluidoAsync(cenarioEncerrado.Aluno.Id, conteudoEncerrado1.Id);
        CriarConteudoPublicado(context, cenarioEncerrado.Turma.Id, cenarioEncerrado.Modulo.Id, cenarioEncerrado.Curso.Id, "Aula 2 (nova)");
        cenarioEncerrado.Curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await service.RecalcularProgressoDeCursosNaoEncerradosAsync();

        var progressoAguardando = context.ProgressosCursosAlunos.Single(p => p.MatriculaId == cenarioAguardando.Matricula.Id);
        Assert.Equal(50m, progressoAguardando.PercentualConclusao);

        var progressoEncerrado = context.ProgressosCursosAlunos.Single(p => p.MatriculaId == cenarioEncerrado.Matricula.Id);
        Assert.Equal(100m, progressoEncerrado.PercentualConclusao);
    }

    // Modulo so com quiz (sem nenhum conteudo) precisa contar em
    // TotalModulos/ModulosConcluidos - antes so agrupava pelos conteudos.
    [Fact]
    public async Task RecalcularProgressoDoCursoAsync_ModuloSoComQuiz_ContaEmTotalModulosQuandoQuizConcluido()
    {
        var (service, context) = CriarService();
        var cenario = CriarCenarioAprovado(context);

        var avaliacaoService = new AvaliacaoService(
            context,
            service,
            new NotificacaoService(context, Microsoft.Extensions.Logging.Abstractions.NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            null!,
            null!,
            null!,
            new CursoService(
                context,
                new PlataformaEnsino.API.Repositories.GenericRepository<Curso>(context),
                new PlataformaEnsino.API.Repositories.GenericRepository<Coordenador>(context),
                new NotificacaoService(context, Microsoft.Extensions.Logging.Abstractions.NullLogger<NotificacaoService>.Instance),
                new CertificadoService(context, new AcessoAcademicoService(context))));

        var professor = new Professor { Nome = "Professor Teste", Email = $"{Guid.NewGuid():N}@teste.local", Cpf = "22233344455", CodigoRegistro = "PRF-0001" };
        professor.ConfigurarAcesso("Professor", "hash-fake");
        context.Professores.Add(professor);
        context.SaveChanges();
        context.ProfessoresCursos.Add(new ProfessorCurso { CursoId = cenario.Curso.Id, ProfessorId = professor.Id });
        context.SaveChanges();

        var quiz = await avaliacaoService.CriarAvaliacaoAsync(professor.Id, new PlataformaEnsino.API.DTOs.CriarAvaliacaoDto
        {
            Titulo = "Quiz do modulo",
            CursoId = cenario.Curso.Id,
            ModuloId = cenario.Modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        });
        await avaliacaoService.AdicionarQuestaoAsync(quiz.Id, professor.Id, new PlataformaEnsino.API.DTOs.CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao",
            Enunciado = "Enunciado",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 1,
            Alternativas = new List<PlataformaEnsino.API.DTOs.CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "Certa", EhCorreta = true },
                new() { Letra = "B", Texto = "Errada", EhCorreta = false }
            }
        });
        quiz.Publicar();
        context.Avaliacoes.Update(quiz);
        context.SaveChanges();

        await avaliacaoService.EnviarRespostasAlunoAsync(quiz.Id, cenario.Aluno.Id, new PlataformaEnsino.API.DTOs.EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<PlataformaEnsino.API.DTOs.RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = (await context.QuestoesPublicadas.FirstAsync(q => q.AvaliacaoId == quiz.Id)).Id, AlternativaId = (await context.AlternativasQuestoesPublicadas.FirstAsync(a => a.EhCorreta)).Id }
            }
        });

        var snapshot = await service.ObterSnapshotAsync(cenario.Aluno.Id);
        var cursoProgresso = Assert.Single(snapshot.Cursos);
        Assert.Equal(1, cursoProgresso.TotalModulos);
        Assert.Equal(1, cursoProgresso.ModulosConcluidos);
        Assert.Equal(100m, cursoProgresso.PercentualConclusao);
    }
}
