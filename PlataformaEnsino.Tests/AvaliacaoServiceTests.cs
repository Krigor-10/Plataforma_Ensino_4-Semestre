using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class AvaliacaoServiceTests
{
    private static AvaliacaoService CriarService(PlataformaContext context) => new(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));

    private static CursoService CriarCursoService(PlataformaContext context) =>
        new(
            context,
            new GenericRepository<Curso>(context),
            new GenericRepository<Coordenador>(context),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new CertificadoService(context, new AcessoAcademicoService(context)));

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
        VincularProfessorCurso(context, professorId, cursoId);
        return turma;
    }

    private static void VincularProfessorCurso(PlataformaContext context, int professorId, int cursoId)
    {
        var jaVinculado = context.ProfessoresCursos.Any(vinculo => vinculo.ProfessorId == professorId && vinculo.CursoId == cursoId);
        if (jaVinculado)
        {
            return;
        }

        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
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

    // Default Rascunho - CriarAvaliacaoAsync recusa nascer Publicada (sem
    // questao). Quem realmente precisa de uma avaliacao Publicada usa
    // CriarCenarioComAvaliacaoPublicada (que publica pelo metodo de dominio
    // depois de criar) ou passa status explicito + publica manualmente.
    private static CriarAvaliacaoDto NovaAvaliacaoDto(int cursoId, int moduloId, StatusPublicacao status = StatusPublicacao.Rascunho, int tentativasPermitidas = 1, DateTime? dataAbertura = null, DateTime? dataFechamento = null, TipoAvaliacao tipoAvaliacao = TipoAvaliacao.Quiz)
    {
        return new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Teste",
            Descricao = "Descricao",
            CursoId = cursoId,
            ModuloId = moduloId,
            TipoAvaliacao = tipoAvaliacao,
            StatusPublicacao = status,
            TentativasPermitidas = tentativasPermitidas,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1,
            DataAbertura = dataAbertura,
            DataFechamento = dataFechamento
        };
    }

    private static CriarQuestaoAvaliacaoDto NovaQuestaoObjetivaDto(decimal pontos = 5, string letraCorreta = "A")
    {
        return new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao objetiva",
            Enunciado = "Qual a resposta certa?",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = pontos,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "Certa", EhCorreta = letraCorreta == "A" },
                new() { Letra = "B", Texto = "Errada", EhCorreta = letraCorreta == "B" }
            }
        };
    }

    // ---------- CriarAvaliacaoAsync ----------

    [Fact]
    public async Task CriarAvaliacaoAsync_ComTurmaEModuloValidos_CriaComSucesso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        Assert.Equal("Avaliacao Teste", avaliacao.Titulo);
        Assert.Equal(StatusPublicacao.Rascunho, avaliacao.StatusPublicacao);
        Assert.Null(avaliacao.PublicadoEm);
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_StatusPublicadoSemQuestao_LancaInvalidOperation()
    {
        // Brecha encontrada na auditoria de progresso: AtualizarAvaliacaoAsync
        // ja bloqueava publicar sem questao, mas CriarAvaliacaoAsync aceitava
        // criar ja Publicada - de la vieram quizzes publicados com 0 questoes
        // em producao.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarTurma(context, curso.Id, professor.Id);

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Publicado)));

        Assert.Equal("Adicione ao menos uma questao antes de publicar o quiz.", excecao.Message);
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_CursoAcompanhadoEncerrado_LancaInvalidOperation()
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

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id)));
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_TurmaDeOutroProfessor_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, outroProfessor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id)));
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_ModuloDeOutroCurso_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var outroCurso = CriarCurso(context);
        var moduloDeOutroCurso = CriarModulo(context, outroCurso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, moduloDeOutroCurso.Id)));
    }

    [Fact]
    // Decisao F0 da auditoria de 26/11: toda avaliacao vale de 0 a 10 e a
    // media e simples - NotaMaxima/PesoNota do DTO sao ignorados.
    public async Task CriarAvaliacaoAsync_IgnoraNotaMaximaEPesoDoDto_GravaEscalaDezEPesoUm()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarTurma(context, curso.Id, professor.Id);
        var dto = NovaAvaliacaoDto(curso.Id, modulo.Id, tipoAvaliacao: TipoAvaliacao.Prova);
        dto.NotaMaxima = 0;
        dto.PesoNota = 3;

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, dto);

        Assert.Equal(10m, avaliacao.NotaMaxima);
        Assert.Equal(1m, avaliacao.PesoNota);
    }

    // Decisao E3 da auditoria de 26/11: o professor escolhe de 1 a 10
    // tentativas no quiz; Prova/Exercicio seguem sem limite maximo.
    [Theory]
    [InlineData(TipoAvaliacao.Quiz, 1, true)]
    [InlineData(TipoAvaliacao.Quiz, 10, true)]
    [InlineData(TipoAvaliacao.Quiz, 11, false)]
    [InlineData(TipoAvaliacao.Prova, 15, true)]
    public async Task CriarAvaliacaoAsync_LimiteDeTentativas_QuizAteDez(TipoAvaliacao tipo, int tentativas, bool deveAceitar)
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarTurma(context, curso.Id, professor.Id);
        var dto = NovaAvaliacaoDto(curso.Id, modulo.Id, tentativasPermitidas: tentativas, tipoAvaliacao: tipo);

        if (deveAceitar)
        {
            var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, dto);
            Assert.Equal(tentativas, avaliacao.TentativasPermitidas);
        }
        else
        {
            await Assert.ThrowsAsync<ArgumentException>(() => service.CriarAvaliacaoAsync(professor.Id, dto));
        }
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_FechamentoAntesDaAbertura_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var agora = DateTime.UtcNow;
        var dto = NovaAvaliacaoDto(curso.Id, modulo.Id, dataAbertura: agora, dataFechamento: agora.AddDays(-1));

        await Assert.ThrowsAsync<ArgumentException>(() => service.CriarAvaliacaoAsync(professor.Id, dto));
    }

    // ---------- Atualizar / Excluir (isolamento por professor) ----------

    [Fact]
    public async Task AtualizarAvaliacaoAsync_DeOutroProfessor_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dtoAtualizacao = new AtualizarAvaliacaoDto
        {
            Titulo = "Tentativa de editar",
            CursoId = curso.Id,
            ModuloId = modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            StatusPublicacao = StatusPublicacao.Publicado,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.AtualizarAvaliacaoAsync(avaliacao.Id, outroProfessor.Id, dtoAtualizacao));
    }

    [Fact]
    public async Task AtualizarAvaliacaoAsync_PublicarSemQuestoes_LancaInvalidOperationException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        var dtoAtualizacao = new AtualizarAvaliacaoDto
        {
            Titulo = avaliacao.Titulo,
            CursoId = curso.Id,
            ModuloId = modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            StatusPublicacao = StatusPublicacao.Publicado,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AtualizarAvaliacaoAsync(avaliacao.Id, professor.Id, dtoAtualizacao));

        var avaliacaoNoBanco = context.Avaliacoes.AsNoTracking().Single(a => a.Id == avaliacao.Id);
        Assert.Equal(StatusPublicacao.Rascunho, avaliacaoNoBanco.StatusPublicacao);
    }

    [Fact]
    public async Task AtualizarAvaliacaoAsync_PublicarComQuestao_Publica()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dtoAtualizacao = new AtualizarAvaliacaoDto
        {
            Titulo = avaliacao.Titulo,
            CursoId = curso.Id,
            ModuloId = modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            StatusPublicacao = StatusPublicacao.Publicado,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        };

        var avaliacaoAtualizada = await service.AtualizarAvaliacaoAsync(avaliacao.Id, professor.Id, dtoAtualizacao);

        Assert.Equal(StatusPublicacao.Publicado, avaliacaoAtualizada.StatusPublicacao);
    }

    [Fact]
    public async Task AtualizarAvaliacaoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AtualizarAvaliacaoAsync(avaliacao.Id, professor.Id, new AtualizarAvaliacaoDto
            {
                Titulo = avaliacao.Titulo,
                Descricao = avaliacao.Descricao,
                CursoId = curso.Id,
                ModuloId = modulo.Id,
                TipoAvaliacao = avaliacao.TipoAvaliacao,
                StatusPublicacao = StatusPublicacao.Rascunho,
                TentativasPermitidas = avaliacao.TentativasPermitidas,
                NotaMaxima = avaliacao.NotaMaxima,
                PesoNota = avaliacao.PesoNota,
                PesoProgresso = avaliacao.PesoProgresso
            }));
    }

    [Fact]
    public async Task ExcluirAvaliacaoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ExcluirAvaliacaoAsync(avaliacao.Id, professor.Id));
    }

    [Fact]
    public async Task ExcluirAvaliacaoAsync_DeOutroProfessor_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ExcluirAvaliacaoAsync(avaliacao.Id, outroProfessor.Id));
    }

    [Fact]
    public async Task ExcluirAvaliacaoAsync_SemTentativas_ExcluiFisicamente()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var foiArquivada = await service.ExcluirAvaliacaoAsync(avaliacao.Id, professor.Id);

        Assert.False(foiArquivada);
        Assert.Null(context.Avaliacoes.Find(avaliacao.Id));
    }

    [Fact]
    public async Task ExcluirAvaliacaoAsync_ComTentativaRegistrada_Arquiva()
    {
        // Pendencia "Painel de arquivados" (05/11): antes isso so lancava InvalidOperationException
        // e deixava o professor sem nenhuma saida pra "limpar" a avaliacao da listagem. Agora
        // arquiva (mesmo mecanismo ja usado por ConteudoDidaticoService.ExcluirConteudoAsync).
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        context.TentativasAvaliacao.Add(new TentativaAvaliacao { AvaliacaoId = avaliacao.Id, MatriculaId = 1 });
        await context.SaveChangesAsync();

        var foiArquivada = await service.ExcluirAvaliacaoAsync(avaliacao.Id, professor.Id);

        Assert.True(foiArquivada);
        var avaliacaoNoBanco = context.Avaliacoes.AsNoTracking().Single(a => a.Id == avaliacao.Id);
        Assert.Equal(StatusPublicacao.Arquivado, avaliacaoNoBanco.StatusPublicacao);
        Assert.Single(context.TentativasAvaliacao.Where(t => t.AvaliacaoId == avaliacao.Id));
    }

    // ---------- AdicionarQuestaoAsync ----------

    [Fact]
    public async Task AdicionarQuestaoAsync_ComUmaAlternativaCorreta_CriaComSucesso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        Assert.Equal(1, questao.Ordem);
        Assert.Equal(2, questao.Alternativas.Count);
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto()));
    }

    [Fact]
    public async Task AdicionarQuestoesEmLoteAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AdicionarQuestoesEmLoteAsync(avaliacao.Id, professor.Id, new CriarQuestoesEmLoteDto
            {
                Questoes = new List<CriarQuestaoAvaliacaoDto> { NovaQuestaoObjetivaDto() }
            }));
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_DuasQuestoes_IncrementaOrdem()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var segunda = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        Assert.Equal(2, segunda.Ordem);
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_SemAlternativaCorreta_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dto = NovaQuestaoObjetivaDto(letraCorreta: "nenhuma");

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_ComDuasAlternativasCorretas_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dto = NovaQuestaoObjetivaDto();
        dto.Alternativas[1].EhCorreta = true;

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_MenosDeDuasAlternativas_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dto = NovaQuestaoObjetivaDto();
        dto.Alternativas.RemoveAt(1);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_Dissertativa_EhRecusada()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dto = new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        };

        // Decisao de 27/11: por enquanto so questoes objetivas.
        var erro = await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto));
        Assert.Equal(AvaliacaoService.MensagemSomenteQuestoesObjetivas, erro.Message);
        Assert.Empty(context.QuestoesPublicadas);
    }

    [Fact]
    public async Task AdicionarQuestoesEmLoteAsync_ComUmaDissertativa_NaoGravaNenhuma()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var lote = new CriarQuestoesEmLoteDto
        {
            Questoes = new List<CriarQuestaoAvaliacaoDto>
            {
                NovaQuestaoObjetivaDto(),
                new() { TituloInterno = "Dissertativa", Enunciado = "Explique...", TipoQuestao = TipoQuestao.Dissertativa, Pontos = 5 }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestoesEmLoteAsync(avaliacao.Id, professor.Id, lote));
        Assert.Empty(context.QuestoesPublicadas);
    }

    [Fact]
    public async Task AtualizarAvaliacaoAsync_PublicarComDissertativa_LancaInvalidOperationException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id);

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AtualizarAvaliacaoAsync(avaliacao.Id, professor.Id, DtoAtualizacaoPublicada(avaliacao, curso.Id, modulo.Id)));

        Assert.Contains("dissertativa", erro.Message);
        Assert.Equal(StatusPublicacao.Rascunho, context.Avaliacoes.AsNoTracking().Single(a => a.Id == avaliacao.Id).StatusPublicacao);
    }

    [Fact]
    public async Task AtualizarAvaliacaoAsync_JaPublicadaComDissertativa_ContinuaEditavelEPublicada()
    {
        var (service, context, professor, _, _, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id);

        var dto = DtoAtualizacaoPublicada(avaliacao, avaliacao.CursoId, modulo.Id);
        dto.Titulo = "Titulo novo";
        await service.AtualizarAvaliacaoAsync(avaliacao.Id, professor.Id, dto);

        var noBanco = context.Avaliacoes.AsNoTracking().Single(a => a.Id == avaliacao.Id);
        Assert.Equal(StatusPublicacao.Publicado, noBanco.StatusPublicacao);
        Assert.Equal("Titulo novo", noBanco.Titulo);
    }

    private static AtualizarAvaliacaoDto DtoAtualizacaoPublicada(Avaliacao avaliacao, int cursoId, int moduloId) => new()
    {
        Titulo = avaliacao.Titulo,
        CursoId = cursoId,
        ModuloId = moduloId,
        TipoAvaliacao = avaliacao.TipoAvaliacao,
        StatusPublicacao = StatusPublicacao.Publicado,
        TentativasPermitidas = 1,
        NotaMaxima = 10,
        PesoNota = 1,
        PesoProgresso = 1
    };

    // Dissertativa publicada ANTES de 27/11 (hoje o servico recusa criar uma):
    // grava direto no banco para testar o que continua valendo para elas.
    private static QuestaoPublicada AdicionarDissertativaAntiga(PlataformaContext context, int avaliacaoId, int professorId, decimal pontos = 10)
    {
        var questaoBanco = new QuestaoBanco
        {
            ProfessorAutorId = professorId,
            TituloInterno = "Dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Ativa = true,
            CriadoEm = DateTime.UtcNow
        };
        context.QuestoesBanco.Add(questaoBanco);
        context.SaveChanges();

        var ordem = (context.QuestoesPublicadas.Where(q => q.AvaliacaoId == avaliacaoId).Select(q => (int?)q.Ordem).Max() ?? 0) + 1;
        var questao = new QuestaoPublicada
        {
            AvaliacaoId = avaliacaoId,
            QuestaoBancoId = questaoBanco.Id,
            Ordem = ordem,
            EnunciadoSnapshot = questaoBanco.Enunciado,
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = pontos
        };
        context.QuestoesPublicadas.Add(questao);
        context.SaveChanges();
        return questao;
    }

    // ---------- AdicionarQuestoesEmLoteAsync ----------

    [Fact]
    public async Task AdicionarQuestoesEmLoteAsync_DuasQuestoesValidas_CriaAmbasComOrdemSequencial()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var dto = new CriarQuestoesEmLoteDto
        {
            Questoes = new List<CriarQuestaoAvaliacaoDto> { NovaQuestaoObjetivaDto(), NovaQuestaoObjetivaDto() }
        };

        var questoes = (await service.AdicionarQuestoesEmLoteAsync(avaliacao.Id, professor.Id, dto)).ToList();

        Assert.Equal(2, questoes.Count);
        Assert.Equal(new[] { 1, 2 }, questoes.Select(questao => questao.Ordem).OrderBy(ordem => ordem));
    }

    [Fact]
    public async Task AdicionarQuestoesEmLoteAsync_UmaQuestaoInvalida_NaoPersisteNenhuma()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));

        var questaoInvalida = NovaQuestaoObjetivaDto(letraCorreta: "nenhuma");
        var dto = new CriarQuestoesEmLoteDto
        {
            Questoes = new List<CriarQuestaoAvaliacaoDto> { NovaQuestaoObjetivaDto(), questaoInvalida }
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestoesEmLoteAsync(avaliacao.Id, professor.Id, dto));

        var questoesPersistidas = await service.ListarQuestoesAsync(avaliacao.Id, professor.Id);
        Assert.Empty(questoesPersistidas);
    }

    // ---------- AtualizarQuestaoAsync ----------

    [Fact]
    public async Task AtualizarQuestaoAsync_AlteraEnunciadoEAlternativas()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new AtualizarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao editada",
            Enunciado = "Enunciado editado",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 8,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "Nova certa", EhCorreta = true },
                new() { Letra = "B", Texto = "Nova errada", EhCorreta = false },
                new() { Letra = "C", Texto = "Outra errada", EhCorreta = false }
            }
        };

        var atualizada = await service.AtualizarQuestaoAsync(avaliacao.Id, questao.Id, professor.Id, dto);

        Assert.Equal("Enunciado editado", atualizada.EnunciadoSnapshot);
        Assert.Equal(8, atualizada.Pontos);
        Assert.Equal(3, atualizada.Alternativas.Count);
    }

    [Fact]
    public async Task AtualizarQuestaoAsync_ComTentativaRegistrada_LancaInvalidOperationException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        context.TentativasAvaliacao.Add(new TentativaAvaliacao { AvaliacaoId = avaliacao.Id, MatriculaId = 1 });
        await context.SaveChangesAsync();

        var dto = new AtualizarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao editada",
            Enunciado = "Enunciado editado",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 8,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "Nova certa", EhCorreta = true },
                new() { Letra = "B", Texto = "Nova errada", EhCorreta = false }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AtualizarQuestaoAsync(avaliacao.Id, questao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task AtualizarQuestaoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        var dto = new AtualizarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao editada",
            Enunciado = "Enunciado editado",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 8,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "Nova certa", EhCorreta = true },
                new() { Letra = "B", Texto = "Nova errada", EhCorreta = false }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AtualizarQuestaoAsync(avaliacao.Id, questao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task ExcluirQuestaoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ExcluirQuestaoAsync(avaliacao.Id, questao.Id, professor.Id));
    }

    // ---------- ReordenarQuestoesAsync ----------

    [Fact]
    public async Task ReordenarQuestoesAsync_InverteOrdem_AplicaCorretamente()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var primeira = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var segunda = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new ReordenarQuestoesDto
        {
            Posicoes = new List<PosicaoQuestaoDto>
            {
                new() { QuestaoId = primeira.Id, NovaOrdem = 2 },
                new() { QuestaoId = segunda.Id, NovaOrdem = 1 }
            }
        };

        await service.ReordenarQuestoesAsync(avaliacao.Id, professor.Id, dto);

        var questoes = (await service.ListarQuestoesAsync(avaliacao.Id, professor.Id)).ToList();
        Assert.Equal(segunda.Id, questoes.Single(questao => questao.Ordem == 1).Id);
        Assert.Equal(primeira.Id, questoes.Single(questao => questao.Ordem == 2).Id);
    }

    [Fact]
    public async Task ReordenarQuestoesAsync_PosicoesIncompletas_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var primeira = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new ReordenarQuestoesDto
        {
            Posicoes = new List<PosicaoQuestaoDto> { new() { QuestaoId = primeira.Id, NovaOrdem = 1 } }
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.ReordenarQuestoesAsync(avaliacao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task ReordenarQuestoesAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var primeira = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var segunda = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        var dto = new ReordenarQuestoesDto
        {
            Posicoes = new List<PosicaoQuestaoDto>
            {
                new() { QuestaoId = primeira.Id, NovaOrdem = 2 },
                new() { QuestaoId = segunda.Id, NovaOrdem = 1 }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ReordenarQuestoesAsync(avaliacao.Id, professor.Id, dto));
    }

    // ---------- EnviarRespostasAlunoAsync (motor de correcao) ----------

    private static async Task<(AvaliacaoService Service, PlataformaContext Context, Professor Professor, Aluno Aluno, Turma Turma, Modulo Modulo, Avaliacao Avaliacao)> CriarCenarioComAvaliacaoPublicada(
        int tentativasPermitidas = 1, DateTime? dataAbertura = null, DateTime? dataFechamento = null, TipoAvaliacao tipoAvaliacao = TipoAvaliacao.Quiz)
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);

        // CriarAvaliacaoAsync agora recusa nascer Publicada (sem questao) -
        // cria Rascunho e publica direto pelo metodo de dominio, simulando o
        // cenario real que estes testes precisam: avaliacao ja publicada
        // (pelo fluxo normal criar->adicionar questao->publicar), ANTES do
        // teste adicionar a questao que ele mesmo quer exercitar.
        var avaliacao = await service.CriarAvaliacaoAsync(
            professor.Id,
            NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho, tentativasPermitidas: tentativasPermitidas, dataAbertura: dataAbertura, dataFechamento: dataFechamento, tipoAvaliacao: tipoAvaliacao));
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();

        return (service, context, professor, aluno, turma, modulo, avaliacao);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_SoObjetivasComRespostaCorreta_CorrigeAutomaticamenteComNotaCheia()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id }
            }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        // Acertou tudo = 10, qualquer que seja o valor em pontos da questao.
        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
        Assert.Equal(10m, resultado.NotaBruta);
        Assert.NotNull(resultado.CorrigidaEm);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_NotaEProporcaoDosPontosAcertados_NaEscalaDeZeroADez()
    {
        var (service, _, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var questaoAcertada = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 1));
        var questaoErrada = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 3));

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questaoAcertada.Id, AlternativaId = questaoAcertada.Alternativas.Single(a => a.Letra == "A").Id },
                new() { QuestaoId = questaoErrada.Id, AlternativaId = questaoErrada.Alternativas.Single(a => a.Letra == "B").Id }
            }
        });

        // 1 de 4 pontos = 2,5 (antes dava 1 de 10).
        Assert.Equal(2.5m, resultado.NotaBruta);
    }

    // docs/TelaConteudosAlunos/PROMPT-agente-revisao-aluno-layout-professor.md,
    // item 1: a revisao do aluno nao trazia os anexos da questao (imagem do
    // enunciado), diferente da execucao (MapQuestaoAluno), que ja trazia.
    [Fact]
    public async Task ObterRevisaoTentativaAsync_QuestaoComAnexoDeImagem_RetornaAnexoNaRevisao()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");

        context.AnexosQuestoesBanco.Add(new AnexoQuestaoBanco
        {
            QuestaoBancoId = questao.QuestaoBancoId,
            Titulo = "Figura da questao",
            TipoAnexo = "Imagem",
            ArquivoUrl = "/uploads/questoes/figura.png"
        });
        await context.SaveChangesAsync();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id }
            }
        };
        var tentativa = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        var revisao = await service.ObterRevisaoTentativaAsync(tentativa.Id, aluno.Id);

        var questaoRevisao = Assert.Single(revisao.Questoes);
        var anexo = Assert.Single(questaoRevisao.Anexos);
        Assert.Equal("Imagem", anexo.TipoAnexo);
        Assert.Equal("/uploads/questoes/figura.png", anexo.ArquivoUrl);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_RespostaErrada_ZeraPontosDaQuestao()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaErrada = questao.Alternativas.Single(a => a.Letra == "B");

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaErrada.Id }
            }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(0m, resultado.NotaBruta);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ComQuestaoDissertativa_FicaEnviadaSemCorrecaoAutomatica()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questaoDissertativa = AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id, pontos: 10);

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questaoDissertativa.Id, RespostaTexto = "Minha resposta." }
            }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(StatusTentativaAvaliacao.Enviada, resultado.StatusTentativa);
        Assert.Null(resultado.CorrigidaEm);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_DissertativaVazia_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questaoDissertativa = AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id, pontos: 10);

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questaoDissertativa.Id, RespostaTexto = "   " }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ObjetivaSemAlternativaSelecionada_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = null } }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_NaoRespondeTodasAsQuestoes_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao1 = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao1.Id, AlternativaId = questao1.Alternativas.First().Id }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_RespondeMesmaQuestaoDuasVezes_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var alternativa = questao.Alternativas.First();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativa.Id },
                new() { QuestaoId = questao.Id, AlternativaId = alternativa.Id }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_MatriculaSemTurma_PermiteEnvio()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar liberando acesso a avaliacao publicada do curso.
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 10));
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id }
            }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(10m, resultado.NotaBruta);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AlunoSemMatriculaAprovadaNaTurma_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();

        var alunoSemMatricula = CriarAluno(context);
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, alunoSemMatricula.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ExcedeuTentativasPermitidas_LancaInvalidOperation()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tentativasPermitidas: 1);
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ForaDoPeriodoDeFechamento_LancaInvalidOperation()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(
            dataAbertura: DateTime.UtcNow.AddDays(-2),
            dataFechamento: DateTime.UtcNow.AddDays(-1));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AntesDaAbertura_LancaInvalidOperation()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(
            dataAbertura: DateTime.UtcNow.AddDays(1));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AlternativaNaoPertenceAQuestao_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao1 = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var questao2 = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao1.Id, AlternativaId = questao2.Alternativas.First().Id },
                new() { QuestaoId = questao2.Id, AlternativaId = questao2.Alternativas.First().Id }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    // ---------- Lancamento automatico de nota ----------

    [Fact]
    public async Task EnviarRespostasAlunoAsync_SoObjetivas_LancaNotaAutomaticaEAtualizaMediaModuloECurso()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");
        var matricula = context.Matriculas.Single();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id }
            }
        };

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        var lancamento = Assert.Single(context.LancamentosNotasAlunos);
        Assert.Equal(matricula.Id, lancamento.MatriculaId);
        Assert.Equal(avaliacao.Id, lancamento.AvaliacaoId);
        Assert.Equal(10m, lancamento.NotaOficial);
        Assert.Equal(1m, lancamento.PesoNota);
        Assert.Equal(OrigemCorrecaoNota.Automatica, lancamento.OrigemCorrecao);
        Assert.NotNull(lancamento.LiberadaAoAlunoEm);

        var progressoModulo = context.ProgressosModulosAlunos.Single(p => p.ModuloId == modulo.Id);
        Assert.Equal(1, progressoModulo.TotalAvaliacoes);
        Assert.Equal(1, progressoModulo.AvaliacoesConcluidas);
        Assert.Equal(10m, progressoModulo.MediaModulo);

        var progressoCurso = context.ProgressosCursosAlunos.Single();
        Assert.Equal(10m, progressoCurso.MediaCurso);

        var matriculaAtualizada = context.Matriculas.Single(m => m.Id == matricula.Id);
        Assert.Equal(10m, matriculaAtualizada.NotaFinal);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_DuasAvaliacoesNoCurso_SoLancaNotaFinalQuandoAmbasForemCorrigidas()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao1) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var avaliacao2 = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(avaliacao1.CursoId, modulo.Id, tipoAvaliacao: TipoAvaliacao.Prova));
        var matricula = context.Matriculas.Single();

        var questao1 = await service.AdicionarQuestaoAsync(avaliacao1.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var questao2 = await service.AdicionarQuestaoAsync(avaliacao2.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 3));
        avaliacao2.Publicar();
        context.Avaliacoes.Update(avaliacao2);
        await context.SaveChangesAsync();

        await service.EnviarRespostasAlunoAsync(avaliacao1.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao1.Id, AlternativaId = questao1.Alternativas.Single(a => a.Letra == "A").Id } }
        });

        var matriculaAposPrimeiraCorrecao = context.Matriculas.Single(m => m.Id == matricula.Id);
        Assert.Equal(0m, matriculaAposPrimeiraCorrecao.NotaFinal);

        await service.EnviarRespostasAlunoAsync(avaliacao2.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao2.Id, AlternativaId = questao2.Alternativas.Single(a => a.Letra == "B").Id } }
        });

        // Media SIMPLES: (10 + 0) / 2 = 5, sem peso por avaliacao.
        var matriculaAposSegundaCorrecao = context.Matriculas.Single(m => m.Id == matricula.Id);
        Assert.Equal(5m, matriculaAposSegundaCorrecao.NotaFinal);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_PesoDaNotaNoBancoNaoMudaAMedia_MediaSimples()
    {
        var (service, context, professor, aluno, _, modulo, avaliacao1) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var avaliacao2 = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(avaliacao1.CursoId, modulo.Id, tipoAvaliacao: TipoAvaliacao.Prova));
        var questao1 = await service.AdicionarQuestaoAsync(avaliacao1.Id, professor.Id, NovaQuestaoObjetivaDto());
        var questao2 = await service.AdicionarQuestaoAsync(avaliacao2.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao2.Publicar();
        // Dado antigo com peso diferente de 1: nao pode mais pesar na media.
        avaliacao2.PesoNota = 3;
        context.Avaliacoes.Update(avaliacao2);
        await context.SaveChangesAsync();

        await service.EnviarRespostasAlunoAsync(avaliacao1.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao1.Id, AlternativaId = questao1.Alternativas.Single(a => a.Letra == "A").Id } }
        });
        await service.EnviarRespostasAlunoAsync(avaliacao2.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao2.Id, AlternativaId = questao2.Alternativas.Single(a => a.Letra == "B").Id } }
        });

        Assert.Equal(5m, context.Matriculas.Single().NotaFinal);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ComQuestaoDissertativa_NaoLancaNotaAutomatica()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var questaoDissertativa = AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id, pontos: 10);

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questaoDissertativa.Id, RespostaTexto = "Minha resposta." }
            }
        };

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Empty(context.LancamentosNotasAlunos);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_SegundaTentativaMelhor_AtualizaLancamentoParaAMelhorNota()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tentativasPermitidas: 2, tipoAvaliacao: TipoAvaliacao.Prova);
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var correta = questao.Alternativas.Single(a => a.Letra == "A");
        var errada = questao.Alternativas.Single(a => a.Letra == "B");

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = errada.Id } }
        });
        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = correta.Id } }
        });

        var lancamento = Assert.Single(context.LancamentosNotasAlunos);
        Assert.Equal(10m, lancamento.NotaOficial);
    }

    // Decisao F1 da auditoria de 26/11: vale a MELHOR tentativa corrigida -
    // refazer e ir pior nao derruba a nota.
    [Fact]
    public async Task EnviarRespostasAlunoAsync_SegundaTentativaPior_MantemAMelhorNota()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tentativasPermitidas: 2, tipoAvaliacao: TipoAvaliacao.Prova);
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var correta = questao.Alternativas.Single(a => a.Letra == "A");
        var errada = questao.Alternativas.Single(a => a.Letra == "B");

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = correta.Id } }
        });
        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = errada.Id } }
        });

        var lancamento = Assert.Single(context.LancamentosNotasAlunos);
        Assert.Equal(10m, lancamento.NotaOficial);
        Assert.Equal(10m, context.Matriculas.Single().NotaFinal);

        var item = Assert.Single(await service.ListarAvaliacoesPorAlunoAsync(aluno.Id));
        Assert.Equal(0m, item.UltimaNota);
        Assert.Equal(10m, item.MelhorNota);
    }

    // ---------- Quiz e formativo: conta progresso, nao gera nota ----------

    [Fact]
    public async Task EnviarRespostasAlunoAsync_Quiz_NaoLancaNotaMasContaComoProgresso()
    {
        var (service, context, professor, aluno, _, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");
        var matricula = context.Matriculas.Single();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id }
            }
        };

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Empty(context.LancamentosNotasAlunos);

        var progressoModulo = context.ProgressosModulosAlunos.Single(p => p.ModuloId == modulo.Id);
        Assert.Equal(100m, progressoModulo.PercentualConclusao);
        Assert.Equal(0m, progressoModulo.MediaModulo);
        Assert.Equal(0, progressoModulo.TotalAvaliacoes);

        var progressoCurso = context.ProgressosCursosAlunos.Single();
        Assert.Equal(100m, progressoCurso.PercentualConclusao);
        Assert.Equal(0m, progressoCurso.MediaCurso);

        var matriculaAtualizada = context.Matriculas.Single(m => m.Id == matricula.Id);
        Assert.Equal(0m, matriculaAtualizada.NotaFinal);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_Quiz_ComDissertativa_AindaContaProgresso()
    {
        var (service, context, professor, aluno, _, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questaoDissertativa = AdicionarDissertativaAntiga(context, avaliacao.Id, professor.Id, pontos: 10);

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto>
            {
                new() { QuestaoId = questaoDissertativa.Id, RespostaTexto = "Minha resposta." }
            }
        };

        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Empty(context.LancamentosNotasAlunos);

        var progressoModulo = context.ProgressosModulosAlunos.Single(p => p.ModuloId == modulo.Id);
        Assert.Equal(100m, progressoModulo.PercentualConclusao);
    }

    // ---------- EnviarRespostasAlunoAsync: avaliacao alterada durante a
    // resposta (docs/bugs/PROMPT-agente-envio-avaliacao-alterada-durante-
    // resposta.md) ----------

    [Theory]
    [InlineData(StatusPublicacao.Arquivado)]
    [InlineData(StatusPublicacao.Rascunho)]
    public async Task EnviarRespostasAlunoAsync_StatusMudouDepoisQueAlunoAbriuDentroDaJanela_AceitaEnvio(StatusPublicacao novoStatus)
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");

        // Publicacao "backdated" pra nao colidir com IniciadaEm no passado -
        // sem isso, PublicadoEm fica quase igual a "agora" (criado ha poucos
        // ms) e qualquer IniciadaEm anterior cairia na rejeicao "antes da
        // primeira publicacao".
        avaliacao.Publicar(DateTime.UtcNow.AddHours(-6));
        context.SaveChanges();

        var iniciadaEm = DateTime.UtcNow.AddMinutes(-10);
        var momentoMudanca = DateTime.UtcNow.AddMinutes(-5);
        if (novoStatus == StatusPublicacao.Arquivado)
        {
            avaliacao.Arquivar(momentoMudanca);
        }
        else
        {
            avaliacao.VoltarParaRascunho(momentoMudanca);
        }
        context.SaveChanges();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = iniciadaEm,
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id } }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
        Assert.Equal(10m, resultado.NotaBruta);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ArquivadaForaDaJanelaDeGraca_LancaErroEnvioAvaliacaoIndisponivel()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        avaliacao.Publicar(DateTime.UtcNow.AddHours(-6));
        var iniciadaEm = DateTime.UtcNow.AddHours(-5);
        avaliacao.Arquivar(DateTime.UtcNow.AddHours(-4)); // ha mais de 3h (sem TempoLimiteMinutos)
        context.SaveChanges();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = iniciadaEm,
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        var excecao = await Assert.ThrowsAsync<ErroEnvioAvaliacaoException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
        Assert.Equal("AVALIACAO_INDISPONIVEL", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_DespublicadaSemIniciadaEm_LancaErroEnvioAvaliacaoIndisponivel()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        avaliacao.VoltarParaRascunho();
        context.SaveChanges();

        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        var excecao = await Assert.ThrowsAsync<ErroEnvioAvaliacaoException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
        Assert.Equal("AVALIACAO_INDISPONIVEL", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ExcluidaDeVerdadeSemTentativas_LancaErroEnvioAvaliacaoRemovida()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        await service.ExcluirAvaliacaoAsync(avaliacao.Id, professor.Id);

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = DateTime.UtcNow.AddMinutes(-5),
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        var excecao = await Assert.ThrowsAsync<ErroEnvioAvaliacaoException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
        Assert.Equal("AVALIACAO_REMOVIDA", excecao.Codigo);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_QuestaoTrocadaDepoisDeAbrir_LancaErroEnvioAvaliacaoAlterada()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questaoAntiga = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        // Aluno abriu a avaliacao e guardou a resposta pra questaoAntiga...
        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = DateTime.UtcNow,
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questaoAntiga.Id, AlternativaId = questaoAntiga.Alternativas.First().Id } }
        };

        // ...mas o professor trocou a questao antes do envio chegar. Adiciona
        // a nova ANTES de excluir a antiga - ExcluirQuestaoAsync agora recusa
        // remover a ultima questao de uma avaliacao publicada, entao precisa
        // ter as duas questoes no ar por um instante pra trocar.
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        await service.ExcluirQuestaoAsync(avaliacao.Id, questaoAntiga.Id, professor.Id);

        var excecao = await Assert.ThrowsAsync<ErroEnvioAvaliacaoException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
        Assert.Equal("AVALIACAO_ALTERADA", excecao.Codigo);
    }

    [Fact]
    public async Task ListarQuestoesPorAlunoAsync_AvaliacaoArquivada_ContinuaSemAcesso()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao.Arquivar();
        context.SaveChanges();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ListarQuestoesPorAlunoAsync(avaliacao.Id, aluno.Id));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_IniciadaEmNoFuturo_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = DateTime.UtcNow.AddHours(1),
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_IniciadaEmAntesDaPrimeiraPublicacao_LancaArgumentException()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = avaliacao.PublicadoEm!.Value.AddMinutes(-10),
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_PublicadaComIniciadaEmValido_FuncionaNormalmente()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 7));
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");

        var dto = new EnviarAvaliacaoAlunoDto
        {
            IniciadaEm = DateTime.UtcNow,
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id } }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(10m, resultado.NotaBruta);
    }

    // ---------- ListarAvaliacoesPorAlunoAsync ----------

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_SemMatriculaAprovada_RetornaVazio()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var aluno = CriarAluno(context);

        var resultado = await service.ListarAvaliacoesPorAlunoAsync(aluno.Id);

        Assert.Empty(resultado);
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_MatriculaSemTurma_RetornaAvaliacaoDoCurso()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();

        var resultado = await service.ListarAvaliacoesPorAlunoAsync(aluno.Id);

        Assert.Single(resultado);
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_ComTentativaRealizada_CalculaTentativasRestantes()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tentativasPermitidas: 3);
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };
        var tentativa = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        var resultado = (await service.ListarAvaliacoesPorAlunoAsync(aluno.Id)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.TentativasRealizadas);
        Assert.Equal(2, item.TentativasRestantes);
        Assert.Equal(tentativa.Id, item.UltimaTentativaId);
        Assert.Equal(StatusTentativaAvaliacao.Corrigida, item.UltimoStatusTentativa);
    }

    // Regressao do risco critico do plano fluxo-venda-cursos (achado 1): o
    // filtro em memoria desta listagem reusa AcessoAcademicoService.
    // MatriculaTemAcessoLiberado, que le ValorNaMatricula (congelado na
    // matricula), nunca o Curso.Preco atual - senao um curso que vira pago
    // depois da matricula tiraria a avaliacao da lista do aluno antigo.
    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_CursoViraPagoDepoisDaMatricula_MatriculaAntigaContinuaVendoAAvaliacao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var alunoAntigo = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, alunoAntigo.Id, curso.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();

        curso.Preco = 29.90m;
        context.SaveChanges();

        var resultadoAntigo = await service.ListarAvaliacoesPorAlunoAsync(alunoAntigo.Id);
        Assert.Single(resultadoAntigo);

        var alunoNovo = CriarAluno(context);
        var matriculaNova = new Matricula { AlunoId = alunoNovo.Id, CursoId = curso.Id, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matriculaNova.DefinirValorNaMatricula(curso.Preco);
        matriculaNova.Aprovar();
        context.Matriculas.Add(matriculaNova);
        context.SaveChanges();

        var resultadoNovo = await service.ListarAvaliacoesPorAlunoAsync(alunoNovo.Id);
        Assert.Empty(resultadoNovo);
    }

    // Regressao do achado docs/redesign-mobile/PROMPT-agente-avaliacoes-
    // ajustes-1.md, item 1: avaliacao sem Modulo (prova/exercicio final do
    // curso) nao tem Modulo.Curso pra navegar, entao CursoTitulo vinha vazio
    // e o app mostrava "Curso #id". Agora cai no titulo da matricula do
    // aluno (ja carregada com .Include(Curso)).
    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_AvaliacaoSemModulo_UsaCursoTituloDaMatricula()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarMatriculaAprovadaSemTurma(context, aluno.Id, curso.Id);

        var dto = new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao final",
            CursoId = curso.Id,
            ModuloId = null,
            TipoAvaliacao = TipoAvaliacao.Prova,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        };
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, dto);
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacao.Publicar();
        context.Avaliacoes.Update(avaliacao);
        await context.SaveChangesAsync();

        var resultado = await service.ListarAvaliacoesPorAlunoAsync(aluno.Id);

        var item = Assert.Single(resultado);
        Assert.Null(item.ModuloId);
        Assert.Equal(curso.Titulo, item.CursoTitulo);
    }

    // ---------- GerarQuestoesComIaAsync ----------

    [Fact]
    public async Task GerarQuestoesComIaAsync_PdfEscaneado_NaoBloqueiaEEnviaDocumentoParaIA()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var extrator = new ExtratorTextoMaterialServiceFake(() =>
            new ResultadoExtracaoMaterial(
                TextoPorPagina: Array.Empty<string>(),
                QuantidadePaginas: 1,
                TemTextoExtraivel: false,
                Avisos: new[] { "Este PDF parece ser uma versao escaneada, sem texto selecionavel suficiente para gerar questoes." },
                MotivoFalha: MotivoFalhaExtracao.PdfEscaneado));
        var iaFake = new AvaliacaoIAServiceFake(_ =>
            new ResultadoGeracaoIA(Array.Empty<QuestaoGeradaIaDto>(), Array.Empty<string>(), false));
        var armazenamento = new ArmazenamentoArquivoServiceFake(() => "/uploads/avaliacoes-ia-fontes/fake.pdf");

        var service = new AvaliacaoService(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            armazenamento,
            extrator,
            iaFake,
            CriarCursoService(context));

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        var bytesFalsos = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4\nconteudo escaneado de teste");
        var arquivo = new FormFile(new MemoryStream(bytesFalsos), 0, bytesFalsos.Length, "arquivo", "prova-escaneada.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var resultado = await service.GerarQuestoesComIaAsync(avaliacao.Id, professor.Id, arquivo, new GerarQuestoesIaRequestDto(), CancellationToken.None);

        Assert.True(iaFake.MaterialRecebido!.EhDocumento);
        Assert.Equal("application/pdf", iaFake.MaterialRecebido.MediaType);
        Assert.Contains(resultado.Avisos, aviso => aviso.Contains("lido diretamente pela IA", StringComparison.OrdinalIgnoreCase));
    }

    // ---------- GerarQuestoesComIaDeConteudoAsync ----------

    [Fact]
    public async Task GerarQuestoesComIaDeConteudoAsync_ConteudoTexto_EnviaCorpoTextoParaIA()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var conteudo = new ConteudoDidatico { Titulo = "Aula 1", TurmaId = turma.Id, ModuloId = modulo.Id, CorpoTexto = "Conteudo de apoio pra gerar questoes." };
        conteudo.DefinirProfessorAutor(professor.Id);
        conteudo.DefinirCurso(curso.Id);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();

        var iaFake = new AvaliacaoIAServiceFake(_ => new ResultadoGeracaoIA(Array.Empty<QuestaoGeradaIaDto>(), Array.Empty<string>(), false));
        var service = new AvaliacaoService(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            new ArmazenamentoArquivoServiceFake(),
            new ExtratorTextoMaterialServiceFake(),
            iaFake,
            CriarCursoService(context));

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        await service.GerarQuestoesComIaDeConteudoAsync(avaliacao.Id, professor.Id, conteudo.Id, new GerarQuestoesIaRequestDto(), CancellationToken.None);

        Assert.False(iaFake.MaterialRecebido!.EhDocumento);
        Assert.Equal("Conteudo de apoio pra gerar questoes.", iaFake.MaterialRecebido.TextoFonte);
    }

    [Fact]
    public async Task GerarQuestoesComIaDeConteudoAsync_CursoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var conteudo = new ConteudoDidatico { Titulo = "Aula 1", TurmaId = turma.Id, ModuloId = modulo.Id, CorpoTexto = "Conteudo de apoio pra gerar questoes." };
        conteudo.DefinirProfessorAutor(professor.Id);
        conteudo.DefinirCurso(curso.Id);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();

        var service = CriarService(context);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GerarQuestoesComIaDeConteudoAsync(avaliacao.Id, professor.Id, conteudo.Id, new GerarQuestoesIaRequestDto(), CancellationToken.None));
    }

    [Fact]
    public async Task GerarQuestoesComIaDeConteudoAsync_ConteudoDeOutroCurso_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var outroCurso = CriarCurso(context);
        var outroModulo = CriarModulo(context, outroCurso.Id);
        var conteudoDeOutroCurso = new ConteudoDidatico { Titulo = "Aula de outro curso", TurmaId = turma.Id, ModuloId = outroModulo.Id, CorpoTexto = "Texto." };
        conteudoDeOutroCurso.DefinirProfessorAutor(professor.Id);
        conteudoDeOutroCurso.DefinirCurso(outroCurso.Id);
        context.ConteudosDidaticos.Add(conteudoDeOutroCurso);
        context.SaveChanges();

        var service = new AvaliacaoService(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            new ArmazenamentoArquivoServiceFake(),
            new ExtratorTextoMaterialServiceFake(),
            new AvaliacaoIAServiceFake(),
            CriarCursoService(context));

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GerarQuestoesComIaDeConteudoAsync(avaliacao.Id, professor.Id, conteudoDeOutroCurso.Id, new GerarQuestoesIaRequestDto(), CancellationToken.None));
    }

    [Fact]
    public async Task GerarQuestoesComIaDeConteudoAsync_TipoConteudoNaoSuportado_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var conteudoVideo = new ConteudoDidatico { Titulo = "Aula em video", TurmaId = turma.Id, ModuloId = modulo.Id, TipoConteudo = TipoConteudoDidatico.Video, ArquivoUrl = "/uploads/conteudos/aula.mp4" };
        conteudoVideo.DefinirProfessorAutor(professor.Id);
        conteudoVideo.DefinirCurso(curso.Id);
        context.ConteudosDidaticos.Add(conteudoVideo);
        context.SaveChanges();

        var service = new AvaliacaoService(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            new ArmazenamentoArquivoServiceFake(),
            new ExtratorTextoMaterialServiceFake(),
            new AvaliacaoIAServiceFake(),
            CriarCursoService(context));

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GerarQuestoesComIaDeConteudoAsync(avaliacao.Id, professor.Id, conteudoVideo.Id, new GerarQuestoesIaRequestDto(), CancellationToken.None));
    }

    [Fact]
    public async Task GerarQuestoesComIaDeConteudoAsync_PdfEscaneado_NaoBloqueiaEEnviaDocumentoParaIA()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);

        var conteudoPdf = new ConteudoDidatico { Titulo = "Apostila", TurmaId = turma.Id, ModuloId = modulo.Id, TipoConteudo = TipoConteudoDidatico.Pdf, ArquivoUrl = "/uploads/conteudos/apostila.pdf" };
        conteudoPdf.DefinirProfessorAutor(professor.Id);
        conteudoPdf.DefinirCurso(curso.Id);
        context.ConteudosDidaticos.Add(conteudoPdf);
        context.SaveChanges();

        var extrator = new ExtratorTextoMaterialServiceFake(() =>
            new ResultadoExtracaoMaterial(
                TextoPorPagina: Array.Empty<string>(),
                QuantidadePaginas: 1,
                TemTextoExtraivel: false,
                Avisos: new[] { "Este PDF parece ser uma versao escaneada, sem texto selecionavel suficiente para gerar questoes." },
                MotivoFalha: MotivoFalhaExtracao.PdfEscaneado));
        var bytesFalsos = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4\nconteudo escaneado de teste");
        var armazenamento = new ArmazenamentoArquivoServiceFake(conteudoParaAbrir: () => bytesFalsos);
        var iaFake = new AvaliacaoIAServiceFake(_ => new ResultadoGeracaoIA(Array.Empty<QuestaoGeradaIaDto>(), Array.Empty<string>(), false));

        var service = new AvaliacaoService(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            armazenamento,
            extrator,
            iaFake,
            CriarCursoService(context));

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id, status: StatusPublicacao.Rascunho));

        var resultado = await service.GerarQuestoesComIaDeConteudoAsync(avaliacao.Id, professor.Id, conteudoPdf.Id, new GerarQuestoesIaRequestDto(), CancellationToken.None);

        Assert.True(iaFake.MaterialRecebido!.EhDocumento);
        Assert.Equal("application/pdf", iaFake.MaterialRecebido.MediaType);
        Assert.Contains(resultado.Avisos, aviso => aviso.Contains("lido diretamente pela IA", StringComparison.OrdinalIgnoreCase));
    }

    // ---------- Liberacao por progresso (quiz de modulo / avaliacao final do curso) ----------

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

    [Fact]
    public async Task ListarQuestoesPorAlunoAsync_QuizDeModuloComConteudoPendente_LancaInvalidOperation()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        CriarConteudoPublicado(context, turma.Id, modulo.Id, avaliacao.CursoId, "Aula 1");
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ListarQuestoesPorAlunoAsync(avaliacao.Id, aluno.Id));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_QuizDeModuloComConteudoPendente_LancaInvalidOperation()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        CriarConteudoPublicado(context, turma.Id, modulo.Id, avaliacao.CursoId, "Aula 1");
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_QuizDeModuloComConteudoConcluido_PermiteEnvio()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, avaliacao.CursoId, "Aula 1");
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudo.Id);

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_QuizDeModuloComConteudoPendente_MarcaProgressoLiberadoFalso()
    {
        var (service, context, professor, aluno, turma, modulo, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());
        CriarConteudoPublicado(context, turma.Id, modulo.Id, avaliacao.CursoId, "Aula 1");

        var resultado = (await service.ListarAvaliacoesPorAlunoAsync(aluno.Id)).ToList();

        var item = Assert.Single(resultado);
        Assert.False(item.ProgressoLiberado);
    }

    // ---------- Quiz vinculado a um conteudo: ordem estrita da trilha ----------
    // docs/TelaConteudosAlunos/PROMPT-agente-quiz-vinculado-ordem-estrita.md:
    // o quiz vinculado libera assim que o conteudo-pai e concluido, mesmo com
    // outros conteudos do modulo pendentes.

    private static async Task<(AvaliacaoService Service, PlataformaContext Context, Aluno Aluno, Avaliacao QuizVinculado, ConteudoDidatico ConteudoPai, ConteudoDidatico ConteudoSeguinte)> CriarCenarioQuizVinculadoAoPrimeiroConteudo()
    {
        var (service, context, professor, aluno, turma, modulo, quiz) = await CriarCenarioComAvaliacaoPublicada();
        var conteudoPai = CriarConteudoPublicado(context, turma.Id, modulo.Id, quiz.CursoId, "Conteudo 1");
        var conteudoSeguinte = CriarConteudoPublicado(context, turma.Id, modulo.Id, quiz.CursoId, "Conteudo 2");
        await service.AdicionarQuestaoAsync(quiz.Id, professor.Id, NovaQuestaoObjetivaDto());

        quiz.ConteudoDidaticoId = conteudoPai.Id;
        context.Avaliacoes.Update(quiz);
        await context.SaveChangesAsync();

        return (service, context, aluno, quiz, conteudoPai, conteudoSeguinte);
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_QuizVinculadoComConteudoPaiConcluido_LiberaMesmoComOutroConteudoPendente()
    {
        var (service, context, aluno, _, conteudoPai, _) = await CriarCenarioQuizVinculadoAoPrimeiroConteudo();
        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudoPai.Id);

        var resultado = (await service.ListarAvaliacoesPorAlunoAsync(aluno.Id)).ToList();

        Assert.True(Assert.Single(resultado).ProgressoLiberado);
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_QuizVinculadoComConteudoPaiPendente_MarcaProgressoLiberadoFalso()
    {
        var (service, context, aluno, _, _, conteudoSeguinte) = await CriarCenarioQuizVinculadoAoPrimeiroConteudo();
        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudoSeguinte.Id);

        var resultado = (await service.ListarAvaliacoesPorAlunoAsync(aluno.Id)).ToList();

        Assert.False(Assert.Single(resultado).ProgressoLiberado);
    }

    [Fact]
    public async Task ListarQuestoesPorAlunoAsync_QuizVinculadoComConteudoPaiConcluido_PermiteIniciar()
    {
        var (service, context, aluno, quiz, conteudoPai, _) = await CriarCenarioQuizVinculadoAoPrimeiroConteudo();
        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudoPai.Id);

        var questoes = await service.ListarQuestoesPorAlunoAsync(quiz.Id, aluno.Id);

        Assert.Single(questoes);
    }

    [Fact]
    public async Task ListarQuestoesPorAlunoAsync_QuizVinculadoComConteudoPaiPendente_LancaInvalidOperation()
    {
        var (service, _, aluno, quiz, _, _) = await CriarCenarioQuizVinculadoAoPrimeiroConteudo();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ListarQuestoesPorAlunoAsync(quiz.Id, aluno.Id));
    }

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_QuizVinculadoAConteudoForaDaTrilha_VoltaParaRegraDoModulo()
    {
        var (service, context, aluno, _, conteudoPai, conteudoSeguinte) = await CriarCenarioQuizVinculadoAoPrimeiroConteudo();
        conteudoPai.DefinirStatusPublicacao(StatusPublicacao.Rascunho);
        context.ConteudosDidaticos.Update(conteudoPai);
        await context.SaveChangesAsync();

        var antes = Assert.Single(await service.ListarAvaliacoesPorAlunoAsync(aluno.Id));
        Assert.False(antes.ProgressoLiberado);

        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudoSeguinte.Id);

        var depois = Assert.Single(await service.ListarAvaliacoesPorAlunoAsync(aluno.Id));
        Assert.True(depois.ProgressoLiberado);
    }

    // docs/certificados-mobile/PROMPT-agente-certificados-mobile.md, item 0:
    // a nota lancada (via correcao automatica da prova objetiva) que atinge
    // o minimo de 7 emite o certificado automaticamente, quando o resto do
    // curso (conteudo) ja estava 100% concluido.
    [Fact]
    public async Task EnviarRespostasAlunoAsync_NotaDaProvaAtinge7ComConteudoJaConcluido_EmiteCertificadoAutomaticamente()
    {
        var context = TestContextFactory.Criar();
        var certificadoService = new CertificadoService(context, new AcessoAcademicoService(context));
        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context), certificadoService);
        var service = new AvaliacaoService(context, progressoService, new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, curso.Id, "Aula 1");
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudo.Id);

        var avaliacaoFinal = await service.CriarAvaliacaoAsync(professor.Id, new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Final",
            CursoId = curso.Id,
            ModuloId = null,
            TipoAvaliacao = TipoAvaliacao.Prova,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        });
        var questao = await service.AdicionarQuestaoAsync(avaliacaoFinal.Id, professor.Id, NovaQuestaoObjetivaDto(pontos: 10));
        avaliacaoFinal.Publicar();
        context.Avaliacoes.Update(avaliacaoFinal);
        await context.SaveChangesAsync();
        var alternativaCorreta = questao.Alternativas.Single(a => a.Letra == "A");
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = alternativaCorreta.Id } }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacaoFinal.Id, aluno.Id, dto);

        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
        Assert.NotNull(matricula.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AvaliacaoFinalComConteudoDoCursoPendente_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        CriarConteudoPublicado(context, turma.Id, modulo.Id, curso.Id, "Aula 1");

        var avaliacaoFinal = await service.CriarAvaliacaoAsync(professor.Id, new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Final",
            CursoId = curso.Id,
            ModuloId = null,
            TipoAvaliacao = TipoAvaliacao.Prova,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        });
        var questao = await service.AdicionarQuestaoAsync(avaliacaoFinal.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacaoFinal.Publicar();
        context.Avaliacoes.Update(avaliacaoFinal);
        await context.SaveChangesAsync();
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questao.Id, AlternativaId = questao.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnviarRespostasAlunoAsync(avaliacaoFinal.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AvaliacaoFinalComConteudoConcluidoMasQuizDeModuloPendente_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, curso.Id, "Aula 1");

        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudo.Id);

        // Quiz do modulo publicado, mas o aluno nunca enviou nenhuma tentativa.
        var quizPendente = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        await service.AdicionarQuestaoAsync(quizPendente.Id, professor.Id, NovaQuestaoObjetivaDto());
        quizPendente.Publicar();
        context.Avaliacoes.Update(quizPendente);
        await context.SaveChangesAsync();

        var avaliacaoFinal = await service.CriarAvaliacaoAsync(professor.Id, new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Final",
            CursoId = curso.Id,
            ModuloId = null,
            TipoAvaliacao = TipoAvaliacao.Prova,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        });
        var questaoFinal = await service.AdicionarQuestaoAsync(avaliacaoFinal.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacaoFinal.Publicar();
        context.Avaliacoes.Update(avaliacaoFinal);
        await context.SaveChangesAsync();
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questaoFinal.Id, AlternativaId = questaoFinal.Alternativas.First().Id } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnviarRespostasAlunoAsync(avaliacaoFinal.Id, aluno.Id, dto));
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_AvaliacaoFinalComConteudoEQuizDeModuloConcluidos_PermiteEnvio()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake(), new ExtratorTextoMaterialServiceFake(), new AvaliacaoIAServiceFake(), CriarCursoService(context));
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        var conteudo = CriarConteudoPublicado(context, turma.Id, modulo.Id, curso.Id, "Aula 1");

        var progressoService = new ProgressoAlunoService(context, new AcessoAcademicoService(context));
        await progressoService.MarcarConteudoConcluidoAsync(aluno.Id, conteudo.Id);

        var quiz = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(curso.Id, modulo.Id));
        var questaoQuiz = await service.AdicionarQuestaoAsync(quiz.Id, professor.Id, NovaQuestaoObjetivaDto());
        quiz.Publicar();
        context.Avaliacoes.Update(quiz);
        await context.SaveChangesAsync();
        await service.EnviarRespostasAlunoAsync(quiz.Id, aluno.Id, new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questaoQuiz.Id, AlternativaId = questaoQuiz.Alternativas.First().Id } }
        });

        var avaliacaoFinal = await service.CriarAvaliacaoAsync(professor.Id, new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Final",
            CursoId = curso.Id,
            ModuloId = null,
            TipoAvaliacao = TipoAvaliacao.Prova,
            StatusPublicacao = StatusPublicacao.Rascunho,
            TentativasPermitidas = 1,
            NotaMaxima = 10,
            PesoNota = 1,
            PesoProgresso = 1
        });
        var questaoFinal = await service.AdicionarQuestaoAsync(avaliacaoFinal.Id, professor.Id, NovaQuestaoObjetivaDto());
        avaliacaoFinal.Publicar();
        context.Avaliacoes.Update(avaliacaoFinal);
        await context.SaveChangesAsync();
        var dto = new EnviarAvaliacaoAlunoDto
        {
            Respostas = new List<RespostaAvaliacaoAlunoDto> { new() { QuestaoId = questaoFinal.Id, AlternativaId = questaoFinal.Alternativas.First().Id } }
        };

        var resultado = await service.EnviarRespostasAlunoAsync(avaliacaoFinal.Id, aluno.Id, dto);

        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
    }

    // ---------- CorrigirAvaliacoesPublicadasSemQuestaoAsync (migracao de dados) ----------

    [Fact]
    public async Task CorrigirAvaliacoesPublicadasSemQuestaoAsync_AvaliacaoPublicadaSemQuestao_VoltaParaRascunho()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);

        // Simula dado antigo: so era possivel antes de CriarAvaliacaoAsync
        // recusar isso (ver CriarAvaliacaoAsync_StatusPublicadoSemQuestao_LancaInvalidOperation).
        var avaliacaoVazia = new Avaliacao { Titulo = "Quiz vazio", TipoAvaliacao = TipoAvaliacao.Quiz, ModuloId = modulo.Id };
        avaliacaoVazia.DefinirCurso(curso.Id);
        avaliacaoVazia.Publicar();
        context.Avaliacoes.Add(avaliacaoVazia);
        await context.SaveChangesAsync();

        var corrigidas = await service.CorrigirAvaliacoesPublicadasSemQuestaoAsync();

        Assert.Equal(1, corrigidas);
        var avaliacaoAtualizada = await context.Avaliacoes.AsNoTracking().SingleAsync(a => a.Id == avaliacaoVazia.Id);
        Assert.Equal(StatusPublicacao.Rascunho, avaliacaoAtualizada.StatusPublicacao);
    }

    [Fact]
    public async Task CorrigirAvaliacoesPublicadasSemQuestaoAsync_AvaliacaoPublicadaComQuestao_NaoAltera()
    {
        var (service, context, professor, _, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada();
        await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        var corrigidas = await service.CorrigirAvaliacoesPublicadasSemQuestaoAsync();

        Assert.Equal(0, corrigidas);
        var avaliacaoAtualizada = await context.Avaliacoes.AsNoTracking().SingleAsync(a => a.Id == avaliacao.Id);
        Assert.Equal(StatusPublicacao.Publicado, avaliacaoAtualizada.StatusPublicacao);
    }

    [Fact]
    public async Task CorrigirAvaliacoesPublicadasSemQuestaoAsync_ChamadoDeNovo_NaoAlteraMaisNada()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);

        var avaliacaoVazia = new Avaliacao { Titulo = "Quiz vazio", TipoAvaliacao = TipoAvaliacao.Quiz, ModuloId = modulo.Id };
        avaliacaoVazia.DefinirCurso(curso.Id);
        avaliacaoVazia.Publicar();
        context.Avaliacoes.Add(avaliacaoVazia);
        await context.SaveChangesAsync();

        await service.CorrigirAvaliacoesPublicadasSemQuestaoAsync();
        var corrigidasDeNovo = await service.CorrigirAvaliacoesPublicadasSemQuestaoAsync();

        Assert.Equal(0, corrigidasDeNovo);
    }

    private class ArmazenamentoArquivoServiceFake : IArmazenamentoArquivoService
    {
        private readonly Func<string>? _urlRetornada;
        private readonly Func<byte[]>? _conteudoParaAbrir;

        public ArmazenamentoArquivoServiceFake(Func<string>? urlRetornada = null, Func<byte[]>? conteudoParaAbrir = null)
        {
            _urlRetornada = urlRetornada;
            _conteudoParaAbrir = conteudoParaAbrir;
        }

        public Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes) =>
            _urlRetornada is not null
                ? Task.FromResult(_urlRetornada())
                : throw new NotImplementedException("Nenhum teste de AvaliacaoService exercita upload de anexo ate agora.");

        public Task<ArquivoArmazenado?> AbrirArquivoAsync(string subpasta, string nomeArquivo) =>
            _conteudoParaAbrir is not null
                ? Task.FromResult<ArquivoArmazenado?>(new ArquivoArmazenado(new MemoryStream(_conteudoParaAbrir()), "application/pdf"))
                : throw new NotImplementedException("Nenhum teste de AvaliacaoService exercita leitura de anexo ate agora.");
    }

    private class ExtratorTextoMaterialServiceFake : IExtratorTextoMaterialService
    {
        private readonly Func<ResultadoExtracaoMaterial>? _resultado;

        public ExtratorTextoMaterialServiceFake(Func<ResultadoExtracaoMaterial>? resultado = null)
        {
            _resultado = resultado;
        }

        public Task<ResultadoExtracaoMaterial> ExtrairTextoAsync(Stream conteudo, string extensao, CancellationToken cancellationToken) =>
            _resultado is not null
                ? Task.FromResult(_resultado())
                : throw new NotImplementedException("Nenhum teste de AvaliacaoService exercita geracao por IA ate agora.");
    }

    private class AvaliacaoIAServiceFake : IAvaliacaoIAService
    {
        private readonly Func<MaterialParaIaDto, ResultadoGeracaoIA>? _resultado;

        public MaterialParaIaDto? MaterialRecebido { get; private set; }

        public AvaliacaoIAServiceFake(Func<MaterialParaIaDto, ResultadoGeracaoIA>? resultado = null)
        {
            _resultado = resultado;
        }

        public Task<ResultadoGeracaoIA> GerarQuestoesAsync(MaterialParaIaDto material, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken)
        {
            MaterialRecebido = material;
            return _resultado is not null
                ? Task.FromResult(_resultado(material))
                : throw new NotImplementedException("Nenhum teste de AvaliacaoService exercita geracao por IA ate agora.");
        }
    }
}
