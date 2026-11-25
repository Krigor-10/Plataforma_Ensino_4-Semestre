using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md - cobre o que
/// so o pipeline HTTP real exercita: autorizacao por papel nos endpoints
/// novos e o corte "na hora" via JwtBearerEvents (token de acesso ainda
/// valido, mas o usuario foi inativado entre uma requisicao e outra).
/// </summary>
public class AlunosControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public AlunosControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> SemearAlunoAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        await context.Database.EnsureCreatedAsync();

        var aluno = new Aluno
        {
            Nome = "Aluna Semeada",
            Email = email,
            Cpf = Random.Shared.NextInt64(10000000000, 99999999999).ToString(),
            Matricula = $"RA-{Guid.NewGuid():N}"[..12]
        };
        aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(ApiWebApplicationFactory.SenhaPadrao));

        context.Alunos.Add(aluno);
        await context.SaveChangesAsync();
        return aluno.Id;
    }

    private static object DtoAtualizacao(string nome, string email, string matricula) => new { nome, email, telefone = "11988887777", matricula };

    private HttpClient CriarClienteComToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Theory]
    [InlineData("Coordenador")]
    [InlineData("Professor")]
    [InlineData("Aluno")]
    public async Task AtualizarAluno_NaoAdmin_Retorna403(string papel)
    {
        var alunoId = await SemearAlunoAsync($"editar.{Guid.NewGuid():N}@teste.local");
        var token = papel switch
        {
            "Coordenador" => await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local"),
            "Professor" => await _factory.CriarProfessorEObterTokenAsync($"prof.{Guid.NewGuid():N}@teste.local"),
            _ => await _factory.CriarAlunoEObterTokenAsync($"aluno.{Guid.NewGuid():N}@teste.local")
        };
        using var client = CriarClienteComToken(token);

        var resposta = await client.PutAsJsonAsync($"/api/v1/alunos/{alunoId}", DtoAtualizacao("X", $"x.{Guid.NewGuid():N}@teste.local", "RA-X"));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task AtualizarAluno_Admin_RetornaOkComDadosAtualizados()
    {
        var emailOriginal = $"original.{Guid.NewGuid():N}@teste.local";
        var alunoId = await SemearAlunoAsync(emailOriginal);
        var tokenAdmin = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = CriarClienteComToken(tokenAdmin);

        var resposta = await client.PutAsJsonAsync($"/api/v1/alunos/{alunoId}", DtoAtualizacao("Nome Novo", emailOriginal, "RA-NOVO"));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var corpo = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Nome Novo", corpo.GetProperty("nome").GetString());
        Assert.Equal("RA-NOVO", corpo.GetProperty("matricula").GetString());
    }

    [Fact]
    public async Task InativarAluno_SemMotivo_Retorna400()
    {
        var alunoId = await SemearAlunoAsync($"semmotivo.{Guid.NewGuid():N}@teste.local");
        var tokenAdmin = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = CriarClienteComToken(tokenAdmin);

        var resposta = await client.PostAsJsonAsync($"/api/v1/alunos/{alunoId}/inativar", new { motivo = "" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task InativarAluno_Repetido_SegundaChamadaRetorna409()
    {
        var alunoId = await SemearAlunoAsync($"repetido.{Guid.NewGuid():N}@teste.local");
        var tokenAdmin = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = CriarClienteComToken(tokenAdmin);

        var primeira = await client.PostAsJsonAsync($"/api/v1/alunos/{alunoId}/inativar", new { motivo = "Pagamento nao regularizado." });
        var segunda = await client.PostAsJsonAsync($"/api/v1/alunos/{alunoId}/inativar", new { motivo = "Pagamento nao regularizado." });

        Assert.Equal(HttpStatusCode.OK, primeira.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, segunda.StatusCode);
    }

    [Fact]
    public async Task ReativarAluno_Admin_RetornaOkEAlunoVoltaAAtivo()
    {
        var alunoId = await SemearAlunoAsync($"reativar.{Guid.NewGuid():N}@teste.local");
        var tokenAdmin = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = CriarClienteComToken(tokenAdmin);
        await client.PostAsJsonAsync($"/api/v1/alunos/{alunoId}/inativar", new { motivo = "Pagamento nao regularizado." });

        var resposta = await client.PostAsync($"/api/v1/alunos/{alunoId}/reativar", content: null);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var corpo = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(corpo.GetProperty("ativo").GetBoolean());
    }

    // Corte "na hora" (item A4): o aluno pega um token valido ANTES de ser
    // inativado - sem este corte, continuaria autenticado ate o token
    // expirar (ate 20 min). Usa /api/v1/usuarios/me (qualquer papel
    // autenticado) so como endpoint generico pra provar que QUALQUER
    // requisicao autenticada corta, nao so as de /alunos.
    [Fact]
    public async Task RequisicaoAutenticada_DepoisDeInativado_Retorna401ComCodigoUsuarioInativo()
    {
        var emailAluno = $"corte.{Guid.NewGuid():N}@teste.local";
        var tokenAluno = await _factory.CriarAlunoEObterTokenAsync(emailAluno);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var aluno = await context.Alunos.FirstAsync(a => a.Email == emailAluno);
            aluno.Desativar(porUsuarioId: 1, motivo: "Corte na hora - teste de integracao.");
            await context.SaveChangesAsync();
        }

        using var client = CriarClienteComToken(tokenAluno);
        var resposta = await client.GetAsync("/api/v1/usuarios/me");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.Equal("USUARIO_INATIVO", resposta.Headers.GetValues("codigo").Single());

        var corpo = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USUARIO_INATIVO", corpo.GetProperty("codigo").GetString());
    }

    [Fact]
    public async Task RequisicaoAutenticada_AlunoAindaAtivo_ContinuaFuncionando()
    {
        var tokenAluno = await _factory.CriarAlunoEObterTokenAsync($"ativo.{Guid.NewGuid():N}@teste.local");
        using var client = CriarClienteComToken(tokenAluno);

        var resposta = await client.GetAsync("/api/v1/usuarios/me");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }
}
