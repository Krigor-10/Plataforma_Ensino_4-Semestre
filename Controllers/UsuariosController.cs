using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _usuarioService;

    public UsuariosController(IUsuarioService usuarioService)
    {
        _usuarioService = usuarioService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ListarTodos()
    {
        var usuarios = await _usuarioService.ListarTodosUsuariosAsync();
        return Ok(usuarios);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ObterUsuarioPorId(int id)
    {
        var usuario = await _usuarioService.ObterUsuarioPorIdAsync(id);
        return Ok(usuario);
    }

    [HttpGet("me")]
    public async Task<IActionResult> ObterMeuPerfil()
    {
        var usuarioId = User.ObterUsuarioId();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        var usuario = await _usuarioService.ObterUsuarioPorIdAsync(usuarioId.Value);
        return Ok(usuario);
    }

    [HttpPut("me")]
    public async Task<IActionResult> AtualizarMeuPerfil([FromBody] AtualizarPerfilDto dto)
    {
        var usuarioId = User.ObterUsuarioId();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        var usuario = await _usuarioService.AtualizarPerfilAsync(usuarioId.Value, dto);
        return Ok(usuario);
    }

    [HttpPut("me/senha")]
    public async Task<IActionResult> TrocarMinhaSenha([FromBody] TrocarSenhaDto dto)
    {
        var usuarioId = User.ObterUsuarioId();
        if (!usuarioId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        await _usuarioService.TrocarSenhaAsync(usuarioId.Value, dto);
        return Ok(new { mensagem = "Senha atualizada com sucesso." });
    }
}
