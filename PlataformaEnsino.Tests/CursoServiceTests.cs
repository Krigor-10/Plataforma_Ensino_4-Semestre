using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class CursoServiceTests
{
    private static CursoService CriarService(PlataformaContext context) => new(
        context,
        new GenericRepository<Curso>(context),
        new GenericRepository<Coordenador>(context),
        new NotificacaoService(context, NullLogger<NotificacaoService>.Instance));

    private static Professor CriarProfessor(PlataformaContext context)
    {
        var professor = new Professor
        {
            Nome = "Professor Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", "hash-fake");

        context.Professores.Add(professor);
        context.SaveChanges();
        return professor;
    }

    private static Coordenador CriarCoordenador(PlataformaContext context)
    {
        var coordenador = new Coordenador
        {
            Nome = "Coordenador Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "33344455566",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            CodigoRegistro = $"COORD-{Guid.NewGuid():N}"[..10]
        };
        coordenador.ConfigurarAcesso("Coordenador", "hash-fake");

        context.Coordenadores.Add(coordenador);
        context.SaveChanges();
        return coordenador;
    }

    private static Curso CriarCurso(PlataformaContext context, ModeloCurso modeloCurso, int? coordenadorId = null)
    {
        var curso = new Curso
        {
            Titulo = "Curso Teste",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            ModeloCurso = modeloCurso,
            CoordenadorId = coordenadorId
        };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static void VincularProfessorCurso(PlataformaContext context, int professorId, int cursoId)
    {
        context.ProfessoresCursos.Add(new ProfessorCurso { ProfessorId = professorId, CursoId = cursoId });
        context.SaveChanges();
    }

    [Theory]
    [InlineData(0, ModeloCurso.Gratuito)]
    [InlineData(150, ModeloCurso.PagoPacote)]
    public async Task CriarCursoAsync_SemModeloInformado_InfereAPartirDoPreco(decimal preco, ModeloCurso esperado)
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var curso = await service.CriarCursoAsync(new CriarCursoDto { Titulo = "Curso", Preco = preco }, criadoPorId: 1);

        Assert.Equal(esperado, curso.ModeloCurso);
    }

    [Fact]
    public async Task CriarCursoAsync_ComModeloInformado_RespeitaOValorExplicito()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);

        var curso = await service.CriarCursoAsync(
            new CriarCursoDto { Titulo = "Curso Acompanhado", Preco = 0, ModeloCurso = ModeloCurso.Acompanhado },
            criadoPorId: 1);

        Assert.Equal(ModeloCurso.Acompanhado, curso.ModeloCurso);
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_ProfessorVinculado_MarcaConclusaoENotificaCoordenador()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.ConcluidoPeloProfessorEm);
        Assert.Equal(professor.Id, cursoAtualizado.ConcluidoPeloProfessorId);

        var notificacoes = context.Notificacoes.Where(n => n.UsuarioId == coordenador.Id).ToList();
        Assert.Single(notificacoes);
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_ProfessorNaoVinculado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id));
    }

    [Fact]
    public async Task ConcluirCursoComoProfessorAsync_CursoNaoAcompanhado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);
        VincularProfessorCurso(context, professor.Id, curso.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id));
    }

    [Fact]
    public async Task EncerrarCursoAsync_FluxoCompleto_EncerraComSucesso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.NotNull(cursoAtualizado.EncerradoEm);
        Assert.Equal(coordenador.Id, cursoAtualizado.EncerradoPorId);
    }

    [Fact]
    public async Task EncerrarCursoAsync_SemConclusaoDoProfessor_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EncerrarCursoAsync(curso.Id, coordenador.Id));
    }

    [Fact]
    public async Task EncerrarCursoAsync_CoordenadorNaoResponsavel_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenadorDono = CriarCoordenador(context);
        var outroCoordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenadorDono.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EncerrarCursoAsync(curso.Id, outroCoordenador.Id));
    }

    [Fact]
    public async Task ReabrirCursoAsync_CursoEncerrado_LimpaEncerramento()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await service.ReabrirCursoAsync(curso.Id, coordenador.Id);

        var cursoAtualizado = await service.ObterCursoPorIdAsync(curso.Id);
        Assert.Null(cursoAtualizado.EncerradoEm);
        Assert.Null(cursoAtualizado.EncerradoPorId);
        // Marca de conclusao do professor nao e desfeita por reabrir — o
        // coordenador pode encerrar de novo sem o professor repetir a acao.
        Assert.NotNull(cursoAtualizado.ConcluidoPeloProfessorEm);
    }

    [Fact]
    public async Task GarantirCursoAbertoAsync_CursoAcompanhadoEncerrado_LancaInvalidOperation()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var coordenador = CriarCoordenador(context);
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, ModeloCurso.Acompanhado, coordenador.Id);
        VincularProfessorCurso(context, professor.Id, curso.Id);
        await service.ConcluirCursoComoProfessorAsync(curso.Id, professor.Id);
        await service.EncerrarCursoAsync(curso.Id, coordenador.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GarantirCursoAbertoAsync(curso.Id));
    }

    [Fact]
    public async Task GarantirCursoAbertoAsync_CursoPagoPacote_NuncaBloqueia()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote);

        await service.GarantirCursoAbertoAsync(curso.Id);
    }
}
