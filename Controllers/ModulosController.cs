using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ModulosController : ControllerBase
{
    private readonly IModuloService _moduloService;
    private readonly ICursoAutorizacaoService _cursoAutorizacaoService;

    public ModulosController(IModuloService moduloService, ICursoAutorizacaoService cursoAutorizacaoService)
    {
        _moduloService = moduloService;
        _cursoAutorizacaoService = cursoAutorizacaoService;
    }

    [HttpGet]
    public async Task<IActionResult> ListarModulos()
    {
        var modulos = (await _moduloService.ListarModulosAsync()).ToList();
        var moduloIds = modulos.Select(modulo => modulo.Id);

        var totalConteudosPorModulo = await _moduloService.ContarConteudosPorModuloAsync(moduloIds);
        var totalAvaliacoesPorModulo = await _moduloService.ContarAvaliacoesPorModuloAsync(moduloIds);

        return Ok(modulos.Select(modulo => MapResponse(modulo, totalConteudosPorModulo, totalAvaliacoesPorModulo)));
    }

    [HttpGet("meus")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarMeusModulos()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var modulos = await _moduloService.ListarModulosPorProfessorAsync(professorId.Value);
        return Ok(modulos.Select(modulo => MapResponse(modulo)));
    }

    [HttpGet("aluno/{alunoId:int}")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarModulosDoAluno(int alunoId)
    {
        if (!UsuarioAtualPodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        var modulos = await _moduloService.ListarModulosPorAlunoAsync(alunoId);
        return Ok(modulos.Select(modulo => MapResponse(modulo)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObterModuloPorId(int id)
    {
        var modulo = await _moduloService.ObterModuloPorIdAsync(id);
        return Ok(MapResponse(modulo));
    }

    [HttpGet("curso/{cursoId:int}")]
    public async Task<IActionResult> ListarPorCurso(int cursoId)
    {
        var modulos = await _moduloService.ListarModulosPorCursoAsync(cursoId);
        return Ok(modulos.Select(modulo => MapResponse(modulo)));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> CriarModulo([FromBody] CriarModuloDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!await _cursoAutorizacaoService.PodeGerenciarCursoAsync(User, dto.CursoId))
        {
            return MensagemAcessoNegado();
        }

        var modulo = new Modulo
        {
            Titulo = dto.Titulo.Trim(),
            CursoId = dto.CursoId
        };

        var moduloCriado = await _moduloService.CriarModuloAsync(modulo);
        return CreatedAtAction(nameof(ObterModuloPorId), new { id = moduloCriado.Id }, MapResponse(moduloCriado));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AtualizarModulo(int id, [FromBody] AtualizarModuloDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!await _cursoAutorizacaoService.PodeGerenciarModuloAsync(User, id))
        {
            return MensagemAcessoNegado();
        }

        var modulo = await _moduloService.AtualizarModuloAsync(id, dto.Titulo);
        return Ok(MapResponse(modulo));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> ExcluirModulo(int id)
    {
        if (!await _cursoAutorizacaoService.PodeGerenciarModuloAsync(User, id))
        {
            return MensagemAcessoNegado();
        }

        await _moduloService.ExcluirModuloAsync(id);
        return NoContent();
    }

    private static ModuloResponseDto MapResponse(
        Modulo modulo,
        IReadOnlyDictionary<int, int>? totalConteudosPorModulo = null,
        IReadOnlyDictionary<int, int>? totalAvaliacoesPorModulo = null)
    {
        return new ModuloResponseDto
        {
            Id = modulo.Id,
            CodigoRegistro = modulo.CodigoRegistro,
            Titulo = modulo.Titulo,
            CursoId = modulo.CursoId,
            DataCriacao = modulo.DataCriacao,
            TotalConteudos = totalConteudosPorModulo?.GetValueOrDefault(modulo.Id) ?? 0,
            TotalAvaliacoes = totalAvaliacoesPorModulo?.GetValueOrDefault(modulo.Id) ?? 0
        };
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);

    private ObjectResult MensagemAcessoNegado() =>
        StatusCode(StatusCodes.Status403Forbidden, new { mensagem = "Voce nao tem permissao para gerenciar este modulo." });
}
