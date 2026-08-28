using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CertificadosController : ControllerBase
{
    private readonly ICertificadoService _certificadoService;

    public CertificadosController(ICertificadoService certificadoService)
    {
        _certificadoService = certificadoService;
    }

    [HttpPost("matricula/{matriculaId:int}/emitir")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> Emitir(int matriculaId)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var matricula = await _certificadoService.EmitirCertificadoAsync(alunoId.Value, matriculaId);
        return Ok(MapResponse(matricula));
    }

    [HttpGet("meus")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarMeus()
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var certificados = await _certificadoService.ListarCertificadosDoAlunoAsync(alunoId.Value);
        return Ok(certificados.Select(MapResponse));
    }

    [HttpGet("verificar/{codigo}")]
    [AllowAnonymous]
    public async Task<IActionResult> Verificar(string codigo)
    {
        var matricula = await _certificadoService.ObterCertificadoPorCodigoAsync(codigo);
        return Ok(MapResponse(matricula));
    }

    private int? ObterAlunoId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("usuarioId");
        return int.TryParse(rawId, out var alunoId) ? alunoId : null;
    }

    private static CertificadoResponseDto MapResponse(Matricula matricula)
    {
        return new CertificadoResponseDto
        {
            CodigoVerificacao = matricula.CodigoRegistro,
            AlunoNome = matricula.Aluno?.Nome ?? string.Empty,
            CursoTitulo = matricula.Curso?.Titulo ?? string.Empty,
            TurmaNome = matricula.Turma?.NomeTurma,
            NotaFinal = matricula.NotaFinal,
            EmitidoEm = matricula.CertificadoEmitidoEm ?? default
        };
    }
}
