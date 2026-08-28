using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Senha))
        {
            return BadRequest(new { mensagem = "E-mail e senha são obrigatórios." });
        }

        var resposta = await _authService.LoginAsync(dto.Email, dto.Senha);

        if (resposta is null)
        {
            return Unauthorized(new { mensagem = "E-mail ou senha inválidos." });
        }

        return Ok(resposta);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        var resposta = await _authService.RefreshAsync(dto.RefreshToken);

        if (resposta is null)
        {
            return Unauthorized(new { mensagem = "Sessão expirada. Faça login novamente." });
        }

        return Ok(resposta);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenDto dto)
    {
        await _authService.LogoutAsync(dto.RefreshToken);

        return Ok();
    }
}
