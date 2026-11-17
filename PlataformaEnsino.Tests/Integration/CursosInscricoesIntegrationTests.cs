using System.Net;
using System.Net.Http.Headers;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// GET /Cursos/inscricoes (tela "Inscricoes" do Admin) batendo no endpoint
/// HTTP real - permissoes por papel. Classe PROPRIA (nao empilhada em
/// CursosControllerIntegrationTests) pra ter sua propria cota do rate
/// limiter de /auth/login - ver achado_rate_limiter_auth_por_classe_teste_integracao
/// na memoria do projeto: IClassFixture compartilha a cota de 10 logins/min
/// entre todos os [Fact] da MESMA classe.
/// </summary>
public class CursosInscricoesIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public CursosInscricoesIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListarInscricoes_Coordenador_Retorna403()
    {
        var token = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/cursos/inscricoes");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ListarInscricoes_Professor_Retorna403()
    {
        var token = await _factory.CriarProfessorEObterTokenAsync($"prof.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/cursos/inscricoes");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ListarInscricoes_Aluno_Retorna403()
    {
        var token = await _factory.CriarAlunoEObterTokenAsync($"aluno.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/cursos/inscricoes");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ListarInscricoes_Admin_Retorna200()
    {
        var token = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/v1/cursos/inscricoes?de=2026-01-01&ate=2026-12-31");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }
}
