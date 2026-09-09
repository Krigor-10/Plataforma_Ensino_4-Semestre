using System.Security.Claims;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class CursoAutorizacaoServiceTests
{
    private static CursoAutorizacaoService CriarService(PlataformaContext context) => new(context);

    private static ClaimsPrincipal CriarPrincipal(int? usuarioId, string papel)
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, papel) };
        if (usuarioId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, usuarioId.Value.ToString()));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private static Curso CriarCurso(PlataformaContext context, int? coordenadorId = null)
    {
        var curso = new Curso
        {
            Titulo = "Curso Teste",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            CoordenadorId = coordenadorId
        };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Modulo CriarModulo(PlataformaContext context, int cursoId)
    {
        var modulo = new Modulo { Titulo = "Modulo Teste", CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9], CursoId = cursoId };
        context.Modulos.Add(modulo);
        context.SaveChanges();
        return modulo;
    }

    private static Turma CriarTurma(PlataformaContext context, int cursoId)
    {
        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = $"TUR-{Guid.NewGuid():N}"[..9], CursoId = cursoId };
        context.Turmas.Add(turma);
        context.SaveChanges();
        return turma;
    }

    // ---------- PodeGerenciarCursoAsync ----------

    [Fact]
    public async Task PodeGerenciarCursoAsync_Admin_SempreRetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 999);

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(1, "Admin"), curso.Id);

        Assert.True(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarCursoAsync_CoordenadorDono_RetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(10, "Coordenador"), curso.Id);

        Assert.True(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarCursoAsync_CoordenadorDeOutroCurso_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(20, "Coordenador"), curso.Id);

        Assert.False(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarCursoAsync_CursoSemCoordenadorAtribuido_CoordenadorNaoPodeGerenciar()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: null);

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(10, "Coordenador"), curso.Id);

        Assert.False(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarCursoAsync_CursoInexistente_RetornaFalse()
    {
        var context = TestContextFactory.Criar();

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(10, "Coordenador"), 99999);

        Assert.False(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarCursoAsync_UsuarioSemClaimDeId_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);

        var podeGerenciar = await CriarService(context).PodeGerenciarCursoAsync(CriarPrincipal(null, "Coordenador"), curso.Id);

        Assert.False(podeGerenciar);
    }

    // A checagem de papel (Admin/Coordenador) e feita a montante, via
    // [Authorize(Roles = "Admin,Coordenador")] nos Controllers - o servico so
    // reforca posse do recurso pra quem ja passou por esse gate, entao nao
    // reavalia o papel do usuario aqui (ver PodeGerenciarCursoAsync_CoordenadorDeOutroCurso_RetornaFalse
    // pro limite de seguranca real que este metodo garante: posse por Id).

    // ---------- PodeGerenciarModuloAsync ----------

    [Fact]
    public async Task PodeGerenciarModuloAsync_ModuloDeCursoDoCoordenador_RetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);
        var modulo = CriarModulo(context, curso.Id);

        var podeGerenciar = await CriarService(context).PodeGerenciarModuloAsync(CriarPrincipal(10, "Coordenador"), modulo.Id);

        Assert.True(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarModuloAsync_ModuloDeCursoDeOutroCoordenador_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);
        var modulo = CriarModulo(context, curso.Id);

        var podeGerenciar = await CriarService(context).PodeGerenciarModuloAsync(CriarPrincipal(20, "Coordenador"), modulo.Id);

        Assert.False(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarModuloAsync_ModuloInexistente_RetornaTrueParaDeixarServicoReportar404()
    {
        var context = TestContextFactory.Criar();

        var podeGerenciar = await CriarService(context).PodeGerenciarModuloAsync(CriarPrincipal(10, "Coordenador"), 99999);

        Assert.True(podeGerenciar);
    }

    // ---------- PodeGerenciarTurmaAsync ----------

    [Fact]
    public async Task PodeGerenciarTurmaAsync_TurmaDeCursoDoCoordenador_RetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);
        var turma = CriarTurma(context, curso.Id);

        var podeGerenciar = await CriarService(context).PodeGerenciarTurmaAsync(CriarPrincipal(10, "Coordenador"), turma.Id);

        Assert.True(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarTurmaAsync_TurmaDeCursoDeOutroCoordenador_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 10);
        var turma = CriarTurma(context, curso.Id);

        var podeGerenciar = await CriarService(context).PodeGerenciarTurmaAsync(CriarPrincipal(20, "Coordenador"), turma.Id);

        Assert.False(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarTurmaAsync_TurmaInexistente_RetornaTrueParaDeixarServicoReportar404()
    {
        var context = TestContextFactory.Criar();

        var podeGerenciar = await CriarService(context).PodeGerenciarTurmaAsync(CriarPrincipal(10, "Coordenador"), 99999);

        Assert.True(podeGerenciar);
    }

    [Fact]
    public async Task PodeGerenciarTurmaAsync_Admin_SempreRetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var curso = CriarCurso(context, coordenadorId: 999);
        var turma = CriarTurma(context, curso.Id);

        var podeGerenciar = await CriarService(context).PodeGerenciarTurmaAsync(CriarPrincipal(1, "Admin"), turma.Id);

        Assert.True(podeGerenciar);
    }
}
