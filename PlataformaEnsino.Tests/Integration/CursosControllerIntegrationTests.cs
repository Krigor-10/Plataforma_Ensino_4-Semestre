using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// PUT /Cursos/{id} batendo no endpoint HTTP real - preco e modelo de curso
/// sao exclusivos do Admin (prompt "Preco e modelo de curso exclusivos do
/// Admin"). Ver ApiWebApplicationFactory para o porque desse padrao de teste.
/// </summary>
public class CursosControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public CursosControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(string Token, Curso Curso)> SemearCoordenadorDonoDeCursoAsync(string emailCoordenador)
    {
        var token = await _factory.CriarCoordenadorEObterTokenAsync(emailCoordenador);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();

        var coordenador = await context.Coordenadores.AsNoTracking().FirstAsync(c => c.Email == emailCoordenador);

        var curso = new Curso
        {
            Titulo = "Curso Teste PUT",
            Descricao = "Descricao original",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            Preco = 99.90m,
            ModeloCurso = ModeloCurso.PagoPacote,
            CoordenadorId = coordenador.Id
        };
        context.Cursos.Add(curso);
        await context.SaveChangesAsync();

        return (token, curso);
    }

    [Fact]
    public async Task AtualizarCurso_CoordenadorAlterandoModelo_Retorna403ENaoAltera()
    {
        var (token, curso) = await SemearCoordenadorDonoDeCursoAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PutAsJsonAsync($"/api/v1/cursos/{curso.Id}", new
        {
            titulo = "Novo titulo",
            descricao = "Nova descricao",
            preco = curso.Preco,
            modeloCurso = (int)ModeloCurso.Gratuito
        });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        var cursoAtualizado = await context.Cursos.AsNoTracking().FirstAsync(c => c.Id == curso.Id);
        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
        Assert.Equal("Curso Teste PUT", cursoAtualizado.Titulo);
    }

    [Fact]
    public async Task AtualizarCurso_CoordenadorSemEnviarModelo_SalvaTituloEDescricaoMantendoPrecoEModelo()
    {
        var (token, curso) = await SemearCoordenadorDonoDeCursoAsync($"coord.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PutAsJsonAsync($"/api/v1/cursos/{curso.Id}", new
        {
            titulo = "Titulo editado pelo coordenador",
            descricao = "Descricao editada pelo coordenador",
            preco = curso.Preco
        });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        var cursoAtualizado = await context.Cursos.AsNoTracking().FirstAsync(c => c.Id == curso.Id);
        Assert.Equal("Titulo editado pelo coordenador", cursoAtualizado.Titulo);
        Assert.Equal("Descricao editada pelo coordenador", cursoAtualizado.Descricao);
        Assert.Equal(99.90m, cursoAtualizado.Preco);
        Assert.Equal(ModeloCurso.PagoPacote, cursoAtualizado.ModeloCurso);
    }

    [Fact]
    public async Task AtualizarCurso_Admin_AlteraPrecoEModelo()
    {
        var (_, curso) = await SemearCoordenadorDonoDeCursoAsync($"coord.{Guid.NewGuid():N}@teste.local");
        var tokenAdmin = await _factory.CriarAdminEObterTokenAsync($"admin.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenAdmin);

        var resposta = await client.PutAsJsonAsync($"/api/v1/cursos/{curso.Id}", new
        {
            titulo = curso.Titulo,
            descricao = curso.Descricao,
            preco = 149.90m,
            modeloCurso = (int)ModeloCurso.Gratuito
        });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        var cursoAtualizado = await context.Cursos.AsNoTracking().FirstAsync(c => c.Id == curso.Id);
        Assert.Equal(149.90m, cursoAtualizado.Preco);
        Assert.Equal(ModeloCurso.Gratuito, cursoAtualizado.ModeloCurso);
    }
}
