using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
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
    private readonly IAuthService _authService;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AlunoService> _logger;

    public AlunoService(
        PlataformaContext context,
        IMatriculaService matriculaService,
        IAuthService authService,
        IEmailService emailService,
        IMemoryCache cache,
        ILogger<AlunoService> logger)
    {
        _context = context;
        _matriculaService = matriculaService;
        _authService = authService;
        _emailService = emailService;
        _cache = cache;
        _logger = logger;
    }

    public async Task<(IEnumerable<AlunoResponseDto> Itens, int TotalItens)> ListarAlunosAsync(int? pagina, int? tamanhoPagina, bool incluirDadosInativacao)
    {
        var query = _context.Alunos
            .AsNoTracking()
            .Include(aluno => aluno.Matriculas)
            .OrderBy(aluno => aluno.Nome);

        var totalItens = await query.CountAsync();

        List<Aluno> itensDaPagina;
        if (!pagina.HasValue)
        {
            itensDaPagina = await query.ToListAsync();
        }
        else
        {
            var tamanho = Math.Clamp(tamanhoPagina ?? 20, 1, 100);
            var pular = Math.Max(0, (pagina.Value - 1) * tamanho);
            itensDaPagina = await query.Skip(pular).Take(tamanho).ToListAsync();
        }

        var nomesInativadoPor = incluirDadosInativacao
            ? await ObterNomesInativadoPorAsync(itensDaPagina)
            : new Dictionary<int, string>();

        return (itensDaPagina.Select(aluno => MapResponse(aluno, incluirDadosInativacao, nomesInativadoPor)), totalItens);
    }

    private async Task<Dictionary<int, string>> ObterNomesInativadoPorAsync(IEnumerable<Aluno> alunos)
    {
        var ids = alunos.Where(aluno => aluno.InativadoPorId.HasValue).Select(aluno => aluno.InativadoPorId!.Value).Distinct().ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        return await _context.Usuarios
            .Where(usuario => ids.Contains(usuario.Id))
            .ToDictionaryAsync(usuario => usuario.Id, usuario => usuario.Nome);
    }

    private static string ComputeTurmaAtual(Aluno aluno)
    {
        var turmasAtivas = aluno.Matriculas
            .Where(matricula => matricula.Status == StatusMatricula.Aprovada && matricula.NomeTurmaSnapshot is not null)
            .Select(matricula => matricula.NomeTurmaSnapshot!)
            .Distinct()
            .ToList();

        return turmasAtivas.Count > 0 ? string.Join(", ", turmasAtivas) : string.Empty;
    }

    private static AlunoResponseDto MapResponse(Aluno aluno, bool incluirDadosInativacao, IReadOnlyDictionary<int, string> nomesInativadoPor)
    {
        var dto = new AlunoResponseDto
        {
            Matricula = aluno.Matricula,
            TurmaAtual = ComputeTurmaAtual(aluno)
        }.PreencherCamposBase(aluno);

        if (incluirDadosInativacao)
        {
            dto.InativadoEm = aluno.InativadoEm;
            dto.MotivoInativacao = aluno.MotivoInativacao ?? string.Empty;
            dto.InativadoPorNome = aluno.InativadoPorId.HasValue && nomesInativadoPor.TryGetValue(aluno.InativadoPorId.Value, out var nome)
                ? nome
                : string.Empty;
        }

        return dto;
    }

    private async Task<AlunoResponseDto> MapResponseComInativacaoAsync(Aluno aluno)
    {
        var nomesInativadoPor = await ObterNomesInativadoPorAsync(new[] { aluno });
        return MapResponse(aluno, incluirDadosInativacao: true, nomesInativadoPor);
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

    public async Task<AlunoResponseDto> AtualizarDadosAdminAsync(int id, AtualizarAlunoAdminDto dto)
    {
        var aluno = await _context.Alunos.Include(a => a.Matriculas).FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        var emailNormalizado = dto.Email.Trim().ToLower();
        var emailAntigo = aluno.Email;
        var emailMudou = !string.Equals(emailAntigo, emailNormalizado, StringComparison.OrdinalIgnoreCase);

        if (emailMudou && await _context.Usuarios.AnyAsync(usuario => usuario.Email.ToLower() == emailNormalizado && usuario.Id != id))
        {
            throw new ConflitoDeNegocioException("Este e-mail já está em uso.");
        }

        var raNormalizado = dto.Matricula.Trim();
        if (await _context.Alunos.AnyAsync(outroAluno => outroAluno.Matricula == raNormalizado && outroAluno.Id != id))
        {
            throw new ConflitoDeNegocioException("Este RA já pertence a outro aluno.");
        }

        aluno.AlterarDadosBasicos(dto.Nome.Trim(), emailNormalizado, (dto.Telefone ?? string.Empty).Trim());
        aluno.Matricula = raNormalizado;

        await _context.SaveChangesAsync();

        var avisoEmailEnviado = true;

        if (emailMudou)
        {
            await _authService.RevogarTodosOsTokensAsync(aluno.Id);

            try
            {
                await EnviarAvisoTrocaEmailAsync(aluno.Nome, emailAntigo, emailNormalizado);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao enviar o aviso de troca de e-mail para o aluno {AlunoId}.", aluno.Id);
                avisoEmailEnviado = false;
            }
        }

        var resposta = await MapResponseComInativacaoAsync(aluno);
        resposta.AvisoEmailEnviado = avisoEmailEnviado;
        return resposta;
    }

    public async Task<AlunoResponseDto> InativarAsync(int id, int adminId, string motivo)
    {
        var aluno = await _context.Alunos.Include(a => a.Matriculas).FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        if (!aluno.Ativo)
        {
            throw new ConflitoDeNegocioException("Este aluno já está inativo.");
        }

        aluno.Desativar(adminId, motivo);
        await _context.SaveChangesAsync();

        await _authService.RevogarTodosOsTokensAsync(aluno.Id);
        _cache.Remove(CacheChaves.UsuarioAtivo(aluno.Id));

        return await MapResponseComInativacaoAsync(aluno);
    }

    public async Task<AlunoResponseDto> ReativarAsync(int id)
    {
        var aluno = await _context.Alunos.Include(a => a.Matriculas).FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        if (aluno.Ativo)
        {
            throw new ConflitoDeNegocioException("Este aluno já está ativo.");
        }

        aluno.Ativar();
        await _context.SaveChangesAsync();

        _cache.Remove(CacheChaves.UsuarioAtivo(aluno.Id));

        return await MapResponseComInativacaoAsync(aluno);
    }

    /// <summary>
    /// "O aluno será desconectado e receberá um aviso no e-mail antigo e no
    /// novo" (docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md,
    /// item A2) - preço aqui não importa, o aviso é só informativo.
    /// </summary>
    private async Task EnviarAvisoTrocaEmailAsync(string nomeAluno, string emailAntigo, string emailNovo)
    {
        const string assunto = "Seu e-mail de acesso ao CodeRyse foi alterado";
        var corpoHtml =
            $"<p>Olá, {nomeAluno}.</p>" +
            "<p>O e-mail usado para entrar na sua conta da CodeRyse Academy foi alterado pela administração. " +
            $"O novo endereço de login é <strong>{MascararEmail(emailNovo)}</strong>.</p>" +
            "<p>Se você não reconhece essa mudança, procure a administração o quanto antes.</p>";

        await _emailService.EnviarAsync(emailAntigo, assunto, corpoHtml);
        await _emailService.EnviarAsync(emailNovo, assunto, corpoHtml);
    }

    private static string MascararEmail(string email)
    {
        var posicaoArroba = email.IndexOf('@');
        if (posicaoArroba <= 1)
        {
            return email;
        }

        return $"{email[0]}***{email[posicaoArroba..]}";
    }

    private Task<string> GerarCodigoAlunoAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarAluno,
            codigo => _context.Alunos.AnyAsync(aluno => aluno.Matricula == codigo),
            "o aluno");
}
