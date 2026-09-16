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

        if (matricula.Status != StatusMatricula.Aprovada)
        {
            throw new ArgumentException("A matricula ainda nao foi aprovada.");
        }

        if (!await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula))
        {
            throw new InvalidOperationException("O pagamento deste curso ainda nao foi confirmado.");
        }

        var progresso = matricula.ProgressosCurso.FirstOrDefault();
        if (progresso is null || progresso.PercentualConclusao < 100)
        {
            throw new ArgumentException("O curso ainda nao foi concluido.");
        }

        // PercentualConclusao so conta conteudo+quiz (ver ProgressoAlunoService.RecalcularCursoAsync);
        // Prova/Exercicio nao entra no progresso, entao precisa ser checado a parte aqui
        // pra impedir certificado com avaliacao somativa publicada e ainda sem correcao.
        var existeAvaliacaoPendente = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.TurmaId == matricula.TurmaId)
            .Select(avaliacao => avaliacao.Id)
            .Where(avaliacaoId => !_context.LancamentosNotasAlunos
                .Any(lancamento => lancamento.MatriculaId == matricula.Id && lancamento.AvaliacaoId == avaliacaoId))
            .AnyAsync();

        if (existeAvaliacaoPendente)
        {
            throw new ArgumentException("Ha avaliacoes (prova/exercicio) pendentes de correcao para concluir o curso.");
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
