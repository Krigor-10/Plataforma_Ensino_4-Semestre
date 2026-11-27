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
   concluiram, com certificado, pendentes, receita, a receber, cancelados,
   tentativas de compra), em poucas consultas agrupadas - nao mexe em
   CursoDesempenhoService (usado por outras telas). */
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

        // Todos os pagamentos (qualquer status) das matriculas do periodo, numa
        // unica consulta - os campos de vendas (AReceber, Cancelados,
        // TentativasCompra, etc., PROMPT-agente-inscricoes-v3.md) derivam
        // todos daqui, sem round-trip extra por campo.
        var pagamentos = matriculaIds.Count == 0
            ? new List<PagamentoResumo>()
            : await _context.Pagamentos
                .AsNoTracking()
                .Where(pagamento => matriculaIds.Contains(pagamento.MatriculaId))
                .Select(pagamento => new PagamentoResumo(pagamento.MatriculaId, pagamento.Valor, pagamento.Status))
                .ToListAsync();

        var pagamentosPorMatriculaId = pagamentos.ToLookup(pagamento => pagamento.MatriculaId);

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
            var pagamentosDoCurso = matriculasDoCurso.SelectMany(matricula => pagamentosPorMatriculaId[matricula.Id]).ToList();

            var matriculaIdsComPago = pagamentosDoCurso.Where(pagamento => pagamento.Status == StatusPagamento.Pago).Select(pagamento => pagamento.MatriculaId).ToHashSet();
            var matriculaIdsComPendente = pagamentosDoCurso.Where(pagamento => pagamento.Status == StatusPagamento.Pendente).Select(pagamento => pagamento.MatriculaId).ToHashSet();
            var matriculaIdsComQualquerPagamento = pagamentosDoCurso.Select(pagamento => pagamento.MatriculaId).ToHashSet();

            var inscritas = matriculasDoCurso
                .Where(matricula => matricula.ValorNaMatricula <= 0 || matriculaIdsComPago.Contains(matricula.Id))
                .ToList();

            // "De curso pago" (prompt v3, item 5): curso Gratuito sempre fica
            // em 0/0 aqui, mesmo que por algum motivo tenha pagamento.
            var cursoEhPago = curso.ModeloCurso != ModeloCurso.Gratuito;
            var tentativasCompra = cursoEhPago ? matriculaIdsComQualquerPagamento.Count : 0;
            var compraram = cursoEhPago ? matriculaIdsComQualquerPagamento.Count(matriculaId => matriculaIdsComPago.Contains(matriculaId)) : 0;

            return new CursoInscricoesResponseDto
            {
                CursoId = curso.Id,
                Titulo = curso.Titulo,
                ImagemUrl = curso.ImagemUrl,
                ModeloCurso = curso.ModeloCurso,
                Situacao = curso.Situacao,
                Preco = curso.Preco,
                Inscritos = inscritas.Count,
                Comecaram = inscritas.Count(matricula => percentualPorMatriculaId.GetValueOrDefault(matricula.Id, 0) > 0),
                Concluiram = inscritas.Count(matricula => percentualPorMatriculaId.GetValueOrDefault(matricula.Id, 0) >= 100),
                ComCertificado = inscritas.Count(matricula => matricula.CertificadoEmitidoEm.HasValue),
                Pendentes = matriculasDoCurso.Count(matricula => matriculaIdsComPendente.Contains(matricula.Id)),
                Receita = receitaPorCursoId.GetValueOrDefault(curso.Id, 0m),
                AReceber = pagamentosDoCurso.Where(pagamento => pagamento.Status == StatusPagamento.Pendente).Sum(pagamento => pagamento.Valor),
                Cancelados = pagamentosDoCurso.Count(pagamento => pagamento.Status == StatusPagamento.Cancelado),
                ValorCancelado = pagamentosDoCurso.Where(pagamento => pagamento.Status == StatusPagamento.Cancelado).Sum(pagamento => pagamento.Valor),
                TentativasCompra = tentativasCompra,
                Compraram = compraram
            };
        })
        .OrderByDescending(item => item.Inscritos)
        .ToList();

        return resultado;
    }

    private sealed record PagamentoResumo(int MatriculaId, decimal Valor, StatusPagamento Status);

}
