using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class UsuarioService : IUsuarioService
{
    private readonly IGenericRepository<Usuario> _usuarioRepository;
    private readonly PlataformaContext _context;

    public UsuarioService(IGenericRepository<Usuario> usuarioRepository, PlataformaContext context)
    {
        _usuarioRepository = usuarioRepository;
        _context = context;
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

    public async Task<Usuario> AtualizarPerfilAsync(int usuarioId, AtualizarPerfilDto dto)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId)
            ?? throw new KeyNotFoundException("Utilizador não encontrado.");

        var emailNormalizado = dto.Email.Trim().ToLower();
        var emailEmUso = await _context.Usuarios.AnyAsync(u => u.Email.ToLower() == emailNormalizado && u.Id != usuarioId);
        if (emailEmUso)
        {
            throw new ArgumentException("Ja existe um usuario com este e-mail.");
        }

        usuario.AlterarDados(
            dto.Nome.Trim(),
            emailNormalizado,
            dto.Telefone.Trim(),
            dto.Cep.Trim(),
            dto.Rua.Trim(),
            dto.Numero.Trim(),
            dto.Bairro.Trim(),
            dto.Cidade.Trim(),
            dto.Estado.Trim().ToUpper());

        _usuarioRepository.Atualizar(usuario);
        await _usuarioRepository.SalvarAlteracoesAsync();

        return usuario;
    }

    public async Task TrocarSenhaAsync(int usuarioId, TrocarSenhaDto dto)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId)
            ?? throw new KeyNotFoundException("Utilizador não encontrado.");

        if (!BCrypt.Net.BCrypt.Verify(dto.SenhaAtual, usuario.SenhaHash))
        {
            throw new ArgumentException("Senha atual incorreta.");
        }

        usuario.AtualizarSenhaHash(BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha));

        _usuarioRepository.Atualizar(usuario);
        await _usuarioRepository.SalvarAlteracoesAsync();
    }
}
