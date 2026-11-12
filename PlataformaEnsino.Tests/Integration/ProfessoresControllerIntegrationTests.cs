using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// Ajuste de responsabilidades entre perfis: cadastrar, editar, inativar/
/// reativar e excluir professor fica so com o Admin (igual a alunos e
/// coordenadores). Coordenador continua so com GET (pra vincular/desvincular
/// professor pela tela do curso), batendo no endpoint HTTP real.
/// </summary>
public class ProfessoresControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public ProfessoresControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<Professor> SemearProfessorAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        await context.Database.EnsureCreatedAsync();

        var professor = new Professor
        {
            Nome = "Professor Semeado",
            Email = $"prof.{Guid.NewGuid():N}@teste.local",
            Cpf = GerarCpfUnico(),
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", BCrypt.Net.BCrypt.HashPassword("Senha@123"));

        context.Professores.Add(professor);
        await context.SaveChangesAsync();
        return professor;
    }

    // CPF/e-mail precisam ser unicos entre os testes desta classe - o
    // IClassFixture compartilha o mesmo banco (InMemory) entre todos os
    // [Fact], entao um CPF fixo colide entre os testes e cai em 400 por
    // UsuarioValidacao.NormalizarEGarantirDisponivelAsync.
    private static string GerarCpfUnico() => Random.Shared.NextInt64(10000000000, 99999999999).ToString();

    private static object NovoProfessorDto(string email) => new
    {
        nome = "Professor Novo",
        email,
        cpf = GerarCpfUnico(),
        telefone = "11999999999",
        cep = "01001000",
        rua = "Rua Teste",
        numero = "100",
        bairro = "Centro",
        cidade = "Sao Paulo",
        estado = "SP",
        senha = "Senha@123",
        especialidade = "Programacao"
    };

    private static object AtualizarProfessorDto(string nome) => new
    {
        nome,
        email = $"prof.{Guid.NewGuid():N}@teste.local",
        cpf = GerarCpfUnico(),
        telefone = "11999999999",
        cep = "01001000",
        rua = "Rua Teste",
        numero = "100",
        bairro = "Centro",
        cidade = "Sao Paulo",
        estado = "SP",
        especialidade = "Programacao",
        ativo = true
    };

    [Fact]
    public async Task ListarProfessores_Coordenador_Retorna200()
    {
        var token = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/professores");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }

    [Fact]
    public async Task CriarProfessor_Coordenador_Retorna403()
    {
        var token = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PostAsJsonAsync("/api/v1/professores", NovoProfessorDto($"novo.{Guid.NewGuid():N}@teste.local"));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task CriarProfessor_Admin_Retorna200()
    {
        var token = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PostAsJsonAsync("/api/v1/professores", NovoProfessorDto($"novo.{Guid.NewGuid():N}@teste.local"));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }

    [Fact]
    public async Task AtualizarProfessor_Coordenador_Retorna403()
    {
        var professor = await SemearProfessorAsync();
        var token = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PutAsJsonAsync($"/api/v1/professores/{professor.Id}", AtualizarProfessorDto("Nome Alterado"));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task AtualizarProfessor_Admin_RetornaOk()
    {
        var professor = await SemearProfessorAsync();
        var token = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PutAsJsonAsync($"/api/v1/professores/{professor.Id}", AtualizarProfessorDto("Nome Alterado"));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }

    [Fact]
    public async Task ExcluirProfessor_Coordenador_Retorna403()
    {
        var professor = await SemearProfessorAsync();
        var token = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.DeleteAsync($"/api/v1/professores/{professor.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ExcluirProfessor_Admin_RetornaNoContent()
    {
        var professor = await SemearProfessorAsync();
        var token = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.DeleteAsync($"/api/v1/professores/{professor.Id}");

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
    }
}
