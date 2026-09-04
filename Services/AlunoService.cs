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
    private readonly IMatriculaService _matriculaService;

    public AlunoService(PlataformaContext context, IMatriculaService matriculaService)
    {
        _context = context;
        _matriculaService = matriculaService;
    }

    public async Task<(IEnumerable<AlunoResponseDto> Itens, int TotalItens)> ListarAlunosAsync(int? pagina, int? tamanhoPagina)
    {
        var query = _context.Alunos
            .AsNoTracking()
            .Include(aluno => aluno.Matriculas)
                .ThenInclude(matricula => matricula.Turma)
            .OrderBy(aluno => aluno.Nome);

        var totalItens = await query.CountAsync();

        if (!pagina.HasValue)
        {
            var todos = await query.ToListAsync();
            return (todos.Select(MapResponse), totalItens);
        }

        var tamanho = Math.Clamp(tamanhoPagina ?? 20, 1, 100);
        var pular = Math.Max(0, (pagina.Value - 1) * tamanho);

        var alunosDaPagina = await query.Skip(pular).Take(tamanho).ToListAsync();
        return (alunosDaPagina.Select(MapResponse), totalItens);
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
            Matricula = aluno.Matricula,
            TurmaAtual = turmasAtivas.Count > 0 ? string.Join(", ", turmasAtivas) : string.Empty
        }.PreencherCamposBase(aluno);
    }

    public async Task<Aluno> CriarAlunoAsync(CriarAlunoDto dto)
    {
        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf);

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

    /// <summary>
    /// Retorna true se o curso escolhido e gratuito (acesso ja liberado ao
    /// concluir o cadastro) ou false se e pago (matricula aprovada, mas o
    /// acesso so libera apos confirmar o pagamento pendente) — usado pelo
    /// controller pra escolher a mensagem de sucesso correta.
    /// </summary>
    public async Task<bool> CadastrarAlunoCompletoAsync(CadastroAlunoDto dto)
    {
        var (emailNormalizado, cpfNormalizado) = await UsuarioValidacao.NormalizarEGarantirDisponivelAsync(_context, dto.Email, dto.Cpf);

        var precoCurso = await _context.Cursos
            .Where(curso => curso.Id == dto.CursoId)
            .Select(curso => (decimal?)curso.Preco)
            .FirstOrDefaultAsync()
            ?? throw new ArgumentException("Curso informado nao foi encontrado.");

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

        await _matriculaService.MatricularComAprovacaoAutomaticaAsync(aluno.Id, dto.CursoId);
        await transaction.CommitAsync();

        return precoCurso <= 0;
    }

    private Task<string> GerarCodigoAlunoAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarAluno,
            codigo => _context.Alunos.AnyAsync(aluno => aluno.Matricula == codigo),
            "o aluno");
}
