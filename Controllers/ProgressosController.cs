using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Aluno")]
public class ProgressosController : ControllerBase
{
    private readonly IProgressoAlunoService _progressoService;

    public ProgressosController(IProgressoAlunoService progressoService)
    {
        _progressoService = progressoService;
    }

    [HttpGet("aluno/{alunoId:int}")]
    public async Task<IActionResult> ObterProgressoDoAluno(int alunoId)
    {
        if (!UsuarioAtualPodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        var snapshot = await _progressoService.ObterSnapshotAsync(alunoId);
        return Ok(snapshot);
    }

    [HttpPut("conteudos/{conteudoId:int}/concluir")]
    public async Task<IActionResult> MarcarConteudoConcluido(int conteudoId)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var snapshot = await _progressoService.MarcarConteudoConcluidoAsync(alunoId.Value, conteudoId);
        return Ok(snapshot);
    }

    private int? ObterAlunoId() => User.ObterUsuarioId();

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);
}
