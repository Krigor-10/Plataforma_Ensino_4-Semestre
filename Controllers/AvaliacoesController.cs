using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AvaliacoesController : ControllerBase
{
    private readonly IAvaliacaoService _avaliacaoService;

    public AvaliacoesController(IAvaliacaoService avaliacaoService)
    {
        _avaliacaoService = avaliacaoService;
    }

    [HttpGet]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarMinhasAvaliacoes()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var avaliacoes = await _avaliacaoService.ListarAvaliacoesPorProfessorAsync(professorId.Value);
        return Ok(avaliacoes.Select(MapResponse));
    }

    [HttpGet("aluno/{alunoId:int}")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarAvaliacoesDoAluno(int alunoId)
    {
        if (!UsuarioAtualPodeAcessarAluno(alunoId))
        {
            return Forbid();
        }

        var avaliacoes = await _avaliacaoService.ListarAvaliacoesPorAlunoAsync(alunoId);
        return Ok(avaliacoes);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ObterAvaliacaoPorId(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var avaliacao = await _avaliacaoService.ObterAvaliacaoPorProfessorAsync(id, professorId.Value);
        return Ok(MapResponse(avaliacao));
    }

    [HttpPost]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> CriarAvaliacao([FromBody] CriarAvaliacaoDto dto)
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

        var avaliacao = await _avaliacaoService.CriarAvaliacaoAsync(professorId.Value, dto);
        return CreatedAtAction(nameof(ObterAvaliacaoPorId), new { id = avaliacao.Id }, MapResponse(avaliacao));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> AtualizarAvaliacao(int id, [FromBody] AtualizarAvaliacaoDto dto)
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

        var avaliacao = await _avaliacaoService.AtualizarAvaliacaoAsync(id, professorId.Value, dto);
        return Ok(MapResponse(avaliacao));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ExcluirAvaliacao(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        await _avaliacaoService.ExcluirAvaliacaoAsync(id, professorId.Value);
        return NoContent();
    }

    [HttpGet("{id:int}/questoes")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ListarQuestoes(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var questoes = await _avaliacaoService.ListarQuestoesAsync(id, professorId.Value);
        return Ok(questoes.Select(MapQuestaoResponse));
    }

    [HttpGet("{id:int}/aluno/questoes")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ListarQuestoesDoAluno(int id)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var questoes = await _avaliacaoService.ListarQuestoesPorAlunoAsync(id, alunoId.Value);
        return Ok(questoes);
    }

    [HttpPost("{id:int}/questoes")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> AdicionarQuestao(int id, [FromBody] CriarQuestaoAvaliacaoDto dto)
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

        var questao = await _avaliacaoService.AdicionarQuestaoAsync(id, professorId.Value, dto);
        return CreatedAtAction(nameof(ListarQuestoes), new { id }, MapQuestaoResponse(questao));
    }

    [HttpDelete("{id:int}/questoes/{questaoId:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ExcluirQuestao(int id, int questaoId)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        await _avaliacaoService.ExcluirQuestaoAsync(id, questaoId, professorId.Value);
        return NoContent();
    }

    [HttpPost("{id:int}/aluno/respostas")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> EnviarRespostasDoAluno(int id, [FromBody] EnviarAvaliacaoAlunoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var tentativa = await _avaliacaoService.EnviarRespostasAlunoAsync(id, alunoId.Value, dto);
        return Ok(tentativa);
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();

    private int? ObterAlunoId() => User.ObterUsuarioId();

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);

    private static AvaliacaoResponseDto MapResponse(Avaliacao avaliacao)
    {
        return new AvaliacaoResponseDto
        {
            Id = avaliacao.Id,
            Titulo = avaliacao.Titulo,
            Descricao = avaliacao.Descricao,
            ProfessorAutorId = avaliacao.ProfessorAutorId,
            TurmaId = avaliacao.TurmaId,
            TurmaNome = avaliacao.Turma?.NomeTurma ?? string.Empty,
            CursoId = avaliacao.Modulo?.CursoId ?? avaliacao.Turma?.CursoId ?? 0,
            CursoTitulo = avaliacao.Modulo?.Curso?.Titulo ?? string.Empty,
            ModuloId = avaliacao.ModuloId,
            ModuloTitulo = avaliacao.Modulo?.Titulo ?? string.Empty,
            TipoAvaliacao = avaliacao.TipoAvaliacao,
            StatusPublicacao = avaliacao.StatusPublicacao,
            DataAbertura = avaliacao.DataAbertura,
            DataFechamento = avaliacao.DataFechamento,
            TentativasPermitidas = avaliacao.TentativasPermitidas,
            TempoLimiteMinutos = avaliacao.TempoLimiteMinutos,
            NotaMaxima = avaliacao.NotaMaxima,
            PesoNota = avaliacao.PesoNota,
            PesoProgresso = avaliacao.PesoProgresso,
            TotalQuestoes = avaliacao.Questoes?.Count ?? 0,
            PublicadoEm = avaliacao.PublicadoEm,
            CriadoEm = avaliacao.CriadoEm,
            AtualizadoEm = avaliacao.AtualizadoEm
        };
    }

    private static QuestaoAvaliacaoResponseDto MapQuestaoResponse(QuestaoPublicada questao)
    {
        return new QuestaoAvaliacaoResponseDto
        {
            Id = questao.Id,
            AvaliacaoId = questao.AvaliacaoId,
            QuestaoBancoId = questao.QuestaoBancoId,
            Ordem = questao.Ordem,
            Contexto = questao.ContextoSnapshot,
            Enunciado = questao.EnunciadoSnapshot,
            TipoQuestao = questao.TipoQuestao,
            Explicacao = questao.ExplicacaoSnapshot,
            Pontos = questao.Pontos,
            Alternativas = questao.Alternativas
                .OrderBy(alternativa => alternativa.Ordem)
                .Select(alternativa => new AlternativaAvaliacaoResponseDto
                {
                    Id = alternativa.Id,
                    Letra = alternativa.Letra,
                    Texto = alternativa.Texto,
                    EhCorreta = alternativa.EhCorreta,
                    Justificativa = alternativa.JustificativaSnapshot,
                    Ordem = alternativa.Ordem
                })
                .ToList()
        };
    }
}
