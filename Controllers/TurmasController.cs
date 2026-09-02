using ClosedXML.Excel;
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
public class TurmasController : ControllerBase
{
    private readonly ITurmaService _turmaService;
    private readonly ICursoAutorizacaoService _cursoAutorizacaoService;

    public TurmasController(ITurmaService turmaService, ICursoAutorizacaoService cursoAutorizacaoService)
    {
        _turmaService = turmaService;
        _cursoAutorizacaoService = cursoAutorizacaoService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> CriarTurma([FromBody] CriarTurmaDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!await _cursoAutorizacaoService.PodeGerenciarCursoAsync(User, dto.CursoId))
        {
            return MensagemAcessoNegado();
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
            ProfessorId = t.ProfessorId,
            ProfessorNome = t.ProfessorResponsavel?.Nome
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

    [HttpGet("desempenho")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ObterDesempenho()
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var desempenho = await _turmaService.ObterDesempenhoPorProfessorAsync(professorId.Value);
        return Ok(desempenho);
    }

    [HttpGet("{id:int}/desempenho/exportar")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> ExportarDesempenho(int id)
    {
        var professorId = ObterProfessorId();
        if (!professorId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o professor autenticado." });
        }

        var desempenho = await _turmaService.ObterDesempenhoPorTurmaAsync(id, professorId.Value);
        var conteudo = GerarExcelDesempenho(desempenho);
        var nomeArquivo = MontarNomeArquivoDesempenho(desempenho);

        return File(conteudo, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nomeArquivo);
    }

    [HttpPut("{id:int}/professor")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AtribuirProfessor(int id, [FromBody] int professorId)
    {
        if (!await _cursoAutorizacaoService.PodeGerenciarTurmaAsync(User, id))
        {
            return MensagemAcessoNegado();
        }

        await _turmaService.AtribuirProfessorAsync(id, professorId);
        return Ok(new { mensagem = "Professor atribuido a turma com sucesso." });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Coordenador")]
    public async Task<IActionResult> AtualizarNome(int id, [FromBody] string nomeTurma)
    {
        if (!await _cursoAutorizacaoService.PodeGerenciarTurmaAsync(User, id))
        {
            return MensagemAcessoNegado();
        }

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
        if (!await _cursoAutorizacaoService.PodeGerenciarTurmaAsync(User, id))
        {
            return MensagemAcessoNegado();
        }

        await _turmaService.ExcluirTurmaAsync(id);
        return NoContent();
    }

    private int? ObterProfessorId() => User.ObterUsuarioId();

    private ObjectResult MensagemAcessoNegado() =>
        StatusCode(StatusCodes.Status403Forbidden, new { mensagem = "Voce nao tem permissao para gerenciar esta turma." });

    private static byte[] GerarExcelDesempenho(TurmaDesempenhoResponseDto desempenho)
    {
        using var pasta = new XLWorkbook();

        var planilhaAlunos = pasta.Worksheets.Add("Alunos");
        EscreverCabecalhoContexto(planilhaAlunos, desempenho);

        planilhaAlunos.Cell(4, 1).Value = "Nome";
        planilhaAlunos.Cell(4, 2).Value = "Status";
        planilhaAlunos.Cell(4, 3).Value = "Progresso (%)";
        planilhaAlunos.Cell(4, 4).Value = "Nota final";
        planilhaAlunos.Range(4, 1, 4, 4).Style.Font.SetBold();

        var linhaAluno = 5;
        foreach (var aluno in desempenho.Alunos)
        {
            planilhaAlunos.Cell(linhaAluno, 1).Value = aluno.Nome;
            planilhaAlunos.Cell(linhaAluno, 2).Value = aluno.Status.ToString();
            planilhaAlunos.Cell(linhaAluno, 3).Value = aluno.PercentualConclusao;
            planilhaAlunos.Cell(linhaAluno, 4).Value = aluno.NotaFinal;
            linhaAluno++;
        }

        planilhaAlunos.Columns(1, 4).AdjustToContents();

        var planilhaAvaliacoes = pasta.Worksheets.Add("Avaliacoes");
        EscreverCabecalhoContexto(planilhaAvaliacoes, desempenho);

        string[] colunasAvaliacao = ["Titulo", "Tipo", "Situacao", "Participantes", "Media", "Nota maxima", "Conclusao (%)", "Aproveitamento (%)"];
        for (var coluna = 0; coluna < colunasAvaliacao.Length; coluna++)
        {
            planilhaAvaliacoes.Cell(4, coluna + 1).Value = colunasAvaliacao[coluna];
        }
        planilhaAvaliacoes.Range(4, 1, 4, colunasAvaliacao.Length).Style.Font.SetBold();

        var linhaAvaliacao = 5;
        foreach (var avaliacao in desempenho.Avaliacoes)
        {
            planilhaAvaliacoes.Cell(linhaAvaliacao, 1).Value = avaliacao.Titulo;
            planilhaAvaliacoes.Cell(linhaAvaliacao, 2).Value = avaliacao.TipoAvaliacao.ToString();
            planilhaAvaliacoes.Cell(linhaAvaliacao, 3).Value = avaliacao.StatusPublicacao.ToString();
            planilhaAvaliacoes.Cell(linhaAvaliacao, 4).Value = avaliacao.TotalParticipantes;
            planilhaAvaliacoes.Cell(linhaAvaliacao, 5).Value = avaliacao.MediaNota;
            planilhaAvaliacoes.Cell(linhaAvaliacao, 6).Value = avaliacao.NotaMaxima;
            planilhaAvaliacoes.Cell(linhaAvaliacao, 7).Value = avaliacao.PercentualConclusao;
            planilhaAvaliacoes.Cell(linhaAvaliacao, 8).Value = avaliacao.PercentualAproveitamento;
            linhaAvaliacao++;
        }

        planilhaAvaliacoes.Columns(1, colunasAvaliacao.Length).AdjustToContents();

        using var stream = new MemoryStream();
        pasta.SaveAs(stream);
        return stream.ToArray();
    }

    private static void EscreverCabecalhoContexto(IXLWorksheet planilha, TurmaDesempenhoResponseDto desempenho)
    {
        planilha.Cell(1, 1).Value = "Curso:";
        planilha.Cell(1, 2).Value = desempenho.CursoTitulo;
        planilha.Cell(2, 1).Value = "Turma:";
        planilha.Cell(2, 2).Value = desempenho.NomeTurma;
        planilha.Range(1, 1, 2, 1).Style.Font.SetBold();
    }

    private static string MontarNomeArquivoDesempenho(TurmaDesempenhoResponseDto desempenho)
    {
        var baseNome = $"Desempenho_{desempenho.CursoTitulo}_{desempenho.NomeTurma}";
        var caracteresInvalidos = Path.GetInvalidFileNameChars();
        var nomeSanitizado = new string(baseNome.Select(caractere => caracteresInvalidos.Contains(caractere) ? '_' : caractere).ToArray());
        return $"{nomeSanitizado}.xlsx";
    }
}
