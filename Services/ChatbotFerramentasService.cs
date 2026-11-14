using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ChatbotFerramentasService : IChatbotFerramentasService
{
    private const int LimiteResultadosCatalogo = 5;
    // Mesma lista de shared/catalogoVisibilidade.js (isCursoVisivelNoCatalogoPublico) -
    // reimplementada aqui porque o backend nao roda JS; se a lista la mudar, mudar aqui tambem.
    private static readonly HashSet<string> TitulosOcultosDoCatalogoPublico = new() { "product analytics para edtech" };

    private readonly PlataformaContext _context;
    private readonly IMatriculaService _matriculaService;
    private readonly IProgressoAlunoService _progressoAlunoService;
    private readonly IAvaliacaoService _avaliacaoService;
    private readonly ICertificadoService _certificadoService;
    private readonly IPagamentoService _pagamentoService;

    public ChatbotFerramentasService(
        PlataformaContext context,
        IMatriculaService matriculaService,
        IProgressoAlunoService progressoAlunoService,
        IAvaliacaoService avaliacaoService,
        ICertificadoService certificadoService,
        IPagamentoService pagamentoService)
    {
        _context = context;
        _matriculaService = matriculaService;
        _progressoAlunoService = progressoAlunoService;
        _avaliacaoService = avaliacaoService;
        _certificadoService = certificadoService;
        _pagamentoService = pagamentoService;
    }

    public async Task<IReadOnlyList<CursoDoAlunoFerramentaDto>> ObterMeusCursosAsync(int alunoId)
    {
        var matriculas = await _matriculaService.ListarMatriculasPorAlunoAsync(alunoId);
        var matriculasLista = matriculas.ToList();
        if (matriculasLista.Count == 0)
        {
            return Array.Empty<CursoDoAlunoFerramentaDto>();
        }

        // ListarMatriculasPorAlunoAsync so faz Include de Turma, nao de Curso -
        // busca os cursos direto pra nao depender de navegacao que nao vem carregada.
        var cursoIds = matriculasLista.Select(matricula => matricula.CursoId).Distinct().ToList();
        var cursosPorId = await _context.Cursos
            .AsNoTracking()
            .Where(curso => cursoIds.Contains(curso.Id))
            .ToDictionaryAsync(curso => curso.Id);

        var progressoPorCursoId = (await _progressoAlunoService.ObterSnapshotAsync(alunoId))
            .Cursos
            .ToDictionary(progresso => progresso.CursoId, progresso => progresso.PercentualConclusao);

        var pagamentos = await _pagamentoService.ListarPagamentosDoAlunoAsync(alunoId);
        var cursoIdsComPagamentoPendente = pagamentos
            .Where(pagamento => pagamento.Status == StatusPagamento.Pendente)
            .Select(pagamento => pagamento.CursoId)
            .ToHashSet();

        return matriculasLista
            .Select(matricula =>
            {
                var curso = cursosPorId.GetValueOrDefault(matricula.CursoId);
                return new CursoDoAlunoFerramentaDto
                {
                    CursoId = matricula.CursoId,
                    Titulo = curso?.Titulo ?? string.Empty,
                    Modelo = curso?.ModeloCurso.ToString() ?? string.Empty,
                    SituacaoMatricula = matricula.Status.ToString(),
                    PercentualProgresso = progressoPorCursoId.TryGetValue(matricula.CursoId, out var percentual) ? percentual : 0,
                    PagamentoPendente = cursoIdsComPagamentoPendente.Contains(matricula.CursoId)
                };
            })
            .ToList();
    }

    public async Task<ProgressoDoCursoFerramentaDto> ObterProgressoDoCursoAsync(int alunoId, int cursoId)
    {
        var matricula = await ObterMatriculaDoAlunoNoCursoAsync(alunoId, cursoId);
        var cursoTitulo = await _context.Cursos
            .AsNoTracking()
            .Where(curso => curso.Id == cursoId)
            .Select(curso => curso.Titulo)
            .FirstOrDefaultAsync() ?? string.Empty;

        var modulosDoCurso = await _context.Modulos
            .AsNoTracking()
            .Where(modulo => modulo.CursoId == cursoId)
            .OrderBy(modulo => modulo.DataCriacao)
            .Select(modulo => new { modulo.Id, modulo.Titulo })
            .ToListAsync();

        var progressoModulosPorModuloId = (await _progressoAlunoService.ObterSnapshotAsync(alunoId))
            .Modulos
            .Where(progresso => progresso.MatriculaId == matricula.Id)
            .ToDictionary(progresso => progresso.ModuloId);

        var modulosDto = new List<ModuloProgressoFerramentaDto>();
        var moduloAnteriorConcluido = true;
        foreach (var modulo in modulosDoCurso)
        {
            var progresso = progressoModulosPorModuloId.GetValueOrDefault(modulo.Id);
            var concluidos = progresso?.ConteudosConcluidos ?? 0;
            var total = progresso?.TotalConteudos ?? 0;

            modulosDto.Add(new ModuloProgressoFerramentaDto
            {
                ModuloId = modulo.Id,
                Titulo = modulo.Titulo,
                Liberado = moduloAnteriorConcluido,
                PercentualConclusao = progresso?.PercentualConclusao ?? 0,
                ConteudosConcluidos = concluidos,
                TotalConteudos = total
            });

            // Mesma regra sequencial de SecoesAluno.jsx: so libera o proximo
            // modulo quando TODOS os conteudos (sem contar quiz) deste foram
            // concluidos.
            moduloAnteriorConcluido = total > 0 && concluidos >= total;
        }

        return new ProgressoDoCursoFerramentaDto
        {
            CursoId = cursoId,
            CursoTitulo = cursoTitulo,
            Modulos = modulosDto
        };
    }

    public async Task<IReadOnlyList<SituacaoAvaliacaoFerramentaDto>> ObterSituacaoAvaliacoesAsync(int alunoId, int cursoId)
    {
        await ObterMatriculaDoAlunoNoCursoAsync(alunoId, cursoId);

        var avaliacoes = await _avaliacaoService.ListarAvaliacoesPorAlunoAsync(alunoId);

        return avaliacoes
            .Where(avaliacao => avaliacao.CursoId == cursoId)
            .Select(avaliacao => new SituacaoAvaliacaoFerramentaDto
            {
                AvaliacaoId = avaliacao.Id,
                Titulo = avaliacao.Titulo,
                Liberada = avaliacao.ProgressoLiberado,
                Motivo = avaliacao.ProgressoLiberado ? null : MontarMotivoBloqueio(avaliacao.ModuloId, avaliacao.ModuloTitulo),
                TentativasPermitidas = avaliacao.TentativasPermitidas,
                TentativasRealizadas = avaliacao.TentativasRealizadas,
                TentativasRestantes = avaliacao.TentativasRestantes,
                Prazo = avaliacao.DataFechamento,
                UltimaNota = avaliacao.UltimaNota
            })
            .ToList();
    }

    private static string MontarMotivoBloqueio(int? moduloId, string moduloTitulo)
    {
        return moduloId.HasValue
            ? $"Conclua 100% dos conteudos do modulo \"{moduloTitulo}\" para liberar esta avaliacao."
            : "Conclua 100% dos conteudos do curso e todos os quizzes de modulo para liberar esta avaliacao.";
    }

    public async Task<SituacaoCertificadoFerramentaDto> ObterSituacaoCertificadoAsync(int alunoId, int cursoId)
    {
        var statusDoAluno = await _certificadoService.ListarStatusCertificadosDoAlunoAsync(alunoId);
        var statusDoCurso = statusDoAluno.FirstOrDefault(status => status.Matricula.CursoId == cursoId)
            ?? throw new KeyNotFoundException("curso nao encontrado nas matriculas do aluno");

        return new SituacaoCertificadoFerramentaDto
        {
            CursoId = cursoId,
            Disponivel = statusDoCurso.CertificadoDisponivel,
            Pendencias = statusDoCurso.Pendencias.ToList()
        };
    }

    public async Task<IReadOnlyList<PagamentoFerramentaDto>> ObterMeusPagamentosAsync(int alunoId)
    {
        var pagamentos = await _pagamentoService.ListarPagamentosDoAlunoAsync(alunoId);

        return pagamentos
            .Select(pagamento => new PagamentoFerramentaDto
            {
                CursoId = pagamento.CursoId,
                CursoTitulo = pagamento.CursoTitulo,
                Valor = pagamento.Valor,
                Status = pagamento.Status.ToString(),
                DataCompra = pagamento.CriadoEm,
                DataPagamento = pagamento.PagoEm
            })
            .ToList();
    }

    public async Task<IReadOnlyList<CursoCatalogoFerramentaDto>> BuscarNoCatalogoAsync(string termo)
    {
        var termoNormalizado = (termo ?? string.Empty).Trim();

        var candidatos = await _context.Cursos
            .AsNoTracking()
            .Where(curso => termoNormalizado == string.Empty || curso.Titulo.Contains(termoNormalizado))
            .ToListAsync();

        return candidatos
            .Where(EhVisivelNoCatalogoPublico)
            .OrderBy(curso => curso.Titulo)
            .Take(LimiteResultadosCatalogo)
            .Select(curso => new CursoCatalogoFerramentaDto
            {
                CursoId = curso.Id,
                Titulo = curso.Titulo,
                Modelo = curso.ModeloCurso.ToString(),
                Preco = curso.Preco
            })
            .ToList();
    }

    // Reimplementacao em C# de shared/catalogoVisibilidade.js (isCursoVisivelNoCatalogoPublico) -
    // o backend nao roda JS, entao a regra e duplicada aqui de proposito. Se mudar la, mudar aqui.
    private static bool EhVisivelNoCatalogoPublico(Curso curso)
    {
        if (TitulosOcultosDoCatalogoPublico.Contains(curso.Titulo.Trim().ToLowerInvariant()))
        {
            return false;
        }

        if ((curso.ModeloCurso == ModeloCurso.Acompanhado || curso.ModeloCurso == ModeloCurso.Gratuito) && curso.EncerradoEm.HasValue)
        {
            return false;
        }

        if (curso.ModeloCurso == ModeloCurso.PagoPacote && !curso.PublicadoParaVendaEm.HasValue)
        {
            return false;
        }

        return true;
    }

    private async Task<Matricula> ObterMatriculaDoAlunoNoCursoAsync(int alunoId, int cursoId)
    {
        var matriculas = await _matriculaService.ListarMatriculasPorAlunoAsync(alunoId);
        return matriculas.FirstOrDefault(matricula => matricula.CursoId == cursoId)
            ?? throw new KeyNotFoundException("curso nao encontrado nas matriculas do aluno");
    }
}
