using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Contagens de tudo que prende a exclusao de um modulo (docs/TelaConteudosProfessor/
/// PROMPT-agente-excluir-modulo-vazio.md). Substitui o antigo PossuiDependenciasAsync
/// (so true/false) - aqui da pra montar uma mensagem especifica do que precisa sair
/// do caminho antes.
/// </summary>
public record BloqueiosExclusaoModulo(
    int ConteudosAtivos,
    int ConteudosArquivados,
    int QuizzesAtivos,
    int QuizzesArquivados,
    int AvaliacoesAtivas,
    int AvaliacoesArquivadas,
    bool TemNotasLancadas,
    bool TemProgressoConteudo,
    bool TemProgressoModuloComAvanco)
{
    public bool TemItemArquivado => ConteudosArquivados > 0 || QuizzesArquivados > 0 || AvaliacoesArquivadas > 0;

    public bool PodeExcluir =>
        ConteudosAtivos == 0 && ConteudosArquivados == 0 &&
        QuizzesAtivos == 0 && QuizzesArquivados == 0 &&
        AvaliacoesAtivas == 0 && AvaliacoesArquivadas == 0 &&
        !TemNotasLancadas && !TemProgressoConteudo && !TemProgressoModuloComAvanco;
}

public interface IModuloRepository : IGenericRepository<Modulo>
{
    Task<bool> ExisteModuloComMesmoTituloAsync(string titulo, int cursoId, int? ignorarId = null);
    Task<List<Modulo>> ObterPorCursoAsync(int cursoId);
    Task<List<Modulo>> ObterPorProfessorAsync(int professorId);
    Task<List<Modulo>> ObterPorAlunoAsync(int alunoId);
    Task<BloqueiosExclusaoModulo> ObterBloqueiosExclusaoAsync(int moduloId);
    Task RemoverProgressosModuloAsync(int moduloId);
}
