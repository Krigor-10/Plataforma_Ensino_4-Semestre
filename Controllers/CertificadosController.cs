using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
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

    [HttpGet("status")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarStatus()
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var status = await _certificadoService.ListarStatusCertificadosDoAlunoAsync(alunoId.Value);
        return Ok(status.Select(item => new StatusCertificadoMatriculaDto
        {
            MatriculaId = item.Matricula.Id,
            CursoId = item.Matricula.CursoId,
            CertificadoDisponivel = item.CertificadoDisponivel,
            PendenciasCertificado = item.Pendencias.ToList(),
            CertificadoEmitidoEm = item.Matricula.CertificadoEmitidoEm,
            CertificadoRevogadoEm = item.Matricula.CertificadoRevogadoEm,
            Situacao = item.Situacao
        }));
    }

    [HttpPost("matricula/{matriculaId:int}/revogar")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Revogar(int matriculaId, [FromBody] RevogarCertificadoDto dto)
    {
        var adminId = User.ObterUsuarioId();
        if (!adminId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o administrador autenticado." });
        }

        var matricula = await _certificadoService.RevogarCertificadoAsync(matriculaId, adminId.Value, dto?.Motivo ?? string.Empty);
        return Ok(MapResponse(matricula));
    }

    [HttpGet("verificar/{codigo}")]
    [AllowAnonymous]
    public async Task<IActionResult> Verificar(string codigo)
    {
        var matricula = await _certificadoService.ObterCertificadoPorCodigoAsync(codigo);
        return Ok(MapResponse(matricula));
    }

    private int? ObterAlunoId() => User.ObterUsuarioId();

    private static CertificadoResponseDto MapResponse(Matricula matricula)
    {
        return new CertificadoResponseDto
        {
            CodigoVerificacao = matricula.CodigoRegistro,
            // Dados congelados na emissao (decisao F2); o valor atual so entra
            // se faltar o congelado (nao deveria, a migration preenche os antigos).
            AlunoNome = matricula.NomeAlunoCertificado ?? matricula.Aluno?.Nome ?? string.Empty,
            CursoTitulo = matricula.TituloCursoCertificado ?? matricula.Curso?.Titulo ?? string.Empty,
            TurmaNome = matricula.NomeTurmaSnapshot,
            NotaFinal = matricula.NotaFinalCertificado ?? matricula.NotaFinal,
            EmitidoEm = matricula.CertificadoEmitidoEm ?? default,
            RevogadoEm = matricula.CertificadoRevogadoEm
        };
    }
}
