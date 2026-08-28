using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ConteudosDidaticosController : ControllerBase
{
    private readonly IConteudoDidaticoService _conteudoService;
    private readonly IArmazenamentoArquivoService _armazenamentoService;

    public ConteudosDidaticosController(IConteudoDidaticoService conteudoService, IArmazenamentoArquivoService armazenamentoService)
    {
        _conteudoService = conteudoService;
        _armazenamentoService = armazenamentoService;
    }

    [HttpGet]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarMeusConteudos()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var conteudos = await _conteudoService.ListarConteudosPorProfessorAsync(professorId.Value);
        return Ok(conteudos.Select(MapResponse));
    }

    [HttpGet("aluno/{alunoId:int}")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarConteudosDoAluno(int alunoId)
    {
        if (!UsuarioAtualPodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        var conteudos = await _conteudoService.ListarConteudosPorAlunoAsync(alunoId);
        return Ok(conteudos.Select(MapResponse));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ObterConteudoPorId(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var conteudo = await _conteudoService.ObterConteudoPorProfessorAsync(id, professorId.Value);
        return Ok(MapResponse(conteudo));
    }

    [HttpPost("arquivo")]
    [Authorize(Roles = "Professor")]
    [RequestSizeLimit(105_000_000)]
    public async Task<IActionResult> EnviarArquivo([FromForm] IFormFile arquivo, [FromForm] TipoConteudoDidatico tipoConteudo)
    {
        var (extensoesPermitidas, tamanhoMaximoBytes) = tipoConteudo switch
        {
            TipoConteudoDidatico.Imagem => (new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" }, 5_000_000L),
            TipoConteudoDidatico.Pdf => (new[] { ".pdf" }, 20_000_000L),
            TipoConteudoDidatico.Video => (new[] { ".mp4", ".webm", ".mov" }, 100_000_000L),
            _ => throw new ArgumentException("Tipo de conteudo nao aceita upload de arquivo.")
        };

        var arquivoUrl = await _armazenamentoService.SalvarArquivoAsync(arquivo, "conteudos", extensoesPermitidas, tamanhoMaximoBytes);
        return Ok(new { arquivoUrl });
    }

    [HttpPost]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> CriarConteudo([FromBody] CriarConteudoDidaticoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var conteudo = await _conteudoService.CriarConteudoAsync(professorId.Value, dto);
        return CreatedAtAction(nameof(ObterConteudoPorId), new { id = conteudo.Id }, MapResponse(conteudo));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> AtualizarConteudo(int id, [FromBody] AtualizarConteudoDidaticoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var conteudo = await _conteudoService.AtualizarConteudoAsync(id, professorId.Value, dto);
        return Ok(MapResponse(conteudo));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ExcluirConteudo(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        await _conteudoService.ExcluirConteudoAsync(id, professorId.Value);
        return NoContent();
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);

    private static ConteudoDidaticoResponseDto MapResponse(ConteudoDidatico conteudo)
    {
        return new ConteudoDidaticoResponseDto
        {
            Id = conteudo.Id,
            Titulo = conteudo.Titulo,
            Descricao = conteudo.Descricao,
            TipoConteudo = conteudo.TipoConteudo,
            CorpoTexto = conteudo.CorpoTexto,
            ArquivoUrl = conteudo.ArquivoUrl,
            LinkUrl = conteudo.LinkUrl,
            ProfessorAutorId = conteudo.ProfessorAutorId,
            TurmaId = conteudo.TurmaId,
            TurmaNome = conteudo.Turma?.NomeTurma ?? string.Empty,
            CursoId = conteudo.Modulo?.CursoId ?? conteudo.Turma?.CursoId ?? 0,
            CursoTitulo = conteudo.Modulo?.Curso?.Titulo ?? string.Empty,
            ModuloId = conteudo.ModuloId,
            ModuloTitulo = conteudo.Modulo?.Titulo ?? string.Empty,
            StatusPublicacao = conteudo.StatusPublicacao,
            OrdemExibicao = conteudo.OrdemExibicao,
            PesoProgresso = conteudo.PesoProgresso,
            PublicadoEm = conteudo.PublicadoEm,
            CriadoEm = conteudo.CriadoEm,
            AtualizadoEm = conteudo.AtualizadoEm
        };
    }
}
