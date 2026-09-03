using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// Fonte unica de verdade pra "esse aluno pode consumir o conteudo desta
/// matricula agora": exige matricula Aprovada e, se o curso for pago,
/// exige tambem um Pagamento com Status == Pago vinculado a ela. Curso
/// gratuito (Preco &lt;= 0) nunca gera Pagamento, entao a matricula aprovada
/// ja basta. Nunca persistido — sempre computado na hora, pra nunca poder
/// ficar dessincronizado de Matricula/Pagamento.
/// </summary>
public class AcessoAcademicoService : IAcessoAcademicoService
{
    private readonly PlataformaContext _context;

    public AcessoAcademicoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<bool> TemAcessoLiberadoAsync(Matricula matricula)
    {
        if (matricula.Status != StatusMatricula.Aprovada)
        {
            return false;
        }

        var precoCurso = matricula.Curso?.Preco
            ?? await _context.Cursos
                .Where(curso => curso.Id == matricula.CursoId)
                .Select(curso => curso.Preco)
                .FirstOrDefaultAsync();

        if (precoCurso <= 0)
        {
            return true;
        }

        return await _context.Pagamentos
            .AnyAsync(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago);
    }
}
