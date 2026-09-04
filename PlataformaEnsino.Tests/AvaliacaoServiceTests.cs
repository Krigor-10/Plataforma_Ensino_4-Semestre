using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class AvaliacaoServiceTests
{
    private static AvaliacaoService CriarService(PlataformaContext context) => new(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake());

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

    private static Matricula CriarMatriculaAprovada(PlataformaContext context, int alunoId, int cursoId, int turmaId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.VincularTurma(turmaId);
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static CriarAvaliacaoDto NovaAvaliacaoDto(int turmaId, int moduloId, StatusPublicacao status = StatusPublicacao.Publicado, int tentativasPermitidas = 1, DateTime? dataAbertura = null, DateTime? dataFechamento = null, TipoAvaliacao tipoAvaliacao = TipoAvaliacao.Quiz)
    {
        return new CriarAvaliacaoDto
        {
            Titulo = "Avaliacao Teste",
            Descricao = "Descricao",
            TurmaId = turmaId,
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

        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        Assert.Equal("Avaliacao Teste", avaliacao.Titulo);
        Assert.Equal(StatusPublicacao.Publicado, avaliacao.StatusPublicacao);
        Assert.NotNull(avaliacao.PublicadoEm);
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
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id)));
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
            () => service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, moduloDeOutroCurso.Id)));
    }

    [Fact]
    public async Task CriarAvaliacaoAsync_NotaMaximaZero_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var dto = NovaAvaliacaoDto(turma.Id, modulo.Id);
        dto.NotaMaxima = 0;

        await Assert.ThrowsAsync<ArgumentException>(() => service.CriarAvaliacaoAsync(professor.Id, dto));
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
        var dto = NovaAvaliacaoDto(turma.Id, modulo.Id, dataAbertura: agora, dataFechamento: agora.AddDays(-1));

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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var dtoAtualizacao = new AtualizarAvaliacaoDto
        {
            Titulo = "Tentativa de editar",
            TurmaId = turma.Id,
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
    public async Task ExcluirAvaliacaoAsync_DeOutroProfessor_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var outroProfessor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ExcluirAvaliacaoAsync(avaliacao.Id, outroProfessor.Id));
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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

        Assert.Equal(1, questao.Ordem);
        Assert.Equal(2, questao.Alternativas.Count);
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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

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
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var dto = NovaQuestaoObjetivaDto();
        dto.Alternativas.RemoveAt(1);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto));
    }

    [Fact]
    public async Task AdicionarQuestaoAsync_Dissertativa_NaoExigeAlternativas()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var dto = new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Questao dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        };

        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, dto);

        Assert.Empty(questao.Alternativas);
    }

    // ---------- EnviarRespostasAlunoAsync (motor de correcao) ----------

    private static async Task<(AvaliacaoService Service, PlataformaContext Context, Professor Professor, Aluno Aluno, Turma Turma, Modulo Modulo, Avaliacao Avaliacao)> CriarCenarioComAvaliacaoPublicada(
        int tentativasPermitidas = 1, DateTime? dataAbertura = null, DateTime? dataFechamento = null, TipoAvaliacao tipoAvaliacao = TipoAvaliacao.Quiz)
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake());
        var professor = CriarProfessor(context);
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);

        var avaliacao = await service.CriarAvaliacaoAsync(
            professor.Id,
            NovaAvaliacaoDto(turma.Id, modulo.Id, tentativasPermitidas: tentativasPermitidas, dataAbertura: dataAbertura, dataFechamento: dataFechamento, tipoAvaliacao: tipoAvaliacao));

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

        Assert.Equal(StatusTentativaAvaliacao.Corrigida, resultado.StatusTentativa);
        Assert.Equal(7m, resultado.NotaBruta);
        Assert.NotNull(resultado.CorrigidaEm);
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
        var questaoDissertativa = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        });

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
        var questaoDissertativa = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        });

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
    public async Task EnviarRespostasAlunoAsync_AlunoSemMatriculaAprovadaNaTurma_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake());
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));
        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, NovaQuestaoObjetivaDto());

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
        Assert.Equal(7m, lancamento.NotaOficial);
        Assert.Equal(OrigemCorrecaoNota.Automatica, lancamento.OrigemCorrecao);
        Assert.NotNull(lancamento.LiberadaAoAlunoEm);

        var progressoModulo = context.ProgressosModulosAlunos.Single(p => p.ModuloId == modulo.Id);
        Assert.Equal(1, progressoModulo.TotalAvaliacoes);
        Assert.Equal(1, progressoModulo.AvaliacoesConcluidas);
        Assert.Equal(7m, progressoModulo.MediaModulo);

        var progressoCurso = context.ProgressosCursosAlunos.Single();
        Assert.Equal(7m, progressoCurso.MediaCurso);

        var matriculaAtualizada = context.Matriculas.Single(m => m.Id == matricula.Id);
        Assert.Equal(7m, matriculaAtualizada.NotaFinal);
    }

    [Fact]
    public async Task EnviarRespostasAlunoAsync_ComQuestaoDissertativa_NaoLancaNotaAutomatica()
    {
        var (service, context, professor, aluno, _, _, avaliacao) = await CriarCenarioComAvaliacaoPublicada(tipoAvaliacao: TipoAvaliacao.Prova);
        var questaoDissertativa = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        });

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
    public async Task EnviarRespostasAlunoAsync_SegundaTentativaCorrigida_AtualizaLancamentoExistenteParaNotaMaisRecente()
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
        Assert.Equal(7m, lancamento.NotaOficial);
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
        var questaoDissertativa = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Dissertativa",
            Enunciado = "Explique...",
            TipoQuestao = TipoQuestao.Dissertativa,
            Pontos = 10
        });

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

    // ---------- ListarAvaliacoesPorAlunoAsync ----------

    [Fact]
    public async Task ListarAvaliacoesPorAlunoAsync_SemMatriculaAprovada_RetornaVazio()
    {
        var context = TestContextFactory.Criar();
        var service = new AvaliacaoService(context, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new AcessoAcademicoService(context), new ArmazenamentoArquivoServiceFake());
        var aluno = CriarAluno(context);

        var resultado = await service.ListarAvaliacoesPorAlunoAsync(aluno.Id);

        Assert.Empty(resultado);
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
        await service.EnviarRespostasAlunoAsync(avaliacao.Id, aluno.Id, dto);

        var resultado = (await service.ListarAvaliacoesPorAlunoAsync(aluno.Id)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.TentativasRealizadas);
        Assert.Equal(2, item.TentativasRestantes);
    }

    private class ArmazenamentoArquivoServiceFake : IArmazenamentoArquivoService
    {
        public Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes)
            => throw new NotImplementedException("Nenhum teste de AvaliacaoService exercita upload de anexo ate agora.");
    }
}
