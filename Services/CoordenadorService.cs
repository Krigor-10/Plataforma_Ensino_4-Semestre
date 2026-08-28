using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class CoordenadorService : ICoordenadorService
{
    private readonly PlataformaContext _context;

    public CoordenadorService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Coordenador>> ListarCoordenadoresAsync()
    {
        return await _context.Coordenadores
            .AsNoTracking()
            .OrderBy(coordenador => coordenador.Nome)
            .ToListAsync();
    }

    public async Task<Coordenador> CriarCoordenadorAsync(CriarCoordenadorDto dto)
    {
        var emailNormalizado = dto.Email.Trim().ToLower();
        var cpfNormalizado = new string(dto.Cpf.Where(char.IsDigit).ToArray());

        if (await _context.Usuarios.AnyAsync(usuario => usuario.Email.ToLower() == emailNormalizado))
        {
            throw new ArgumentException("Ja existe um usuario com este e-mail.");
        }

        if (await _context.Usuarios.AnyAsync(usuario => usuario.Cpf == cpfNormalizado))
        {
            throw new ArgumentException("Ja existe um usuario com este CPF.");
        }

        var coordenador = new Coordenador
        {
            CodigoRegistro = await GerarCodigoCoordenadorAsync(),
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            Cpf = cpfNormalizado,
            Telefone = dto.Telefone.Trim(),
            Cep = dto.Cep.Trim(),
            Rua = dto.Rua.Trim(),
            Numero = dto.Numero.Trim(),
            Bairro = dto.Bairro.Trim(),
            Cidade = dto.Cidade.Trim(),
            Estado = dto.Estado.Trim().ToUpper()
        };
        coordenador.ConfigurarAcesso("Coordenador", BCrypt.Net.BCrypt.HashPassword(dto.Senha), dto.Ativo);

        _context.Coordenadores.Add(coordenador);
        await _context.SaveChangesAsync();

        return coordenador;
    }

    private Task<string> GerarCodigoCoordenadorAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarCoordenador,
            codigo => _context.Coordenadores.AnyAsync(coordenador => coordenador.CodigoRegistro == codigo),
            "o coordenador");
}
