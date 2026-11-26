using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using Xunit;

namespace PlataformaEnsino.Tests.Integration;

/// <summary>
/// Cobre o gate de autenticacao/autorizacao do endpoint "/uploads/{subpasta}/{nomeArquivo}"
/// (Program.cs) - especificamente o requisito de que material pago (conteudos/questoes)
/// so e liberado pra aluno com acesso de verdade (matricula aprovada + pagamento
/// confirmado quando o curso for pago), nunca so por estar autenticado.
/// </summary>
public class UploadsEndpointIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public UploadsEndpointIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetUploadsCursos_SemToken_NuncaRetorna401()
    {
        using var client = _factory.CreateClient();

        var resposta = await client.GetAsync("/uploads/cursos/capa-inexistente.jpg");

        Assert.NotEqual(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task GetUploadsConteudos_SemToken_Retorna401()
    {
        using var client = _factory.CreateClient();

        var resposta = await client.GetAsync("/uploads/conteudos/arquivo-qualquer.pdf");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task GetUploadsConteudos_AlunoAutenticadoSemAcessoAoCurso_Retorna403()
    {
        var nomeArquivo = $"{Guid.NewGuid():N}.pdf";
        await SemearConteudoAsync(nomeArquivo, criarMatricula: false);

        var token = await _factory.CriarAlunoEObterTokenAsync($"aluno.semacesso.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync($"/uploads/conteudos/{nomeArquivo}");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task GetUploadsConteudos_AlunoComAcessoLiberado_NaoRetorna401Nem403()
    {
        var nomeArquivo = $"{Guid.NewGuid():N}.pdf";
        var emailAluno = $"aluno.comacesso.{Guid.NewGuid():N}@teste.local";
        await SemearConteudoAsync(nomeArquivo, criarMatricula: true, emailAluno: emailAluno);

        var token = await _factory.ObterTokenAsync(emailAluno);
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync($"/uploads/conteudos/{nomeArquivo}");

        // O arquivo fisico nao existe no storage de teste (so o registro no
        // banco) - o que importa aqui e passar pelo gate de autorizacao:
        // 404 (arquivo nao encontrado no disco) e aceitavel, 401/403 nao.
        Assert.NotEqual(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task GetUploadsConteudos_Professor_NaoRetorna401Nem403()
    {
        var token = await _factory.CriarProfessorEObterTokenAsync($"professor.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/uploads/conteudos/arquivo-qualquer.pdf");

        Assert.NotEqual(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    // docs/bugs/PROMPT-agente-video-nao-carrega-producao.md: sem Range (206)
    // o player de video fica parado em 0:00. "/uploads/cursos" e publico, o
    // que deixa testar sem precisar de token.
    [Fact]
    public async Task GetUploadsCursos_ComRange_Retorna206ComContentRange()
    {
        var nomeArquivo = $"{Guid.NewGuid():N}.jpg";
        var conteudo = System.Text.Encoding.UTF8.GetBytes("conteudo de teste para Range, precisa ter mais de cem bytes de tamanho para o teste de bytes=0-99 fazer sentido de verdade.");
        var caminhoArquivo = CriarArquivoFisicoEmCursos(nomeArquivo, conteudo);

        try
        {
            using var client = _factory.CreateClient();
            var requisicao = new HttpRequestMessage(HttpMethod.Get, $"/uploads/cursos/{nomeArquivo}");
            requisicao.Headers.Range = new RangeHeaderValue(0, 99);

            var resposta = await client.SendAsync(requisicao);

            Assert.Equal(HttpStatusCode.PartialContent, resposta.StatusCode);
            Assert.Equal(100, resposta.Content.Headers.ContentLength);
            Assert.NotNull(resposta.Content.Headers.ContentRange);
            Assert.Equal(conteudo.Length, resposta.Content.Headers.ContentRange!.Length);
            Assert.Equal("bytes", resposta.Headers.AcceptRanges.Single());
        }
        finally
        {
            File.Delete(caminhoArquivo);
        }
    }

    [Fact]
    public async Task GetUploadsCursos_SemRange_Retorna200ComContentLength()
    {
        var nomeArquivo = $"{Guid.NewGuid():N}.jpg";
        var conteudo = System.Text.Encoding.UTF8.GetBytes("conteudo de teste sem range");
        var caminhoArquivo = CriarArquivoFisicoEmCursos(nomeArquivo, conteudo);

        try
        {
            using var client = _factory.CreateClient();

            var resposta = await client.GetAsync($"/uploads/cursos/{nomeArquivo}");

            Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
            Assert.Equal(conteudo.Length, resposta.Content.Headers.ContentLength);
            Assert.Equal("bytes", resposta.Headers.AcceptRanges.Single());
        }
        finally
        {
            File.Delete(caminhoArquivo);
        }
    }

    private string CriarArquivoFisicoEmCursos(string nomeArquivo, byte[] conteudo)
    {
        var ambiente = _factory.Services.GetRequiredService<IWebHostEnvironment>();
        var pasta = Path.Combine(ambiente.ContentRootPath, "Storage", "Uploads", "cursos");
        Directory.CreateDirectory(pasta);

        var caminho = Path.Combine(pasta, nomeArquivo);
        File.WriteAllBytes(caminho, conteudo);
        return caminho;
    }

    private async Task SemearConteudoAsync(string nomeArquivo, bool criarMatricula, string? emailAluno = null)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
        await context.Database.EnsureCreatedAsync();

        var professor = new Professor
        {
            Nome = "Professor Conteudo",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", "hash-fake");
        context.Professores.Add(professor);
        await context.SaveChangesAsync();

        var curso = new Curso { Titulo = "Curso Upload Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9] };
        context.Cursos.Add(curso);
        await context.SaveChangesAsync();

        var turma = new Turma { NomeTurma = "Turma Upload Teste", CodigoRegistro = $"TUR-{Guid.NewGuid():N}"[..9], CursoId = curso.Id, ProfessorId = professor.Id };
        context.Turmas.Add(turma);
        await context.SaveChangesAsync();

        var modulo = new Modulo { Titulo = "Modulo Upload Teste", CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9], CursoId = curso.Id };
        context.Modulos.Add(modulo);
        await context.SaveChangesAsync();

        var conteudo = new ConteudoDidatico
        {
            Titulo = "Conteudo Upload Teste",
            TipoConteudo = TipoConteudoDidatico.Pdf,
            ArquivoUrl = $"/uploads/conteudos/{nomeArquivo}",
            TurmaId = turma.Id,
            ModuloId = modulo.Id
        };
        conteudo.DefinirProfessorAutor(professor.Id);
        conteudo.DefinirCurso(curso.Id);
        context.ConteudosDidaticos.Add(conteudo);
        await context.SaveChangesAsync();

        if (criarMatricula)
        {
            var aluno = new Aluno
            {
                Nome = "Aluno Upload Teste",
                Email = emailAluno ?? $"{Guid.NewGuid():N}@teste.local",
                Cpf = "33344455566",
                Matricula = "ALU-UPLOAD-TESTE"
            };
            aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(ApiWebApplicationFactory.SenhaPadrao));
            context.Alunos.Add(aluno);
            await context.SaveChangesAsync();

            var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
            matricula.VincularTurma(turma.Id);
            matricula.Aprovar();
            context.Matriculas.Add(matricula);
            await context.SaveChangesAsync();
        }
    }
}
