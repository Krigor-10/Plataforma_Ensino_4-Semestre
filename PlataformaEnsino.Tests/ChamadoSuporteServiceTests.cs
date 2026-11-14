using System.Security.Claims;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;

namespace PlataformaEnsino.Tests;

public class ChamadoSuporteServiceTests
{
    private static ChamadoSuporteService CriarService(PlataformaContext context, IChatbotIAService? iaFake = null)
    {
        var notificacao = new NotificacaoService(context, NullLogger<NotificacaoService>.Instance);
        return new ChamadoSuporteService(context, iaFake ?? new ChatbotIAServiceFake(), notificacao, NullLogger<ChamadoSuporteService>.Instance);
    }

    private static Aluno CriarAluno(PlataformaContext context, string sufixo = "A")
    {
        var aluno = new Aluno
        {
            Nome = $"Aluno {sufixo}",
            Email = $"aluno.{sufixo}.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
            Matricula = $"MAT-{Guid.NewGuid():N}"[..10]
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");
        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Admin CriarAdmin(PlataformaContext context)
    {
        var admin = new Admin { Nome = "Admin Teste", Email = $"admin.{Guid.NewGuid():N}@teste.local", Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}" };
        admin.ConfigurarAcesso("Admin", "hash-fake");
        context.Admins.Add(admin);
        context.SaveChanges();
        return admin;
    }

    private static Coordenador CriarCoordenador(PlataformaContext context)
    {
        var coordenador = new Coordenador
        {
            Nome = "Coordenador Teste",
            Email = $"coord.{Guid.NewGuid():N}@teste.local",
            Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
            CodigoRegistro = $"COORD-{Guid.NewGuid():N}"[..10]
        };
        coordenador.ConfigurarAcesso("Coordenador", "hash-fake");
        context.Coordenadores.Add(coordenador);
        context.SaveChanges();
        return coordenador;
    }

    private static Curso CriarCurso(PlataformaContext context, int? coordenadorId = null)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9], CoordenadorId = coordenadorId };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static ClaimsPrincipal ComoUsuario(int usuarioId, string papel)
    {
        var identidade = new ClaimsIdentity(new[]
        {
            new Claim("usuarioId", usuarioId.ToString()),
            new Claim(ClaimTypes.Role, papel)
        }, "TesteAuth");
        return new ClaimsPrincipal(identidade);
    }

    [Fact]
    public async Task AbrirAsync_CursoComCoordenador_RoteiaParaOCoordenadorENotificaEle()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, coordenador.Id);

        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = curso.Id, Texto = "Nao consigo acessar o modulo 2." });

        Assert.Equal(coordenador.Id, chamado.CoordenadorDestinoId);
        Assert.Contains(context.Notificacoes, notificacao => notificacao.UsuarioId == coordenador.Id && notificacao.Tipo == TipoNotificacao.ChamadoNovo);
    }

    [Fact]
    public async Task AbrirAsync_SemCurso_RoteiaParaTodosOsAdmins()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var adminUm = CriarAdmin(context);
        var adminDois = CriarAdmin(context);

        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Nao consigo acessar minha conta." });

        Assert.Null(chamado.CoordenadorDestinoId);
        Assert.Contains(context.Notificacoes, notificacao => notificacao.UsuarioId == adminUm.Id);
        Assert.Contains(context.Notificacoes, notificacao => notificacao.UsuarioId == adminDois.Id);
    }

    [Fact]
    public async Task AbrirAsync_CursoDeCoordenadorNuloComoNull_RoteiaParaAdmin()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var cursoSemCoordenador = CriarCurso(context, coordenadorId: null);

        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = cursoSemCoordenador.Id, Texto = "Duvida sobre o curso." });

        Assert.Null(chamado.CoordenadorDestinoId);
        Assert.Contains(context.Notificacoes, notificacao => notificacao.UsuarioId == admin.Id);
    }

    [Fact]
    public async Task AbrirAsync_ComConversaMasIaFalha_UsaFallbackDasUltimasMensagensDoAluno()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var conversa = ConversaChatbot.Criar(aluno.Id);
        context.ConversasChatbot.Add(conversa);
        context.SaveChanges();
        context.MensagensChatbot.Add(MensagemChatbot.CriarDoUsuario(conversa.Id, "Minha avaliacao esta bloqueada."));
        context.SaveChanges();

        var iaFake = new ChatbotIAServiceFakeComFalhaNoResumo();
        var service = CriarService(context, iaFake);

        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { ConversaId = conversa.Id, Texto = "Continuo sem conseguir." });

        Assert.Contains("Minha avaliacao esta bloqueada.", chamado.Resumo);
    }

    [Fact]
    public async Task ObterPorIdAsync_AlunoQueNaoEDono_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var dono = CriarAluno(context, "Dono");
        var outro = CriarAluno(context, "Outro");
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(dono.Id, new AbrirChamadoDto { Texto = "Problema." });

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterPorIdAsync(chamado.Id, ComoUsuario(outro.Id, "Aluno")));
    }

    [Fact]
    public async Task ObterPorIdAsync_CoordenadorDeOutroCurso_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var coordenadorDono = CriarCoordenador(context);
        var coordenadorDeOutroCurso = CriarCoordenador(context);
        var curso = CriarCurso(context, coordenadorDono.Id);

        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = curso.Id, Texto = "Problema no curso." });

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ObterPorIdAsync(chamado.Id, ComoUsuario(coordenadorDeOutroCurso.Id, "Coordenador")));
    }

    [Fact]
    public async Task ObterPorIdAsync_Admin_SempreAcessaMesmoSemSerODestino()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, coordenador.Id);

        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = curso.Id, Texto = "Problema no curso." });

        var resultado = await service.ObterPorIdAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));
        Assert.Equal(chamado.Id, resultado.Id);
    }

    [Fact]
    public async Task ListarParaStaffAsync_Coordenador_VeSoOsChamadosDosSeusCursos()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var coordenadorA = CriarCoordenador(context);
        var coordenadorB = CriarCoordenador(context);
        var cursoDeA = CriarCurso(context, coordenadorA.Id);
        var cursoDeB = CriarCurso(context, coordenadorB.Id);

        var service = CriarService(context);
        await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = cursoDeA.Id, Texto = "Chamado do curso A." });
        await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = cursoDeB.Id, Texto = "Chamado do curso B." });

        var resultado = await service.ListarParaStaffAsync(ComoUsuario(coordenadorA.Id, "Coordenador"), status: null);

        Assert.Single(resultado);
        Assert.Equal(coordenadorA.Id, resultado[0].CoordenadorDestinoId);
    }

    [Fact]
    public async Task ListarParaStaffAsync_Admin_VeTodosOsChamados()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, coordenador.Id);

        var service = CriarService(context);
        await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { CursoId = curso.Id, Texto = "Chamado do curso." });
        await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Chamado sem curso." });

        var resultado = await service.ListarParaStaffAsync(ComoUsuario(admin.Id, "Admin"), status: null);

        Assert.Equal(2, resultado.Count);
    }

    [Fact]
    public async Task ResponderAsync_AlunoDono_VoltaParaAbertoENotificaODestino()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Problema." });

        await service.ResponderAsync(chamado.Id, ComoUsuario(aluno.Id, "Aluno"), new ResponderChamadoDto { Texto = "Mais detalhes." });

        var atualizado = await service.ObterPorIdAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));
        Assert.Equal(StatusChamadoSuporte.Aberto, atualizado.Status);
        Assert.Equal(2, atualizado.Mensagens.Count);
    }

    [Fact]
    public async Task ResponderAsync_Staff_MudaParaRespondidoENotificaOAluno()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Problema." });

        var atualizado = await service.ResponderAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"), new ResponderChamadoDto { Texto = "Resolvido, veja X." });

        Assert.Equal(StatusChamadoSuporte.Respondido, atualizado.Status);
        Assert.Contains(context.Notificacoes, notificacao => notificacao.UsuarioId == aluno.Id && notificacao.Tipo == TipoNotificacao.ChamadoNovaMensagem);
    }

    [Fact]
    public async Task ResolverAsync_Aluno_LancaKeyNotFound()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Problema." });

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.ResolverAsync(chamado.Id, ComoUsuario(aluno.Id, "Aluno")));
    }

    [Fact]
    public async Task ResolverAsync_Admin_MudaStatusParaResolvidoERegistraResolvidoEm()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Problema." });

        await service.ResolverAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));

        var atualizado = await service.ObterPorIdAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));
        Assert.Equal(StatusChamadoSuporte.Resolvido, atualizado.Status);
        Assert.NotNull(atualizado.ResolvidoEm);
    }

    [Fact]
    public async Task ReabrirAsync_DentroDoPrazoDeSeteDias_VoltaParaAberto()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var admin = CriarAdmin(context);
        var service = CriarService(context);
        var chamado = await service.AbrirAsync(aluno.Id, new AbrirChamadoDto { Texto = "Problema." });
        await service.ResolverAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));

        await service.ReabrirAsync(chamado.Id, aluno.Id);

        var atualizado = await service.ObterPorIdAsync(chamado.Id, ComoUsuario(admin.Id, "Admin"));
        Assert.Equal(StatusChamadoSuporte.Aberto, atualizado.Status);
        Assert.Null(atualizado.ResolvidoEm);
    }

    [Fact]
    public async Task ReabrirAsync_ForaDoPrazoDeSeteDias_LancaInvalidOperationException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var chamado = ChamadoSuporte.Abrir(aluno.Id, curso.Id, coordenadorDestinoId: null, "Resumo.", conversaId: null);
        chamado.Resolver(DateTime.UtcNow.AddDays(-8));
        context.ChamadosSuporte.Add(chamado);
        context.SaveChanges();

        var service = CriarService(context);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReabrirAsync(chamado.Id, aluno.Id));
    }
}

/// <summary>Fake da IA do chat cujo resumo automatico sempre falha - forca o fallback de ChamadoSuporteService.</summary>
public sealed class ChatbotIAServiceFakeComFalhaNoResumo : PlataformaEnsino.API.Interfaces.IChatbotIAService
{
    public Task<PlataformaEnsino.API.Interfaces.ResultadoMensagemChatbotIA> ObterRespostaAsync(
        int alunoId,
        IReadOnlyList<(string Papel, string Texto)> historico,
        string textoNovaMensagem,
        ContextoTelaChatbotDto? contexto,
        Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
        CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<string> ResumirConversaAsync(IReadOnlyList<(string Papel, string Texto)> mensagens, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Falha simulada do provedor de IA.");
}
