using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class CursoServiceTests
{
    private static CursoService CriarService(PlataformaContext context) => new(
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

    private static Curso CriarCurso(PlataformaContext context, ModeloCurso modeloCurso, int? coordenadorId = null)
    {
        var curso = new Curso
        {
            Titulo = "Curso Teste",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            ModeloCurso = modeloCurso,
            CoordenadorId = coordenadorId
        };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    // Pacote 7 da auditoria de 26/11: publicar exige pelo menos 1 conteudo
    // publicado no curso.
    private static void CriarConteudoPublicado(PlataformaContext context, int cursoId)
    {
        var conteudo = new ConteudoDidatico { Titulo = "Aula publicada", PesoProgresso = 1 };
        conteudo.DefinirProfessorAutor(1);
        conteudo.DefinirCurso(cursoId);
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
    }

    private static void CriarAvaliacaoComQuestao(
        PlataformaContext context, int cursoId, TipoQuestao tipoQuestao, bool publicada = true)
    {
        var avaliacao = new Avaliacao { Titulo = "Prova", TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirAutor(1);
        avaliacao.DefinirCurso(cursoId);
        if (publicada)
        {
            avaliacao.Publicar();
        }
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();
        context.QuestoesPublicadas.Add(new QuestaoPublicada { AvaliacaoId = avaliacao.Id, Ordem = 1, TipoQuestao = tipoQuestao });
        context.SaveChanges();
    }

    // Curso pronto: professor concluiu e coordenador encerrou.
    private static async Task<Curso> CriarCursoEncerradoAsync(
        PlataformaContext context, CursoService service, ModeloCurso modeloCurso)
    {
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, modeloCurso, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        return curso;
    }

    private static void VincularProfessorCurso(PlataformaContext context, int professorId, int cursoId)
    {
        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
    }

    private static Admin CriarAdmin(PlataformaContext context)
    {
        var admin = new Admin
        {
            Nome = "Admin Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "77788899900"
        };
        admin.ConfigurarAcesso("Admin", "hash-fake");

        context.Admins.Add(admin);
        context.SaveChanges();
        return admin;
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
            Matricula = "MAT-0001"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Turma CriarTurma(PlataformaContext context, int cursoId)
    {
        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = $"TUR-{Guid.NewGuid():N}"[..9], CursoId = cursoId };
        context.Turmas.Add(turma);
        context.SaveChanges();
        return turma;
    }

    private static Matricula CriarMatriculaAprovada(PlataformaContext context, Aluno aluno, Curso curso, Turma turma)
    {
        var matricula = new Matricula
        {
            AlunoId = aluno.Id,
            CursoId = curso.Id,
            CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..16]
        };
        matricula.VincularTurma(turma.Id);
        matricula.AprovarComTurma(turma.Id, curso.Id);
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        context.ProgressosCursosAlunos.Add(new ProgressoCursoAluno
        {
            MatriculaId = matricula.Id,
            CursoId = curso.Id,
            PercentualConclusao = 100
        });
        context.SaveChanges();

        return matricula;
    }

    [Theory]
    [InlineData(0, ModeloCurso.Gratuito)]
    [InlineData(150, ModeloCurso.PagoPacote)]
    public async Task CriarCursoAsync_SemModeloInformado_InfereAPartirDoPreco(decimal preco, ModeloCurso esperado)
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var curso = await service.CriarCursoAsync(new CriarCursoDto { Titulo = "Curso", Preco = preco }, criadoPorId: 1);

        Assert.Equal(esperado, curso.ModeloCurso);
    }

    [Fact]
    public async Task CriarCursoAsync_ComModeloInformado_RespeitaOValorExplicito()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var curso = await service.CriarCursoAsync(
            new CriarCursoDto { Titulo = "Curso Acompanhado", Preco = 0, ModeloCurso = ModeloCurso.Acompanhado },
            criadoPorId: 1);

        Assert.Equal(ModeloCurso.Acompanhado, curso.ModeloCurso);
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_ProfessorVinculado_MarcaConclusaoENotificaCoordenador()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.ConcluidoPeloProfessorEm);
        Assert.Equal(professor.Id, cursoAtualizado.ConcluidoPeloProfessorId);

        var notificacoes = context.Notificacoes.Where(n => n.UsuarioId == coordenador.Id).ToList();
        Assert.Single(notificacoes);
    }

    // Decisao D9 da auditoria de 26/11: sem coordenador ninguem encerra o
    // curso depois, entao o professor nao conclui.
    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_CursoSemCoordenador_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id));
        Assert.Contains("coordenador", erro.Message);
    }

    // Pacote 6 da auditoria de 26/11: situacao unica do curso.
    [Fact]
    public void Situacao_SegueAOrdemUnica_EmAndamentoAguardandoEncerradoAVendaForaDeVenda()
    {
        var acompanhado = new Curso { Titulo = "A", ModeloCurso = ModeloCurso.Acompanhado };
        Assert.Equal(SituacaoCurso.EmAndamento, acompanhado.Situacao);

        acompanhado.ConcluirPeloProfessor(1);
        Assert.Equal(SituacaoCurso.AguardandoCoordenador, acompanhado.Situacao);

        acompanhado.Encerrar(2);
        Assert.Equal(SituacaoCurso.Encerrado, acompanhado.Situacao);

        var gratuito = new Curso { Titulo = "G", ModeloCurso = ModeloCurso.Gratuito };
        gratuito.ConcluirPeloProfessor(1);
        Assert.Equal(SituacaoCurso.AguardandoCoordenador, gratuito.Situacao);
        gratuito.PublicarParaVenda();
        Assert.Equal(SituacaoCurso.NoCatalogo, gratuito.Situacao);

        var pacoteDireto = new Curso { Titulo = "P", ModeloCurso = ModeloCurso.PagoPacote, Preco = 10m };
        Assert.Equal(SituacaoCurso.EmAndamento, pacoteDireto.Situacao);
        pacoteDireto.ConcluirPeloProfessor(1);
        Assert.Equal(SituacaoCurso.ProntoParaPublicar, pacoteDireto.Situacao);

        pacoteDireto.PublicarParaVenda();
        Assert.Equal(SituacaoCurso.AVenda, pacoteDireto.Situacao);

        pacoteDireto.DespublicarDaVenda();
        Assert.NotNull(pacoteDireto.RetiradoDaVendaEm);
        Assert.Equal(SituacaoCurso.ForaDeVenda, pacoteDireto.Situacao);

        pacoteDireto.PublicarParaVenda();
        Assert.Null(pacoteDireto.RetiradoDaVendaEm);
        Assert.Equal(SituacaoCurso.AVenda, pacoteDireto.Situacao);
    }

    [Fact]
    public void DespublicarDaVenda_CursoNuncaPublicado_NaoMarcaComoRetirado()
    {
        var curso = new Curso { Titulo = "P", ModeloCurso = ModeloCurso.PagoPacote };

        curso.DespublicarDaVenda();

        Assert.Null(curso.RetiradoDaVendaEm);
        Assert.Equal(SituacaoCurso.EmAndamento, curso.Situacao);
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_ProfessorNaoVinculado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id));
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_PagoJaPublicado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        curso.PublicarParaVenda();
        context.SaveChanges();
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id));
    }

    // Pacote 7 (decisao D11): o Pago criado direto e concluido pelo professor
    // sem coordenador e vai direto ao Admin ("Pronto para publicar").
    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_PagoCriadoDireto_ConcluiSemCoordenadorENotificaAdmins()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var admin = CriarAdmin(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Equal(SituacaoCurso.ProntoParaPublicar, cursoAtualizado.Situacao);
        Assert.Single(context.Notificacoes.Where(n => n.UsuarioId == admin.Id));
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_CursoGratuito_MarcaConclusaoENotificaCoordenador()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.ConcluidoPeloProfessorEm);
        Assert.Equal(professor.Id, cursoAtualizado.ConcluidoPeloProfessorId);
    }

    [Fact]
    public async Task EncerrarCursoAsync_FluxoCompleto_EncerraComSucesso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.EncerradoEm);
        Assert.Equal(coordenador.Id, cursoAtualizado.EncerradoPorId);
    }

    [Fact]
    public async Task EncerrarCursoAsync_SemConclusaoDoProfessor_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EncerrarCursoAsync(curso.Id, coordenador.Id));
    }

    [Fact]
    public async Task EncerrarCursoAsync_CursoGratuito_EncerraComSucesso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.EncerradoEm);
        Assert.Equal(coordenador.Id, cursoAtualizado.EncerradoPorId);
    }

    [Fact]
    public async Task EncerrarCursoAsync_CursoGratuitoComAlunoElegivel_NaoEmiteCertificadoEmLote()
    {
        // Achado 3 do plano: so Acompanhado dispara a emissao automatica em
        // lote no encerramento - Gratuito segue a regra normal de pendencias
        // (o aluno so recebe quando pedir/alguem checar, nao em massa aqui).
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var aluno = CriarAluno(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EncerrarCursoAsync_NotificaTodosOsAdminsComLinkDoCursoEspecifico()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var admin1 = CriarAdmin(context);
        var admin2 = CriarAdmin(context);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var notificacoes = context.Notificacoes
            .Where(n => n.Tipo == TipoNotificacao.CursoEncerrado)
            .ToList();
        Assert.Equal(2, notificacoes.Count);
        Assert.All(notificacoes, n => Assert.Equal($"/app/cursos/{curso.Id}", n.Link));
        Assert.Contains(notificacoes, n => n.UsuarioId == admin1.Id);
        Assert.Contains(notificacoes, n => n.UsuarioId == admin2.Id);
    }

    [Fact]
    public async Task EncerrarCursoAsync_CoordenadorNaoResponsavel_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenadorDono = CriarCoordenador(context);
        var outroCoordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenadorDono.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EncerrarCursoAsync(curso.Id, outroCoordenador.Id));
    }

    [Fact]
    public async Task ReabrirCursoAsync_CursoEncerrado_LimpaEncerramentoEDesfazConclusao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.EncerradoEm);
        Assert.Null(cursoAtualizado.EncerradoPorId);
        // Decisao "Travar + devolver" (PROMPT-agente-progresso-e-trava-ao-concluir.md,
        // Parte A): reabrir Gratuito/Acompanhado tambem devolve ao professor -
        // senao o curso ficaria "Aguardando encerramento" pra sempre e o
        // professor nunca conseguiria concluir de novo.
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorEm);
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorId);
    }

    [Fact]
    public async Task ReabrirCursoAsync_CursoGratuitoEncerrado_LimpaEncerramentoEDesfazConclusao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.EncerradoEm);
        Assert.Null(cursoAtualizado.EncerradoPorId);
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorEm);
    }

    [Fact]
    public async Task ReabrirCursoAsync_PagoPacoteAVenda_LancaInvalidOperationComMensagemCorreta()
    {
        // Correcao Adendo 2 item 1: o pacote ja esta sendo vendido, entao
        // reabrir (e permitir edicao) por baixo dos pes de quem comprou e
        // bloqueado at ele ser tirado da venda.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        await service.PublicarParaVendaAsync(curso.Id);

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ReabrirCursoAsync(curso.Id, coordenador.Id));

        Assert.Equal("Tire o curso da venda/do catalogo antes de reabrir.", excecao.Message);
    }

    [Fact]
    public async Task ReabrirCursoAsync_PagoPacoteForaDaVenda_Funciona()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        await service.PublicarParaVendaAsync(curso.Id);
        await service.DespublicarDaVendaAsync(curso.Id);

        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.EncerradoEm);
        // Pacote 7: reabrir desfaz a conclusao tambem no Pago (senao ficaria
        // travado, ver Curso.AceitaEdicao).
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorEm);
    }

    [Fact]
    public async Task EncerrarCursoAsync_AlunoComRequisitosCumpridos_EmiteCertificadoAutomaticamente()
    {
        // Regra de negocio: o aluno nunca pede o certificado - o encerramento
        // do coordenador e o gatilho da emissao automatica (ver
        // ICertificadoService.EmitirCertificadosDoCursoAsync).
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var aluno = CriarAluno(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.NotNull(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EncerrarCursoAsync_AlunoComNotaAbaixoDoMinimo_NaoEmiteCertificado()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var aluno = CriarAluno(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();
        context.QuestoesPublicadas.Add(new QuestaoPublicada { AvaliacaoId = avaliacao.Id, Ordem = 1 });
        context.SaveChanges();

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(5, 1, OrigemCorrecaoNota.Automatica);
        context.LancamentosNotasAlunos.Add(lancamento);
        matricula.LancarNotaFinal(5m);
        context.SaveChanges();

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task ReabrirCursoAsync_MatriculaComCertificadoJaEmitido_NaoApagaCertificado()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        var aluno = CriarAluno(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var certificadoEmitidoEm = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id).CertificadoEmitidoEm;
        Assert.NotNull(certificadoEmitidoEm);

        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var matriculaAposReabrir = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Equal(certificadoEmitidoEm, matriculaAposReabrir.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_CursoAcompanhadoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoParaEdicaoAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_CursoGratuitoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoParaEdicaoAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_CursoPagoPacoteEncerrado_LancaInvalidOperation()
    {
        // O pacote travado (achado 10 do plano) tambem bloqueia edicao - mesma
        // regra de qualquer outro modelo com EncerradoEm preenchido.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoParaEdicaoAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_CursoPagoPacoteSemEncerramento_NuncaBloqueia()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);

        await service.GarantirCursoAbertoParaEdicaoAsync(curso.Id);
    }

    [Theory]
    [InlineData(ModeloCurso.Acompanhado)]
    [InlineData(ModeloCurso.Gratuito)]
    public async Task GarantirCursoAbertoParaEdicaoAsync_ConcluidoPeloProfessorNaoEncerrado_LancaInvalidOperation(ModeloCurso modeloCurso)
    {
        // Decisao "Travar + devolver": a edicao trava assim que o professor
        // conclui, antes mesmo do coordenador encerrar.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, modeloCurso, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var excecao = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoParaEdicaoAsync(curso.Id));

        Assert.Contains("aguardando o encerramento", excecao.Message);
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_PacoteConvertidoTiradoDaVendaEReaberto_DesfazConclusaoEAceitaEdicao()
    {
        // Pacote 7 da auditoria de 26/11: reabrir tambem desfaz a conclusao
        // no Pago - senao o curso ficaria travado para sempre (concluido trava).
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        await service.PublicarParaVendaAsync(curso.Id);
        await service.DespublicarDaVendaAsync(curso.Id);
        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorEm);

        await service.GarantirCursoAbertoParaEdicaoAsync(curso.Id);
    }

    [Theory]
    [InlineData(ModeloCurso.Acompanhado)]
    [InlineData(ModeloCurso.Gratuito)]
    public async Task DevolverAoProfessorAsync_CursoConcluido_DesfazConclusaoENotificaProfessores(ModeloCurso modeloCurso)
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, modeloCurso, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, "Falta corrigir o modulo 2.");

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorEm);
        Assert.Null(cursoAtualizado.ConcluidoPeloProfessorId);

        // Edicao volta a funcionar imediatamente.
        await service.GarantirCursoAbertoParaEdicaoAsync(curso.Id);

        var notificacoes = context.Notificacoes.Where(n => n.UsuarioId == professor.Id).ToList();
        var notificacaoDevolucao = Assert.Single(notificacoes, n => n.Tipo == TipoNotificacao.CursoDevolvidoAoProfessor);
        Assert.Contains("Falta corrigir o modulo 2.", notificacaoDevolucao.Mensagem);
    }

    [Fact]
    public async Task DevolverAoProfessorAsync_SemMotivo_NotificaSemMotivoNaMensagem()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, motivo: null);

        var notificacao = context.Notificacoes.Single(n => n.UsuarioId == professor.Id && n.Tipo == TipoNotificacao.CursoDevolvidoAoProfessor);
        Assert.DoesNotContain("Motivo:", notificacao.Mensagem);
    }

    [Fact]
    public async Task DevolverAoProfessorAsync_CoordenadorNaoResponsavel_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenadorDono = CriarCoordenador(context);
        var outroCoordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenadorDono.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DevolverAoProfessorAsync(curso.Id, outroCoordenador.Id, null));
    }

    [Fact]
    public async Task DevolverAoProfessorAsync_CursoAindaNaoConcluido_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, null));
    }

    [Fact]
    public async Task DevolverAoProfessorAsync_CursoJaEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, null));
    }

    [Fact]
    public async Task DevolverAoProfessorAsync_PagoPacote_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, null));
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_AposDevolver_FuncionaDeNovo()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.DevolverAoProfessorAsync(curso.Id, coordenador.Id, null);

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.ConcluidoPeloProfessorEm);

        var notificacoesCoordenador = context.Notificacoes
            .Where(n => n.UsuarioId == coordenador.Id && n.Tipo == TipoNotificacao.CursoConcluidoPeloProfessor)
            .ToList();
        Assert.Equal(2, notificacoesCoordenador.Count);
    }

    [Fact]
    public async Task GarantirCursoAbertoParaMatriculaAsync_CursoGratuitoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoParaMatriculaAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoParaMatriculaAsync_CursoPagoPacoteEncerrado_NuncaBloqueia()
    {
        // "So compra o que esta a venda" (Round 3) e quem decide se um
        // PagoPacote pode ser comprado - esta trava nunca entra na jogada pra
        // esse modelo, mesmo com o conteudo travado.
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        await service.GarantirCursoAbertoParaMatriculaAsync(curso.Id);
    }

    // ---------- DefinirPacoteAsync ----------

    [Fact]
    public async Task DefinirPacoteAsync_CursoGratuitoEncerrado_TransformaEmPagoPacote()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.DefinirPacoteAsync(
            curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m, Descricao = "Pacote promocional" });

        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
        Assert.Equal(29.90m, cursoAtualizado.Preco);
        Assert.Equal("Pacote promocional", cursoAtualizado.Descricao);
        // Nao desfaz o encerramento - o pacote continua travado ate alguem reabrir.
        Assert.NotNull(cursoAtualizado.EncerradoEm);
    }

    [Fact]
    public async Task DefinirPacoteAsync_CursoGratuitoNaoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m }));
    }

    // Pacote 8 da auditoria de 26/11 (D1, D4, D8b): conversao.

    [Fact]
    public async Task DefinirPacoteAsync_GratuitoEncerradoViraPago_GuardaModalidadeOriginal()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Gratuito);

        var cursoAtualizado = await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });

        Assert.Equal(ModeloCurso.Gratuito, cursoAtualizado.ModeloCursoOriginal);
    }

    [Fact]
    public async Task DefinirPacoteAsync_AcompanhadoEncerradoViraPago()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Acompanhado);

        var cursoAtualizado = await service.DefinirPacoteAsync(
            curso.Id, new AtualizarPacoteCursoDto { Preco = 59.90m, ModeloDestino = ModeloCurso.PagoPacote });

        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
        Assert.Equal(ModeloCurso.Acompanhado, cursoAtualizado.ModeloCursoOriginal);
        Assert.Equal(59.90m, cursoAtualizado.Preco);
        Assert.NotNull(cursoAtualizado.EncerradoEm);
        Assert.Null(cursoAtualizado.PublicadoParaVendaEm);
    }

    [Fact]
    public async Task DefinirPacoteAsync_AcompanhadoEncerradoViraGratuito_ZeraPrecoEPodePublicar()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Acompanhado);
        curso.Preco = 59.90m;
        context.SaveChanges();
        CriarConteudoPublicado(context, curso.Id);

        var cursoAtualizado = await service.DefinirPacoteAsync(
            curso.Id, new AtualizarPacoteCursoDto { Preco = 0, ModeloDestino = ModeloCurso.Gratuito });
        await service.PublicarParaVendaAsync(curso.Id);

        Assert.Equal(ModeloCurso.Gratuito, cursoAtualizado.ModeloCurso);
        Assert.Equal(ModeloCurso.Acompanhado, cursoAtualizado.ModeloCursoOriginal);
        Assert.Equal(0m, cursoAtualizado.Preco);
        Assert.NotNull(cursoAtualizado.PublicadoParaVendaEm);
        Assert.True(cursoAtualizado.DisponivelParaNovosAlunos);
    }

    [Fact]
    public async Task DefinirPacoteAsync_ConvertidoDuasVezes_MantemPrimeiraOrigem()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Acompanhado);

        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { ModeloDestino = ModeloCurso.Gratuito });
        var cursoAtualizado = await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 19.90m });

        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
        Assert.Equal(ModeloCurso.Acompanhado, cursoAtualizado.ModeloCursoOriginal);
    }

    [Fact]
    public async Task DefinirPacoteAsync_AcompanhadoNaoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m }));
    }

    [Fact]
    public async Task DefinirPacoteAsync_PagoParaGratuito_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { ModeloDestino = ModeloCurso.Gratuito }));
    }

    [Fact]
    public async Task DefinirPacoteAsync_DestinoAcompanhado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Gratuito);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { ModeloDestino = ModeloCurso.Acompanhado }));
    }

    [Fact]
    public async Task DefinirPacoteAsync_ComDissertativaPublicada_BloqueiaConversao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Acompanhado);
        CriarAvaliacaoComQuestao(context, curso.Id, TipoQuestao.Dissertativa);

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m }));

        Assert.Contains("dissertativa", erro.Message);
        var cursoNoBanco = await context.Cursos.FindAsync(curso.Id);
        Assert.Equal(ModeloCurso.Acompanhado, cursoNoBanco!.ModeloCurso);
        Assert.Null(cursoNoBanco.ModeloCursoOriginal);
    }

    [Fact]
    public async Task DefinirPacoteAsync_SoObjetivasOuDissertativaEmRascunho_Converte()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = await CriarCursoEncerradoAsync(context, service, ModeloCurso.Acompanhado);
        CriarAvaliacaoComQuestao(context, curso.Id, TipoQuestao.MultiplaEscolha);
        CriarAvaliacaoComQuestao(context, curso.Id, TipoQuestao.Dissertativa, publicada: false);

        var cursoAtualizado = await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });

        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
    }

    [Fact]
    public async Task DefinirPacoteAsync_PacoteJaExistente_EditaPrecoEDescricao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);

        var cursoAtualizado = await service.DefinirPacoteAsync(
            curso.Id, new AtualizarPacoteCursoDto { Preco = 49.90m, Descricao = "Novo preco" });

        Assert.Equal(49.90m, cursoAtualizado.Preco);
        Assert.Equal("Novo preco", cursoAtualizado.Descricao);
    }

    [Fact]
    public async Task DefinirPacoteAsync_PrecoZero_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 0 }));
    }

    // ---------- PublicarParaVendaAsync / DespublicarDaVendaAsync ----------

    // Pacote 7 da auditoria de 26/11: o Pago criado direto so publica depois
    // que o professor conclui (o conteudo chega completo ao aluno).
    [Fact]
    public async Task PublicarParaVendaAsync_PacoteCriadoDiretoSemConclusao_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.PublicarParaVendaAsync(curso.Id));
    }

    [Fact]
    public async Task PublicarParaVendaAsync_PacoteCriadoDiretoConcluido_PublicaSemExigirEncerramento()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        curso.ConcluirPeloProfessor(1);
        context.SaveChanges();

        await service.PublicarParaVendaAsync(curso.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.PublicadoParaVendaEm);
    }

    [Fact]
    public async Task PublicarParaVendaAsync_SemConteudoPublicado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        curso.ConcluirPeloProfessor(1);
        context.SaveChanges();

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(() => service.PublicarParaVendaAsync(curso.Id));
        Assert.Contains("conteudo", erro.Message);
    }

    // Decisoes D3/D11: o Gratuito publica depois do coordenador encerrar,
    // vira "No catalogo" e passa a aceitar matricula.
    [Fact]
    public async Task PublicarParaVendaAsync_GratuitoEncerrado_PublicaNoCatalogo()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        CriarConteudoPublicado(context, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await service.PublicarParaVendaAsync(curso.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Equal(SituacaoCurso.NoCatalogo, cursoAtualizado.Situacao);
        Assert.True(cursoAtualizado.DisponivelParaNovosAlunos);
        await service.GarantirCursoAbertoParaMatriculaAsync(curso.Id);
    }

    [Fact]
    public async Task PublicarParaVendaAsync_GratuitoNaoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        CriarConteudoPublicado(context, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.PublicarParaVendaAsync(curso.Id));
    }

    [Fact]
    public async Task PublicarParaVendaAsync_Acompanhado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado);
        CriarConteudoPublicado(context, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.PublicarParaVendaAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoParaMatriculaAsync_GratuitoNaoPublicado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(() => service.GarantirCursoAbertoParaMatriculaAsync(curso.Id));
        Assert.Contains("nao esta disponivel", erro.Message);
    }

    [Fact]
    public async Task GarantirCursoAbertoParaEdicaoAsync_CursoPublicado_TravaComMensagemDePublicado()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        curso.PublicarParaVenda();
        context.SaveChanges();

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(() => service.GarantirCursoAbertoParaEdicaoAsync(curso.Id));
        Assert.Contains("publicado", erro.Message);
    }

    [Fact]
    public async Task EncerrarCursoAsync_Pago_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, coordenador.Id);
        curso.ConcluirPeloProfessor(1);
        context.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.EncerrarCursoAsync(curso.Id, coordenador.Id));
    }

    [Fact]
    public async Task PublicarParaVendaAsync_PacoteVindoDoFluxoNaoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.PublicarParaVendaAsync(curso.Id));
    }

    [Fact]
    public async Task PublicarParaVendaAsync_PacoteVindoDoFluxoEncerrado_Publica()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);

        await service.PublicarParaVendaAsync(curso.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.PublicadoParaVendaEm);
    }

    [Fact]
    public async Task PublicarParaVendaAsync_ModeloNaoPagoPacote_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.PublicarParaVendaAsync(curso.Id));
    }

    [Fact]
    public async Task DespublicarDaVendaAsync_LimpaOCampoEMarcaRetiradoDaVenda()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        curso.ConcluirPeloProfessor(1);
        context.SaveChanges();
        await service.PublicarParaVendaAsync(curso.Id);

        await service.DespublicarDaVendaAsync(curso.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.PublicadoParaVendaEm);
        Assert.NotNull(cursoAtualizado.RetiradoDaVendaEm);
        Assert.Equal(SituacaoCurso.ForaDeVenda, cursoAtualizado.Situacao);
    }

    // ---------- Ciclo completo: Gratuito -> pacote travado -> reabrir so fora da venda ----------

    [Fact]
    public async Task CicloCompleto_PacoteTravado_TiraDaVendaReabreEditaConcluiEPublicaDeNovo()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var moduloService = new ModuloService(new ModuloRepository(context), new GenericRepository<Curso>(context), service, new ProgressoAlunoService(context, new AcessoAcademicoService(context)), context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);
        await service.DefinirPacoteAsync(curso.Id, new AtualizarPacoteCursoDto { Preco = 29.90m });
        CriarConteudoPublicado(context, curso.Id);
        await service.PublicarParaVendaAsync(curso.Id);

        // Travado: nem o Coordenador reabre nem o Professor edita enquanto a
        // venda estiver ativa.
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReabrirCursoAsync(curso.Id, coordenador.Id));
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => moduloService.CriarModuloAsync(new Modulo { Titulo = "Modulo Novo", CursoId = curso.Id }));

        // Admin tira da venda -> Coordenador reabre (desfaz a conclusao) -> Professor edita.
        await service.DespublicarDaVendaAsync(curso.Id);
        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);
        var moduloNovo = await moduloService.CriarModuloAsync(new Modulo { Titulo = "Modulo Novo", CursoId = curso.Id });
        Assert.NotEqual(0, moduloNovo.Id);

        // Pacote 7 (D11): o Pago nao volta ao coordenador - o professor
        // conclui de novo e o Admin publica.
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.PublicarParaVendaAsync(curso.Id);

        var cursoFinal = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoFinal.PublicadoParaVendaEm);
        Assert.Equal(SituacaoCurso.AVenda, cursoFinal.Situacao);
    }

    [Fact]
    public async Task ListarProfessoresVinculadosAsync_RetornaApenasProfessoresDoCurso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var cursoAlvo = CriarCurso(context, ModeloCurso.PagoPacote);
        var outroCurso = CriarCurso(context, ModeloCurso.PagoPacote);
        var professorVinculado = CriarProfessor(context);
        var professorDeOutroCurso = CriarProfessor(context);
        VincularProfessorCurso(context, professorVinculado.Id, cursoAlvo.Id);
        VincularProfessorCurso(context, professorDeOutroCurso.Id, outroCurso.Id);

        var professores = await service.ListarProfessoresVinculadosAsync(cursoAlvo.Id);

        var professor = Assert.Single(professores);
        Assert.Equal(professorVinculado.Id, professor.Id);
    }

    [Fact]
    public async Task ListarProfessoresVinculadosAsync_CursoInexistente_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ListarProfessoresVinculadosAsync(999));
    }
}
