using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ChatbotController : ControllerBase
{
    private readonly IChatbotService _chatbotService;

    public ChatbotController(IChatbotService chatbotService)
    {
        _chatbotService = chatbotService;
    }

    // Resposta em streaming (SSE) por padrao - eventos "texto" (pedacos),
    // "acoes", "fim" (conversaId + mensagemId) e "erro". ?stream=false
    // devolve o JSON inteiro de uma vez, pro mobile. O limite de 30/hora
    // fica na policy "chatbot" (Program.cs); o de 100/dia e checado dentro
    // de ChatbotService (nao tem RateLimiter pronto pra janela por aluno).
    [HttpPost("mensagens")]
    [Authorize(Roles = "Aluno")]
    [EnableRateLimiting("chatbot")]
    public async Task EnviarMensagem([FromBody] EnviarMensagemChatbotDto dto, [FromQuery] bool stream, CancellationToken cancellationToken)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (!stream)
        {
            await EnviarSemStreamAsync(alunoId.Value, dto, cancellationToken);
            return;
        }

        await EnviarComStreamAsync(alunoId.Value, dto, cancellationToken);
    }

    private async Task EnviarSemStreamAsync(int alunoId, EnviarMensagemChatbotDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var resultado = await _chatbotService.EnviarMensagemAsync(alunoId, dto, (_, _) => Task.CompletedTask, cancellationToken);
            await Response.WriteAsJsonAsync(new EnviarMensagemChatbotRespostaDto
            {
                ConversaId = resultado.ConversaId,
                MensagemId = resultado.MensagemId,
                Texto = resultado.Texto,
                Acoes = resultado.Acoes,
                SemResposta = resultado.SemResposta
            }, cancellationToken);
        }
        catch (ArgumentException ex)
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { mensagem = ex.Message }, cancellationToken);
        }
        catch (ChatbotIndisponivelException ex)
        {
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await Response.WriteAsJsonAsync(new { codigo = ex.Codigo, mensagem = ex.Message }, cancellationToken);
        }
    }

    private async Task EnviarComStreamAsync(int alunoId, EnviarMensagemChatbotDto dto, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        // Evita que um proxy reverso (nginx/Azure) acumule os pedacos antes
        // de entregar - sem isso o streaming chega tudo de uma vez no final.
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            var resultado = await _chatbotService.EnviarMensagemAsync(
                alunoId,
                dto,
                (trecho, ct) => EscreverEventoSseAsync("texto", new { texto = trecho }, ct),
                cancellationToken);

            await EscreverEventoSseAsync("acoes", new { acoes = resultado.Acoes }, cancellationToken);
            await EscreverEventoSseAsync("fim", new { conversaId = resultado.ConversaId, mensagemId = resultado.MensagemId }, cancellationToken);
        }
        catch (ArgumentException ex)
        {
            await EscreverEventoSseAsync("erro", new { codigo = "invalido", mensagem = ex.Message }, cancellationToken);
        }
        catch (ChatbotIndisponivelException ex)
        {
            await EscreverEventoSseAsync("erro", new { codigo = ex.Codigo, mensagem = ex.Message }, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await EscreverEventoSseAsync("erro", new { codigo = "erro", mensagem = ex.Message }, cancellationToken);
        }
    }

    private async Task EscreverEventoSseAsync(string evento, object dados, CancellationToken cancellationToken)
    {
        await Response.WriteAsync($"event: {evento}\ndata: {JsonSerializer.Serialize(dados)}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    [HttpGet("conversas/atual")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ObterConversaAtual()
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var conversa = await _chatbotService.ObterConversaAtualAsync(alunoId.Value);
        return Ok(conversa);
    }

    [HttpPost("mensagens/{id:int}/feedback")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> EnviarFeedback(int id, [FromBody] FeedbackMensagemChatbotDto dto)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        await _chatbotService.RegistrarFeedbackAsync(alunoId.Value, id, dto.Util);
        return NoContent();
    }

    [HttpGet("configuracao")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ObterConfiguracao()
    {
        return Ok(await _chatbotService.ObterConfiguracaoAsync());
    }

    [HttpPut("configuracao")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AtualizarConfiguracao([FromBody] AtualizarConfiguracaoChatbotDto dto)
    {
        await _chatbotService.AtualizarConfiguracaoAsync(dto);
        return NoContent();
    }

    [HttpGet("uso")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ObterUso()
    {
        return Ok(await _chatbotService.ObterUsoDoMesAsync());
    }

    private int? ObterAlunoId() => User.ObterUsuarioId();
}
