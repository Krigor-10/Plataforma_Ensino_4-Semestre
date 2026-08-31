using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class TurmasController : ControllerBase
{
    private readonly ITurmaService _turmaService;

    public TurmasController(ITurmaService turmaService)
    {
        _turmaService = turmaService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> CriarTurma([FromBody] CriarTurmaDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var turma = new Turma
        {
            NomeTurma = dto.NomeTurma ?? string.Empty,
            CursoId = dto.CursoId,
            ProfessorId = dto.ProfessorId
        };

        var turmaCriada = await _turmaService.CriarTurmaAsync(turma);

        var response = new TurmaResponseDto
        {
            Id = turmaCriada.Id,
            CodigoRegistro = turmaCriada.CodigoRegistro,
            NomeTurma = turmaCriada.NomeTurma,
            DataCriacao = turmaCriada.DataCriacao,
            CursoId = turmaCriada.CursoId,
            ProfessorId = turmaCriada.ProfessorId
        };

        return CreatedAtAction(
            nameof(ObterTurmaPorId),
            new { id = response.Id },
            response);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObterTurmaPorId(int id)
    {
        var turma = await _turmaService.ObterTurmaPorIdAsync(id);

        var response = new TurmaResponseDto
        {
            Id = turma.Id,
            CodigoRegistro = turma.CodigoRegistro,
            NomeTurma = turma.NomeTurma,
            DataCriacao = turma.DataCriacao,
            CursoId = turma.CursoId,
            ProfessorId = turma.ProfessorId
        };

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> ListarTurmas()
    {
        var turmas = await _turmaService.ListarTurmasAsync();

        var response = turmas.Select(t => new TurmaResponseDto
        {
            Id = t.Id,
            CodigoRegistro = t.CodigoRegistro,
            NomeTurma = t.NomeTurma,
            DataCriacao = t.DataCriacao,
            CursoId = t.CursoId,
            ProfessorId = t.ProfessorId
        });

        return Ok(response);
    }

    [HttpGet("minhas")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarMinhasTurmas()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var turmas = await _turmaService.ListarTurmasPorProfessorAsync(professorId.Value);

        var response = turmas.Select(t => new TurmaResponseDto
        {
            Id = t.Id,
            CodigoRegistro = t.CodigoRegistro,
            NomeTurma = t.NomeTurma,
            DataCriacao = t.DataCriacao,
            CursoId = t.CursoId,
            ProfessorId = t.ProfessorId
        });

        return Ok(response);
    }

    [HttpPut("{id:int}/professor")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AtribuirProfessor(int id, [FromBody] int professorId)
    {
        await _turmaService.AtribuirProfessorAsync(id, professorId);
        return Ok(new { mensagem = "Professor atribuido a turma com sucesso." });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AtualizarNome(int id, [FromBody] string nomeTurma)
    {
        var turma = await _turmaService.AtualizarNomeTurmaAsync(id, nomeTurma);

        var response = new TurmaResponseDto
        {
            Id = turma.Id,
            CodigoRegistro = turma.CodigoRegistro,
            NomeTurma = turma.NomeTurma,
            DataCriacao = turma.DataCriacao,
            CursoId = turma.CursoId,
            ProfessorId = turma.ProfessorId
        };

        return Ok(response);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> ExcluirTurma(int id)
    {
        await _turmaService.ExcluirTurmaAsync(id);
        return NoContent();
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();
}
