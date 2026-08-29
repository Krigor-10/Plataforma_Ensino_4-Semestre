using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class NotificacoesController : ControllerBase
{
    private readonly INotificacaoService _notificacaoService;

    public NotificacoesController(INotificacaoService notificacaoService)
    {
        _notificacaoService = notificacaoService;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var usuarioId = ObterUsuarioIdAutenticado();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        var notificacoes = await _notificacaoService.ListarPorUsuarioAsync(usuarioId.Value);
        return Ok(notificacoes.Select(MapResponse));
    }

    [HttpGet("nao-lidas/contagem")]
    public async Task<IActionResult> ContarNaoLidas()
    {
        var usuarioId = ObterUsuarioIdAutenticado();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        var total = await _notificacaoService.ContarNaoLidasAsync(usuarioId.Value);
        return Ok(new { total });
    }

    [HttpPut("{id:int}/lida")]
    public async Task<IActionResult> MarcarComoLida(int id)
    {
        var usuarioId = ObterUsuarioIdAutenticado();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        await _notificacaoService.MarcarComoLidaAsync(id, usuarioId.Value);
        return Ok();
    }

    [HttpPut("lidas")]
    public async Task<IActionResult> MarcarTodasComoLidas()
    {
        var usuarioId = ObterUsuarioIdAutenticado();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        await _notificacaoService.MarcarTodasComoLidasAsync(usuarioId.Value);
        return Ok();
    }

    private int? ObterUsuarioIdAutenticado() => User.ObterUsuarioId();

    private static NotificacaoResponseDto MapResponse(Notificacao notificacao) => new()
    {
        Id = notificacao.Id,
        Titulo = notificacao.Titulo,
        Mensagem = notificacao.Mensagem,
        Tipo = notificacao.Tipo.ToString(),
        Link = notificacao.Link,
        Lida = notificacao.Lida,
        CriadoEm = notificacao.CriadoEm
    };
}
