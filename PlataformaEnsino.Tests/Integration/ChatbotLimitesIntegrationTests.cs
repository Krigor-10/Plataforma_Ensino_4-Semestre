using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.Tests.Integration;

// Classe separada das demais integration tests porque a policy "chatbot" tem
// orcamento de 30/hora por aluno compartilhado por toda a vida do host - um
// teste "estourando" o limite de proposito contaminaria o contador de outros
// testes se rodasse no mesmo fixture (mesmo achado ja visto com /auth/login).
// Troca o IChatbotIAService real por um fake sem rede: sem isso o teste
// dependeria da chave de API da Anthropic responder de verdade.
public class ChatbotLimitesIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ChatbotLimitesIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IChatbotIAService>();
            services.AddScoped<IChatbotIAService, ChatbotIAServiceFakeSemRede>();
        }));
    }

    private async Task<string> CriarAlunoEObterTokenAsync(string email)
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            await context.Database.EnsureCreatedAsync();

            var aluno = new Aluno
            {
                Nome = "Aluna Limite Chatbot",
                Email = email,
                Cpf = $"{Random.Shared.NextInt64(10000000000, 99999999999)}",
                Matricula = $"MAT-{Guid.NewGuid():N}"[..10]
            };
            aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(ApiWebApplicationFactory.SenhaPadrao));

            context.Alunos.Add(aluno);
            await context.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        var resposta = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, senha = ApiWebApplicationFactory.SenhaPadrao });
        resposta.EnsureSuccessStatusCode();
        var corpo = await resposta.Content.ReadFromJsonAsync<AuthResponseDto>();
        return corpo!.Token;
    }

    [Fact]
    public async Task EnviarMensagem_TrigesimaPrimeiraPerguntaNaMesmaHora_RetornaTooManyRequests()
    {
        var token = await CriarAlunoEObterTokenAsync($"aluno.hora.{Guid.NewGuid():N}@teste.local");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        for (var indice = 0; indice < 30; indice++)
        {
            var resposta = await client.PostAsJsonAsync(
                "/api/v1/Chatbot/mensagens?stream=false",
                new EnviarMensagemChatbotDto { Texto = $"Pergunta {indice}" });

            Assert.NotEqual(HttpStatusCode.TooManyRequests, resposta.StatusCode);
        }

        var trigesimaPrimeira = await client.PostAsJsonAsync(
            "/api/v1/Chatbot/mensagens?stream=false",
            new EnviarMensagemChatbotDto { Texto = "Pergunta 31" });

        Assert.Equal(HttpStatusCode.TooManyRequests, trigesimaPrimeira.StatusCode);
    }

    [Fact]
    public async Task EnviarMensagem_CentesimaPrimeiraPerguntaNoDia_RetornaServiceUnavailableComCodigoLimiteDiario()
    {
        var email = $"aluno.dia.{Guid.NewGuid():N}@teste.local";
        var token = await CriarAlunoEObterTokenAsync(email);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<PlataformaContext>();
            var aluno = context.Alunos.Single(a => a.Email == email);

            var conversa = ConversaChatbot.Criar(aluno.Id);
            context.ConversasChatbot.Add(conversa);
            await context.SaveChangesAsync();

            for (var indice = 0; indice < 100; indice++)
            {
                context.MensagensChatbot.Add(MensagemChatbot.CriarDoUsuario(conversa.Id, $"pergunta antiga {indice}"));
            }
            await context.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.PostAsJsonAsync(
            "/api/v1/Chatbot/mensagens?stream=false",
            new EnviarMensagemChatbotDto { Texto = "Pergunta 101 do dia" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, resposta.StatusCode);

        var corpo = await resposta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("limite_diario", corpo.GetProperty("codigo").GetString());
    }

    private class ChatbotIAServiceFakeSemRede : IChatbotIAService
    {
        public Task<ResultadoMensagemChatbotIA> ObterRespostaAsync(
            int alunoId,
            IReadOnlyList<(string Papel, string Texto)> historico,
            string textoNovaMensagem,
            ContextoTelaChatbotDto? contexto,
            Func<string, CancellationToken, Task> aoReceberTrechoDeTexto,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new ResultadoMensagemChatbotIA(
                "Resposta de teste.", new List<AcaoChatbotDto>(), false, false, new List<string>(), 10, 5, 0, 0));
        }

        public Task<string> ResumirConversaAsync(
            IReadOnlyList<(string Papel, string Texto)> mensagens,
            CancellationToken cancellationToken)
        {
            return Task.FromResult("Resumo de teste.");
        }
    }
}
