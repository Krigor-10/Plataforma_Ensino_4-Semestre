using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize]
public class MatriculasController : ControllerBase
{
    private readonly IMatriculaService _matriculaService;

    public MatriculasController(IMatriculaService matriculaService)
    {
        _matriculaService = matriculaService;
    }

    // Sem "pagina": retorna a lista completa (comportamento atual, sem quebrar clientes existentes).
    // Com "pagina": retorna so aquela pagina e expoe o total em X-Total-Count.
    [HttpGet]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<ActionResult<IEnumerable<MatriculaResponseDto>>> GetMatriculas([FromQuery] int? pagina, [FromQuery] int? tamanhoPagina)
    {
        var (itens, totalItens) = await _matriculaService.ListarMatriculasAsync(pagina, tamanhoPagina);

        if (pagina.HasValue)
        {
            Response.Headers["X-Total-Count"] = totalItens.ToString();
        }

        return Ok(itens.Select(MapResponse));
    }

    [HttpGet("pendentes")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> ListarPendentes()
    {
        var result = await _matriculaService.ListarMatriculasPendentesAsync();
        return Ok(result);
    }

    [HttpGet("aluno/{alunoId:int}")]
    public async Task<ActionResult<IEnumerable<MatriculaResponseDto>>> GetMatriculasPorAluno(int alunoId)
    {
        if (!UsuarioAtualPodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        var matriculas = await _matriculaService.ListarMatriculasPorAlunoAsync(alunoId);
        return Ok(matriculas.Select(MapResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MatriculaResponseDto>> GetMatriculaPorId(int id)
    {
        var matricula = await _matriculaService.ObterMatriculaPorIdAsync(id);

        if (!UsuarioAtualPodeAcessarAluno(matricula.AlunoId))
        {
            return Forbid();
        }

        return Ok(MapResponse(matricula));
    }

    [HttpPost]
    public async Task<ActionResult<MatriculaResponseDto>> PostMatricula([FromBody] MatriculaCriacaoDto request)
    {
        if (!UsuarioAtualPodeAcessarAluno(request.AlunoId))
        {
            return Forbid();
        }

        var matricula = await _matriculaService.MatricularComAprovacaoAutomaticaAsync(request.AlunoId, request.CursoId);
        return CreatedAtAction(nameof(GetMatriculaPorId), new { id = matricula.Id }, MapResponse(matricula));
    }

    [HttpPut("{id:int}/aprovar")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> Aprovar(int id, [FromBody] int turmaId)
    {
        await _matriculaService.AprovarMatriculaAsync(id, turmaId);
        return Ok(new { mensagem = "Matrícula aprovada com sucesso." });
    }

    [HttpPut("aprovar-lote")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AprovarLote([FromBody] AprovarMatriculasLoteRequestDto request)
    {
        var resultado = await _matriculaService.AprovarMatriculasAutomaticamenteAsync(request?.MatriculaIds ?? []);
        return Ok(resultado);
    }

    [HttpPut("{id:int}/rejeitar")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> Rejeitar(int id)
    {
        await _matriculaService.RejeitarMatriculaAsync(id);
        return Ok(new { mensagem = "Matrícula rejeitada com sucesso." });
    }

    [HttpPut("{id:int}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var matricula = await _matriculaService.ObterMatriculaPorIdAsync(id);

        if (!UsuarioAtualPodeAcessarAluno(matricula.AlunoId))
        {
            return Forbid();
        }

        await _matriculaService.CancelarMatriculaAsync(id);
        return Ok(new { mensagem = "Solicitacao de matricula cancelada com sucesso." });
    }

    [HttpPut("{id:int}/reabrir")]
    public async Task<IActionResult> Reabrir(int id)
    {
        var matricula = await _matriculaService.ObterMatriculaPorIdAsync(id);

        if (!UsuarioAtualPodeAcessarAluno(matricula.AlunoId))
        {
            return Forbid();
        }

        await _matriculaService.ReabrirMatriculaAsync(id);
        return Ok(new { mensagem = "Solicitacao de matricula reaberta com sucesso." });
    }

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);

    private static MatriculaResponseDto MapResponse(Matricula matricula) =>
        new MatriculaResponseDto
        {
            Id = matricula.Id,
            CodigoRegistro = matricula.CodigoRegistro,
            AlunoId = matricula.AlunoId,
            CursoId = matricula.CursoId,
            TurmaId = matricula.TurmaId,
            DataSolicitacao = matricula.DataSolicitacao,
            NotaFinal = matricula.NotaFinal,
            Status = matricula.Status
        };
}
