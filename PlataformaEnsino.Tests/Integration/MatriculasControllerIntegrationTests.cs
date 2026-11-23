using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// GET /Matriculas/aluno/{id} batendo no endpoint HTTP real - confere que
/// MatriculaResponseDto expoe CertificadoEmitidoEm (docs/TelaConteudosAlunos/
/// PROMPT-agente-trilha-aluno-modulo-em-tela-propria.md), usado pelo selo
/// "Certificado emitido" do cartao do curso.
/// </summary>
public class MatriculasControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public MatriculasControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(string Token, int AlunoId, Curso Curso)> SemearAlunoComCursoAsync(string email)
    {
        var token = await _factory.CriarAlunoEObterTokenAsync(email);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();

        var aluno = await context.Alunos.AsNoTracking().FirstAsync(a => a.Email == email);

        var curso = new Curso
        {
            Titulo = "Curso Teste Certificado",
            Descricao = "Descricao",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            Preco = 0m,
            ModeloCurso = ModeloCurso.Gratuito
        };
        context.Cursos.Add(curso);
        await context.SaveChangesAsync();

        return (token, aluno.Id, curso);
    }

    [Fact]
    public async Task GetMatriculasPorAluno_CertificadoEmitido_RetornaCertificadoEmitidoEmPreenchido()
    {
        var email = $"aluno.certificado.{Guid.NewGuid():N}@teste.local";
        var (token, alunoId, curso) = await SemearAlunoComCursoAsync(email);
        var emitidoEm = new DateTime(2026, 8, 28, 0, 0, 0, DateTimeKind.Utc);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var matricula = new Matricula { CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..10], AlunoId = alunoId, CursoId = curso.Id };
            matricula.Aprovar();
            matricula.EmitirCertificado(emitidoEm);
            context.Matriculas.Add(matricula);
            await context.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync($"/api/v1/matriculas/aluno/{alunoId}");
        resposta.EnsureSuccessStatusCode();

        var matriculas = await resposta.Content.ReadFromJsonAsync<List<MatriculaResponseDto>>();
        var matriculaDoCurso = Assert.Single(matriculas!, m => m.CursoId == curso.Id);
        Assert.Equal(emitidoEm, matriculaDoCurso.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task GetMatriculasPorAluno_SemCertificado_RetornaCertificadoEmitidoEmNulo()
    {
        var email = $"aluno.semcertificado.{Guid.NewGuid():N}@teste.local";
        var (token, alunoId, curso) = await SemearAlunoComCursoAsync(email);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var matricula = new Matricula { CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..10], AlunoId = alunoId, CursoId = curso.Id };
            matricula.Aprovar();
            context.Matriculas.Add(matricula);
            await context.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync($"/api/v1/matriculas/aluno/{alunoId}");
        resposta.EnsureSuccessStatusCode();

        var matriculas = await resposta.Content.ReadFromJsonAsync<List<MatriculaResponseDto>>();
        var matriculaDoCurso = Assert.Single(matriculas!, m => m.CursoId == curso.Id);
        Assert.Null(matriculaDoCurso.CertificadoEmitidoEm);
    }
}
