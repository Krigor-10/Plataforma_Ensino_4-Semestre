using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/* Tela "Inscricoes" do Admin (PROMPT-agente-tela-inscricoes.md): desde que
   nao existe mais aprovacao manual de matricula, a antiga tela "Matriculas"
   ficou sem funcao (matricula aprovada == aluno ativo sempre). Esse servico
   agrega por curso o funil de vendas/inscricao (inscritos, comecaram,
   concluiram, com certificado, pendentes, receita), em poucas consultas
   agrupadas - nao mexe em CursoDesempenhoService (usado por outras telas). */
public class CursoInscricoesService : ICursoInscricoesService
{
    private readonly PlataformaContext _context;

    public CursoInscricoesService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CursoInscricoesResponseDto>> ObterInscricoesAsync(DateTime? de, DateTime? ate)
    {
        var cursos = await _context.Cursos.AsNoTracking().ToListAsync();

        // Filtro de periodo pela data da INSCRICAO (DataSolicitacao) - "ate"
        // e inclusivo do dia inteiro (soma 1 dia e compara "<").
        var matriculasQuery = _context.Matriculas.AsNoTracking().Where(matricula => matricula.Status == StatusMatricula.Aprovada);
        if (de.HasValue)
        {
            matriculasQuery = matriculasQuery.Where(matricula => matricula.DataSolicitacao >= de.Value);
        }
        if (ate.HasValue)
        {
            var fimDoDia = ate.Value.Date.AddDays(1);
            matriculasQuery = matriculasQuery.Where(matricula => matricula.DataSolicitacao < fimDoDia);
        }

        var matriculas = await matriculasQuery
            .Select(matricula => new
            {
                matricula.Id,
                matricula.CursoId,
                matricula.ValorNaMatricula,
                matricula.CertificadoEmitidoEm
            })
            .ToListAsync();

        var matriculaIds = matriculas.Select(matricula => matricula.Id).ToList();

        // Mesma regra de acesso liberado de AcessoAcademicoService.MatriculaTemAcessoLiberado,
        // inline porque aqui ja vem de uma projecao (nao da entidade Matricula).
        var matriculaIdsComPagamentoPago = matriculaIds.Count == 0
            ? new HashSet<int>()
            : (await _context.Pagamentos
                .AsNoTracking()
                .Where(pagamento => matriculaIds.Contains(pagamento.MatriculaId) && pagamento.Status == StatusPagamento.Pago)
                .Select(pagamento => pagamento.MatriculaId)
                .ToListAsync())
                .ToHashSet();

        var matriculaIdsComPagamentoPendente = matriculaIds.Count == 0
            ? new HashSet<int>()
            : (await _context.Pagamentos
                .AsNoTracking()
                .Where(pagamento => matriculaIds.Contains(pagamento.MatriculaId) && pagamento.Status == StatusPagamento.Pendente)
                .Select(pagamento => pagamento.MatriculaId)
                .ToListAsync())
                .ToHashSet();

        var percentualPorMatriculaId = matriculaIds.Count == 0
            ? new Dictionary<int, decimal>()
            : await _context.ProgressosCursosAlunos
                .AsNoTracking()
                .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
                .ToDictionaryAsync(progresso => progresso.MatriculaId, progresso => progresso.PercentualConclusao);

        // Receita: filtro de periodo pelo PAGAMENTO (PagoEm), nao pela
        // inscricao - decisao explicita do prompt, diferente do resto.
        var receitaQuery = _context.Pagamentos.AsNoTracking().Where(pagamento => pagamento.Status == StatusPagamento.Pago);
        if (de.HasValue)
        {
            receitaQuery = receitaQuery.Where(pagamento => pagamento.PagoEm >= de.Value);
        }
        if (ate.HasValue)
        {
            var fimDoDia = ate.Value.Date.AddDays(1);
            receitaQuery = receitaQuery.Where(pagamento => pagamento.PagoEm < fimDoDia);
        }

        var receitaPorCursoId = await receitaQuery
            .Join(_context.Matriculas.AsNoTracking(), pagamento => pagamento.MatriculaId, matricula => matricula.Id, (pagamento, matricula) => new { pagamento.Valor, matricula.CursoId })
            .GroupBy(item => item.CursoId)
            .Select(grupo => new { CursoId = grupo.Key, Total = grupo.Sum(item => item.Valor) })
            .ToDictionaryAsync(item => item.CursoId, item => item.Total);

        var matriculasPorCursoId = matriculas.ToLookup(matricula => matricula.CursoId);

        var resultado = cursos.Select(curso =>
        {
            var matriculasDoCurso = matriculasPorCursoId[curso.Id].ToList();
            var inscritas = matriculasDoCurso
                .Where(matricula => matricula.ValorNaMatricula <= 0 || matriculaIdsComPagamentoPago.Contains(matricula.Id))
                .ToList();

            return new CursoInscricoesResponseDto
            {
                CursoId = curso.Id,
                Titulo = curso.Titulo,
                ImagemUrl = curso.ImagemUrl,
                ModeloCurso = curso.ModeloCurso,
                Situacao = DefinirSituacao(curso),
                Preco = curso.Preco,
                Inscritos = inscritas.Count,
                Comecaram = inscritas.Count(matricula => percentualPorMatriculaId.GetValueOrDefault(matricula.Id, 0) > 0),
                Concluiram = inscritas.Count(matricula => percentualPorMatriculaId.GetValueOrDefault(matricula.Id, 0) >= 100),
                ComCertificado = inscritas.Count(matricula => matricula.CertificadoEmitidoEm.HasValue),
                Pendentes = matriculasDoCurso.Count(matricula => matriculaIdsComPagamentoPendente.Contains(matricula.Id)),
                Receita = receitaPorCursoId.GetValueOrDefault(curso.Id, 0m)
            };
        })
        .OrderByDescending(item => item.Inscritos)
        .ToList();

        return resultado;
    }

    private static SituacaoCursoInscricoes DefinirSituacao(Curso curso)
    {
        if (curso.EncerradoEm.HasValue)
        {
            return SituacaoCursoInscricoes.Encerrado;
        }

        if (curso.ModeloCurso == ModeloCurso.PagoPacote && curso.PublicadoParaVendaEm.HasValue)
        {
            return SituacaoCursoInscricoes.AVenda;
        }

        if (curso.ConcluidoPeloProfessorEm.HasValue)
        {
            return SituacaoCursoInscricoes.AguardandoEncerramento;
        }

        return SituacaoCursoInscricoes.EmAndamento;
    }
}
