using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.DTOs;


namespace PlataformaEnsino.API.Services;

public class MatriculaService : IMatriculaService
{
    private readonly PlataformaContext _context;
    private readonly IMatriculaRepository _matriculaRepository;
    private readonly IGenericRepository<Aluno> _alunoRepository;
    private readonly IGenericRepository<Turma> _turmaRepository;

    public MatriculaService(
        IMatriculaRepository matriculaRepository,
        IGenericRepository<Aluno> alunoRepository,
        IGenericRepository<Turma> turmaRepository,
        PlataformaContext context)
    {
        _context = context;
        _matriculaRepository = matriculaRepository;
        _alunoRepository = alunoRepository;
        _turmaRepository = turmaRepository;
    }

    public async Task<Matricula> MatricularAlunoAsync(int alunoId, int turmaId)
    {
        var aluno = await _alunoRepository.ObterPorIdAsync(alunoId)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma não encontrada.");

        if (await _matriculaRepository.ExisteMatriculaAsync(alunoId, turmaId))
        {
            throw new InvalidOperationException("O aluno já está matriculado nesta turma.");
        }

        var novaMatricula = new Matricula
        {
            AlunoId = alunoId,
            CursoId = turma.CursoId,
            Aluno = aluno,
            Turma = turma
        };
        novaMatricula.CodigoRegistro = await GerarCodigoMatriculaAsync();
        novaMatricula.VincularTurma(turmaId);
        novaMatricula.RegistrarSolicitacao(DateTime.UtcNow);

        await _matriculaRepository.AdicionarAsync(novaMatricula);
        await _matriculaRepository.SalvarAlteracoesAsync();

        return await _matriculaRepository.ObterMatriculaCompletaAsync(novaMatricula.Id) ?? novaMatricula;
    }

    public async Task<Matricula> ObterMatriculaPorIdAsync(int id)
    {
        return await _matriculaRepository.ObterMatriculaCompletaAsync(id)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");
    }

    public async Task<IEnumerable<Matricula>> ListarMatriculasPorAlunoAsync(int alunoId)
    {
        _ = await _alunoRepository.ObterPorIdAsync(alunoId)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        return await _matriculaRepository.ObterMatriculasPorAlunoAsync(alunoId);
    }

    public async Task<IEnumerable<MatriculaPendenteDto>> ListarMatriculasPendentesAsync()
    {
        var matriculas = await _matriculaRepository.ObterMatriculasPendentesAsync();

        return matriculas.Select(m => new MatriculaPendenteDto
        {
            Id = m.Id,
            CodigoRegistro = m.CodigoRegistro,
            NomeAluno = m.Aluno?.Nome ?? string.Empty,
            CpfMascarado = MascararCpf(m.Aluno?.Cpf ?? string.Empty),
            NomeTurma = m.Turma?.NomeTurma ?? string.Empty,
            CursoId = m.CursoId,
            DataSolicitacao = m.DataSolicitacao
        });
    }

    public async Task<IEnumerable<Matricula>> ListarMatriculasAsync()
    {
        return await _matriculaRepository.ObterTodosAsync();
    }

    public async Task AprovarMatriculaAsync(int matriculaId, int turmaId)
    {
        var matricula = await _matriculaRepository.ObterPorIdAsync(matriculaId)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");

        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma não encontrada.");

        if (matricula.CursoId != turma.CursoId)
        {
            throw new InvalidOperationException("A turma selecionada nao pertence ao curso solicitado pelo aluno.");
        }

        var aluno = await _alunoRepository.ObterPorIdAsync(matricula.AlunoId)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        if (string.IsNullOrWhiteSpace(matricula.CodigoRegistro))
        {
            matricula.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        var matriculaAtiva = await ObterMatriculaAprovadaNaTurmaAsync(matricula, turma);
        if (matriculaAtiva is not null)
        {
            await ConsolidarMatriculaDuplicadaAsync(matricula, matriculaAtiva, turma, aluno);
            await _matriculaRepository.SalvarAlteracoesAsync();
            return;
        }

        await GarantirAlunoSemOutraMatriculaPendenteNaTurmaAsync(matricula, turma);

        matricula.AprovarComTurma(turmaId, matricula.CursoId);
        await GarantirCodigoAlunoAsync(aluno);

        _matriculaRepository.Atualizar(matricula);
        await _matriculaRepository.SalvarAlteracoesAsync();
    }

    public async Task<AprovacaoMatriculasLoteResultadoDto> AprovarMatriculasAutomaticamenteAsync(IEnumerable<int> matriculaIds)
    {
        var ids = matriculaIds
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (ids.Count == 0)
        {
            throw new ArgumentException("Selecione ao menos uma matricula pendente para aprovacao em lote.");
        }

        var resultado = new AprovacaoMatriculasLoteResultadoDto
        {
            TotalSolicitado = ids.Count
        };

        foreach (var id in ids)
        {
            try
            {
                var aprovada = await AprovarMatriculaAutomaticamenteCoreAsync(id);
                await _matriculaRepository.SalvarAlteracoesAsync();
                resultado.Aprovadas.Add(aprovada);
            }
            catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException or ArgumentException)
            {
                resultado.Erros.Add(await CriarErroAprovacaoAsync(id, ex.Message));
            }
        }

        return resultado;
    }

    public async Task RejeitarMatriculaAsync(int matriculaId)
    {
        var matricula = await _matriculaRepository.ObterPorIdAsync(matriculaId)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");

        matricula.Rejeitar();

        _matriculaRepository.Atualizar(matricula);
        await _matriculaRepository.SalvarAlteracoesAsync();
    }
    private static string MascararCpf(string cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf))
            return string.Empty;

        var numeros = new string(cpf.Where(char.IsDigit).ToArray());

        if (numeros.Length != 11)
            return cpf;

        return $"***.***.***-{numeros[^2]}{numeros[^1]}";
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

    private async Task GarantirCodigoAlunoAsync(Aluno aluno)
    {
        var matriculaAtual = aluno.Matricula?.Trim();

        if (!string.IsNullOrWhiteSpace(matriculaAtual) &&
            !matriculaAtual.Equals("Pendente", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        aluno.Matricula = await GerarCodigoAlunoAsync(aluno.Id);
    }

    private async Task<string> GerarCodigoAlunoAsync(int alunoId)
    {
        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarAluno();

            if (!await _context.Alunos.AnyAsync(aluno => aluno.Id != alunoId && aluno.Matricula == codigo))
            {
                return codigo;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o aluno.");
    }

    private async Task<AprovacaoMatriculaItemDto> AprovarMatriculaAutomaticamenteCoreAsync(int matriculaId)
    {
        var matricula = await _context.Matriculas
            .Include(m => m.Aluno)
            .FirstOrDefaultAsync(m => m.Id == matriculaId)
            ?? throw new KeyNotFoundException("Matricula nao encontrada.");

        if (matricula.Status != StatusMatricula.Pendente)
        {
            throw new InvalidOperationException("Apenas matriculas pendentes podem ser aprovadas.");
        }

        var aluno = matricula.Aluno
            ?? await _alunoRepository.ObterPorIdAsync(matricula.AlunoId)
            ?? throw new KeyNotFoundException("Aluno nao encontrado.");

        var turma = await ResolverTurmaAutomaticaAsync(matricula);

        var matriculaAtiva = await ObterMatriculaAprovadaNaTurmaAsync(matricula, turma);
        if (matriculaAtiva is not null)
        {
            return await ConsolidarMatriculaDuplicadaAsync(matricula, matriculaAtiva, turma, aluno);
        }

        await GarantirAlunoSemOutraMatriculaPendenteNaTurmaAsync(matricula, turma);

        if (string.IsNullOrWhiteSpace(matricula.CodigoRegistro))
        {
            matricula.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        matricula.AprovarComTurma(turma.Id, turma.CursoId);
        await GarantirCodigoAlunoAsync(aluno);

        return new AprovacaoMatriculaItemDto
        {
            MatriculaId = matricula.Id,
            CodigoRegistro = matricula.CodigoRegistro,
            CursoId = matricula.CursoId,
            TurmaId = turma.Id,
            NomeTurma = turma.NomeTurma
        };
    }

    private async Task<Turma> ResolverTurmaAutomaticaAsync(Matricula matricula)
    {
        Turma? turma;

        if (matricula.TurmaId.HasValue)
        {
            turma = await _turmaRepository.ObterPorIdAsync(matricula.TurmaId.Value)
                ?? throw new KeyNotFoundException("Turma nao encontrada.");
        }
        else
        {
            turma = await _context.Turmas
                .Where(item => item.CursoId == matricula.CursoId)
                .OrderBy(item => item.DataCriacao)
                .ThenBy(item => item.Id)
                .FirstOrDefaultAsync();
        }

        if (turma is null)
        {
            throw new InvalidOperationException("Nao ha turma padrao cadastrada para o curso solicitado.");
        }

        if (matricula.CursoId != turma.CursoId)
        {
            throw new InvalidOperationException("A turma selecionada nao pertence ao curso solicitado pelo aluno.");
        }

        return turma;
    }

    private async Task<Matricula?> ObterMatriculaAprovadaNaTurmaAsync(Matricula matricula, Turma turma)
    {
        return await _context.Matriculas.FirstOrDefaultAsync(item =>
            item.Id != matricula.Id &&
            item.AlunoId == matricula.AlunoId &&
            item.TurmaId == turma.Id &&
            item.Status == StatusMatricula.Aprovada);
    }

    private async Task GarantirAlunoSemOutraMatriculaPendenteNaTurmaAsync(Matricula matricula, Turma turma)
    {
        var jaPossuiMatriculaPendente = await _context.Matriculas.AnyAsync(item =>
            item.Id != matricula.Id &&
            item.AlunoId == matricula.AlunoId &&
            item.TurmaId == turma.Id &&
            item.Status == StatusMatricula.Pendente);

        if (jaPossuiMatriculaPendente)
        {
            throw new InvalidOperationException("O aluno ja possui outra matricula pendente nesta turma.");
        }
    }

    private async Task<AprovacaoMatriculaItemDto> ConsolidarMatriculaDuplicadaAsync(
        Matricula matriculaDuplicada,
        Matricula matriculaAtiva,
        Turma turma,
        Aluno aluno)
    {
        if (string.IsNullOrWhiteSpace(matriculaAtiva.CodigoRegistro))
        {
            matriculaAtiva.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        matriculaDuplicada.Cancelar();
        await GarantirCodigoAlunoAsync(aluno);

        return new AprovacaoMatriculaItemDto
        {
            MatriculaId = matriculaAtiva.Id,
            CodigoRegistro = matriculaAtiva.CodigoRegistro,
            CursoId = matriculaAtiva.CursoId,
            TurmaId = turma.Id,
            NomeTurma = turma.NomeTurma
        };
    }

    private async Task<AprovacaoMatriculaErroDto> CriarErroAprovacaoAsync(int matriculaId, string motivo)
    {
        var matricula = await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .FirstOrDefaultAsync(m => m.Id == matriculaId);

        return new AprovacaoMatriculaErroDto
        {
            MatriculaId = matriculaId,
            CodigoRegistro = matricula?.CodigoRegistro ?? string.Empty,
            NomeAluno = matricula?.Aluno?.Nome ?? string.Empty,
            CursoId = matricula?.CursoId ?? 0,
            Motivo = motivo
        };
    }
}
