using System.Net;
using System.Net.Http.Headers;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// Login + uma rota autorizada + uma rota negada pra um tipo de usuario (Aluno),
/// batendo nos endpoints HTTP reais em vez de chamar o Service direto - ver
/// ApiWebApplicationFactory para o porque desse teste existir.
/// </summary>
public class UsuariosControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public UsuariosControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ObterMeuPerfil_AlunoAutenticado_Retorna200ComOProprioUsuario()
    {
        var token = await _factory.CriarAlunoEObterTokenAsync("aluna.integracao1@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/usuarios/me");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.Contains("aluna.integracao1@teste.local", corpo);
    }

    [Fact]
    public async Task ObterMeuPerfil_SemToken_Retorna401()
    {
        using var client = _factory.CreateClient();

        var resposta = await client.GetAsync("/api/v1/usuarios/me");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task ListarTodos_AlunoAutenticado_Retorna403PorSerRotaSoDeAdmin()
    {
        var token = await _factory.CriarAlunoEObterTokenAsync("aluna.integracao2@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/usuarios");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }
}
