using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

/// <summary>
/// Teste de integracao contra SQL Server LocalDB real (nao o provider
/// InMemory usado no resto da suite): o provider InMemory nao valida
/// indices unicos filtrados, entao so aqui da pra provar que o indice
/// IX_Matriculas_AlunoId_CursoId_Aprovada realmente impede duas matriculas
/// aprovadas simultaneas pro mesmo aluno+curso (ex.: duplo clique no
/// "matricular-se", ou dois admins aprovando a mesma pendencia ao mesmo
/// tempo). Usa um banco LocalDB proprio e descartavel por execucao.
/// </summary>
public class MatriculaConcorrenciaTests : IAsyncLifetime
{
    private readonly string _connectionString =
        $"Server=(localdb)\\mssqllocaldb;Database=PlataformaEnsinoTesteConcorrencia_{Guid.NewGuid():N};Trusted_Connection=True;TrustServerCertificate=True;";

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

    private static MatriculaService CriarService(PlataformaContext context) =>
        new(
            new MatriculaRepository(context),
            new GenericRepository<Aluno>(context),
            context,
            new NotificacaoService(context, NullLogger<NotificacaoService>.Instance));

    [Fact]
    public async Task MatricularComAprovacaoAutomaticaAsync_DuasChamadasSimultaneas_NuncaDuplicaMatriculaAprovada()
    {
        int alunoId;
        int cursoId;

        await using (var contextSetup = CriarContext())
        {
            var admin = new Admin
            {
                Nome = "Admin Concorrencia",
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
            contextSetup.Admins.Add(admin);
            await contextSetup.SaveChangesAsync();

            var curso = new Curso
            {
                Titulo = "Curso Concorrencia",
                CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..10],
                CriadoPor = admin.Id
            };
            contextSetup.Cursos.Add(curso);

            var aluno = new Aluno
            {
                Nome = "Aluno Concorrencia",
                Email = $"{Guid.NewGuid():N}@teste.local",
                Cpf = "11122233344",
                Telefone = "11999990000",
                Cep = "01001-000",
                Rua = "Rua Teste",
                Numero = "1",
                Bairro = "Centro",
                Cidade = "Sao Paulo",
                Estado = "SP",
                Matricula = "Pendente"
            };
            aluno.ConfigurarAcesso("Aluno", "hash-fake");
            contextSetup.Alunos.Add(aluno);

            await contextSetup.SaveChangesAsync();
            alunoId = aluno.Id;
            cursoId = curso.Id;
        }

        // Cada "lado" da corrida usa seu proprio DbContext (conexao propria),
        // simulando duas requisicoes HTTP concorrentes de verdade - um unico
        // DbContext nao e thread-safe e nao reproduziria a corrida real.
        await using var contextA = CriarContext();
        await using var contextB = CriarContext();
        var servicoA = CriarService(contextA);
        var servicoB = CriarService(contextB);

        var tarefaA = ExecutarSemLancar(() => servicoA.MatricularComAprovacaoAutomaticaAsync(alunoId, cursoId));
        var tarefaB = ExecutarSemLancar(() => servicoB.MatricularComAprovacaoAutomaticaAsync(alunoId, cursoId));

        await Task.WhenAll(tarefaA, tarefaB);

        await using var contextVerificacao = CriarContext();
        var totalAprovadas = await contextVerificacao.Matriculas
            .CountAsync(m => m.AlunoId == alunoId && m.CursoId == cursoId && m.Status == StatusMatricula.Aprovada);

        // O invariante que importa: nunca mais de 1 matricula aprovada pro
        // mesmo aluno+curso, independente de qual dos dois caminhos internos
        // (consolidacao graciosa vs excecao traduzida da violacao do indice)
        // tenha resolvido a corrida - ambos sao comportamento correto.
        Assert.Equal(1, totalAprovadas);
    }

    private static async Task ExecutarSemLancar(Func<Task<Matricula>> acao)
    {
        try
        {
            await acao();
        }
        catch (InvalidOperationException)
        {
            // Esperado em metade das execucoes: SalvarComProtecaoDeConcorrenciaAsync
            // traduz a violacao do indice unico pra essa excecao de negocio.
        }
    }
}
