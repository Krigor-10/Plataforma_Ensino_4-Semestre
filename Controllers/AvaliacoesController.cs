using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;

namespace PlataformaEnsino.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
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
        return Ok(avaliacoes.Select(avaliacao => avaliacao.ParaResponseDto()));
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
        return Ok(avaliacao.ParaResponseDto());
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
        return CreatedAtAction(nameof(ObterAvaliacaoPorId), new { id = avaliacao.Id }, avaliacao.ParaResponseDto());
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
        return Ok(avaliacao.ParaResponseDto());
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

        var foiArquivada = await _avaliacaoService.ExcluirAvaliacaoAsync(id, professorId.Value);
        if (foiArquivada)
        {
            return Ok(new
            {
                arquivado = true,
                mensagem = "Esta avaliacao ja tem tentativa de aluno registrada, por isso foi arquivada em vez de excluida definitivamente."
            });
        }

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
        return Ok(questoes.Select(questao => questao.ParaResponseDto()));
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
        return CreatedAtAction(nameof(ListarQuestoes), new { id }, questao.ParaResponseDto());
    }

    // Uso principal: confirmar de uma vez as questoes revisadas no fluxo de geracao
    // por IA. Tudo-ou-nada - se qualquer questao falhar validacao, nenhuma e salva.
    [HttpPost("{id:int}/questoes/lote")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> AdicionarQuestoesEmLote(int id, [FromBody] CriarQuestoesEmLoteDto dto)
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

        var questoes = await _avaliacaoService.AdicionarQuestoesEmLoteAsync(id, professorId.Value, dto);
        return CreatedAtAction(nameof(ListarQuestoes), new { id }, questoes.Select(questao => questao.ParaResponseDto()));
    }

    [HttpPut("{id:int}/questoes/{questaoId:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> AtualizarQuestao(int id, int questaoId, [FromBody] AtualizarQuestaoAvaliacaoDto dto)
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

        var questao = await _avaliacaoService.AtualizarQuestaoAsync(id, questaoId, professorId.Value, dto);
        return Ok(questao.ParaResponseDto());
    }

    [HttpPut("{id:int}/questoes/ordem")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ReordenarQuestoes(int id, [FromBody] ReordenarQuestoesDto dto)
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

        await _avaliacaoService.ReordenarQuestoesAsync(id, professorId.Value, dto);
        return NoContent();
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

    [HttpGet("{id:int}/aluno/tentativas/{tentativaId:int}/revisao")]
    [Authorize(Roles = "Aluno")]
    public async Task<IActionResult> ObterRevisaoTentativa(int id, int tentativaId)
    {
        var alunoId = ObterAlunoId();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var revisao = await _avaliacaoService.ObterRevisaoTentativaAsync(tentativaId, alunoId.Value);
        if (revisao.AvaliacaoId != id)
        {
            return NotFound(new { mensagem = "Tentativa nao encontrada para esta avaliacao." });
        }

        return Ok(revisao);
    }

    // Gera um rascunho de questoes a partir de um PDF/DOCX - NADA aqui e persistido.
    // O professor revisa no frontend e so confirma via POST {id}/questoes/lote.
    [HttpPost("{id:int}/ia/gerar-questoes")]
    [Authorize(Roles = "Professor")]
    [EnableRateLimiting("ia-geracao")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> GerarQuestoesComIa(
        int id,
        [FromForm] IFormFile arquivo,
        [FromForm] int quantidadeQuestoes,
        [FromForm] byte dificuldade,
        [FromForm] string tiposPermitidos,
        [FromForm] string? assunto,
        CancellationToken cancellationToken)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        List<TipoQuestao> tipos;
        try
        {
            tipos = (tiposPermitidos ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(valor => Enum.Parse<TipoQuestao>(valor, ignoreCase: true))
                .Distinct()
                .ToList();
        }
        catch (ArgumentException)
        {
            return BadRequest(new { mensagem = "tiposPermitidos contem um tipo de questao invalido." });
        }

        if (tipos.Count == 0)
        {
            return BadRequest(new { mensagem = "Informe ao menos um tipo de questao permitido." });
        }

        if (tipos.Contains(TipoQuestao.Dissertativa))
        {
            return BadRequest(new { mensagem = AvaliacaoService.MensagemSomenteQuestoesObjetivas });
        }

        var configuracao = new GerarQuestoesIaRequestDto
        {
            QuantidadeQuestoes = quantidadeQuestoes,
            Dificuldade = dificuldade,
            TiposPermitidos = tipos,
            Assunto = assunto
        };

        if (!TryValidateModel(configuracao))
        {
            return BadRequest(ModelState);
        }

        var resultado = await _avaliacaoService.GerarQuestoesComIaAsync(id, professorId.Value, arquivo, configuracao, cancellationToken);

        return Ok(new
        {
            questoes = resultado.Questoes,
            avisos = resultado.Avisos,
            limitacaoDetectada = resultado.LimitacaoDetectada
        });
    }

    // Mesma geracao por IA de "{id}/ia/gerar-questoes", mas lendo de um
    // ConteudoDidatico ja cadastrado no curso em vez de exigir novo upload —
    // usado pelo fluxo "gerar quiz com IA a partir do material" em Conteudos.
    // NADA aqui e persistido; o professor revisa e confirma via POST {id}/questoes/lote.
    [HttpPost("{id:int}/ia/gerar-questoes-de-conteudo")]
    [Authorize(Roles = "Professor")]
    [EnableRateLimiting("ia-geracao")]
    public async Task<IActionResult> GerarQuestoesComIaDeConteudo(int id, [FromBody] GerarQuestoesDeConteudoRequestDto dto, CancellationToken cancellationToken)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        List<TipoQuestao> tipos;
        try
        {
            tipos = (dto.TiposPermitidos ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(valor => Enum.Parse<TipoQuestao>(valor, ignoreCase: true))
                .Distinct()
                .ToList();
        }
        catch (ArgumentException)
        {
            return BadRequest(new { mensagem = "tiposPermitidos contem um tipo de questao invalido." });
        }

        if (tipos.Count == 0)
        {
            return BadRequest(new { mensagem = "Informe ao menos um tipo de questao permitido." });
        }

        if (tipos.Contains(TipoQuestao.Dissertativa))
        {
            return BadRequest(new { mensagem = AvaliacaoService.MensagemSomenteQuestoesObjetivas });
        }

        var configuracao = new GerarQuestoesIaRequestDto
        {
            QuantidadeQuestoes = dto.QuantidadeQuestoes,
            Dificuldade = dto.Dificuldade,
            TiposPermitidos = tipos,
            Assunto = dto.Assunto
        };

        if (!TryValidateModel(configuracao))
        {
            return BadRequest(ModelState);
        }

        var resultado = await _avaliacaoService.GerarQuestoesComIaDeConteudoAsync(id, professorId.Value, dto.ConteudoDidaticoId, configuracao, cancellationToken);

        return Ok(new
        {
            questoes = resultado.Questoes,
            avisos = resultado.Avisos,
            limitacaoDetectada = resultado.LimitacaoDetectada
        });
    }

    [HttpPost("questoes-banco/{questaoBancoId:int}/anexos")]
    [Authorize(Roles = "Professor")]
    [RequestSizeLimit(105_000_000)]
    public async Task<IActionResult> AdicionarAnexoQuestao(int questaoBancoId, [FromForm] IFormFile arquivo, [FromForm] string titulo, [FromForm] TipoConteudoDidatico tipoAnexo)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var anexo = await _avaliacaoService.AdicionarAnexoQuestaoAsync(questaoBancoId, professorId.Value, arquivo, titulo, tipoAnexo);
        var response = new AnexoQuestaoBancoResponseDto
        {
            Id = anexo.Id,
            Titulo = anexo.Titulo,
            TipoAnexo = anexo.TipoAnexo,
            ArquivoUrl = anexo.ArquivoUrl,
            Ordem = anexo.Ordem
        };

        return Created($"/api/v1/avaliacoes/questoes-banco/{questaoBancoId}/anexos/{anexo.Id}", response);
    }

    [HttpDelete("questoes-banco/{questaoBancoId:int}/anexos/{anexoId:int}")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> RemoverAnexoQuestao(int questaoBancoId, int anexoId)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        await _avaliacaoService.RemoverAnexoQuestaoAsync(questaoBancoId, anexoId, professorId.Value);
        return NoContent();
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();

    private int? ObterAlunoId() => User.ObterUsuarioId();

    private bool UsuarioAtualPodeAcessarAluno(int alunoId) => User.PodeAcessarAluno(alunoId);
}
