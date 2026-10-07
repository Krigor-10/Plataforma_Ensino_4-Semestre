using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// Sobe o Program.cs real (pipeline HTTP, autenticacao JWT, autorizacao por role)
/// num TestServer em memoria, trocando so o banco (EF Core InMemory em vez de SQL
/// Server) - cobre a lacuna que a auditoria de prontidao pra Azure apontou: os
/// testes existentes exercitam Services isolados, nenhum bate nos endpoints HTTP
/// de verdade (roteamento, [Authorize(Roles=...)], serializacao).
/// </summary>
public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string SenhaPadrao = "Teste@123456";

    private readonly string _nomeBancoEmMemoria = $"testes-integracao-{Guid.NewGuid():N}";

    public ApiWebApplicationFactory()
    {
        // Program.cs le Jwt:Key e Cors:AllowedOrigins direto de
        // builder.Configuration ANTES de builder.Build() pra decidir se falha o
        // boot (guard-rail de producao) - variavel de ambiente de processo e a
        // unica forma garantida de chegar la a tempo, independente de quando
        // ConfigureWebHost/ConfigureAppConfiguration (abaixo) sao aplicados.
        Environment.SetEnvironmentVariable("Jwt__Key", "chave-de-teste-de-integracao-com-32-ou-mais-caracteres");
        Environment.SetEnvironmentVariable("Cors__AllowedOrigins__0", "http://localhost");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Nao usa "Development": pularia o guard-rail acima (mascarando
        // regressao nele) e tentaria rodar o DevelopmentDataSeeder/migrations
        // contra um provider que nao suporta.
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<PlataformaContext>>();

            // Program.cs ja registrou os servicos internos do provider SqlServer
            // nesse MESMO IServiceCollection (via UseSqlServer); so trocar a
            // DbContextOptions nao remove eles, e o EF reclama de "dois
            // providers registrados" se o InMemory for adicionado no container
            // compartilhado. UseInternalServiceProvider isola o InMemory no seu
            // proprio container, sem colidir com o que o SqlServer ja deixou la.
            var provedorInterno = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<PlataformaContext>(options => options
                .UseInMemoryDatabase(_nomeBancoEmMemoria)
                .UseInternalServiceProvider(provedorInterno)
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        });
    }

    /// <summary>Cria um Aluno direto no banco de teste e loga via /api/v1/auth/login, devolvendo o JWT.</summary>
    public async Task<string> CriarAlunoEObterTokenAsync(string email)
    {
        using (var scope = Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            await context.Database.EnsureCreatedAsync();

            var aluno = new Aluno
            {
                Nome = "Aluna de Teste",
                Email = email,
                Cpf = "12345678901",
                Matricula = "MAT-TESTE-INTEGRACAO"
            };
            aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(SenhaPadrao));

            context.Alunos.Add(aluno);
            await context.SaveChangesAsync();
        }

        using var client = CreateClient();
        var resposta = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, senha = SenhaPadrao });
        resposta.EnsureSuccessStatusCode();

        var corpo = await resposta.Content.ReadFromJsonAsync<AuthResponseDto>();
        return corpo!.Token;
    }
}
