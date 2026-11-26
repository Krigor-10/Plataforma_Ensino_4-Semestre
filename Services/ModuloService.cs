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
    private readonly ICursoService _cursoService;
    private readonly IProgressoAlunoService _progressoAlunoService;

    public ModuloService(
        IModuloRepository moduloRepository,
        IGenericRepository<Curso> cursoRepository,
        ICursoService cursoService,
        IProgressoAlunoService progressoAlunoService,
        PlataformaContext context)
    {
        _context = context;
        _moduloRepository = moduloRepository;
        _cursoRepository = cursoRepository;
        _cursoService = cursoService;
        _progressoAlunoService = progressoAlunoService;
    }

    public async Task<Modulo> CriarModuloAsync(Modulo modulo)
    {
        ArgumentNullException.ThrowIfNull(modulo);

        await ValidarCursoAsync(modulo.CursoId);
        await _cursoService.GarantirCursoAbertoParaEdicaoAsync(modulo.CursoId);
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
        await _cursoService.GarantirCursoAbertoParaEdicaoAsync(modulo.CursoId);

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

    public async Task<BloqueiosExclusaoModulo> ObterBloqueiosExclusaoAsync(int id)
    {
        _ = await _moduloRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");

        return await _moduloRepository.ObterBloqueiosExclusaoAsync(id);
    }

    public async Task ExcluirModuloAsync(int id)
    {
        var modulo = await _moduloRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
        await _cursoService.GarantirCursoAbertoParaEdicaoAsync(modulo.CursoId);

        var bloqueios = await _moduloRepository.ObterBloqueiosExclusaoAsync(id);
        if (!bloqueios.PodeExcluir)
        {
            throw new InvalidOperationException(MontarMensagemBloqueio(bloqueios));
        }

        // ProgressoModuloAluno -> Modulo e DeleteBehavior.Restrict (Data/
        // Configurations/ProgressoConfiguration.cs) - precisa sair antes do
        // modulo, na mesma transacao. So chega aqui com bloqueios.PodeExcluir
        // == true, ou seja, sem avanco real (0% automatico de todas as
        // matriculas, no maximo).
        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _moduloRepository.RemoverProgressosModuloAsync(id);
        _moduloRepository.Deletar(modulo);
        await _moduloRepository.SalvarAlteracoesAsync();

        await transaction.CommitAsync();

        await _progressoAlunoService.RecalcularProgressoDoCursoAsync(modulo.CursoId);
    }

    public string MontarMensagemBloqueio(BloqueiosExclusaoModulo bloqueios)
    {
        // Defesa: dado antigo/inesperado (nao deveria acontecer num modulo sem
        // conteudo nem quiz) - nunca apagar historico real de progresso.
        if (bloqueios.TemProgressoModuloComAvanco)
        {
            return "Ha progresso de alunos registrado neste modulo.";
        }

        if (bloqueios.TemNotasLancadas)
        {
            return "Nao e possivel excluir: ja existem notas lancadas neste modulo.";
        }

        if (bloqueios.TemProgressoConteudo)
        {
            return "Nao e possivel excluir: ha progresso de alunos registrado em conteudo deste modulo.";
        }

        var partes = new List<string>();
        AdicionarParte(partes, bloqueios.ConteudosAtivos, "conteudo", "conteudos");
        AdicionarParte(partes, bloqueios.QuizzesAtivos, "quiz", "quizzes");
        AdicionarParte(partes, bloqueios.AvaliacoesAtivas, "avaliacao", "avaliacoes");

        var partesArquivadas = new List<string>();
        AdicionarParte(partesArquivadas, bloqueios.ConteudosArquivados, "conteudo arquivado", "conteudos arquivados");
        AdicionarParte(partesArquivadas, bloqueios.QuizzesArquivados, "quiz arquivado", "quizzes arquivados");
        AdicionarParte(partesArquivadas, bloqueios.AvaliacoesArquivadas, "avaliacao arquivada", "avaliacoes arquivadas");

        var mensagem = $"Nao e possivel excluir: o modulo tem {JuntarComE(partes.Concat(partesArquivadas).ToList())}.";

        if (partesArquivadas.Count > 0)
        {
            mensagem += " Exclua ou restaure o item em 'Ver arquivados' antes.";
        }

        return mensagem;
    }

    private static void AdicionarParte(List<string> partes, int quantidade, string singular, string plural)
    {
        if (quantidade > 0)
        {
            partes.Add($"{quantidade} {(quantidade == 1 ? singular : plural)}");
        }
    }

    private static string JuntarComE(IReadOnlyList<string> partes)
    {
        if (partes.Count <= 1)
        {
            return partes.FirstOrDefault() ?? string.Empty;
        }

        return string.Join(", ", partes.Take(partes.Count - 1)) + " e " + partes[^1];
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
