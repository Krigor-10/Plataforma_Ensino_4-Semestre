using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IModuloService
{
    Task<Modulo> CriarModuloAsync(Modulo modulo);
    Task<Modulo> ObterModuloPorIdAsync(int id);
    Task<IEnumerable<Modulo>> ListarModulosAsync();
    Task<IEnumerable<Modulo>> ListarModulosPorProfessorAsync(int professorId);
    Task<IEnumerable<Modulo>> ListarModulosPorAlunoAsync(int alunoId);
    Task<IEnumerable<Modulo>> ListarModulosPorCursoAsync(int cursoId);
    Task<Modulo> AtualizarModuloAsync(int id, string titulo);
    Task ExcluirModuloAsync(int id);

    /// <summary>
    /// Pre-checagem pra janela "Excluir modulo" (web) ja abrir sabendo se da pra
    /// excluir e, se nao, o motivo especifico - sem precisar que o usuario
    /// confirme a exclusao so pra descobrir.
    /// </summary>
    Task<BloqueiosExclusaoModulo> ObterBloqueiosExclusaoAsync(int id);

    /// <summary>Mesma mensagem usada na excecao de ExcluirModuloAsync, pra pre-checagem reaproveitar sem duplicar o texto.</summary>
    string MontarMensagemBloqueio(BloqueiosExclusaoModulo bloqueios);

    /// <summary>
    /// Contagem de conteudos didaticos por modulo, usada pra enriquecer listagens
    /// (ex.: tela de Modulos do Admin/Coordenador) sem expor o conteudo em si.
    /// </summary>
    Task<Dictionary<int, int>> ContarConteudosPorModuloAsync(IEnumerable<int> moduloIds);

    /// <summary>
    /// Contagem de avaliacoes vinculadas diretamente a cada modulo (ModuloId setado).
    /// </summary>
    Task<Dictionary<int, int>> ContarAvaliacoesPorModuloAsync(IEnumerable<int> moduloIds);
}
