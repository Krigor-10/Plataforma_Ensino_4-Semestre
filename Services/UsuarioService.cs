using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class UsuarioService : IUsuarioService
{
    private readonly IGenericRepository<Usuario> _usuarioRepository;

    public UsuarioService(IGenericRepository<Usuario> usuarioRepository)
    {
        _usuarioRepository = usuarioRepository;
    }

    public async Task<Usuario> ObterUsuarioPorIdAsync(int id)
    {
        return await _usuarioRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Utilizador não encontrado.");
    }

    public async Task<IEnumerable<Usuario>> ListarTodosUsuariosAsync()
    {
        return await _usuarioRepository.ObterTodosAsync();
    }

    public async Task EliminarUsuarioAsync(int id)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Utilizador não encontrado.");

        _usuarioRepository.Deletar(usuario);
        await _usuarioRepository.SalvarAlteracoesAsync();
    }
}
