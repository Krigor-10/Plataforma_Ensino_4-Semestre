using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;

namespace PlataformaEnsino.Tests;

public class ChatbotFerramentasServiceTests
{
    private static ChatbotFerramentasService CriarService(PlataformaContext context, MatriculaServiceFake matriculas, AvaliacaoServiceFake avaliacoes)
    {
        var acessoAcademico = new AcessoAcademicoService(context);
        return new ChatbotFerramentasService(
            context,
            matriculas,
            new ProgressoAlunoService(context, acessoAcademico),
            avaliacoes,
            new CertificadoService(context, acessoAcademico),
            new PagamentoService(context, new NotificacaoService(context, NullLogger<NotificacaoService>.Instance), new ConfigurationBuilder().Build()));
    }

    private static Aluno CriarAluno(PlataformaContext context, string sufixo)
    {
        var aluno = new Aluno
        {
            Nome = $"Aluno {sufixo}",
            Email = $"aluno.{sufixo}.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
            Matricula = $"MAT-{sufixo}-{Guid.NewGuid():N}"[..12]
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context, string titulo, ModeloCurso modelo = ModeloCurso.Gratuito, decimal preco = 0, int? coordenadorId = null)
    {
        var curso = new Curso
        {
            Titulo = titulo,
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            Preco = preco,
            ModeloCurso = modelo,
            CoordenadorId = coordenadorId
        };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Matricula CriarMatriculaAprovada(PlataformaContext context, int alunoId, int cursoId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static Modulo CriarModulo(PlataformaContext context, int cursoId, string titulo, DateTime dataCriacao)
    {
        var modulo = new Modulo { Titulo = titulo, CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9], CursoId = cursoId, DataCriacao = dataCriacao };
        context.Modulos.Add(modulo);
        context.SaveChanges();
        return modulo;
    }

    private static ConteudoDidatico CriarConteudoPublicado(PlataformaContext context, int cursoId, int moduloId, string titulo)
    {
        var conteudo = new ConteudoDidatico { Titulo = titulo, ModuloId = moduloId, CorpoTexto = "Conteudo de teste." };
        conteudo.DefinirCurso(cursoId);
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    private static void ConcluirConteudo(PlataformaContext context, int matriculaId, ConteudoDidatico conteudo)
    {
        context.ProgressosConteudosAlunos.Add(new ProgressoConteudoAluno
        {
            MatriculaId = matriculaId,
            ConteudoDidaticoId = conteudo.Id,
            ModuloId = conteudo.ModuloId,
            StatusProgresso = StatusProgressoAprendizagem.Concluido,
            PercentualConclusao = 100
        });
        context.SaveChanges();
    }

    [Fact]
    public async Task ObterMeusCursosAsync_DevolveSoCursosDoAlunoDoToken()
    {
        var context = TestContextFactory.Criar();
        var alunoA = CriarAluno(context, "A");
        var alunoB = CriarAluno(context, "B");
        var cursoDeA = CriarCurso(context, "Curso do Aluno A");
        var cursoDeB = CriarCurso(context, "Curso do Aluno B");
        CriarMatriculaAprovada(context, alunoA.Id, cursoDeA.Id);
        CriarMatriculaAprovada(context, alunoB.Id, cursoDeB.Id);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        var resultado = await service.ObterMeusCursosAsync(alunoA.Id);

        Assert.Single(resultado);
        Assert.Equal(cursoDeA.Id, resultado[0].CursoId);
        Assert.DoesNotContain(resultado, curso => curso.CursoId == cursoDeB.Id);
    }

    [Fact]
    public async Task ObterProgressoDoCursoAsync_CursoDeOutroAluno_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var alunoA = CriarAluno(context, "A");
        var alunoB = CriarAluno(context, "B");
        var cursoDeB = CriarCurso(context, "Curso do Aluno B");
        CriarMatriculaAprovada(context, alunoB.Id, cursoDeB.Id);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterProgressoDoCursoAsync(alunoA.Id, cursoDeB.Id));
    }

    [Fact]
    public async Task ObterSituacaoAvaliacoesAsync_CursoDeOutroAluno_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var alunoA = CriarAluno(context, "A");
        var alunoB = CriarAluno(context, "B");
        var cursoDeB = CriarCurso(context, "Curso do Aluno B");
        CriarMatriculaAprovada(context, alunoB.Id, cursoDeB.Id);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterSituacaoAvaliacoesAsync(alunoA.Id, cursoDeB.Id));
    }

    [Fact]
    public async Task ObterSituacaoCertificadoAsync_CursoDeOutroAluno_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var alunoA = CriarAluno(context, "A");
        var alunoB = CriarAluno(context, "B");
        var cursoDeB = CriarCurso(context, "Curso do Aluno B");
        CriarMatriculaAprovada(context, alunoB.Id, cursoDeB.Id);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterSituacaoCertificadoAsync(alunoA.Id, cursoDeB.Id));
    }

    [Fact]
    public async Task ObterProgressoDoCursoAsync_SegundoModuloSoLiberaQuandoPrimeiroEstaCompleto()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context, "A");
        var curso = CriarCurso(context, "Curso com 2 modulos");
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id);
        var moduloUm = CriarModulo(context, curso.Id, "Modulo 1", new DateTime(2026, 1, 1));
        var moduloDois = CriarModulo(context, curso.Id, "Modulo 2", new DateTime(2026, 1, 2));

        var conteudoUm = CriarConteudoPublicado(context, curso.Id, moduloUm.Id, "Aula 1");
        CriarConteudoPublicado(context, curso.Id, moduloUm.Id, "Aula 2");
        ConcluirConteudo(context, matricula.Id, conteudoUm);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        var resultado = await service.ObterProgressoDoCursoAsync(aluno.Id, curso.Id);

        Assert.Equal(2, resultado.Modulos.Count);
        Assert.True(resultado.Modulos[0].Liberado, "O primeiro modulo deve estar sempre liberado.");
        Assert.False(resultado.Modulos[1].Liberado, "O segundo modulo nao deveria liberar com o primeiro so 50% concluido.");
        Assert.Equal(1, resultado.Modulos[0].ConteudosConcluidos);
        Assert.Equal(2, resultado.Modulos[0].TotalConteudos);
        Assert.Equal(new List<string> { "Aula 2" }, resultado.Modulos[0].ConteudosPendentes);
    }

    [Fact]
    public async Task ObterProgressoDoCursoAsync_ModuloLiberadoMasNuncaTocado_DevolveTotalRealEmVezDeZero()
    {
        // Achado da Rodada 1 da validacao do chatbot: ProgressoModuloAluno so e
        // criado/recalculado na 1a conclusao de um conteudo daquele modulo - um
        // modulo liberado (o anterior esta 100%) mas ainda sem nenhuma conclusao
        // aparecia como "0 de 0" em vez do total real de conteudos publicados.
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context, "A");
        var curso = CriarCurso(context, "Curso com modulo nunca tocado");
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id);
        var moduloUm = CriarModulo(context, curso.Id, "Modulo 1", new DateTime(2026, 1, 1));
        var moduloDois = CriarModulo(context, curso.Id, "Modulo 2 - APIs e Autenticacao", new DateTime(2026, 1, 2));

        var conteudoUm = CriarConteudoPublicado(context, curso.Id, moduloUm.Id, "Aula 1");
        ConcluirConteudo(context, matricula.Id, conteudoUm);

        CriarConteudoPublicado(context, curso.Id, moduloDois.Id, "APIs REST");
        CriarConteudoPublicado(context, curso.Id, moduloDois.Id, "Autenticacao");
        // Nenhum ProgressoConteudoAluno criado pro Modulo 2 - aluno nunca tocou nele.

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        var resultado = await service.ObterProgressoDoCursoAsync(aluno.Id, curso.Id);

        var moduloDoisDto = resultado.Modulos.Single(modulo => modulo.ModuloId == moduloDois.Id);
        Assert.True(moduloDoisDto.Liberado, "Modulo 1 esta 100% concluido, Modulo 2 deveria estar liberado.");
        Assert.Equal(2, moduloDoisDto.TotalConteudos);
        Assert.Equal(0, moduloDoisDto.ConteudosConcluidos);
        Assert.Equal(new List<string> { "APIs REST", "Autenticacao" }, moduloDoisDto.ConteudosPendentes);
    }

    [Fact]
    public async Task ObterSituacaoAvaliacoesAsync_AvaliacaoBloqueadaPorModulo_ListaConteudosPendentesPeloNome()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context, "A");
        var curso = CriarCurso(context, "Curso com prova bloqueada");
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id);
        var modulo = CriarModulo(context, curso.Id, "Modulo 3 - APIs e Autenticacao", new DateTime(2026, 1, 1));

        CriarConteudoPublicado(context, curso.Id, modulo.Id, "APIs REST");
        CriarConteudoPublicado(context, curso.Id, modulo.Id, "Autenticacao");
        // Nenhum concluido - avaliacao de modulo fica bloqueada.

        var avaliacoesFake = new AvaliacaoServiceFake();
        avaliacoesFake.Avaliacoes.Add(new AvaliacaoAlunoResponseDto
        {
            Id = 10,
            MatriculaId = matricula.Id,
            Titulo = "Quiz do Modulo 3",
            CursoId = curso.Id,
            ModuloId = modulo.Id,
            ModuloTitulo = modulo.Titulo,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            TentativasPermitidas = 1,
            ProgressoLiberado = false
        });

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, avaliacoesFake);

        var resultado = await service.ObterSituacaoAvaliacoesAsync(aluno.Id, curso.Id);

        var situacao = Assert.Single(resultado);
        Assert.False(situacao.Liberada);
        Assert.Equal(new List<string> { "APIs REST", "Autenticacao" }, situacao.ConteudosPendentes);
        Assert.Contains("APIs REST", situacao.Motivo);
        Assert.Contains("Autenticacao", situacao.Motivo);
    }

    [Fact]
    public async Task ObterSituacaoAvaliacoesAsync_QuizVinculadoBloqueado_CitaSoOConteudoPai()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context, "A");
        var curso = CriarCurso(context, "Curso com quiz vinculado");
        var matricula = CriarMatriculaAprovada(context, aluno.Id, curso.Id);
        var modulo = CriarModulo(context, curso.Id, "Modulo 2", new DateTime(2026, 1, 1));

        var conteudoPai = CriarConteudoPublicado(context, curso.Id, modulo.Id, "Conteudo 1");
        CriarConteudoPublicado(context, curso.Id, modulo.Id, "Conteudo 2");

        var avaliacoesFake = new AvaliacaoServiceFake();
        avaliacoesFake.Avaliacoes.Add(new AvaliacaoAlunoResponseDto
        {
            Id = 11,
            MatriculaId = matricula.Id,
            Titulo = "Quiz sobre Conteudo 1",
            CursoId = curso.Id,
            ModuloId = modulo.Id,
            ModuloTitulo = modulo.Titulo,
            ConteudoDidaticoId = conteudoPai.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz,
            TentativasPermitidas = 1,
            ProgressoLiberado = false
        });

        var service = CriarService(context, new MatriculaServiceFake(context), avaliacoesFake);

        var situacao = Assert.Single(await service.ObterSituacaoAvaliacoesAsync(aluno.Id, curso.Id));

        Assert.Equal(new List<string> { "Conteudo 1" }, situacao.ConteudosPendentes);
        Assert.Contains("Conteudo 1", situacao.Motivo);
        Assert.DoesNotContain("100%", situacao.Motivo);
    }

    [Fact]
    public void SituacaoAvaliacaoFerramentaDto_NaoExpoeEnunciadoNemGabarito()
    {
        // Ferramenta "situacao_avaliacoes" NUNCA pode mandar enunciado/gabarito pro
        // modelo (so liberada/bloqueada, tentativas, prazo, nota) - garantia estrutural
        // contra alguem adicionar um campo sensivel aqui por engano no futuro.
        var propriedades = typeof(SituacaoAvaliacaoFerramentaDto).GetProperties().Select(p => p.Name.ToLowerInvariant());

        Assert.DoesNotContain("enunciado", propriedades);
        Assert.DoesNotContain("gabarito", propriedades);
        Assert.DoesNotContain("alternativas", propriedades);
        Assert.DoesNotContain("questoes", propriedades);
    }

    [Fact]
    public void FerramentasDtos_NaoExpoemCpfEmailOuEndereco()
    {
        // "Mandar ao modelo so os campos necessarios: nada de CPF, e-mail ou
        // endereco" (FASE-1) - checagem estrutural nos DTOs das 6 ferramentas.
        var tiposDeFerramentas = new[]
        {
            typeof(CursoDoAlunoFerramentaDto),
            typeof(ProgressoDoCursoFerramentaDto),
            typeof(ModuloProgressoFerramentaDto),
            typeof(SituacaoAvaliacaoFerramentaDto),
            typeof(SituacaoCertificadoFerramentaDto),
            typeof(PagamentoFerramentaDto),
            typeof(CursoCatalogoFerramentaDto)
        };

        var camposProibidos = new[] { "cpf", "email", "endereco", "cep", "rua", "telefone" };

        foreach (var tipo in tiposDeFerramentas)
        {
            var propriedades = tipo.GetProperties().Select(p => p.Name.ToLowerInvariant()).ToList();
            foreach (var proibido in camposProibidos)
            {
                Assert.DoesNotContain(proibido, propriedades);
            }
        }
    }

    [Fact]
    public async Task ObterMeusPagamentosAsync_DevolveSoPagamentosDoAlunoDoToken()
    {
        var context = TestContextFactory.Criar();
        var alunoA = CriarAluno(context, "A");
        var alunoB = CriarAluno(context, "B");
        var cursoDeA = CriarCurso(context, "Curso Pago A", ModeloCurso.PagoPacote, preco: 100m);
        var cursoDeB = CriarCurso(context, "Curso Pago B", ModeloCurso.PagoPacote, preco: 150m);
        var matriculaA = CriarMatriculaAprovada(context, alunoA.Id, cursoDeA.Id);
        var matriculaB = CriarMatriculaAprovada(context, alunoB.Id, cursoDeB.Id);

        context.Pagamentos.Add(Pagamento.CriarPendente(matriculaA.Id, 100m));
        var pagamentoDeB = Pagamento.CriarPendente(matriculaB.Id, 150m);
        pagamentoDeB.ConfirmarPagamento();
        context.Pagamentos.Add(pagamentoDeB);
        context.SaveChanges();

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        var resultado = await service.ObterMeusPagamentosAsync(alunoA.Id);

        Assert.Single(resultado);
        Assert.Equal(cursoDeA.Id, resultado[0].CursoId);
    }

    [Fact]
    public async Task BuscarNoCatalogoAsync_RespeitaRegraDeVisibilidadeENaoDevolveMaisDeCinco()
    {
        var context = TestContextFactory.Criar();
        for (var indice = 1; indice <= 6; indice++)
        {
            CriarCurso(context, $"Curso Buscavel {indice}", ModeloCurso.Gratuito).PublicarParaVenda();
        }
        // Pacote 7 da auditoria de 26/11 (D3): Gratuito so aparece publicado;
        // Acompanhado some depois de encerrado.
        var gratuitoNaoPublicado = CriarCurso(context, "Curso Buscavel Gratuito Nao Publicado", ModeloCurso.Gratuito);
        var cursoEncerrado = CriarCurso(context, "Curso Buscavel Encerrado", ModeloCurso.Acompanhado);
        // EncerradoEm so tem setter privado no modelo - usa Encerrar() direto.
        cursoEncerrado.Encerrar(coordenadorId: 1);
        context.SaveChanges();

        var pacoteNaoPublicado = CriarCurso(context, "Curso Buscavel Pacote Nao Publicado", ModeloCurso.PagoPacote, preco: 50m);

        var matriculas = new MatriculaServiceFake(context);
        var service = CriarService(context, matriculas, new AvaliacaoServiceFake());

        var resultado = await service.BuscarNoCatalogoAsync("Curso Buscavel");

        Assert.Equal(5, resultado.Count);
        Assert.DoesNotContain(resultado, curso => curso.CursoId == cursoEncerrado.Id);
        Assert.DoesNotContain(resultado, curso => curso.CursoId == gratuitoNaoPublicado.Id);
        Assert.DoesNotContain(resultado, curso => curso.CursoId == pacoteNaoPublicado.Id);
    }
}

/// <summary>Fake minimo - ChatbotFerramentasService so usa ListarMatriculasPorAlunoAsync; o resto nunca e chamado por essas rotas de leitura.</summary>
public sealed class MatriculaServiceFake : IMatriculaService
{
    private readonly PlataformaContext _context;

    public MatriculaServiceFake(PlataformaContext context) => _context = context;

    public Task<IEnumerable<Matricula>> ListarMatriculasPorAlunoAsync(int alunoId) =>
        Task.FromResult<IEnumerable<Matricula>>(_context.Matriculas.Where(matricula => matricula.AlunoId == alunoId).ToList());

    public Task<Matricula> MatricularComAprovacaoAutomaticaAsync(int alunoId, int cursoId) => throw new NotSupportedException();
    public Task<Matricula> ComprarCursoAsync(int alunoId, int cursoId) => throw new NotSupportedException();
    public Task<Matricula> ObterMatriculaPorIdAsync(int id) => throw new NotSupportedException();
    public Task<(IEnumerable<Matricula> Itens, int TotalItens)> ListarMatriculasAsync(int? pagina, int? tamanhoPagina, int? coordenadorId) => throw new NotSupportedException();
    public Task CancelarMatriculaAsync(int matriculaId) => throw new NotSupportedException();
    public Task ReabrirMatriculaAsync(int matriculaId) => throw new NotSupportedException();
}

/// <summary>Fake minimo - ChatbotFerramentasService so usa ListarAvaliacoesPorAlunoAsync; seed de cenario via <see cref="Avaliacoes"/>.</summary>
public sealed class AvaliacaoServiceFake : IAvaliacaoService
{
    public List<AvaliacaoAlunoResponseDto> Avaliacoes { get; } = new();

    public Task<IEnumerable<AvaliacaoAlunoResponseDto>> ListarAvaliacoesPorAlunoAsync(int alunoId) =>
        Task.FromResult<IEnumerable<AvaliacaoAlunoResponseDto>>(Avaliacoes);

    public Task<IEnumerable<Avaliacao>> ListarAvaliacoesPorProfessorAsync(int professorId) => throw new NotSupportedException();
    public Task<Avaliacao> ObterAvaliacaoPorProfessorAsync(int id, int professorId) => throw new NotSupportedException();
    public Task<Avaliacao> CriarAvaliacaoAsync(int professorId, CriarAvaliacaoDto dto) => throw new NotSupportedException();
    public Task<Avaliacao> AtualizarAvaliacaoAsync(int id, int professorId, AtualizarAvaliacaoDto dto) => throw new NotSupportedException();
    public Task<bool> ExcluirAvaliacaoAsync(int id, int professorId) => throw new NotSupportedException();
    public Task<IEnumerable<QuestaoPublicada>> ListarQuestoesAsync(int avaliacaoId, int professorId) => throw new NotSupportedException();
    public Task<IEnumerable<QuestaoAvaliacaoAlunoResponseDto>> ListarQuestoesPorAlunoAsync(int avaliacaoId, int alunoId) => throw new NotSupportedException();
    public Task<QuestaoPublicada> AdicionarQuestaoAsync(int avaliacaoId, int professorId, CriarQuestaoAvaliacaoDto dto) => throw new NotSupportedException();
    public Task<IEnumerable<QuestaoPublicada>> AdicionarQuestoesEmLoteAsync(int avaliacaoId, int professorId, CriarQuestoesEmLoteDto dto) => throw new NotSupportedException();
    public Task<QuestaoPublicada> AtualizarQuestaoAsync(int avaliacaoId, int questaoId, int professorId, AtualizarQuestaoAvaliacaoDto dto) => throw new NotSupportedException();
    public Task ReordenarQuestoesAsync(int avaliacaoId, int professorId, ReordenarQuestoesDto dto) => throw new NotSupportedException();
    public Task ExcluirQuestaoAsync(int avaliacaoId, int questaoId, int professorId) => throw new NotSupportedException();
    public Task<TentativaAvaliacaoAlunoResponseDto> EnviarRespostasAlunoAsync(int avaliacaoId, int alunoId, EnviarAvaliacaoAlunoDto dto) => throw new NotSupportedException();
    public Task<RevisaoTentativaResponseDto> ObterRevisaoTentativaAsync(int tentativaId, int alunoId) => throw new NotSupportedException();
    public Task<ResultadoGeracaoIA> GerarQuestoesComIaAsync(int avaliacaoId, int professorId, Microsoft.AspNetCore.Http.IFormFile arquivo, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<ResultadoGeracaoIA> GerarQuestoesComIaDeConteudoAsync(int avaliacaoId, int professorId, int conteudoDidaticoId, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken) => throw new NotSupportedException();
    public Task<AnexoQuestaoBanco> AdicionarAnexoQuestaoAsync(int questaoBancoId, int professorId, Microsoft.AspNetCore.Http.IFormFile arquivo, string titulo, TipoConteudoDidatico tipoAnexo) => throw new NotSupportedException();
    public Task RemoverAnexoQuestaoAsync(int questaoBancoId, int anexoId, int professorId) => throw new NotSupportedException();
    public Task<int> CorrigirAvaliacoesPublicadasSemQuestaoAsync() => throw new NotSupportedException();
}
