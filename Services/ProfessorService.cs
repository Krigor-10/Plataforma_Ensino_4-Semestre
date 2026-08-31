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
        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf);

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

    public async Task<Professor> AtualizarProfessorAsync(int id, AtualizarProfessorDto dto)
    {
        var professor = await _context.Professores.FirstOrDefaultAsync(professor => professor.Id == id)
            ?? throw new KeyNotFoundException("Professor nao encontrado.");

        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf, id);

        professor.AlterarDados(
            dto.Nome.Trim(),
            emailNormalizado,
            dto.Telefone.Trim(),
            dto.Cep.Trim(),
            dto.Rua.Trim(),
            dto.Numero.Trim(),
            dto.Bairro.Trim(),
            dto.Cidade.Trim(),
            dto.Estado.Trim().ToUpper());
        professor.Cpf = cpfNormalizado;
        professor.Especialidade = dto.Especialidade.Trim();

        if (dto.Ativo)
        {
            professor.Ativar();
        }
        else
        {
            professor.Desativar();
        }

        await _context.SaveChangesAsync();

        return professor;
    }

    public async Task ExcluirProfessorAsync(int id)
    {
        var professor = await _context.Professores.FirstOrDefaultAsync(professor => professor.Id == id)
            ?? throw new KeyNotFoundException("Professor nao encontrado.");

        _context.Professores.Remove(professor);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("Nao e possivel excluir o professor pois ele esta vinculado a uma ou mais turmas.");
        }
    }

    private Task<string> GerarCodigoProfessorAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarProfessor,
            codigo => _context.Professores.AnyAsync(professor => professor.CodigoRegistro == codigo),
            "o professor");
}
