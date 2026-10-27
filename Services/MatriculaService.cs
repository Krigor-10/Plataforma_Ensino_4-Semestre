using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class MatriculaService : IMatriculaService
{
    private readonly PlataformaContext _context;
    private readonly IMatriculaRepository _matriculaRepository;
    private readonly IGenericRepository<Aluno> _alunoRepository;
    private readonly ICursoService _cursoService;

    public MatriculaService(
        IMatriculaRepository matriculaRepository,
        IGenericRepository<Aluno> alunoRepository,
        PlataformaContext context,
        ICursoService cursoService)
    {
        _context = context;
        _matriculaRepository = matriculaRepository;
        _alunoRepository = alunoRepository;
        _cursoService = cursoService;
    }

    /// <summary>
    /// Ponto de entrada unico pra "aluno ganha uma matricula ja aprovada
    /// sem intervencao de coordenador" — usado tanto no cadastro
    /// (<see cref="Services.AlunoService.CadastrarAlunoCompletoAsync"/>)
    /// quanto na solicitacao pelo Catalogo de Cursos (aluno ja logado
    /// pedindo matricula num curso adicional). Aprova direto no curso (sem
    /// turma) e cria o Pagamento pendente se o curso for pago (via
    /// CriarPagamentoPendenteSeNecessarioAsync) — o acesso ao conteudo
    /// continua bloqueado ate a confirmacao do pagamento (ver
    /// AcessoAcademicoService). Sempre transacional: se a aprovacao falhar
    /// (ex.: aluno ja matriculado), a matricula Pendente intermediaria criada
    /// por CriarMatriculaPendenteAsync tambem e desfeita, evitando um
    /// registro orfao no banco. Quando chamado de dentro de uma transacao ja
    /// aberta pelo chamador (cadastro), reaproveita essa transacao em vez de
    /// abrir uma segunda.
    /// </summary>
    public async Task<Matricula> MatricularComAprovacaoAutomaticaAsync(int alunoId, int cursoId)
    {
        var transacaoJaAberta = _context.Database.CurrentTransaction is not null;
        await using var transaction = transacaoJaAberta ? null : await _context.Database.BeginTransactionAsync();

        var matriculaPendente = await CriarMatriculaPendenteAsync(alunoId, cursoId);

        await AprovarMatriculaAutomaticamenteCoreAsync(matriculaPendente.Id);
        await SalvarComProtecaoDeConcorrenciaAsync();

        if (transaction is not null)
        {
            await transaction.CommitAsync();
        }

        return await _matriculaRepository.ObterMatriculaCompletaAsync(matriculaPendente.Id) ?? matriculaPendente;
    }

    /// <summary>
    /// Cria a matricula em estado Pendente, sem turma — passo intermediario
    /// interno usado por <see cref="MatricularComAprovacaoAutomaticaAsync"/>
    /// antes de aprova-la automaticamente. Nao e mais exposto na interface
    /// publica: nenhum fluxo de negocio hoje precisa de uma matricula que
    /// fique Pendente sem ser imediatamente resolvida/aprovada.
    /// </summary>
    private async Task<Matricula> CriarMatriculaPendenteAsync(int alunoId, int cursoId)
    {
        await _cursoService.GarantirCursoAbertoAsync(cursoId);

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

    public async Task<(IEnumerable<Matricula> Itens, int TotalItens)> ListarMatriculasAsync(int? pagina, int? tamanhoPagina, int? coordenadorId)
    {
        var (itens, totalItens) = await _matriculaRepository.ListarPaginadoAsync(pagina, tamanhoPagina, coordenadorId);
        return (itens, totalItens);
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

    private async Task AprovarMatriculaAutomaticamenteCoreAsync(int matriculaId)
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

        await AprovarNoCursoAsync(matricula, aluno);
    }

    /// <summary>
    /// Aprova uma matricula pendente diretamente no curso (sem turma) —
    /// unico caminho de aprovacao, usado por
    /// <see cref="AprovarMatriculaAutomaticamenteCoreAsync"/> (fluxo
    /// automatico de matricula). Retorna a matricula que ficou como a
    /// aprovada no curso: a própria <paramref name="matricula"/>, ou a
    /// matricula já aprovada anteriormente caso a pendência seja consolidada
    /// nela.
    /// </summary>
    private async Task<Matricula> AprovarNoCursoAsync(Matricula matricula, Aluno aluno)
    {
        var matriculaAtiva = await ObterMatriculaAprovadaNoCursoAsync(matricula);
        if (matriculaAtiva is not null)
        {
            await ConsolidarMatriculaDuplicadaAsync(matricula, matriculaAtiva, aluno);
            return matriculaAtiva;
        }

        await GarantirAlunoSemOutraMatriculaPendenteNoCursoAsync(matricula);

        if (string.IsNullOrWhiteSpace(matricula.CodigoRegistro))
        {
            matricula.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        matricula.Aprovar();
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

    private async Task<Matricula?> ObterMatriculaAprovadaNoCursoAsync(Matricula matricula)
    {
        return await _context.Matriculas.FirstOrDefaultAsync(item =>
            item.Id != matricula.Id &&
            item.AlunoId == matricula.AlunoId &&
            item.CursoId == matricula.CursoId &&
            item.Status == StatusMatricula.Aprovada);
    }

    private async Task GarantirAlunoSemOutraMatriculaPendenteNoCursoAsync(Matricula matricula)
    {
        var jaPossuiMatriculaPendente = await _context.Matriculas.AnyAsync(item =>
            item.Id != matricula.Id &&
            item.AlunoId == matricula.AlunoId &&
            item.CursoId == matricula.CursoId &&
            item.Status == StatusMatricula.Pendente);

        if (jaPossuiMatriculaPendente)
        {
            throw new InvalidOperationException("O aluno ja possui outra matricula pendente neste curso.");
        }
    }

    private async Task ConsolidarMatriculaDuplicadaAsync(
        Matricula matriculaDuplicada,
        Matricula matriculaAtiva,
        Aluno aluno)
    {
        if (string.IsNullOrWhiteSpace(matriculaAtiva.CodigoRegistro))
        {
            matriculaAtiva.CodigoRegistro = await GerarCodigoMatriculaAsync();
        }

        matriculaDuplicada.Cancelar();
        await GarantirCodigoAlunoAsync(aluno);
    }
}
