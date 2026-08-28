using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class AlunoService : IAlunoService
{
    private readonly PlataformaContext _context;

    public AlunoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AlunoResponseDto>> ListarAlunosAsync()
    {
        var alunos = await _context.Alunos
            .AsNoTracking()
            .Include(aluno => aluno.Matriculas)
                .ThenInclude(matricula => matricula.Turma)
            .ToListAsync();

        return alunos.Select(MapResponse);
    }

    private static AlunoResponseDto MapResponse(Aluno aluno)
    {
        var turmasAtivas = aluno.Matriculas
            .Where(matricula => matricula.Status == StatusMatricula.Aprovada && matricula.Turma is not null)
            .Select(matricula => matricula.Turma!.NomeTurma)
            .Distinct()
            .ToList();

        return new AlunoResponseDto
        {
            Id = aluno.Id,
            Nome = aluno.Nome,
            Email = aluno.Email,
            Cpf = aluno.Cpf,
            Telefone = aluno.Telefone,
            Cep = aluno.Cep,
            Rua = aluno.Rua,
            Numero = aluno.Numero,
            Bairro = aluno.Bairro,
            Cidade = aluno.Cidade,
            Estado = aluno.Estado,
            TipoUsuario = aluno.TipoUsuario,
            DataCadastro = aluno.DataCadastro,
            Ativo = aluno.Ativo,
            Matricula = aluno.Matricula,
            TurmaAtual = turmasAtivas.Count > 0 ? string.Join(", ", turmasAtivas) : string.Empty
        };
    }

    public async Task<Aluno> CriarAlunoAsync(CriarAlunoDto dto)
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

        var aluno = new Aluno
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
            Matricula = await GerarCodigoAlunoAsync()
        };
        aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(dto.Senha), dto.Ativo);

        _context.Alunos.Add(aluno);
        await _context.SaveChangesAsync();

        return aluno;
    }

    public async Task CadastrarAlunoCompletoAsync(CadastroAlunoDto dto)
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

        if (!await _context.Cursos.AnyAsync(curso => curso.Id == dto.CursoId))
        {
            throw new ArgumentException("Curso informado nao foi encontrado.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var aluno = new Aluno
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
            Matricula = await GerarCodigoAlunoAsync()
        };
        aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(dto.Senha));

        _context.Alunos.Add(aluno);
        await _context.SaveChangesAsync();

        var matricula = new Matricula
        {
            AlunoId = aluno.Id,
            CursoId = dto.CursoId,
            CodigoRegistro = await GerarCodigoMatriculaAsync()
        };
        matricula.RegistrarSolicitacao(DateTime.UtcNow);

        _context.Matriculas.Add(matricula);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private async Task<string> GerarCodigoMatriculaAsync()
    {
        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarMatricula();

            if (!await _context.Matriculas.AnyAsync(matricula => matricula.CodigoRegistro == codigo))
            {
                return codigo;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para a matricula.");
    }

    private async Task<string> GerarCodigoAlunoAsync()
    {
        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarAluno();

            if (!await _context.Alunos.AnyAsync(aluno => aluno.Matricula == codigo))
            {
                return codigo;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o aluno.");
    }
}
