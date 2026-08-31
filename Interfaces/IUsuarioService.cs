using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IUsuarioService
{
    Task<Usuario> ObterUsuarioPorIdAsync(int id);
    Task<IEnumerable<Usuario>> ListarTodosUsuariosAsync();
    Task EliminarUsuarioAsync(int id);
    Task<Usuario> AtualizarPerfilAsync(int usuarioId, AtualizarPerfilDto dto);
    Task TrocarSenhaAsync(int usuarioId, TrocarSenhaDto dto);
}
