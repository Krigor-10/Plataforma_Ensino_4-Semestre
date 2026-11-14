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
/// GET /Cursos/{id}/revisao-conteudo batendo no endpoint HTTP real (fluxo-coordenador
/// Parte 3/3 - "Ver conteudo", so leitura, com gabarito). Classe separada de
/// CursosControllerIntegrationTests de proposito: cada login consome a cota do rate
/// limiter "auth" (10/min/IP) e esta aqui ja soma 4 identidades diferentes - uma
/// IClassFixture propria da sua propria cota em vez de somar na da outra classe.
/// Coordenador/Professor usados so como "dono" (sem nunca logar) sao criados direto
/// no banco, sem passar por /auth/login, igual ao padrao ja usado la.
/// </summary>
public class RevisaoConteudoCoordenadorIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public RevisaoConteudoCoordenadorIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Coordenador Coordenador, Curso Curso, Modulo Modulo)> SemearCursoComConteudoPublicadoERascunhoAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        await context.Database.EnsureCreatedAsync();

        var coordenador = new Coordenador
        {
            Nome = "Coordenador Dono de Teste",
            Email = $"coord.{Guid.NewGuid():N}@teste.local",
            Cpf = "11223344556",
            CodigoRegistro = $"COORD-{Guid.NewGuid():N}"[..10]
        };
        coordenador.ConfigurarAcesso("Coordenador", BCrypt.Net.BCrypt.HashPassword(ApiWebApplicationFactory.SenhaPadrao));
        context.Coordenadores.Add(coordenador);

        var professor = new Professor
        {
            Nome = "Professor Autor de Teste",
            Email = $"prof.{Guid.NewGuid():N}@teste.local",
            Cpf = "98765432100",
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", "hash-fake");
        context.Professores.Add(professor);
        await context.SaveChangesAsync();

        var curso = new Curso
        {
            Titulo = "Curso Teste Revisao",
            Descricao = "Descricao",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            Preco = 0,
            ModeloCurso = ModeloCurso.Gratuito,
            CoordenadorId = coordenador.Id
        };
        context.Cursos.Add(curso);
        await context.SaveChangesAsync();

        var modulo = new Modulo
        {
            Titulo = "Modulo 1",
            CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9],
            CursoId = curso.Id
        };
        context.Modulos.Add(modulo);
        await context.SaveChangesAsync();

        var conteudoPublicado = new ConteudoDidatico
        {
            Titulo = "Material publicado",
            ModuloId = modulo.Id,
            TipoConteudo = TipoConteudoDidatico.Texto,
            CorpoTexto = "Conteudo publicado"
        };
        conteudoPublicado.DefinirProfessorAutor(professor.Id);
        conteudoPublicado.DefinirCurso(curso.Id);
        conteudoPublicado.DefinirStatusPublicacao(StatusPublicacao.Publicado);

        var conteudoRascunho = new ConteudoDidatico
        {
            Titulo = "Material rascunho",
            ModuloId = modulo.Id,
            TipoConteudo = TipoConteudoDidatico.Texto,
            CorpoTexto = "Conteudo em rascunho"
        };
        conteudoRascunho.DefinirProfessorAutor(professor.Id);
        conteudoRascunho.DefinirCurso(curso.Id);

        context.ConteudosDidaticos.AddRange(conteudoPublicado, conteudoRascunho);
        await context.SaveChangesAsync();

        var avaliacaoPublicada = new Avaliacao
        {
            Titulo = "Quiz publicado",
            ModuloId = modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz
        };
        avaliacaoPublicada.DefinirAutor(professor.Id);
        avaliacaoPublicada.DefinirCurso(curso.Id);
        avaliacaoPublicada.Publicar();

        var avaliacaoRascunho = new Avaliacao
        {
            Titulo = "Quiz rascunho",
            ModuloId = modulo.Id,
            TipoAvaliacao = TipoAvaliacao.Quiz
        };
        avaliacaoRascunho.DefinirAutor(professor.Id);
        avaliacaoRascunho.DefinirCurso(curso.Id);

        context.Avaliacoes.AddRange(avaliacaoPublicada, avaliacaoRascunho);
        await context.SaveChangesAsync();

        return (coordenador, curso, modulo);
    }

    [Fact]
    public async Task ObterRevisaoConteudo_CoordenadorDono_Retorna200SoComPublicado()
    {
        var (coordenador, curso, _) = await SemearCursoComConteudoPublicadoERascunhoAsync();
        var tokenCoordenador = await _factory.ObterTokenAsync(coordenador.Email);

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenCoordenador);

        var resposta = await client.GetAsync($"/api/v1/cursos/{curso.Id}/revisao-conteudo");
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);

        var corpo = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(curso.Id, corpo.GetProperty("cursoId").GetInt32());

        var modulos = corpo.GetProperty("modulos");
        Assert.Equal(1, modulos.GetArrayLength());

        var conteudos = modulos[0].GetProperty("conteudos");
        Assert.Equal(1, conteudos.GetArrayLength());
        Assert.Equal("Material publicado", conteudos[0].GetProperty("titulo").GetString());

        var avaliacoesDoModulo = modulos[0].GetProperty("avaliacoes");
        Assert.Equal(1, avaliacoesDoModulo.GetArrayLength());
        Assert.Equal("Quiz publicado", avaliacoesDoModulo[0].GetProperty("avaliacao").GetProperty("titulo").GetString());
    }

    [Fact]
    public async Task ObterRevisaoConteudo_CoordenadorDeOutroCurso_Retorna403()
    {
        var (_, curso, _) = await SemearCursoComConteudoPublicadoERascunhoAsync();
        var tokenOutroCoordenador = await _factory.CriarCoordenadorEObterTokenAsync($"coord.{Guid.NewGuid():N}@teste.local");

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenOutroCoordenador);

        var resposta = await client.GetAsync($"/api/v1/cursos/{curso.Id}/revisao-conteudo");
        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ObterRevisaoConteudo_Professor_Retorna403()
    {
        var (_, curso, _) = await SemearCursoComConteudoPublicadoERascunhoAsync();
        var tokenProfessor = await _factory.CriarProfessorEObterTokenAsync($"prof.{Guid.NewGuid():N}@teste.local");

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenProfessor);

        var resposta = await client.GetAsync($"/api/v1/cursos/{curso.Id}/revisao-conteudo");
        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task ObterRevisaoConteudo_Aluno_Retorna403()
    {
        var (_, curso, _) = await SemearCursoComConteudoPublicadoERascunhoAsync();
        var tokenAluno = await _factory.CriarAlunoEObterTokenAsync($"aluno.{Guid.NewGuid():N}@teste.local");

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenAluno);

        var resposta = await client.GetAsync($"/api/v1/cursos/{curso.Id}/revisao-conteudo");
        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }
}
