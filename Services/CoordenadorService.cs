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
        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf);

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

    public async Task<Coordenador> AtualizarCoordenadorAsync(int id, AtualizarCoordenadorDto dto)
    {
        var coordenador = await _context.Coordenadores.FirstOrDefaultAsync(coordenador => coordenador.Id == id)
            ?? throw new KeyNotFoundException("Coordenador nao encontrado.");

        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf, id);

        coordenador.AlterarDados(
            dto.Nome.Trim(),
            emailNormalizado,
            dto.Telefone.Trim(),
            dto.Cep.Trim(),
            dto.Rua.Trim(),
            dto.Numero.Trim(),
            dto.Bairro.Trim(),
            dto.Cidade.Trim(),
            dto.Estado.Trim().ToUpper());
        coordenador.Cpf = cpfNormalizado;

        if (dto.Ativo)
        {
            coordenador.Ativar();
        }
        else
        {
            coordenador.Desativar();
        }

        await _context.SaveChangesAsync();

        return coordenador;
    }

    public async Task ExcluirCoordenadorAsync(int id)
    {
        var coordenador = await _context.Coordenadores.FirstOrDefaultAsync(coordenador => coordenador.Id == id)
            ?? throw new KeyNotFoundException("Coordenador nao encontrado.");

        _context.Coordenadores.Remove(coordenador);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Nao e possivel excluir o coordenador pois ele esta vinculado a um ou mais cursos.");
        }
    }

    private Task<string> GerarCodigoCoordenadorAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarCoordenador,
            codigo => _context.Coordenadores.AnyAsync(coordenador => coordenador.CodigoRegistro == codigo),
            "o coordenador");
}
