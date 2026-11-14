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
public class ChamadosController : ControllerBase
{
    private readonly IChamadoSuporteService _chamadoSuporteService;

    public ChamadosController(IChamadoSuporteService chamadoSuporteService)
    {
        _chamadoSuporteService = chamadoSuporteService;
    }

    [HttpPost]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> Abrir([FromBody] AbrirChamadoDto dto, CancellationToken cancellationToken)
    {
        var alunoId = ObterUsuarioId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var chamado = await _chamadoSuporteService.AbrirAsync(alunoId.Value, dto, cancellationToken);
        return CreatedAtAction(nameof(ObterPorId), new { id = chamado.Id }, chamado);
    }

    [HttpGet("meus")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarMeus()
    {
        var alunoId = ObterUsuarioId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        return Ok(await _chamadoSuporteService.ListarMeusAsync(alunoId.Value));
    }

    // Compartilhada entre os 3 perfis - a checagem de posse (Aluno dono,
    // Coordenador do curso ou Admin) fica dentro do service.
    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObterPorId(int id)
    {
        return Ok(await _chamadoSuporteService.ObterPorIdAsync(id, User));
    }

    // Admin ve todos; Coordenador ve so os chamados dos cursos que coordena -
    // o service filtra pelo perfil de quem pediu.
    [HttpGet]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> Listar([FromQuery] StatusChamadoSuporte? status)
    {
        return Ok(await _chamadoSuporteService.ListarParaStaffAsync(User, status));
    }

    // Aluno dono responde e o chamado volta pra Aberto; Admin/Coordenador
    // responde e o chamado passa pra Respondido - a diferenca fica no service.
    [HttpPost("{id:int}/mensagens")]
    public async Task<IActionResult> Responder(int id, [FromBody] ResponderChamadoDto dto)
    {
        var chamado = await _chamadoSuporteService.ResponderAsync(id, User, dto);
        return Ok(chamado);
    }

    [HttpPost("{id:int}/resolver")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> Resolver(int id)
    {
        await _chamadoSuporteService.ResolverAsync(id, User);
        return NoContent();
    }

    [HttpPost("{id:int}/reabrir")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> Reabrir(int id)
    {
        var alunoId = ObterUsuarioId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        await _chamadoSuporteService.ReabrirAsync(id, alunoId.Value);
        return NoContent();
    }

    private int? ObterUsuarioId() => User.ObterUsuarioId();
}
