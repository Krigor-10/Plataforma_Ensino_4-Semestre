using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ModuloService : IModuloService
{
    private readonly PlataformaContext _context;
    private readonly IModuloRepository _moduloRepository;
    private readonly IGenericRepository<Curso> _cursoRepository;

    public ModuloService(
        IModuloRepository moduloRepository,
        IGenericRepository<Curso> cursoRepository,
        PlataformaContext context)
    {
        _context = context;
        _moduloRepository = moduloRepository;
        _cursoRepository = cursoRepository;
    }

    public async Task<Modulo> CriarModuloAsync(Modulo modulo)
    {
        ArgumentNullException.ThrowIfNull(modulo);

        await ValidarCursoAsync(modulo.CursoId);
        ValidarTitulo(modulo.Titulo);

        var existe = await _moduloRepository.ExisteModuloComMesmoTituloAsync(modulo.Titulo, modulo.CursoId);
        if (existe)
        {
            throw new InvalidOperationException("Ja existe um modulo com este titulo neste curso.");
        }

        modulo.CodigoRegistro = await GerarCodigoModuloAsync();

        await _moduloRepository.AdicionarAsync(modulo);
        await _moduloRepository.SalvarAlteracoesAsync();
        return modulo;
    }

    public async Task<Modulo> ObterModuloPorIdAsync(int id)
    {
        return await _moduloRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
    }

    public async Task<IEnumerable<Modulo>> ListarModulosAsync()
    {
        var modulos = await _moduloRepository.ObterTodosAsync();
        return modulos.OrderBy(modulo => modulo.CursoId).ThenBy(modulo => modulo.DataCriacao);
    }

    public async Task<IEnumerable<Modulo>> ListarModulosPorProfessorAsync(int professorId)
    {
        return await _moduloRepository.ObterPorProfessorAsync(professorId);
    }

    public async Task<IEnumerable<Modulo>> ListarModulosPorAlunoAsync(int alunoId)
    {
        await ValidarAlunoAsync(alunoId);
        return await _moduloRepository.ObterPorAlunoAsync(alunoId);
    }

    public async Task<IEnumerable<Modulo>> ListarModulosPorCursoAsync(int cursoId)
    {
        await ValidarCursoAsync(cursoId);
        return await _moduloRepository.ObterPorCursoAsync(cursoId);
    }

    public async Task<Modulo> AtualizarModuloAsync(int id, string titulo)
    {
        var modulo = await _moduloRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");

        ValidarTitulo(titulo);

        var existe = await _moduloRepository.ExisteModuloComMesmoTituloAsync(titulo, modulo.CursoId, id);
        if (existe)
        {
            throw new InvalidOperationException("Ja existe um modulo com este titulo neste curso.");
        }

        modulo.AlterarTitulo(titulo.Trim());
        _moduloRepository.Atualizar(modulo);
        await _moduloRepository.SalvarAlteracoesAsync();
        return modulo;
    }

    public async Task ExcluirModuloAsync(int id)
    {
        var modulo = await _moduloRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");

        if (await _moduloRepository.PossuiDependenciasAsync(id))
        {
            throw new InvalidOperationException("Nao e possivel excluir o modulo porque ele ja possui dependencias academicas.");
        }

        _moduloRepository.Deletar(modulo);
        await _moduloRepository.SalvarAlteracoesAsync();
    }

    public async Task<Dictionary<int, int>> ContarConteudosPorModuloAsync(IEnumerable<int> moduloIds)
    {
        var ids = moduloIds.Distinct().ToList();

        return await _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(conteudo => ids.Contains(conteudo.ModuloId))
            .GroupBy(conteudo => conteudo.ModuloId)
            .Select(grupo => new { ModuloId = grupo.Key, Total = grupo.Count() })
            .ToDictionaryAsync(item => item.ModuloId, item => item.Total);
    }

    public async Task<Dictionary<int, int>> ContarAvaliacoesPorModuloAsync(IEnumerable<int> moduloIds)
    {
        var ids = moduloIds.Distinct().ToList();

        return await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao => avaliacao.ModuloId.HasValue && ids.Contains(avaliacao.ModuloId.Value))
            .GroupBy(avaliacao => avaliacao.ModuloId!.Value)
            .Select(grupo => new { ModuloId = grupo.Key, Total = grupo.Count() })
            .ToDictionaryAsync(item => item.ModuloId, item => item.Total);
    }

    private async Task ValidarCursoAsync(int cursoId)
    {
        _ = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso nao encontrado.");
    }

    private async Task ValidarAlunoAsync(int alunoId)
    {
        var existe = await _context.Alunos.AsNoTracking().AnyAsync(aluno => aluno.Id == alunoId);
        if (!existe)
        {
            throw new KeyNotFoundException("Aluno nao encontrado.");
        }
    }

    private static void ValidarTitulo(string titulo)
    {
        if (string.IsNullOrWhiteSpace(titulo))
        {
            throw new ArgumentException("O titulo do modulo e obrigatorio.");
        }
    }

    private Task<string> GerarCodigoModuloAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarModulo,
            codigo => _context.Modulos.AnyAsync(modulo => modulo.CodigoRegistro == codigo),
            "o modulo");
}
