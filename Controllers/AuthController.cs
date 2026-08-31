using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/v1/[controller]")]
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
    [EnableRateLimiting("auth")]
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
    [EnableRateLimiting("auth")]
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

    [HttpPost("esqueci-senha")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaDto dto)
    {
        await _authService.SolicitarRecuperacaoSenhaAsync(dto.Email);

        return Ok(new
        {
            mensagem = "Se o e-mail informado estiver cadastrado, enviaremos as instrucoes de recuperacao."
        });
    }

    [HttpPost("redefinir-senha")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaDto dto)
    {
        await _authService.RedefinirSenhaAsync(dto.Token, dto.NovaSenha);

        return Ok(new { mensagem = "Senha redefinida com sucesso. Faca login com a nova senha." });
    }
}
