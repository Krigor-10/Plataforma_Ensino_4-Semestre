using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class CursoService : ICursoService
{
    private readonly PlataformaContext _context;
    private readonly IGenericRepository<Curso> _cursoRepository;
    private readonly IGenericRepository<Coordenador> _coordenadorRepository;

    public CursoService(
        PlataformaContext context,
        IGenericRepository<Curso> cursoRepository,
        IGenericRepository<Coordenador> coordenadorRepository)
    {
        _context = context;
        _cursoRepository = cursoRepository;
        _coordenadorRepository = coordenadorRepository;
    }

    public async Task<Curso> CriarCursoAsync(CriarCursoDto dto, int criadoPorId)
    {
        var novoCurso = new Curso
        {
            Titulo = dto.Titulo.Trim(),
            Descricao = dto.Descricao?.Trim() ?? string.Empty,
            Preco = dto.Preco,
            CriadoPor = criadoPorId,
            CodigoRegistro = await GerarCodigoCursoAsync()
        };

        await _cursoRepository.AdicionarAsync(novoCurso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return novoCurso;
    }

    public async Task<Curso> ObterCursoPorIdAsync(int id)
    {
        return await _cursoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Curso não encontrado.");
    }

    public async Task<IEnumerable<Curso>> ListarTodosCursosAsync()
    {
        return await _cursoRepository.ObterTodosAsync();
    }

    public async Task<IEnumerable<Curso>> ListarCursosPorProfessorAsync(int professorId)
    {
        return await _context.Cursos
            .Where(curso => _context.Turmas.Any(turma =>
                turma.ProfessorId == professorId &&
                turma.CursoId == curso.Id))
            .OrderBy(curso => curso.Titulo)
            .ToListAsync();
    }

    public async Task AdicionarModuloAsync(int cursoId, Modulo novoModulo)
    {
        ArgumentNullException.ThrowIfNull(novoModulo);

        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado para adicionar o módulo.");

        novoModulo.CodigoRegistro = await GerarCodigoModuloAsync();
        curso.AdicionarModulo(novoModulo);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    public async Task AtribuirCoordenadorAsync(int cursoId, int coordenadorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (coordenadorId == 0)
        {
            curso.RemoverCoordenador();
            _cursoRepository.Atualizar(curso);
            await _cursoRepository.SalvarAlteracoesAsync();
            return;
        }

        var coordenador = await _coordenadorRepository.ObterPorIdAsync(coordenadorId)
            ?? throw new KeyNotFoundException("Coordenador não encontrado.");

        curso.AtribuirCoordenador(coordenador);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    public async Task<Curso> DefinirImagemAsync(int cursoId, string imagemUrl)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        curso.ImagemUrl = imagemUrl;
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return curso;
    }

    private Task<string> GerarCodigoCursoAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarCurso,
            codigo => _context.Cursos.AnyAsync(curso => curso.CodigoRegistro == codigo),
            "o curso");

    private Task<string> GerarCodigoModuloAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarModulo,
            codigo => _context.Modulos.AnyAsync(modulo => modulo.CodigoRegistro == codigo),
            "o modulo");
}
