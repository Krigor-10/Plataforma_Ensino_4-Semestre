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

        // Conteudos reais do curso (nao a linha agregada ProgressoModuloAluno,
        // que so e criada/recalculada na 1a conclusao de um conteudo daquele
        // modulo - um modulo liberado mas nunca tocado aparecia como "0 de 0"
        // em vez do total real).
        var conteudosPorModulo = (await _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo =>
                conteudo.CursoId == cursoId &&
                conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
                conteudo.ExcluidoEm == null)
            .Select(conteudo => new { conteudo.Id, conteudo.ModuloId, conteudo.Titulo })
            .ToListAsync())
            .ToLookup(conteudo => conteudo.ModuloId);

        var concluidosIds = (await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso =>
                progresso.MatriculaId == matricula.Id &&
                progresso.StatusProgresso == StatusProgressoAprendizagem.Concluido)
            .Select(progresso => progresso.ConteudoDidaticoId)
            .ToListAsync())
            .ToHashSet();

        var modulosDto = new List<ModuloProgressoFerramentaDto>();
        var moduloAnteriorConcluido = true;
        foreach (var modulo in modulosDoCurso)
        {
            var conteudosModulo = conteudosPorModulo[modulo.Id].ToList();
            var pendentes = conteudosModulo.Where(conteudo => !concluidosIds.Contains(conteudo.Id)).Select(conteudo => conteudo.Titulo).ToList();
            var total = conteudosModulo.Count;
            var concluidos = total - pendentes.Count;
            var percentual = total > 0 ? decimal.Round((decimal)concluidos / total * 100, 2, MidpointRounding.AwayFromZero) : 0;

            modulosDto.Add(new ModuloProgressoFerramentaDto
            {
                ModuloId = modulo.Id,
                Titulo = modulo.Titulo,
                Liberado = moduloAnteriorConcluido,
                PercentualConclusao = percentual,
                ConteudosConcluidos = concluidos,
                TotalConteudos = total,
                ConteudosPendentes = pendentes
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
        var matricula = await ObterMatriculaDoAlunoNoCursoAsync(alunoId, cursoId);

        var avaliacoes = await _avaliacaoService.ListarAvaliacoesPorAlunoAsync(alunoId);
        var avaliacoesDoCurso = avaliacoes.Where(avaliacao => avaliacao.CursoId == cursoId).ToList();

        var resultado = new List<SituacaoAvaliacaoFerramentaDto>();
        foreach (var avaliacao in avaliacoesDoCurso)
        {
            var pendentes = new List<string>();
            string? motivo = null;

            if (!avaliacao.ProgressoLiberado)
            {
                // Quiz vinculado a um conteudo libera so com ESSE conteudo
                // (ordem estrita da trilha, ver LiberacaoAvaliacoesInfo). Lista
                // vazia aqui = o conteudo-pai saiu da trilha (excluido/
                // despublicado) e o quiz voltou pra regra do quiz solto.
                var pendentesDoConteudoPai = avaliacao.TipoAvaliacao == TipoAvaliacao.Quiz && avaliacao.ConteudoDidaticoId.HasValue
                    ? await ObterTitulosConteudosPendentesAsync(matricula.Id, cursoId, avaliacao.ModuloId, avaliacao.ConteudoDidaticoId)
                    : new List<string>();

                if (pendentesDoConteudoPai.Count > 0)
                {
                    pendentes = pendentesDoConteudoPai;
                    motivo = $"Conclua o conteudo \"{pendentesDoConteudoPai[0]}\" para liberar este quiz.";
                }
                else
                {
                    pendentes = await ObterTitulosConteudosPendentesAsync(matricula.Id, cursoId, avaliacao.ModuloId);
                    motivo = MontarMotivoBloqueio(avaliacao.ModuloId, avaliacao.ModuloTitulo, pendentes);
                }
            }

            resultado.Add(new SituacaoAvaliacaoFerramentaDto
            {
                AvaliacaoId = avaliacao.Id,
                Titulo = avaliacao.Titulo,
                Liberada = avaliacao.ProgressoLiberado,
                Motivo = motivo,
                ConteudosPendentes = pendentes,
                TentativasPermitidas = avaliacao.TentativasPermitidas,
                TentativasRealizadas = avaliacao.TentativasRealizadas,
                TentativasRestantes = avaliacao.TentativasRestantes,
                Prazo = avaliacao.DataFechamento,
                UltimaNota = avaliacao.UltimaNota
            });
        }

        return resultado;
    }

    private static string MontarMotivoBloqueio(int? moduloId, string moduloTitulo, List<string> conteudosPendentes)
    {
        var listaPendentes = conteudosPendentes.Count > 0 ? $" Falta concluir: {string.Join(", ", conteudosPendentes)}." : string.Empty;

        return moduloId.HasValue
            ? $"Conclua 100% dos conteudos do modulo \"{moduloTitulo}\" para liberar esta avaliacao.{listaPendentes}"
            : $"Conclua 100% dos conteudos do curso e todos os quizzes de modulo para liberar esta avaliacao.{listaPendentes}";
    }

    /// <summary>
    /// Titulos dos conteudos publicados ainda nao concluidos pelo aluno - do
    /// modulo especifico (avaliacao de modulo) ou do curso inteiro (prova/
    /// exercicio final, moduloId nulo), ou so do conteudo-pai de um quiz
    /// vinculado (conteudoDidaticoId). Usado so quando a avaliacao esta
    /// bloqueada, pra o assistente poder citar os conteudos pendentes pelo
    /// nome em vez de so uma contagem agregada.
    /// </summary>
    private async Task<List<string>> ObterTitulosConteudosPendentesAsync(
        int matriculaId,
        int cursoId,
        int? moduloId,
        int? conteudoDidaticoId = null)
    {
        var consulta = _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo =>
                conteudo.CursoId == cursoId &&
                conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
                conteudo.ExcluidoEm == null);

        if (conteudoDidaticoId.HasValue)
        {
            consulta = consulta.Where(conteudo => conteudo.Id == conteudoDidaticoId.Value);
        }
        else if (moduloId.HasValue)
        {
            consulta = consulta.Where(conteudo => conteudo.ModuloId == moduloId.Value);
        }

        var conteudos = await consulta.Select(conteudo => new { conteudo.Id, conteudo.Titulo }).ToListAsync();
        if (conteudos.Count == 0)
        {
            return new List<string>();
        }

        var conteudoIds = conteudos.Select(conteudo => conteudo.Id).ToList();
        var concluidosIds = (await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso =>
                progresso.MatriculaId == matriculaId &&
                conteudoIds.Contains(progresso.ConteudoDidaticoId) &&
                progresso.StatusProgresso == StatusProgressoAprendizagem.Concluido)
            .Select(progresso => progresso.ConteudoDidaticoId)
            .ToListAsync())
            .ToHashSet();

        return conteudos
            .Where(conteudo => !concluidosIds.Contains(conteudo.Id))
            .Select(conteudo => conteudo.Titulo)
            .ToList();
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

        // Mesma regra do catalogo (Curso.DisponivelParaNovosAlunos, decisao D3).
        return curso.DisponivelParaNovosAlunos;
    }

    private async Task<Matricula> ObterMatriculaDoAlunoNoCursoAsync(int alunoId, int cursoId)
    {
        var matriculas = await _matriculaService.ListarMatriculasPorAlunoAsync(alunoId);
        return matriculas.FirstOrDefault(matricula => matricula.CursoId == cursoId)
            ?? throw new KeyNotFoundException("curso nao encontrado nas matriculas do aluno");
    }
}
