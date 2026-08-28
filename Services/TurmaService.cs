using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
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
        return await _turmaRepository.ObterTodosAsync();
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
