using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _usuarioService;

    public UsuariosController(IUsuarioService usuarioService)
    {
        _usuarioService = usuarioService;
    }

    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        var usuarios = await _usuarioService.ListarTodosUsuariosAsync();
        return Ok(usuarios);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObterUsuarioPorId(int id)
    {
        var usuario = await _usuarioService.ObterUsuarioPorIdAsync(id);
        return Ok(usuario);
    }
}
