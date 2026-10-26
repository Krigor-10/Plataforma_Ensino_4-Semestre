using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

/// <summary>
/// Teste de integracao contra SQL Server LocalDB real (nao o provider InMemory
/// usado no resto da suite): AlternativasQuestoesBanco/Publicadas e
/// AfirmativasQuestoesBanco/Publicadas tem indice unico (QuestaoId, Letra/Numero)
/// que o provider InMemory nao valida. Reproduz o bug relatado "erro interno ao
/// editar questao e trocar a resposta correta" - AtualizarQuestaoAsync deletava as
/// alternativas/afirmativas antigas e inseria as novas na mesma SaveChangesAsync
/// sem garantir ordem, e a query nem carregava QuestaoBanco.Alternativas/Afirmativas
/// (faltava ThenInclude), entao o RemoveRange nunca via as linhas reais pra apagar -
/// qualquer edicao que reaproveitasse a mesma letra/numero (o caso comum: trocar
/// texto ou qual alternativa e a correta, mantendo A/B/C/D) violava o indice unico
/// com SqlException 2601 em vez do 200 esperado.
/// </summary>
public class AvaliacaoQuestaoEdicaoIntegrationTests : IAsyncLifetime
{
    private readonly string _connectionString =
        $"Server=(localdb)\\mssqllocaldb;Database=PlataformaEnsinoTesteEdicaoQuestao_{Guid.NewGuid():N};Trusted_Connection=True;TrustServerCertificate=True;";

    public async Task InitializeAsync()
    {
        await using var context = CriarContext();
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await using var context = CriarContext();
        await context.Database.EnsureDeletedAsync();
    }

    private PlataformaContext CriarContext()
    {
        var options = new DbContextOptionsBuilder<PlataformaContext>()
            .UseSqlServer(_connectionString)
            .Options;
        return new PlataformaContext(options);
    }

    private static AvaliacaoService CriarService(PlataformaContext context) =>
        new(
            context,
            new ProgressoAlunoService(context, new AcessoAcademicoService(context)),
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance),
            new AcessoAcademicoService(context),
            new ArmazenamentoArquivoServiceFake(),
            new ExtratorTextoMaterialServiceFake(),
            new AvaliacaoIAServiceFake(),
            new CursoService(
                context,
                new GenericRepository<Curso>(context),
                new GenericRepository<Coordenador>(context),
                new NotificacaoService(context, NullLogger<NotificacaoService>.Instance)));

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

    private static Curso CriarCurso(PlataformaContext context)
    {
        var admin = new Admin
        {
            Nome = "Admin Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "99988877766",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP"
        };
        admin.ConfigurarAcesso("Admin", "hash-fake");
        context.Admins.Add(admin);
        context.SaveChanges();

        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9], CriadoPor = admin.Id };
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
        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
        return turma;
    }

    private static CriarAvaliacaoDto NovaAvaliacaoDto(int turmaId, int moduloId) => new()
    {
        Titulo = "Avaliacao Teste",
        Descricao = "Descricao",
        TurmaId = turmaId,
        ModuloId = moduloId,
        TipoAvaliacao = TipoAvaliacao.Quiz,
        StatusPublicacao = StatusPublicacao.Publicado,
        TentativasPermitidas = 1,
        NotaMaxima = 10,
        PesoNota = 1,
        PesoProgresso = 1
    };

    [Fact]
    public async Task AtualizarQuestaoAsync_TrocaAlternativaCorretaMantendoAsMesmasLetras_NaoLancaViolacaoDeIndiceUnico()
    {
        await using var context = CriarContext();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "2 + 2 = ?",
            Enunciado = "2 + 2 = ?",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 1,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "3", EhCorreta = true },
                new() { Letra = "B", Texto = "4", EhCorreta = false },
                new() { Letra = "C", Texto = "5", EhCorreta = false }
            }
        });

        // Mesma letras A/B/C de antes, so inverte qual e a correta - exatamente o
        // caso relatado (corrigir o gabarito de uma questao ja criada).
        var dto = new AtualizarQuestaoAvaliacaoDto
        {
            TituloInterno = "2 + 2 = ?",
            Enunciado = "2 + 2 = ?",
            TipoQuestao = TipoQuestao.MultiplaEscolha,
            Pontos = 1,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "3", EhCorreta = false },
                new() { Letra = "B", Texto = "4", EhCorreta = true },
                new() { Letra = "C", Texto = "5", EhCorreta = false }
            }
        };

        var atualizada = await service.AtualizarQuestaoAsync(avaliacao.Id, questao.Id, professor.Id, dto);

        Assert.True(atualizada.Alternativas.Single(alternativa => alternativa.Letra == "B").EhCorreta);
        Assert.False(atualizada.Alternativas.Single(alternativa => alternativa.Letra == "A").EhCorreta);

        await using var contextVerificacao = CriarContext();
        var alternativasBanco = await contextVerificacao.AlternativasQuestoesBanco
            .Where(alternativa => alternativa.QuestaoBancoId == questao.QuestaoBancoId)
            .ToListAsync();
        Assert.Equal(3, alternativasBanco.Count);
        Assert.True(alternativasBanco.Single(alternativa => alternativa.Letra == "B").EhCorreta);
    }

    [Fact]
    public async Task AtualizarQuestaoAsync_AfirmativasCombinadas_TrocaCorretaMantendoOsMesmosNumeros_NaoLancaViolacaoDeIndiceUnico()
    {
        await using var context = CriarContext();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var modulo = CriarModulo(context, curso.Id);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var avaliacao = await service.CriarAvaliacaoAsync(professor.Id, NovaAvaliacaoDto(turma.Id, modulo.Id));

        var questao = await service.AdicionarQuestaoAsync(avaliacao.Id, professor.Id, new CriarQuestaoAvaliacaoDto
        {
            TituloInterno = "Afirmativas",
            Enunciado = "Avalie as afirmativas",
            TipoQuestao = TipoQuestao.AfirmativasCombinadas,
            Pontos = 1,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "I, II", EhCorreta = true },
                new() { Letra = "B", Texto = "I, III", EhCorreta = false }
            },
            Afirmativas = new List<CriarAfirmativaQuestaoDto>
            {
                new() { Numero = "I", Texto = "Afirmativa 1", EhCorreta = true },
                new() { Numero = "II", Texto = "Afirmativa 2", EhCorreta = false }
            }
        });

        var dto = new AtualizarQuestaoAvaliacaoDto
        {
            TituloInterno = "Afirmativas",
            Enunciado = "Avalie as afirmativas",
            TipoQuestao = TipoQuestao.AfirmativasCombinadas,
            Pontos = 1,
            Alternativas = new List<CriarAlternativaAvaliacaoDto>
            {
                new() { Letra = "A", Texto = "I, II", EhCorreta = false },
                new() { Letra = "B", Texto = "I, III", EhCorreta = true }
            },
            Afirmativas = new List<CriarAfirmativaQuestaoDto>
            {
                new() { Numero = "I", Texto = "Afirmativa 1", EhCorreta = false },
                new() { Numero = "II", Texto = "Afirmativa 2", EhCorreta = true }
            }
        };

        var atualizada = await service.AtualizarQuestaoAsync(avaliacao.Id, questao.Id, professor.Id, dto);

        Assert.True(atualizada.Afirmativas.Single(afirmativa => afirmativa.Numero == "II").EhCorreta);
        Assert.True(atualizada.Alternativas.Single(alternativa => alternativa.Letra == "B").EhCorreta);
    }

    private class ArmazenamentoArquivoServiceFake : IArmazenamentoArquivoService
    {
        public Task<string> SalvarArquivoAsync(IFormFile arquivo, string subpasta, string[] extensoesPermitidas, long tamanhoMaximoBytes) =>
            throw new NotImplementedException("Nenhum teste deste arquivo exercita upload de anexo.");

        public Task<ArquivoArmazenado?> AbrirArquivoAsync(string subpasta, string nomeArquivo) =>
            throw new NotImplementedException("Nenhum teste deste arquivo exercita leitura de anexo.");
    }

    private class ExtratorTextoMaterialServiceFake : IExtratorTextoMaterialService
    {
        public Task<ResultadoExtracaoMaterial> ExtrairTextoAsync(Stream conteudo, string extensao, CancellationToken cancellationToken) =>
            throw new NotImplementedException("Nenhum teste deste arquivo exercita extracao de material.");
    }

    private class AvaliacaoIAServiceFake : IAvaliacaoIAService
    {
        public Task<ResultadoGeracaoIA> GerarQuestoesAsync(MaterialParaIaDto material, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken) =>
            throw new NotImplementedException("Nenhum teste deste arquivo exercita geracao por IA.");
    }
}
