using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class TurmaService : ITurmaService
{
    private readonly PlataformaContext _context;
    private readonly ITurmaRepository _turmaRepository;
    private readonly IGenericRepository<Professor> _professorRepository;

    public TurmaService(
        PlataformaContext context,
        ITurmaRepository turmaRepository,
        IGenericRepository<Professor> professorRepository)
    {
        _context = context;
        _turmaRepository = turmaRepository;
        _professorRepository = professorRepository;
    }

    public async Task<Turma> CriarTurmaAsync(Turma turma)
    {
        ArgumentNullException.ThrowIfNull(turma);

        if (turma.CursoId <= 0)
        {
            throw new ArgumentException("Selecione um curso valido.");
        }

        if (turma.ProfessorId <= 0)
        {
            throw new ArgumentException("Selecione um professor valido.");
        }

        var curso = await _context.Cursos
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == turma.CursoId)
            ?? throw new KeyNotFoundException("Curso nao encontrado.");

        var professor = await _professorRepository.ObterPorIdAsync(turma.ProfessorId)
            ?? throw new KeyNotFoundException("Professor nao encontrado.");

        var turmaPadraoExistente = await _context.Turmas
            .AsNoTracking()
            .OrderBy(item => item.DataCriacao)
            .ThenBy(item => item.Id)
            .FirstOrDefaultAsync(item => item.CursoId == turma.CursoId);

        if (turmaPadraoExistente is not null)
        {
            throw new InvalidOperationException(
                "Este curso ja possui uma turma padrao. Use a turma existente para alterar professor ou acompanhar a operacao.");
        }

        turma.NomeTurma = MontarNomeTurmaPadrao(curso.Titulo);
        turma.DefinirProfessor(professor);
        turma.CodigoRegistro = await GerarCodigoTurmaAsync();

        await _turmaRepository.AdicionarAsync(turma);
        await _turmaRepository.SalvarAlteracoesAsync();

        return turma;
    }

    public async Task<Turma> ObterTurmaPorIdAsync(int id)
    {
        return await _turmaRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");
    }

    public async Task<IEnumerable<Turma>> ListarTurmasAsync()
    {
        return await _turmaRepository.ObterTodosComProfessorAsync();
    }

    public async Task<IEnumerable<Turma>> ListarTurmasPorProfessorAsync(int professorId)
    {
        return await _turmaRepository.ObterPorProfessorAsync(professorId);
    }

    public async Task AtribuirProfessorAsync(int turmaId, int professorId)
    {
        if (professorId <= 0)
        {
            throw new ArgumentException("Selecione um professor valido.");
        }

        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");

        var professor = await _professorRepository.ObterPorIdAsync(professorId)
            ?? throw new KeyNotFoundException("Professor nao encontrado.");

        turma.DefinirProfessor(professor);
        _turmaRepository.Atualizar(turma);
        await _turmaRepository.SalvarAlteracoesAsync();
    }

    public async Task<Turma> AtualizarNomeTurmaAsync(int turmaId, string nomeTurma)
    {
        if (string.IsNullOrWhiteSpace(nomeTurma))
        {
            throw new ArgumentException("Informe um nome valido para a turma.");
        }

        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");

        turma.NomeTurma = nomeTurma.Trim();
        _turmaRepository.Atualizar(turma);
        await _turmaRepository.SalvarAlteracoesAsync();

        return turma;
    }

    public async Task ExcluirTurmaAsync(int turmaId)
    {
        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");

        var possuiConteudoOuAvaliacao = await _context.ConteudosDidaticos.AnyAsync(conteudo => conteudo.TurmaId == turmaId)
            || await _context.Avaliacoes.AnyAsync(avaliacao => avaliacao.TurmaId == turmaId);

        if (possuiConteudoOuAvaliacao)
        {
            throw new InvalidOperationException("Nao e possivel excluir a turma pois ela possui conteudos ou avaliacoes vinculados.");
        }

        _turmaRepository.Deletar(turma);

        try
        {
            await _turmaRepository.SalvarAlteracoesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Nao e possivel excluir a turma pois ela possui matriculas vinculadas.");
        }
    }

    public async Task<IEnumerable<TurmaDesempenhoResponseDto>> ObterDesempenhoPorProfessorAsync(int professorId)
        => await ObterDesempenhoInternoAsync(professorId, null);

    public async Task<TurmaDesempenhoResponseDto> ObterDesempenhoPorTurmaAsync(int turmaId, int professorId)
    {
        var resultado = await ObterDesempenhoInternoAsync(professorId, turmaId);
        return resultado.FirstOrDefault()
            ?? throw new KeyNotFoundException("Turma nao encontrada.");
    }

    private async Task<IEnumerable<TurmaDesempenhoResponseDto>> ObterDesempenhoInternoAsync(int professorId, int? turmaIdFiltro)
    {
        var comparadorPtBr = StringComparer.Create(new CultureInfo("pt-BR"), false);

        var turmas = await _context.Turmas
            .AsNoTracking()
            .Where(turma => turma.ProfessorId == professorId && (!turmaIdFiltro.HasValue || turma.Id == turmaIdFiltro.Value))
            .Include(turma => turma.Curso)
            .ToListAsync();

        if (turmas.Count == 0)
        {
            return Enumerable.Empty<TurmaDesempenhoResponseDto>();
        }

        var turmaIds = turmas.Select(turma => turma.Id).ToList();

        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Where(matricula => matricula.TurmaId.HasValue && turmaIds.Contains(matricula.TurmaId.Value))
            .Include(matricula => matricula.Aluno)
            .ToListAsync();
        var matriculaIds = matriculas.Select(matricula => matricula.Id).ToList();
        var matriculasPorTurmaId = matriculas
            .GroupBy(matricula => matricula.TurmaId!.Value)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var progressoPorMatriculaId = await _context.ProgressosCursosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
            .ToDictionaryAsync(progresso => progresso.MatriculaId);

        var avaliacoes = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao => turmaIds.Contains(avaliacao.TurmaId))
            .ToListAsync();
        var avaliacaoIds = avaliacoes.Select(avaliacao => avaliacao.Id).ToList();
        var avaliacoesPorTurmaId = avaliacoes
            .GroupBy(avaliacao => avaliacao.TurmaId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var tentativasCorrigidas = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Where(tentativa => avaliacaoIds.Contains(tentativa.AvaliacaoId) && tentativa.StatusTentativa == StatusTentativaAvaliacao.Corrigida)
            .ToListAsync();

        var estatisticasPorAvaliacaoId = tentativasCorrigidas
            .GroupBy(tentativa => (tentativa.AvaliacaoId, tentativa.MatriculaId))
            .Select(grupo => grupo.OrderByDescending(item => item.NotaBruta).First())
            .GroupBy(tentativa => tentativa.AvaliacaoId)
            .ToDictionary(
                grupo => grupo.Key,
                grupo => (Participantes: grupo.Count(), MediaNota: grupo.Average(item => item.NotaBruta)));

        var resultado = new List<TurmaDesempenhoResponseDto>();

        foreach (var turma in turmas)
        {
            var matriculasDaTurma = matriculasPorTurmaId.TryGetValue(turma.Id, out var listaMatriculas)
                ? listaMatriculas
                : new List<Matricula>();

            var alunosDto = matriculasDaTurma
                .Select(matricula => new AlunoDesempenhoResponseDto
                {
                    MatriculaId = matricula.Id,
                    AlunoId = matricula.AlunoId,
                    Nome = matricula.Aluno?.Nome ?? $"Aluno #{matricula.AlunoId}",
                    Status = matricula.Status,
                    NotaFinal = matricula.NotaFinal,
                    PercentualConclusao = progressoPorMatriculaId.TryGetValue(matricula.Id, out var progresso)
                        ? progresso.PercentualConclusao
                        : 0
                })
                .OrderBy(aluno => aluno.Nome, comparadorPtBr)
                .ToList();

            var totalAlunos = alunosDto.Count;
            var alunosComNota = alunosDto.Where(aluno => aluno.NotaFinal > 0).ToList();
            var concluidos = alunosDto.Count(aluno => aluno.PercentualConclusao >= 100);

            var avaliacoesDaTurma = avaliacoesPorTurmaId.TryGetValue(turma.Id, out var listaAvaliacoes)
                ? listaAvaliacoes
                : new List<Avaliacao>();

            var avaliacoesDto = avaliacoesDaTurma
                .Select(avaliacao =>
                {
                    var estatistica = estatisticasPorAvaliacaoId.TryGetValue(avaliacao.Id, out var valor)
                        ? valor
                        : (Participantes: 0, MediaNota: 0m);

                    return new AvaliacaoDesempenhoResponseDto
                    {
                        AvaliacaoId = avaliacao.Id,
                        Titulo = avaliacao.Titulo,
                        TipoAvaliacao = avaliacao.TipoAvaliacao,
                        StatusPublicacao = avaliacao.StatusPublicacao,
                        TotalParticipantes = estatistica.Participantes,
                        MediaNota = Math.Round(estatistica.MediaNota, 2),
                        NotaMaxima = avaliacao.NotaMaxima,
                        PercentualConclusao = totalAlunos > 0
                            ? Math.Round((decimal)estatistica.Participantes / totalAlunos * 100, 1)
                            : 0,
                        PercentualAproveitamento = avaliacao.NotaMaxima > 0
                            ? Math.Round(estatistica.MediaNota / avaliacao.NotaMaxima * 100, 1)
                            : 0
                    };
                })
                .OrderBy(avaliacao => avaliacao.Titulo, comparadorPtBr)
                .ToList();

            resultado.Add(new TurmaDesempenhoResponseDto
            {
                TurmaId = turma.Id,
                NomeTurma = turma.NomeTurma,
                CursoId = turma.CursoId,
                CursoTitulo = turma.Curso?.Titulo ?? string.Empty,
                TotalAlunos = totalAlunos,
                AlunosAtivos = alunosDto.Count(aluno => aluno.Status == StatusMatricula.Aprovada),
                ProgressoMedio = totalAlunos > 0 ? Math.Round(alunosDto.Average(aluno => aluno.PercentualConclusao), 1) : 0,
                PercentualConclusao = totalAlunos > 0 ? Math.Round((decimal)concluidos / totalAlunos * 100, 1) : 0,
                DesempenhoMedio = alunosComNota.Count > 0 ? Math.Round(alunosComNota.Average(aluno => aluno.NotaFinal), 2) : 0,
                Alunos = alunosDto,
                Avaliacoes = avaliacoesDto
            });
        }

        return resultado
            .OrderBy(turma => turma.CursoTitulo, comparadorPtBr)
            .ToList();
    }

    private Task<string> GerarCodigoTurmaAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarTurma,
            codigo => _context.Turmas.AnyAsync(turma => turma.CodigoRegistro == codigo),
            "a turma");

    private static string MontarNomeTurmaPadrao(string tituloCurso)
    {
        var titulo = string.IsNullOrWhiteSpace(tituloCurso)
            ? "Curso"
            : tituloCurso.Trim();
        var nome = $"Turma online - {titulo}";

        return nome.Length <= 120
            ? nome
            : nome[..120].TrimEnd();
    }
}
