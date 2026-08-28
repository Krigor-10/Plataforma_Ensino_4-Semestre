using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CursosController : ControllerBase
{
    private readonly ICursoService _cursoService;
    private readonly IArmazenamentoArquivoService _armazenamentoService;

    public CursosController(ICursoService cursoService, IArmazenamentoArquivoService armazenamentoService)
    {
        _cursoService = cursoService;
        _armazenamentoService = armazenamentoService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> CriarCurso([FromBody] Curso curso)
    {
        var novoCurso = await _cursoService.CriarCursoAsync(curso);
        return CreatedAtAction(nameof(ObterCursoPorId), new { id = novoCurso.Id }, novoCurso);
    }

    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        var cursos = await _cursoService.ListarTodosCursosAsync();
        return Ok(cursos);
    }

    [HttpGet("meus")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarMeusCursos()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var cursos = await _cursoService.ListarCursosPorProfessorAsync(professorId.Value);
        return Ok(cursos);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObterCursoPorId(int id)
    {
        var curso = await _cursoService.ObterCursoPorIdAsync(id);
        return Ok(curso);
    }

    [HttpPut("{id:int}/coordenador")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AtribuirCoordenador(int id, [FromBody] int coordenadorId)
    {
        await _cursoService.AtribuirCoordenadorAsync(id, coordenadorId);
        return Ok(new
        {
            mensagem = coordenadorId == 0
                ? "Curso marcado como aguardando coordenador."
                : "Coordenador atribuido ao curso com sucesso."
        });
    }

    [HttpPost("{id:int}/imagem")]
    [Authorize(Roles = "Admin,Coordenador")]
    [RequestSizeLimit(6_000_000)]
    public async Task<IActionResult> EnviarImagemCurso(int id, [FromForm] IFormFile imagem)
    {
        var imagemUrl = await _armazenamentoService.SalvarArquivoAsync(
            imagem,
            "cursos",
            new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" },
            5_000_000L);

        var cursoAtualizado = await _cursoService.DefinirImagemAsync(id, imagemUrl);
        return Ok(cursoAtualizado);
    }

    private int? ObterProfessorId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("usuarioId");
        return int.TryParse(rawId, out var professorId) ? professorId : null;
    }
}
