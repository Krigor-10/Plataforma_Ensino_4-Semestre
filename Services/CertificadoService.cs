using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class CertificadoService : ICertificadoService
{
    private readonly PlataformaContext _context;
    private readonly IAcessoAcademicoService _acessoAcademicoService;

    public CertificadoService(PlataformaContext context, IAcessoAcademicoService acessoAcademicoService)
    {
        _context = context;
        _acessoAcademicoService = acessoAcademicoService;
    }

    public async Task<Matricula> EmitirCertificadoAsync(int alunoId, int matriculaId)
    {
        var matricula = await ObterMatriculaComDetalhesAsync(m => m.Id == matriculaId)
            ?? throw new KeyNotFoundException("Matricula nao encontrada.");

        if (matricula.AlunoId != alunoId)
        {
            throw new KeyNotFoundException("Matricula nao encontrada.");
        }

        var pendencias = await ObterPendenciasAsync(matricula);
        if (pendencias.Count > 0)
        {
            throw pendencias[0].CriarExcecao();
        }

        if (matricula.CertificadoEmitidoEm is null)
        {
            matricula.EmitirCertificado();

            // Anexa só a matrícula raiz (grafo carregado via Include fica Unchanged)
            // e marca apenas essa propriedade como modificada, evitando updates
            // indesejados em Aluno/Curso/Turma/ProgressoCursoAluno.
            _context.Matriculas.Attach(matricula);
            _context.Entry(matricula).Property(m => m.CertificadoEmitidoEm).IsModified = true;
            await _context.SaveChangesAsync();
        }

        return matricula;
    }

    public async Task<IReadOnlyList<string>> VerificarRequisitosAsync(Matricula matricula)
    {
        ArgumentNullException.ThrowIfNull(matricula);
        var pendencias = await ObterPendenciasAsync(matricula);
        return pendencias.Select(pendencia => pendencia.Mensagem).ToList();
    }

    public async Task<IReadOnlyList<StatusCertificadoMatricula>> ListarStatusCertificadosDoAlunoAsync(int alunoId)
    {
        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.Turma)
            .Include(m => m.ProgressosCurso)
            .Where(m => m.AlunoId == alunoId && m.Status == StatusMatricula.Aprovada)
            .ToListAsync();

        var resultado = new List<StatusCertificadoMatricula>(matriculas.Count);
        foreach (var matricula in matriculas)
        {
            var pendencias = await VerificarRequisitosAsync(matricula);
            resultado.Add(new StatusCertificadoMatricula(matricula, pendencias));
        }

        return resultado;
    }

    // Par mensagem/fabrica-de-excecao: VerificarRequisitosAsync expõe só a
    // mensagem (pra tela/modo demo), EmitirCertificadoAsync usa a mesma lista
    // pra lancar a excecao certa (ArgumentException/InvalidOperationException)
    // na primeira pendencia - preserva o tipo e a mensagem que os 19 testes
    // de CertificadoServiceTests ja esperavam antes dessa extracao.
    private sealed record Pendencia(string Mensagem, Func<Exception> CriarExcecao);

    private async Task<List<Pendencia>> ObterPendenciasAsync(Matricula matricula)
    {
        var pendencias = new List<Pendencia>();

        if (matricula.Status != StatusMatricula.Aprovada)
        {
            const string mensagem = "A matricula ainda nao foi aprovada.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        if (!await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula))
        {
            const string mensagem = "O pagamento deste curso ainda nao foi confirmado.";
            pendencias.Add(new Pendencia(mensagem, () => new InvalidOperationException(mensagem)));
        }

        var progresso = matricula.ProgressosCurso.FirstOrDefault();
        if (progresso is null || progresso.PercentualConclusao < 100)
        {
            const string mensagem = "O curso ainda nao foi concluido.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        // PercentualConclusao so conta conteudo+quiz (ver ProgressoAlunoService.RecalcularCursoAsync);
        // Prova/Exercicio nao entra no progresso, entao precisa ser checado a parte aqui
        // pra impedir certificado com avaliacao somativa publicada e ainda sem correcao.
        var existeAvaliacaoPendente = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.CursoId == matricula.CursoId)
            .Select(avaliacao => avaliacao.Id)
            .Where(avaliacaoId => !_context.LancamentosNotasAlunos
                .Any(lancamento => lancamento.MatriculaId == matricula.Id && lancamento.AvaliacaoId == avaliacaoId))
            .AnyAsync();

        if (existeAvaliacaoPendente)
        {
            const string mensagem = "Ha avaliacoes (prova/exercicio) pendentes de correcao para concluir o curso.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        // Nota minima de aprovacao: so se aplica a cursos com avaliacao formal
        // publicada (Prova/Exercicio) - cursos so com quiz/conteudo nunca calculam
        // NotaFinal (fica no default 0, ver ProgressoAlunoService.RecalcularMediaCursoAsync)
        // e nao devem ser bloqueados por essa regra. Concluir a avaliacao (checado
        // acima) nao significa estar aprovado - a media precisa bater o minimo.
        var possuiAvaliacaoFormalPublicada = await _context.Avaliacoes
            .AsNoTracking()
            .AnyAsync(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.CursoId == matricula.CursoId);

        if (possuiAvaliacaoFormalPublicada && matricula.NotaFinal < 7m)
        {
            const string mensagem = "A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        // Curso Acompanhado tem conteudo liberado aos poucos pelo professor —
        // "100% concluido" so e um criterio estavel depois que o coordenador
        // encerra o curso (ver CursoService.EncerrarCursoAsync). Gratuito/
        // PagoPacote ja nascem com todo o conteudo pronto, sem esse gate.
        if (matricula.Curso is not null && matricula.Curso.ModeloCurso == ModeloCurso.Acompanhado && !matricula.Curso.EncerradoEm.HasValue)
        {
            const string mensagem = "Este curso ainda nao foi encerrado pelo coordenador.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        return pendencias;
    }

    public async Task<IEnumerable<Matricula>> ListarCertificadosDoAlunoAsync(int alunoId)
    {
        return await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.Turma)
            .Where(m => m.AlunoId == alunoId && m.CertificadoEmitidoEm != null)
            .OrderByDescending(m => m.CertificadoEmitidoEm)
            .ToListAsync();
    }

    public async Task<Matricula> ObterCertificadoPorCodigoAsync(string codigo)
    {
        var codigoNormalizado = (codigo ?? string.Empty).Trim();

        var matricula = await ObterMatriculaComDetalhesAsync(m => m.CodigoRegistro == codigoNormalizado);

        if (matricula is null || matricula.CertificadoEmitidoEm is null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado.");
        }

        return matricula;
    }

    private async Task<Matricula?> ObterMatriculaComDetalhesAsync(System.Linq.Expressions.Expression<Func<Matricula, bool>> filtro)
    {
        return await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.Turma)
            .Include(m => m.ProgressosCurso)
            .FirstOrDefaultAsync(filtro);
    }
}
