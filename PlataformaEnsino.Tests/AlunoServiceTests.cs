using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

/// <summary>
/// Docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md - cobre a
/// secao "Testes" (xUnit) que fica a nivel de servico: regras de PUT/
/// inativar/reativar. 403 por papel e o corte "na hora" (JwtBearerEvents)
/// exigem o pipeline HTTP real - ver AlunosControllerIntegrationTests.
/// </summary>
public class AlunoServiceTests
{
    private class AuthServiceFake : IAuthService
    {
        public List<int> TokensRevogadosParaUsuario { get; } = new();

        public Task<AuthResponseDto?> LoginAsync(string email, string senha) => throw new NotImplementedException();
        public Task<AuthResponseDto?> RefreshAsync(string refreshToken) => throw new NotImplementedException();
        public Task LogoutAsync(string refreshToken) => throw new NotImplementedException();
        public Task SolicitarRecuperacaoSenhaAsync(string email) => throw new NotImplementedException();
        public Task RedefinirSenhaAsync(string token, string novaSenha) => throw new NotImplementedException();
        public Task<AuthResponseDto> BootstrapAdminAsync(BootstrapAdminDto dto) => throw new NotImplementedException();

        public Task RevogarTodosOsTokensAsync(int usuarioId)
        {
            TokensRevogadosParaUsuario.Add(usuarioId);
            return Task.CompletedTask;
        }
    }

    private class EmailCapturaFake : IEmailService
    {
        public List<(string Destinatario, string Assunto)> Enviados { get; } = new();
        public bool DeveFalhar { get; set; }

        public Task EnviarAsync(string destinatario, string assunto, string corpoHtml)
        {
            if (DeveFalhar)
            {
                throw new InvalidOperationException("Falha simulada de SMTP.");
            }

            Enviados.Add((destinatario, assunto));
            return Task.CompletedTask;
        }
    }

    private static (AlunoService Service, PlataformaContext Context, AuthServiceFake AuthFake, EmailCapturaFake EmailFake) CriarService()
    {
        var context = TestContextFactory.Criar();
        var authFake = new AuthServiceFake();
        var emailFake = new EmailCapturaFake();
        var cache = new MemoryCache(new MemoryCacheOptions());

        var service = new AlunoService(context, matriculaService: null!, authFake, emailFake, cache, NullLogger<AlunoService>.Instance);
        return (service, context, authFake, emailFake);
    }

    private static Aluno CriarAluno(PlataformaContext context, string? email = null)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Original",
            Email = email ?? $"{Guid.NewGuid():N}@teste.local",
            Cpf = Random.Shared.NextInt64(10000000000, 99999999999).ToString(),
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = $"RA-{Guid.NewGuid():N}"[..12]
        };
        aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword("Senha@123"));

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static AtualizarAlunoAdminDto DtoAtualizacao(Aluno aluno, string? email = null, string? matricula = null) => new()
    {
        Nome = "Aluno Atualizado",
        Email = email ?? aluno.Email,
        Telefone = "11988887777",
        Matricula = matricula ?? aluno.Matricula
    };

    [Fact]
    public async Task AtualizarDadosAdminAsync_DadosValidos_AtualizaSemTocarCpfEndereco()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);
        var cpfOriginal = aluno.Cpf;
        var ruaOriginal = aluno.Rua;

        var resultado = await service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno, matricula: "NOVO-RA-123"));

        Assert.Equal("Aluno Atualizado", resultado.Nome);
        Assert.Equal("11988887777", resultado.Telefone);
        Assert.Equal("NOVO-RA-123", resultado.Matricula);
        Assert.Equal(cpfOriginal, resultado.Cpf);
        Assert.Equal(ruaOriginal, resultado.Rua);
        Assert.True(resultado.AvisoEmailEnviado);
    }

    [Fact]
    public async Task AtualizarDadosAdminAsync_EmailJaUsadoPorOutroUsuario_LancaConflitoDeNegocio()
    {
        var (service, context, _, _) = CriarService();
        var outroAluno = CriarAluno(context, "ocupado@teste.local");
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<ConflitoDeNegocioException>(
            () => service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno, email: outroAluno.Email)));
    }

    [Fact]
    public async Task AtualizarDadosAdminAsync_RaJaPertenceAOutroAluno_LancaConflitoDeNegocio()
    {
        var (service, context, _, _) = CriarService();
        var outroAluno = CriarAluno(context);
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<ConflitoDeNegocioException>(
            () => service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno, matricula: outroAluno.Matricula)));
    }

    [Fact]
    public async Task AtualizarDadosAdminAsync_TrocaDeEmail_RevogaTokensEEnviaDoisEmails()
    {
        var (service, context, authFake, emailFake) = CriarService();
        var aluno = CriarAluno(context);
        var emailAntigo = aluno.Email;
        var emailNovo = $"novo.{Guid.NewGuid():N}@teste.local";

        var resultado = await service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno, email: emailNovo));

        Assert.True(resultado.AvisoEmailEnviado);
        Assert.Equal(new[] { aluno.Id }, authFake.TokensRevogadosParaUsuario);
        Assert.Equal(2, emailFake.Enviados.Count);
        Assert.Contains(emailFake.Enviados, envio => envio.Destinatario == emailAntigo);
        Assert.Contains(emailFake.Enviados, envio => envio.Destinatario == emailNovo);
    }

    [Fact]
    public async Task AtualizarDadosAdminAsync_SemTrocarEmail_NaoRevogaTokensNemEnviaEmail()
    {
        var (service, context, authFake, emailFake) = CriarService();
        var aluno = CriarAluno(context);

        await service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno));

        Assert.Empty(authFake.TokensRevogadosParaUsuario);
        Assert.Empty(emailFake.Enviados);
    }

    [Fact]
    public async Task AtualizarDadosAdminAsync_FalhaNoEnvioDoAviso_MantemAEdicaoEDevolveAvisoEmailEnviadoFalse()
    {
        var (service, context, _, emailFake) = CriarService();
        emailFake.DeveFalhar = true;
        var aluno = CriarAluno(context);
        var emailNovo = $"novo.{Guid.NewGuid():N}@teste.local";

        var resultado = await service.AtualizarDadosAdminAsync(aluno.Id, DtoAtualizacao(aluno, email: emailNovo));

        Assert.False(resultado.AvisoEmailEnviado);
        Assert.Equal(emailNovo, resultado.Email);

        var alunoSalvo = await context.Alunos.AsNoTracking().FirstAsync(a => a.Id == aluno.Id);
        Assert.Equal(emailNovo, alunoSalvo.Email);
    }

    [Fact]
    public async Task InativarAsync_MotivoValido_RegistraDadosEDesativaERevogaTokens()
    {
        var (service, context, authFake, _) = CriarService();
        var aluno = CriarAluno(context);
        var admin = new Admin { Nome = "Admin Teste", Email = $"{Guid.NewGuid():N}@teste.local", Cpf = "00011122233" };
        admin.ConfigurarAcesso("Admin", BCrypt.Net.BCrypt.HashPassword("Senha@123"));
        context.Admins.Add(admin);
        await context.SaveChangesAsync();

        var resultado = await service.InativarAsync(aluno.Id, admin.Id, "Pagamento recorrente em atraso.");

        Assert.False(resultado.Ativo);
        Assert.NotNull(resultado.InativadoEm);
        Assert.Equal("Admin Teste", resultado.InativadoPorNome);
        Assert.Equal("Pagamento recorrente em atraso.", resultado.MotivoInativacao);
        Assert.Equal(new[] { aluno.Id }, authFake.TokensRevogadosParaUsuario);
    }

    [Fact]
    public async Task InativarAsync_MotivoCurto_LancaArgumentException()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.InativarAsync(aluno.Id, adminId: 1, motivo: "Não"));
    }

    [Fact]
    public async Task InativarAsync_AlunoJaInativo_LancaConflitoDeNegocio()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);
        await service.InativarAsync(aluno.Id, adminId: 1, motivo: "Primeiro motivo valido.");

        await Assert.ThrowsAsync<ConflitoDeNegocioException>(
            () => service.InativarAsync(aluno.Id, adminId: 1, motivo: "Segundo motivo valido."));
    }

    [Fact]
    public async Task ReativarAsync_LimpaDadosDeInativacaoEVoltaAtivo()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);
        await service.InativarAsync(aluno.Id, adminId: 1, motivo: "Motivo valido para inativar.");

        var resultado = await service.ReativarAsync(aluno.Id);

        Assert.True(resultado.Ativo);
        Assert.Null(resultado.InativadoEm);
        Assert.Equal(string.Empty, resultado.MotivoInativacao);
        Assert.Equal(string.Empty, resultado.InativadoPorNome);
    }

    [Fact]
    public async Task ReativarAsync_AlunoJaAtivo_LancaConflitoDeNegocio()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<ConflitoDeNegocioException>(() => service.ReativarAsync(aluno.Id));
    }

    [Fact]
    public async Task ListarAlunosAsync_SemIncluirDadosInativacao_NaoExpoeCamposParaCoordenador()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);
        await service.InativarAsync(aluno.Id, adminId: 1, motivo: "Motivo valido para inativar.");

        var (itens, _) = await service.ListarAlunosAsync(pagina: null, tamanhoPagina: null, incluirDadosInativacao: false);
        var dto = Assert.Single(itens, item => item.Id == aluno.Id);

        Assert.Null(dto.InativadoEm);
        Assert.Equal(string.Empty, dto.InativadoPorNome);
        Assert.Equal(string.Empty, dto.MotivoInativacao);
    }

    [Fact]
    public async Task ListarAlunosAsync_IncluirDadosInativacao_ExpoeCamposParaAdmin()
    {
        var (service, context, _, _) = CriarService();
        var aluno = CriarAluno(context);
        var admin = new Admin { Nome = "Admin Lista", Email = $"{Guid.NewGuid():N}@teste.local", Cpf = "99988877766" };
        admin.ConfigurarAcesso("Admin", BCrypt.Net.BCrypt.HashPassword("Senha@123"));
        context.Admins.Add(admin);
        await context.SaveChangesAsync();
        await service.InativarAsync(aluno.Id, admin.Id, "Motivo valido para inativar.");

        var (itens, _) = await service.ListarAlunosAsync(pagina: null, tamanhoPagina: null, incluirDadosInativacao: true);
        var dto = Assert.Single(itens, item => item.Id == aluno.Id);

        Assert.NotNull(dto.InativadoEm);
        Assert.Equal("Admin Lista", dto.InativadoPorNome);
        Assert.Equal("Motivo valido para inativar.", dto.MotivoInativacao);
    }
}
