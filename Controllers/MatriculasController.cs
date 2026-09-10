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
    private readonly ICursoAutorizacaoService _cursoAutorizacaoService;

    public MatriculasController(IMatriculaService matriculaService, ICursoAutorizacaoService cursoAutorizacaoService)
    {
        _matriculaService = matriculaService;
        _cursoAutorizacaoService = cursoAutorizacaoService;
    }

    // Sem "pagina": retorna a lista completa (comportamento atual, sem quebrar clientes existentes).
    // Com "pagina": retorna so aquela pagina e expoe o total em X-Total-Count.
    // Coordenador so ve matriculas dos proprios cursos (CoordenadorId); Admin ve tudo.
    [HttpGet]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<ActionResult<IEnumerable<MatriculaResponseDto>>> GetMatriculas([FromQuery] int? pagina, [FromQuery] int? tamanhoPagina)
    {
        var (itens, totalItens) = await _matriculaService.ListarMatriculasAsync(pagina, tamanhoPagina, ObterCoordenadorIdParaFiltro());

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
        var result = await _matriculaService.ListarMatriculasPendentesAsync(ObterCoordenadorIdParaFiltro());
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
        if (!await UsuarioPodeGerenciarMatriculaAsync(id))
        {
            return MensagemAcessoNegado();
        }

        await _matriculaService.AprovarMatriculaAsync(id, turmaId);
        return Ok(new { mensagem = "Matrícula aprovada com sucesso." });
    }

    [HttpPut("aprovar-lote")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AprovarLote([FromBody] AprovarMatriculasLoteRequestDto request)
    {
        var idsSolicitados = (request?.MatriculaIds ?? []).Where(id => id > 0).Distinct().ToList();

        var idsAutorizados = new List<int>();
        var errosDeAutorizacao = new List<AprovacaoMatriculaErroDto>();

        foreach (var id in idsSolicitados)
        {
            var cursoId = await _matriculaService.ObterCursoIdDaMatriculaAsync(id);

            // Matricula inexistente (cursoId null) segue pro service sem checagem
            // de posse — o proprio service reporta "nao encontrada" no item.
            if (cursoId is null || await _cursoAutorizacaoService.PodeGerenciarCursoAsync(User, cursoId.Value))
            {
                idsAutorizados.Add(id);
            }
            else
            {
                errosDeAutorizacao.Add(new AprovacaoMatriculaErroDto
                {
                    MatriculaId = id,
                    CursoId = cursoId.Value,
                    Motivo = "Voce nao tem permissao para gerenciar esta matricula."
                });
            }
        }

        // Se sobrou pelo menos 1 id autorizado, deixa o service processar normalmente
        // (inclusive o caso de lista vazia -> ArgumentException -> 400, comportamento
        // preexistente). Se havia ids mas nenhum autorizado, nao chama o service com
        // lista vazia (viraria a mensagem generica de "selecione ao menos uma
        // matricula", confusa quando na verdade nenhuma era permitida).
        var resultado = idsAutorizados.Count > 0 || idsSolicitados.Count == 0
            ? await _matriculaService.AprovarMatriculasAutomaticamenteAsync(idsAutorizados)
            : new AprovacaoMatriculasLoteResultadoDto();

        resultado.Erros.AddRange(errosDeAutorizacao);
        resultado.TotalSolicitado = idsSolicitados.Count;

        return Ok(resultado);
    }

    [HttpPut("{id:int}/rejeitar")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> Rejeitar(int id)
    {
        if (!await UsuarioPodeGerenciarMatriculaAsync(id))
        {
            return MensagemAcessoNegado();
        }

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

    // Admin nao tem CoordenadorId proprio pra filtrar por, entao ve tudo (null = sem filtro).
    private int? ObterCoordenadorIdParaFiltro() => User.IsInRole("Admin") ? null : User.ObterUsuarioId();

    // Matricula inexistente (cursoId null) e deixada passar: o proprio service.AprovarMatriculaAsync/
    // RejeitarMatriculaAsync reporta o KeyNotFoundException -> 404, sem confundir com 403.
    private async Task<bool> UsuarioPodeGerenciarMatriculaAsync(int matriculaId)
    {
        var cursoId = await _matriculaService.ObterCursoIdDaMatriculaAsync(matriculaId);
        return cursoId is null || await _cursoAutorizacaoService.PodeGerenciarCursoAsync(User, cursoId.Value);
    }

    private ObjectResult MensagemAcessoNegado() =>
        StatusCode(StatusCodes.Status403Forbidden, new { mensagem = "Voce nao tem permissao para gerenciar esta matricula." });

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
