using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class AuthServiceTests
{
    private static IConfiguration CriarConfiguracao() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "chave-secreta-de-teste-com-tamanho-suficiente-para-hs256",
                ["Jwt:Issuer"] = "PlataformaEnsino.Testes",
                ["Jwt:Audience"] = "PlataformaEnsino.Testes",
                ["Jwt:ExpireMinutes"] = "20",
                ["Jwt:RefreshTokenExpireDays"] = "30",
                ["Frontend:BaseUrl"] = "http://localhost:5173"
            })
            .Build();

    private static (AuthService Service, PlataformaContext Context) CriarService(IEmailService? emailService = null)
    {
        var context = TestContextFactory.Criar();
        var configuration = CriarConfiguracao();

        // Sem Smtp:Host configurado, EmailService real so loga (nao tenta enviar de verdade).
        emailService ??= new EmailService(configuration, NullLogger<EmailService>.Instance);

        var service = new AuthService(context, configuration, emailService);
        return (service, context);
    }

    private static Aluno CriarAluno(PlataformaContext context, string senha = "Senha@123", bool ativo = true)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = "Pendente"
        };
        aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(senha), ativo);

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private class EmailCapturaFake : IEmailService
    {
        public string? UltimoCorpoHtml { get; private set; }

        public Task EnviarAsync(string destinatario, string assunto, string corpoHtml)
        {
            UltimoCorpoHtml = corpoHtml;
            return Task.CompletedTask;
        }
    }

    private static string ExtrairTokenDoLink(string corpoHtml)
    {
        var match = Regex.Match(corpoHtml, @"/redefinir-senha/([^""<\s]+)");
        Assert.True(match.Success, "Link de recuperacao nao encontrado no corpo do e-mail.");
        return match.Groups[1].Value;
    }

    [Fact]
    public async Task LoginAsync_CredenciaisValidas_RetornaTokenERefreshToken()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context, "Senha@123");

        var resposta = await service.LoginAsync(aluno.Email!, "Senha@123");

        Assert.NotNull(resposta);
        Assert.NotEmpty(resposta!.Token);
        Assert.NotEmpty(resposta.RefreshToken);
        Assert.Equal(aluno.Id, resposta.Usuario.Id);
    }

    [Fact]
    public async Task LoginAsync_SenhaErrada_RetornaNull()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context, "Senha@123");

        var resposta = await service.LoginAsync(aluno.Email!, "senha-errada");

        Assert.Null(resposta);
    }

    [Fact]
    public async Task LoginAsync_EmailInexistente_RetornaNull()
    {
        var (service, _) = CriarService();

        var resposta = await service.LoginAsync("nao-existe@teste.local", "qualquer-coisa");

        Assert.Null(resposta);
    }

    [Fact]
    public async Task LoginAsync_ContaInativa_LancaUnauthorizedAccess()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context, "Senha@123", ativo: false);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(aluno.Email!, "Senha@123"));
    }

    [Fact]
    public async Task RefreshAsync_TokenValido_RotacionaERevogaOAntigo()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);
        var login = await service.LoginAsync(aluno.Email!, "Senha@123");

        var novaResposta = await service.RefreshAsync(login!.RefreshToken);

        Assert.NotNull(novaResposta);
        Assert.NotEqual(login.RefreshToken, novaResposta!.RefreshToken);

        var tokenAntigo = context.RefreshTokens
            .Where(t => t.UsuarioId == aluno.Id)
            .OrderBy(t => t.CriadoEm)
            .First();
        Assert.False(tokenAntigo.EstaAtivo);
    }

    [Fact]
    public async Task RefreshAsync_TokenInexistente_RetornaNull()
    {
        var (service, _) = CriarService();

        var resposta = await service.RefreshAsync("token-que-nunca-existiu");

        Assert.Null(resposta);
    }

    [Fact]
    public async Task RefreshAsync_TokenJaRevogado_RetornaNull()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);
        var login = await service.LoginAsync(aluno.Email!, "Senha@123");

        await service.LogoutAsync(login!.RefreshToken);
        var resposta = await service.RefreshAsync(login.RefreshToken);

        Assert.Null(resposta);
    }

    [Fact]
    public async Task RefreshAsync_ContaDesativadaDepoisDoLogin_RetornaNull()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);
        var login = await service.LoginAsync(aluno.Email!, "Senha@123");

        aluno.ConfigurarAcesso("Aluno", aluno.SenhaHash, ativo: false);
        await context.SaveChangesAsync();

        var resposta = await service.RefreshAsync(login!.RefreshToken);

        Assert.Null(resposta);
    }

    [Fact]
    public async Task LogoutAsync_RevogaORefreshTokenAtivo()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);
        var login = await service.LoginAsync(aluno.Email!, "Senha@123");

        await service.LogoutAsync(login!.RefreshToken);

        var tokenSalvo = context.RefreshTokens.Single(r => r.UsuarioId == aluno.Id);
        Assert.False(tokenSalvo.EstaAtivo);
    }

    [Fact]
    public async Task LogoutAsync_TokenVazio_NaoLancaExcecao()
    {
        var (service, _) = CriarService();

        var excecao = await Record.ExceptionAsync(() => service.LogoutAsync(string.Empty));

        Assert.Null(excecao);
    }

    [Fact]
    public async Task SolicitarRecuperacaoSenhaAsync_UsuarioExistente_DefineTokenComExpiracaoEEnviaEmail()
    {
        var emailFake = new EmailCapturaFake();
        var (service, context) = CriarService(emailFake);
        var aluno = CriarAluno(context);

        await service.SolicitarRecuperacaoSenhaAsync(aluno.Email!);

        var alunoAtualizado = context.Usuarios.Single(u => u.Id == aluno.Id);
        Assert.NotNull(alunoAtualizado.TokenRecuperacaoSenhaHash);
        Assert.NotNull(alunoAtualizado.TokenRecuperacaoSenhaExpiraEm);
        Assert.True(alunoAtualizado.TokenRecuperacaoSenhaExpiraEm > DateTime.UtcNow);
        Assert.NotNull(emailFake.UltimoCorpoHtml);
    }

    [Fact]
    public async Task SolicitarRecuperacaoSenhaAsync_EmailInexistente_NaoLancaExcecaoENaoEnviaEmail()
    {
        var emailFake = new EmailCapturaFake();
        var (service, _) = CriarService(emailFake);

        var excecao = await Record.ExceptionAsync(
            () => service.SolicitarRecuperacaoSenhaAsync("nao-existe@teste.local"));

        Assert.Null(excecao);
        Assert.Null(emailFake.UltimoCorpoHtml);
    }

    [Fact]
    public async Task RedefinirSenhaAsync_TokenValido_AtualizaSenhaERevogaRefreshTokensAtivos()
    {
        var emailFake = new EmailCapturaFake();
        var (service, context) = CriarService(emailFake);
        var aluno = CriarAluno(context, "SenhaAntiga@123");
        await service.LoginAsync(aluno.Email!, "SenhaAntiga@123");

        await service.SolicitarRecuperacaoSenhaAsync(aluno.Email!);
        var tokenBruto = ExtrairTokenDoLink(emailFake.UltimoCorpoHtml!);

        await service.RedefinirSenhaAsync(tokenBruto, "SenhaNova@123");

        var loginComSenhaNova = await service.LoginAsync(aluno.Email!, "SenhaNova@123");
        Assert.NotNull(loginComSenhaNova);

        var loginComSenhaAntiga = await service.LoginAsync(aluno.Email!, "SenhaAntiga@123");
        Assert.Null(loginComSenhaAntiga);

        var refreshTokenDoLoginOriginal = context.RefreshTokens
            .Where(t => t.UsuarioId == aluno.Id)
            .OrderBy(t => t.CriadoEm)
            .First();
        Assert.False(refreshTokenDoLoginOriginal.EstaAtivo);
    }

    [Fact]
    public async Task RedefinirSenhaAsync_TokenForjado_LancaInvalidOperationException()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RedefinirSenhaAsync("token-forjado-nao-bate-com-nenhum-hash", "SenhaNova@123"));
    }

    [Fact]
    public async Task RedefinirSenhaAsync_TokenVazio_LancaArgumentException()
    {
        var (service, _) = CriarService();

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.RedefinirSenhaAsync(string.Empty, "SenhaNova@123"));
    }

    [Fact]
    public async Task RedefinirSenhaAsync_TokenExpirado_LancaInvalidOperationException()
    {
        var (service, context) = CriarService();
        var aluno = CriarAluno(context);

        aluno.DefinirTokenRecuperacaoSenha("hash-qualquer", DateTime.UtcNow.AddMinutes(-1));
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RedefinirSenhaAsync("token-bruto-qualquer", "SenhaNova@123"));
    }
}
