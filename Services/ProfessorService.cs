using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ProfessorService : IProfessorService
{
    private readonly PlataformaContext _context;

    public ProfessorService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Professor>> ListarProfessoresAsync()
    {
        return await _context.Professores
            .AsNoTracking()
            .OrderBy(professor => professor.Nome)
            .ToListAsync();
    }

    public async Task<Professor> CriarProfessorAsync(CriarProfessorDto dto)
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

        var professor = new Professor
        {
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            Cpf = cpfNormalizado,
            Telefone = dto.Telefone.Trim(),
            Cep = dto.Cep.Trim(),
            Rua = dto.Rua.Trim(),
            Numero = dto.Numero.Trim(),
            Bairro = dto.Bairro.Trim(),
            Cidade = dto.Cidade.Trim(),
            Estado = dto.Estado.Trim().ToUpper(),
            CodigoRegistro = await GerarCodigoProfessorAsync(),
            Especialidade = dto.Especialidade.Trim()
        };
        professor.ConfigurarAcesso("Professor", BCrypt.Net.BCrypt.HashPassword(dto.Senha), dto.Ativo);

        _context.Professores.Add(professor);
        await _context.SaveChangesAsync();

        return professor;
    }

    private Task<string> GerarCodigoProfessorAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarProfessor,
            codigo => _context.Professores.AnyAsync(professor => professor.CodigoRegistro == codigo),
            "o professor");
}
