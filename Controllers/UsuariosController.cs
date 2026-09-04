using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _usuarioService;
    private readonly IFeedbackAcademicoService _feedbackAcademicoService;

    public UsuariosController(IUsuarioService usuarioService, IFeedbackAcademicoService feedbackAcademicoService)
    {
        _usuarioService = usuarioService;
        _feedbackAcademicoService = feedbackAcademicoService;
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

    [HttpPost("{alunoId:int}/feedbacks")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> CriarFeedback(int alunoId, [FromBody] CriarFeedbackAcademicoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var professorId = User.ObterUsuarioId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var feedback = await _feedbackAcademicoService.CriarFeedbackAsync(professorId.Value, alunoId, dto);
        return CreatedAtAction(nameof(ListarFeedbacks), new { alunoId }, feedback);
    }

    [HttpGet("{alunoId:int}/feedbacks")]
    public async Task<IActionResult> ListarFeedbacks(int alunoId)
    {
        var usuarioLogadoId = User.ObterUsuarioId();
        if (!usuarioLogadoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o usuario autenticado." });
        }

        var tipoUsuarioLogado = User.IsInRole("Aluno") ? "Aluno" : User.IsInRole("Professor") ? "Professor" : "Outro";
        var feedbacks = await _feedbackAcademicoService.ListarPorAlunoAsync(alunoId, usuarioLogadoId.Value, tipoUsuarioLogado);
        return Ok(feedbacks);
    }

    [HttpPut("{alunoId:int}/feedbacks/{feedbackId:int}/lido")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> MarcarFeedbackComoLido(int alunoId, int feedbackId)
    {
        if (!User.PodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        await _feedbackAcademicoService.MarcarComoLidoAsync(feedbackId, alunoId);
        return NoContent();
    }
}
