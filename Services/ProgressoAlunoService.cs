using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ProgressoAlunoService : IProgressoAlunoService
{
    private readonly PlataformaContext _context;
    private readonly IAcessoAcademicoService _acessoAcademicoService;

    public ProgressoAlunoService(PlataformaContext context, IAcessoAcademicoService acessoAcademicoService)
    {
        _context = context;
        _acessoAcademicoService = acessoAcademicoService;
    }

    public async Task<ProgressoAlunoSnapshotDto> ObterSnapshotAsync(int alunoId)
    {
        await ValidarAlunoAsync(alunoId);

        // Curso pago so entra com pagamento confirmado (subquery correlacionada
        // em vez de reaproveitar IAcessoAcademicoService — EF Core nao traduz
        // chamada de metodo C# dentro de Where/Select pra SQL).
        var matriculaIds = await _context.Matriculas
            .AsNoTracking()
            .Where(matricula =>
                matricula.AlunoId == alunoId &&
                matricula.Status == StatusMatricula.Aprovada &&
                (matricula.Curso!.Preco <= 0 ||
                 _context.Pagamentos.Any(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago)))
            .Select(matricula => matricula.Id)
            .ToListAsync();

        if (matriculaIds.Count == 0)
        {
            return new ProgressoAlunoSnapshotDto();
        }

        var conteudos = await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
            .OrderBy(progresso => progresso.ModuloId)
            .ThenBy(progresso => progresso.ConteudoDidaticoId)
            .ToListAsync();

        var modulos = await _context.ProgressosModulosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
            .OrderBy(progresso => progresso.ModuloId)
            .ToListAsync();

        var cursos = await _context.ProgressosCursosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
            .OrderBy(progresso => progresso.CursoId)
            .ToListAsync();

        return new ProgressoAlunoSnapshotDto
        {
            Conteudos = conteudos.Select(MapConteudo).ToList(),
            Modulos = modulos.Select(MapModulo).ToList(),
            Cursos = cursos.Select(MapCurso).ToList()
        };
    }

    public async Task<ProgressoAlunoSnapshotDto> MarcarConteudoConcluidoAsync(int alunoId, int conteudoId)
    {
        await ValidarAlunoAsync(alunoId);

        var conteudo = await _context.ConteudosDidaticos
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == conteudoId && item.StatusPublicacao == StatusPublicacao.Publicado)
            ?? throw new KeyNotFoundException("Conteudo publicado nao encontrado.");

        var matricula = await _context.Matriculas
            .Include(item => item.Curso)
            .FirstOrDefaultAsync(item =>
                item.AlunoId == alunoId &&
                item.Status == StatusMatricula.Aprovada &&
                item.TurmaId.HasValue &&
                item.TurmaId == conteudo.TurmaId)
            ?? throw new InvalidOperationException("Este conteudo nao esta liberado para a matricula do aluno.");

        if (!await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula))
        {
            throw new InvalidOperationException("O pagamento deste curso ainda nao foi confirmado.");
        }

        var now = DateTime.UtcNow;
        var progresso = await _context.ProgressosConteudosAlunos
            .FirstOrDefaultAsync(item => item.MatriculaId == matricula.Id && item.ConteudoDidaticoId == conteudo.Id);

        if (progresso is null)
        {
            progresso = new ProgressoConteudoAluno
            {
                MatriculaId = matricula.Id,
                ConteudoDidaticoId = conteudo.Id,
                ModuloId = conteudo.ModuloId
            };

            _context.ProgressosConteudosAlunos.Add(progresso);
        }

        progresso.ModuloId = conteudo.ModuloId;
        progresso.StatusProgresso = StatusProgressoAprendizagem.Concluido;
        progresso.PercentualConclusao = 100;
        progresso.PrimeiroAcessoEm ??= now;
        progresso.UltimoAcessoEm = now;
        progresso.ConcluidoEm = now;

        await _context.SaveChangesAsync();

        await RecalcularModuloAsync(matricula, conteudo.ModuloId, now);
        await RecalcularCursoAsync(matricula, now);
        await _context.SaveChangesAsync();

        return await ObterSnapshotAsync(alunoId);
    }

    public async Task RecalcularNotaAvaliacaoAsync(int matriculaId, int avaliacaoId)
    {
        var avaliacao = await _context.Avaliacoes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == avaliacaoId)
            ?? throw new KeyNotFoundException("Avaliacao nao encontrada.");

        // Quiz e formativo (ver RecalcularProgressoQuizAsync) - nao gera lancamento
        // de nota. Guarda defensiva: quem envia respostas ja roteia por tipo antes
        // de chamar este metodo (AvaliacaoService.EnviarRespostasAlunoAsync).
        if (avaliacao.TipoAvaliacao == TipoAvaliacao.Quiz)
        {
            return;
        }

        var matricula = await _context.Matriculas
            .FirstOrDefaultAsync(item => item.Id == matriculaId)
            ?? throw new KeyNotFoundException("Matricula nao encontrada.");

        var tentativa = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Where(item =>
                item.AvaliacaoId == avaliacaoId &&
                item.MatriculaId == matriculaId &&
                item.StatusTentativa == StatusTentativaAvaliacao.Corrigida)
            .OrderByDescending(item => item.NumeroTentativa)
            .FirstOrDefaultAsync();

        if (tentativa is null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var lancamento = await _context.LancamentosNotasAlunos
            .FirstOrDefaultAsync(item => item.MatriculaId == matriculaId && item.AvaliacaoId == avaliacaoId);

        if (lancamento is null)
        {
            lancamento = new LancamentoNotaAluno
            {
                MatriculaId = matriculaId,
                AvaliacaoId = avaliacaoId,
                ModuloId = avaliacao.ModuloId,
                TentativaAvaliacaoId = tentativa.Id
            };

            _context.LancamentosNotasAlunos.Add(lancamento);
        }
        else
        {
            lancamento.TentativaAvaliacaoId = tentativa.Id;
        }

        lancamento.RegistrarCorrecao(tentativa.NotaBruta, avaliacao.PesoNota, OrigemCorrecaoNota.Automatica);
        lancamento.LiberarAoAluno(now);

        await _context.SaveChangesAsync();

        if (avaliacao.ModuloId.HasValue)
        {
            await RecalcularMediaModuloAsync(matricula, avaliacao.ModuloId.Value, now);
        }

        await RecalcularMediaCursoAsync(matricula, now);
        await _context.SaveChangesAsync();
    }

    public async Task RecalcularProgressoQuizAsync(int matriculaId, int avaliacaoId)
    {
        var avaliacao = await _context.Avaliacoes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == avaliacaoId)
            ?? throw new KeyNotFoundException("Avaliacao nao encontrada.");

        if (avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz)
        {
            return;
        }

        var matricula = await _context.Matriculas
            .FirstOrDefaultAsync(item => item.Id == matriculaId)
            ?? throw new KeyNotFoundException("Matricula nao encontrada.");

        var now = DateTime.UtcNow;

        if (avaliacao.ModuloId.HasValue)
        {
            await RecalcularModuloAsync(matricula, avaliacao.ModuloId.Value, now);
        }

        await RecalcularCursoAsync(matricula, now);
        await _context.SaveChangesAsync();
    }

    private async Task RecalcularMediaModuloAsync(Matricula matricula, int moduloId, DateTime now)
    {
        // Quiz nao entra na media - e atividade formativa (RecalcularProgressoQuizAsync
        // conta ele pro progresso, nao pra nota). So Prova/Exercicio geram nota.
        var avaliacoesModulo = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.TurmaId == matricula.TurmaId &&
                avaliacao.ModuloId == moduloId)
            .Select(avaliacao => new AvaliacaoNotaInfo(avaliacao.Id, avaliacao.NotaMaxima, avaliacao.PesoNota))
            .ToListAsync();

        var lancamentos = await ObterLancamentosAsync(matricula.Id, avaliacoesModulo);
        var media = CalcularMediaPonderada(avaliacoesModulo, lancamentos);

        var progressoModulo = await _context.ProgressosModulosAlunos
            .FirstOrDefaultAsync(progresso => progresso.MatriculaId == matricula.Id && progresso.ModuloId == moduloId);

        if (progressoModulo is null)
        {
            progressoModulo = new ProgressoModuloAluno
            {
                MatriculaId = matricula.Id,
                ModuloId = moduloId
            };

            _context.ProgressosModulosAlunos.Add(progressoModulo);
        }

        progressoModulo.AvaliacoesConcluidas = lancamentos.Count;
        progressoModulo.TotalAvaliacoes = avaliacoesModulo.Count;
        progressoModulo.MediaModulo = media;
        progressoModulo.AtualizadoEm = now;
    }

    private async Task RecalcularMediaCursoAsync(Matricula matricula, DateTime now)
    {
        // TurmaId ja garante o curso certo (uma turma pertence a um unico curso) —
        // nao filtra mais por Modulo.CursoId porque avaliacoes tipo Prova/Exercicio
        // podem ficar soltas direto no curso, sem modulo (ModuloId null). Quiz fica
        // fora da media - e atividade formativa (RecalcularProgressoQuizAsync).
        var avaliacoesCurso = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.TurmaId == matricula.TurmaId)
            .Select(avaliacao => new AvaliacaoNotaInfo(avaliacao.Id, avaliacao.NotaMaxima, avaliacao.PesoNota))
            .ToListAsync();

        var lancamentos = await ObterLancamentosAsync(matricula.Id, avaliacoesCurso);
        var media = CalcularMediaPonderada(avaliacoesCurso, lancamentos);

        var progressoCurso = await _context.ProgressosCursosAlunos
            .FirstOrDefaultAsync(progresso => progresso.MatriculaId == matricula.Id && progresso.CursoId == matricula.CursoId);

        if (progressoCurso is null)
        {
            progressoCurso = new ProgressoCursoAluno
            {
                MatriculaId = matricula.Id,
                CursoId = matricula.CursoId
            };

            _context.ProgressosCursosAlunos.Add(progressoCurso);
        }

        progressoCurso.MediaCurso = media;
        progressoCurso.AtualizadoEm = now;

        if (matricula.Status == StatusMatricula.Aprovada)
        {
            matricula.LancarNotaFinal(media);
        }
    }

    private async Task<List<LancamentoNotaAluno>> ObterLancamentosAsync(int matriculaId, IReadOnlyList<AvaliacaoNotaInfo> avaliacoes)
    {
        if (avaliacoes.Count == 0)
        {
            return new List<LancamentoNotaAluno>();
        }

        var avaliacaoIds = avaliacoes.Select(avaliacao => avaliacao.Id).ToList();
        return await _context.LancamentosNotasAlunos
            .AsNoTracking()
            .Where(lancamento => lancamento.MatriculaId == matriculaId && avaliacaoIds.Contains(lancamento.AvaliacaoId))
            .ToListAsync();
    }

    private static decimal CalcularMediaPonderada(IReadOnlyList<AvaliacaoNotaInfo> avaliacoes, IReadOnlyList<LancamentoNotaAluno> lancamentos)
    {
        var lancamentoPorAvaliacaoId = lancamentos.ToDictionary(lancamento => lancamento.AvaliacaoId);
        var somaPonderada = 0m;
        var somaPesos = 0m;

        foreach (var avaliacao in avaliacoes)
        {
            if (avaliacao.NotaMaxima <= 0 || !lancamentoPorAvaliacaoId.TryGetValue(avaliacao.Id, out var lancamento))
            {
                continue;
            }

            var proporcao = lancamento.NotaOficial / avaliacao.NotaMaxima;
            somaPonderada += proporcao * avaliacao.PesoNota;
            somaPesos += avaliacao.PesoNota;
        }

        if (somaPesos <= 0)
        {
            return 0;
        }

        return decimal.Round(somaPonderada / somaPesos * 10, 2, MidpointRounding.AwayFromZero);
    }

    private sealed record AvaliacaoNotaInfo(int Id, decimal NotaMaxima, decimal PesoNota);

    private async Task ValidarAlunoAsync(int alunoId)
    {
        var existe = await _context.Alunos
            .AsNoTracking()
            .AnyAsync(aluno => aluno.Id == alunoId);

        if (!existe)
        {
            throw new KeyNotFoundException("Aluno nao encontrado.");
        }
    }

    private async Task RecalcularModuloAsync(Matricula matricula, int moduloId, DateTime now)
    {
        var conteudosModulo = await _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo =>
                conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
                conteudo.TurmaId == matricula.TurmaId &&
                conteudo.ModuloId == moduloId)
            .Select(conteudo => new
            {
                conteudo.Id,
                conteudo.PesoProgresso
            })
            .ToListAsync();

        var conteudoIds = conteudosModulo.Select(conteudo => conteudo.Id).ToList();
        var conteudosConcluidosIds = await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso =>
                progresso.MatriculaId == matricula.Id &&
                conteudoIds.Contains(progresso.ConteudoDidaticoId) &&
                progresso.StatusProgresso == StatusProgressoAprendizagem.Concluido)
            .Select(progresso => progresso.ConteudoDidaticoId)
            .ToListAsync();

        var concluidos = conteudosConcluidosIds.ToHashSet();

        var (quizzesModulo, quizzesConcluidos) = await ObterQuizzesDoModuloAsync(matricula, moduloId);

        var pesoTotal = SomarPeso(conteudosModulo.Select(conteudo => conteudo.PesoProgresso)
            .Concat(quizzesModulo.Select(quiz => quiz.PesoProgresso)));
        var pesoConcluido = SomarPeso(conteudosModulo
            .Where(conteudo => concluidos.Contains(conteudo.Id))
            .Select(conteudo => conteudo.PesoProgresso)
            .Concat(quizzesModulo
                .Where(quiz => quizzesConcluidos.Contains(quiz.Id))
                .Select(quiz => quiz.PesoProgresso)));
        var percentual = CalcularPercentual(pesoConcluido, pesoTotal);

        var progressoModulo = await _context.ProgressosModulosAlunos
            .FirstOrDefaultAsync(progresso => progresso.MatriculaId == matricula.Id && progresso.ModuloId == moduloId);

        if (progressoModulo is null)
        {
            progressoModulo = new ProgressoModuloAluno
            {
                MatriculaId = matricula.Id,
                ModuloId = moduloId
            };

            _context.ProgressosModulosAlunos.Add(progressoModulo);
        }

        progressoModulo.StatusProgresso = DefinirStatus(percentual);
        progressoModulo.PercentualConclusao = percentual;
        progressoModulo.PesoConcluido = pesoConcluido;
        progressoModulo.PesoTotal = pesoTotal;
        progressoModulo.ConteudosConcluidos = concluidos.Count;
        progressoModulo.TotalConteudos = conteudosModulo.Count;
        progressoModulo.AtualizadoEm = now;
    }

    private async Task RecalcularCursoAsync(Matricula matricula, DateTime now)
    {
        var conteudosCurso = await _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo =>
                conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
                conteudo.TurmaId == matricula.TurmaId &&
                conteudo.Modulo != null &&
                conteudo.Modulo.CursoId == matricula.CursoId)
            .Select(conteudo => new
            {
                conteudo.Id,
                conteudo.ModuloId,
                conteudo.PesoProgresso
            })
            .ToListAsync();

        var conteudoIds = conteudosCurso.Select(conteudo => conteudo.Id).ToList();
        var conteudosConcluidosIds = await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso =>
                progresso.MatriculaId == matricula.Id &&
                conteudoIds.Contains(progresso.ConteudoDidaticoId) &&
                progresso.StatusProgresso == StatusProgressoAprendizagem.Concluido)
            .Select(progresso => progresso.ConteudoDidaticoId)
            .ToListAsync();

        var concluidos = conteudosConcluidosIds.ToHashSet();
        var modulosComConteudo = conteudosCurso
            .GroupBy(conteudo => conteudo.ModuloId)
            .ToList();
        var modulosConcluidos = modulosComConteudo.Count(grupo =>
            grupo.All(conteudo => concluidos.Contains(conteudo.Id)));

        var (quizzesCurso, quizzesConcluidos) = await ObterQuizzesDoCursoAsync(matricula);

        var pesoTotal = SomarPeso(conteudosCurso.Select(conteudo => conteudo.PesoProgresso)
            .Concat(quizzesCurso.Select(quiz => quiz.PesoProgresso)));
        var pesoConcluido = SomarPeso(conteudosCurso
            .Where(conteudo => concluidos.Contains(conteudo.Id))
            .Select(conteudo => conteudo.PesoProgresso)
            .Concat(quizzesCurso
                .Where(quiz => quizzesConcluidos.Contains(quiz.Id))
                .Select(quiz => quiz.PesoProgresso)));
        var percentual = CalcularPercentual(pesoConcluido, pesoTotal);

        var progressoCurso = await _context.ProgressosCursosAlunos
            .FirstOrDefaultAsync(progresso => progresso.MatriculaId == matricula.Id && progresso.CursoId == matricula.CursoId);

        if (progressoCurso is null)
        {
            progressoCurso = new ProgressoCursoAluno
            {
                MatriculaId = matricula.Id,
                CursoId = matricula.CursoId
            };

            _context.ProgressosCursosAlunos.Add(progressoCurso);
        }

        progressoCurso.StatusProgresso = DefinirStatus(percentual);
        progressoCurso.PercentualConclusao = percentual;
        progressoCurso.PesoConcluido = pesoConcluido;
        progressoCurso.PesoTotal = pesoTotal;
        progressoCurso.ModulosConcluidos = modulosConcluidos;
        progressoCurso.TotalModulos = modulosComConteudo.Count;
        progressoCurso.AtualizadoEm = now;
    }

    private async Task<(List<AvaliacaoProgressoInfo> Quizzes, HashSet<int> ConcluidosIds)> ObterQuizzesDoModuloAsync(Matricula matricula, int moduloId)
    {
        var quizzes = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao == TipoAvaliacao.Quiz &&
                avaliacao.TurmaId == matricula.TurmaId &&
                avaliacao.ModuloId == moduloId)
            .Select(avaliacao => new AvaliacaoProgressoInfo(avaliacao.Id, avaliacao.PesoProgresso))
            .ToListAsync();

        var concluidos = await ObterQuizzesConcluidosIdsAsync(matricula.Id, quizzes);
        return (quizzes, concluidos);
    }

    private async Task<(List<AvaliacaoProgressoInfo> Quizzes, HashSet<int> ConcluidosIds)> ObterQuizzesDoCursoAsync(Matricula matricula)
    {
        var quizzes = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao == TipoAvaliacao.Quiz &&
                avaliacao.TurmaId == matricula.TurmaId)
            .Select(avaliacao => new AvaliacaoProgressoInfo(avaliacao.Id, avaliacao.PesoProgresso))
            .ToListAsync();

        var concluidos = await ObterQuizzesConcluidosIdsAsync(matricula.Id, quizzes);
        return (quizzes, concluidos);
    }

    /// <summary>
    /// Quiz concluido = aluno enviou pelo menos uma tentativa (Enviada ou Corrigida).
    /// Como Quiz e formativo, a nota da tentativa nao importa aqui - so o fato de
    /// ter sido enviada (EmAndamento/Expirada nao contam como conclusao).
    /// </summary>
    private async Task<HashSet<int>> ObterQuizzesConcluidosIdsAsync(int matriculaId, IReadOnlyList<AvaliacaoProgressoInfo> quizzes)
    {
        if (quizzes.Count == 0)
        {
            return new HashSet<int>();
        }

        var quizIds = quizzes.Select(quiz => quiz.Id).ToList();
        var concluidos = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Where(tentativa =>
                tentativa.MatriculaId == matriculaId &&
                quizIds.Contains(tentativa.AvaliacaoId) &&
                tentativa.StatusTentativa != StatusTentativaAvaliacao.EmAndamento &&
                tentativa.StatusTentativa != StatusTentativaAvaliacao.Expirada)
            .Select(tentativa => tentativa.AvaliacaoId)
            .Distinct()
            .ToListAsync();

        return concluidos.ToHashSet();
    }

    private sealed record AvaliacaoProgressoInfo(int Id, decimal PesoProgresso);

    private static decimal SomarPeso(IEnumerable<decimal> pesos)
    {
        return decimal.Round(
            pesos.Sum(peso => peso > 0 ? peso : 0),
            2,
            MidpointRounding.AwayFromZero);
    }

    private static decimal CalcularPercentual(decimal pesoConcluido, decimal pesoTotal)
    {
        if (pesoTotal <= 0)
        {
            return 0;
        }

        var percentual = pesoConcluido / pesoTotal * 100;
        return decimal.Round(Math.Min(percentual, 100), 2, MidpointRounding.AwayFromZero);
    }

    private static StatusProgressoAprendizagem DefinirStatus(decimal percentual)
    {
        if (percentual >= 100)
        {
            return StatusProgressoAprendizagem.Concluido;
        }

        return percentual > 0
            ? StatusProgressoAprendizagem.EmAndamento
            : StatusProgressoAprendizagem.NaoIniciado;
    }

    private static ProgressoConteudoAlunoResponseDto MapConteudo(ProgressoConteudoAluno progresso)
    {
        return new ProgressoConteudoAlunoResponseDto
        {
            Id = progresso.Id,
            MatriculaId = progresso.MatriculaId,
            ConteudoDidaticoId = progresso.ConteudoDidaticoId,
            ModuloId = progresso.ModuloId,
            StatusProgresso = progresso.StatusProgresso,
            PercentualConclusao = progresso.PercentualConclusao,
            PrimeiroAcessoEm = progresso.PrimeiroAcessoEm,
            UltimoAcessoEm = progresso.UltimoAcessoEm,
            ConcluidoEm = progresso.ConcluidoEm
        };
    }

    private static ProgressoModuloAlunoResponseDto MapModulo(ProgressoModuloAluno progresso)
    {
        return new ProgressoModuloAlunoResponseDto
        {
            Id = progresso.Id,
            MatriculaId = progresso.MatriculaId,
            ModuloId = progresso.ModuloId,
            StatusProgresso = progresso.StatusProgresso,
            PercentualConclusao = progresso.PercentualConclusao,
            PesoConcluido = progresso.PesoConcluido,
            PesoTotal = progresso.PesoTotal,
            ConteudosConcluidos = progresso.ConteudosConcluidos,
            TotalConteudos = progresso.TotalConteudos,
            AvaliacoesConcluidas = progresso.AvaliacoesConcluidas,
            TotalAvaliacoes = progresso.TotalAvaliacoes,
            MediaModulo = progresso.MediaModulo,
            AtualizadoEm = progresso.AtualizadoEm
        };
    }

    private static ProgressoCursoAlunoResponseDto MapCurso(ProgressoCursoAluno progresso)
    {
        return new ProgressoCursoAlunoResponseDto
        {
            Id = progresso.Id,
            MatriculaId = progresso.MatriculaId,
            CursoId = progresso.CursoId,
            StatusProgresso = progresso.StatusProgresso,
            PercentualConclusao = progresso.PercentualConclusao,
            PesoConcluido = progresso.PesoConcluido,
            PesoTotal = progresso.PesoTotal,
            ModulosConcluidos = progresso.ModulosConcluidos,
            TotalModulos = progresso.TotalModulos,
            MediaCurso = progresso.MediaCurso,
            AtualizadoEm = progresso.AtualizadoEm
        };
    }
}
