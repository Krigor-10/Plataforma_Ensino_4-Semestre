using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/* Agrega Taxa de Adesao (volume de matriculas aprovadas) por CURSO no periodo
   informado, pro dashboard de Admin/Coordenador. Sem percentual de
   capacidade — o sistema nao impoe limite de vagas em lugar nenhum do fluxo
   de matricula, entao "adesao" aqui e ranking por volume de confirmadas, nao
   ocupacao de vagas. Mesmo estilo de CursoDesempenhoService: carrega as
   entidades ja filtradas por perfil e agrega com LINQ em memoria. */
public class TaxaAdesaoService : ITaxaAdesaoService
{
    private static readonly string[] NomesMesesPtBr =
    {
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    };

    private const int MaximoCursosNaEvolucao = 5;

    private readonly PlataformaContext _context;

    public TaxaAdesaoService(PlataformaContext context)
    {
        _context = context;
    }

    public Task<TaxaAdesaoResponseDto> ObterParaAdminAsync(DateTime dataInicio, DateTime dataFim, string agrupamento)
        => ObterInternoAsync(coordenadorId: null, dataInicio, dataFim, agrupamento);

    public Task<TaxaAdesaoResponseDto> ObterParaCoordenadorAsync(int coordenadorId, DateTime dataInicio, DateTime dataFim, string agrupamento)
        => ObterInternoAsync(coordenadorId, dataInicio, dataFim, agrupamento);

    private async Task<TaxaAdesaoResponseDto> ObterInternoAsync(int? coordenadorId, DateTime dataInicio, DateTime dataFim, string agrupamento)
    {
        if (dataFim < dataInicio)
        {
            throw new ArgumentException("A data final nao pode ser anterior a data inicial.");
        }

        var buckets = MontarBuckets(dataInicio.Date, dataFim.Date, NormalizarAgrupamento(agrupamento));

        var cursos = await _context.Cursos
            .AsNoTracking()
            .Where(curso => !coordenadorId.HasValue || curso.CoordenadorId == coordenadorId.Value)
            .ToListAsync();

        if (cursos.Count == 0)
        {
            return new TaxaAdesaoResponseDto
            {
                DataInicio = dataInicio.Date,
                DataFim = dataFim.Date,
                Agrupamento = NormalizarAgrupamento(agrupamento)
            };
        }

        var cursoIds = cursos.Select(curso => curso.Id).ToList();

        var dataFimExclusiva = dataFim.Date.AddDays(1);
        var matriculasConfirmadasDoPeriodo = await _context.Matriculas
            .AsNoTracking()
            .Where(matricula =>
                cursoIds.Contains(matricula.CursoId) &&
                matricula.Status == StatusMatricula.Aprovada &&
                matricula.DataSolicitacao >= dataInicio.Date &&
                matricula.DataSolicitacao < dataFimExclusiva)
            .Select(matricula => new { matricula.CursoId, matricula.DataSolicitacao })
            .ToListAsync();

        var matriculasPorCursoId = matriculasConfirmadasDoPeriodo
            .GroupBy(matricula => matricula.CursoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Select(matricula => matricula.DataSolicitacao).ToList());

        var comparadorPtBr = StringComparer.Create(new System.Globalization.CultureInfo("pt-BR"), ignoreCase: false);

        var ranking = cursos
            .Select(curso => new CursoTaxaAdesaoResponseDto
            {
                CursoId = curso.Id,
                CursoTitulo = curso.Titulo,
                MatriculasConfirmadas = matriculasPorCursoId.TryGetValue(curso.Id, out var datasDoCurso) ? datasDoCurso.Count : 0
            })
            .OrderByDescending(curso => curso.MatriculasConfirmadas)
            .ThenBy(curso => curso.CursoTitulo, comparadorPtBr)
            .ToList();

        var cursosParaEvolucao = ranking
            .Where(curso => curso.MatriculasConfirmadas > 0)
            .Take(MaximoCursosNaEvolucao)
            .ToList();

        var evolucao = cursosParaEvolucao
            .Select(cursoRanking => MontarEvolucaoCurso(cursoRanking, matriculasPorCursoId, buckets))
            .ToList();

        return new TaxaAdesaoResponseDto
        {
            DataInicio = dataInicio.Date,
            DataFim = dataFim.Date,
            Agrupamento = NormalizarAgrupamento(agrupamento),
            Ranking = ranking,
            Evolucao = evolucao,
            Destaque = ranking.FirstOrDefault(curso => curso.MatriculasConfirmadas > 0)
        };
    }

    private static EvolucaoCursoTaxaAdesaoResponseDto MontarEvolucaoCurso(
        CursoTaxaAdesaoResponseDto cursoRanking,
        Dictionary<int, List<DateTime>> matriculasPorCursoId,
        List<(DateTime Inicio, DateTime FimExclusivo, string Label)> buckets)
    {
        var datasDoCurso = matriculasPorCursoId.TryGetValue(cursoRanking.CursoId, out var lista)
            ? lista
            : new List<DateTime>();

        var pontos = buckets
            .Select(bucket => new PontoEvolucaoTaxaAdesaoResponseDto
            {
                PeriodoInicio = bucket.Inicio,
                PeriodoLabel = bucket.Label,
                MatriculasConfirmadas = datasDoCurso.Count(data => data >= bucket.Inicio && data < bucket.FimExclusivo)
            })
            .ToList();

        return new EvolucaoCursoTaxaAdesaoResponseDto
        {
            CursoId = cursoRanking.CursoId,
            CursoTitulo = cursoRanking.CursoTitulo,
            Pontos = pontos
        };
    }

    private static string NormalizarAgrupamento(string agrupamento)
    {
        var valor = (agrupamento ?? "mensal").Trim().ToLowerInvariant();
        if (valor is not ("mensal" or "trimestral" or "semestral"))
        {
            throw new ArgumentException("Agrupamento invalido. Use mensal, trimestral ou semestral.");
        }

        return valor;
    }

    private static List<(DateTime Inicio, DateTime FimExclusivo, string Label)> MontarBuckets(DateTime dataInicio, DateTime dataFim, string agrupamento)
    {
        var buckets = new List<(DateTime Inicio, DateTime FimExclusivo, string Label)>();

        switch (agrupamento)
        {
            case "trimestral":
                {
                    var cursor = new DateTime(dataInicio.Year, ((dataInicio.Month - 1) / 3) * 3 + 1, 1);
                    while (cursor <= dataFim)
                    {
                        var fimExclusivo = cursor.AddMonths(3);
                        var trimestre = (cursor.Month - 1) / 3 + 1;
                        buckets.Add((cursor, fimExclusivo, $"T{trimestre}/{cursor.Year}"));
                        cursor = fimExclusivo;
                    }

                    break;
                }
            case "semestral":
                {
                    var cursor = new DateTime(dataInicio.Year, dataInicio.Month <= 6 ? 1 : 7, 1);
                    while (cursor <= dataFim)
                    {
                        var fimExclusivo = cursor.AddMonths(6);
                        var semestre = cursor.Month <= 6 ? 1 : 2;
                        buckets.Add((cursor, fimExclusivo, $"S{semestre}/{cursor.Year}"));
                        cursor = fimExclusivo;
                    }

                    break;
                }
            default:
                {
                    var cursor = new DateTime(dataInicio.Year, dataInicio.Month, 1);
                    while (cursor <= dataFim)
                    {
                        var fimExclusivo = cursor.AddMonths(1);
                        buckets.Add((cursor, fimExclusivo, $"{NomesMesesPtBr[cursor.Month - 1]}/{cursor.Year}"));
                        cursor = fimExclusivo;
                    }

                    break;
                }
        }

        return buckets;
    }
}
