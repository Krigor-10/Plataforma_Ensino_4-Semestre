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
    private readonly INotificacaoService _notificacaoService;

    public MatriculaService(
        IMatriculaRepository matriculaRepository,
        IGenericRepository<Aluno> alunoRepository,
        IGenericRepository<Turma> turmaRepository,
        PlataformaContext context,
        INotificacaoService notificacaoService)
    {
        _context = context;
        _matriculaRepository = matriculaRepository;
        _alunoRepository = alunoRepository;
        _turmaRepository = turmaRepository;
        _notificacaoService = notificacaoService;
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

    public async Task<Matricula> SolicitarMatriculaAsync(int alunoId, int cursoId)
    {
        var novaMatricula = new Matricula
        {
            AlunoId = alunoId,
            CursoId = cursoId,
            CodigoRegistro = await GerarCodigoMatriculaAsync()
        };
        novaMatricula.RegistrarSolicitacao(DateTime.UtcNow);

        await _matriculaRepository.AdicionarAsync(novaMatricula);
        await _matriculaRepository.SalvarAlteracoesAsync();

        return novaMatricula;
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

    public async Task<(IEnumerable<Matricula> Itens, int TotalItens)> ListarMatriculasAsync(int? pagina, int? tamanhoPagina)
    {
        var (itens, totalItens) = await _matriculaRepository.ListarPaginadoAsync(pagina, tamanhoPagina);
        return (itens, totalItens);
    }

    public async Task AprovarMatriculaAsync(int matriculaId, int turmaId)
    {
        var matricula = await _matriculaRepository.ObterPorIdAsync(matriculaId)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");

        if (matricula.Status != StatusMatricula.Pendente)
        {
            throw new InvalidOperationException("Apenas matriculas pendentes podem ser aprovadas.");
        }

        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma não encontrada.");

        if (matricula.CursoId != turma.CursoId)
        {
            throw new InvalidOperationException("A turma selecionada nao pertence ao curso solicitado pelo aluno.");
        }

        var aluno = await _alunoRepository.ObterPorIdAsync(matricula.AlunoId)
            ?? throw new KeyNotFoundException("Aluno não encontrado.");

        await AprovarNaTurmaResolvidaAsync(matricula, turma, aluno);
        await SalvarComProtecaoDeConcorrenciaAsync();

        await _notificacaoService.NotificarAsync(
            aluno.Id,
            "Matricula aprovada",
            $"Sua matricula na turma \"{turma.NomeTurma}\" foi aprovada.",
            TipoNotificacao.MatriculaAprovada,
            "/app/cursos-matriculados");
    }

    /// <summary>
    /// Salva as alteracoes traduzindo uma violacao do indice unico
    /// IX_Matriculas_AlunoId_TurmaId_Aprovada (duas aprovacoes simultaneas da
    /// mesma pendencia) num erro de negocio claro, em vez do 500 generico que
    /// o middleware daria pra uma DbUpdateException nao mapeada.
    /// </summary>
    private async Task SalvarComProtecaoDeConcorrenciaAsync()
    {
        try
        {
            await _matriculaRepository.SalvarAlteracoesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException(
                "Esta matricula ja foi aprovada em outra requisicao simultanea.");
        }
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
                await SalvarComProtecaoDeConcorrenciaAsync();
                resultado.Aprovadas.Add(aprovada);

                await _notificacaoService.NotificarAsync(
                    aprovada.AlunoId,
                    "Matricula aprovada",
                    $"Sua matricula na turma \"{aprovada.NomeTurma}\" foi aprovada.",
                    TipoNotificacao.MatriculaAprovada,
                    "/app/cursos-matriculados");
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

        await _notificacaoService.NotificarAsync(
            matricula.AlunoId,
            "Matricula rejeitada",
            "Sua solicitacao de matricula foi rejeitada. Entre em contato com a coordenacao para mais detalhes.",
            TipoNotificacao.MatriculaRejeitada,
            "/app/matriculas");
    }
    public async Task CancelarMatriculaAsync(int matriculaId)
    {
        var matricula = await _matriculaRepository.ObterPorIdAsync(matriculaId)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");

        if (matricula.Status != StatusMatricula.Pendente)
        {
            throw new InvalidOperationException("Apenas matriculas pendentes podem ser canceladas.");
        }

        matricula.Cancelar();

        _matriculaRepository.Atualizar(matricula);
        await _matriculaRepository.SalvarAlteracoesAsync();
    }

    public async Task ReabrirMatriculaAsync(int matriculaId)
    {
        var matricula = await _matriculaRepository.ObterPorIdAsync(matriculaId)
            ?? throw new KeyNotFoundException("Matrícula não encontrada.");

        if (matricula.Status != StatusMatricula.Rejeitada)
        {
            throw new InvalidOperationException("Apenas matriculas rejeitadas podem ser reabertas.");
        }

        matricula.Reabrir();

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

    private Task<string> GerarCodigoMatriculaAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarMatricula,
            codigo => _context.Matriculas.AnyAsync(matricula => matricula.CodigoRegistro == codigo),
            "a matricula");

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

    private Task<string> GerarCodigoAlunoAsync(int alunoId) =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarAluno,
            codigo => _context.Alunos.AnyAsync(aluno => aluno.Id != alunoId && aluno.Matricula == codigo),
            "o aluno");

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
        var matriculaResultante = await AprovarNaTurmaResolvidaAsync(matricula, turma, aluno);

        return new AprovacaoMatriculaItemDto
        {
            MatriculaId = matriculaResultante.Id,
            CodigoRegistro = matriculaResultante.CodigoRegistro,
            AlunoId = aluno.Id,
            CursoId = matriculaResultante.CursoId,
            TurmaId = turma.Id,
            NomeTurma = turma.NomeTurma
        };
    }

    /// <summary>
    /// Aprova uma matricula pendente numa turma ja resolvida — usado tanto pela
    /// aprovacao manual com turma explicita (<see cref="AprovarMatriculaAsync"/>)
    /// quanto pela aprovacao automatica em lote
    /// (<see cref="AprovarMatriculaAutomaticamenteCoreAsync"/>), que só diferem em
    /// como a turma é obtida. Retorna a matricula que ficou como a aprovada na
    /// turma: a própria <paramref name="matricula"/>, ou a matricula já aprovada
    /// anteriormente caso a pendência seja consolidada nela.
    /// </summary>
    private async Task<Matricula> AprovarNaTurmaResolvidaAsync(Matricula matricula, Turma turma, Aluno aluno)
    {
        var matriculaAtiva = await ObterMatriculaAprovadaNaTurmaAsync(matricula, turma);
        if (matriculaAtiva is not null)
        {
            await ConsolidarMatriculaDuplicadaAsync(matricula, matriculaAtiva, turma, aluno);
            return matriculaAtiva;
        }

        await GarantirAlunoSemOutraMatriculaPendenteNaTurmaAsync(matricula, turma);

        if (string.IsNullOrWhiteSpace(matricula.CodigoRegistro))
        {
            matricula.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        matricula.AprovarComTurma(turma.Id, turma.CursoId);
        await GarantirCodigoAlunoAsync(aluno);
        await CriarPagamentoPendenteSeNecessarioAsync(matricula);

        return matricula;
    }

    /// <summary>
    /// Pagamento simulado: se o curso tiver preco, registra uma cobranca
    /// pendente vinculada a matricula recem-aprovada. Nao ha integracao com
    /// gateway externo — o aluno "paga" confirmando via PagamentosController,
    /// e o registro so existe pra o app nao tratar Curso.Preco como decorativo.
    /// </summary>
    private async Task CriarPagamentoPendenteSeNecessarioAsync(Matricula matricula)
    {
        var jaTemPagamento = await _context.Pagamentos
            .AnyAsync(pagamento => pagamento.MatriculaId == matricula.Id);
        if (jaTemPagamento)
        {
            return;
        }

        var precoCurso = await _context.Cursos
            .Where(curso => curso.Id == matricula.CursoId)
            .Select(curso => curso.Preco)
            .FirstOrDefaultAsync();

        if (precoCurso <= 0)
        {
            return;
        }

        await _context.Pagamentos.AddAsync(Pagamento.CriarPendente(matricula.Id, precoCurso));
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
