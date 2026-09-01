using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class PagamentoService : IPagamentoService
{
    private readonly PlataformaContext _context;

    public PagamentoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PagamentoAlunoResponseDto>> ListarPagamentosDoAlunoAsync(int alunoId)
    {
        return await _context.Pagamentos
            .AsNoTracking()
            .Include(pagamento => pagamento.Matricula)
            .ThenInclude(matricula => matricula!.Curso)
            .Where(pagamento => pagamento.Matricula!.AlunoId == alunoId)
            .OrderByDescending(pagamento => pagamento.CriadoEm)
            .Select(pagamento => MapResponse(pagamento))
            .ToListAsync();
    }

    public async Task<PagamentoAlunoResponseDto> ConfirmarPagamentoAsync(int matriculaId, int alunoId)
    {
        var pagamento = await _context.Pagamentos
            .Include(item => item.Matricula)
            .ThenInclude(matricula => matricula!.Curso)
            .FirstOrDefaultAsync(item => item.MatriculaId == matriculaId && item.Matricula!.AlunoId == alunoId)
            ?? throw new KeyNotFoundException("Pagamento nao encontrado para esta matricula.");

        pagamento.ConfirmarPagamento();
        await _context.SaveChangesAsync();

        return MapResponse(pagamento);
    }

    private static PagamentoAlunoResponseDto MapResponse(Models.Pagamento pagamento)
    {
        return new PagamentoAlunoResponseDto
        {
            Id = pagamento.Id,
            MatriculaId = pagamento.MatriculaId,
            CursoId = pagamento.Matricula?.CursoId ?? 0,
            CursoTitulo = pagamento.Matricula?.Curso?.Titulo ?? string.Empty,
            Valor = pagamento.Valor,
            Status = pagamento.Status,
            CriadoEm = pagamento.CriadoEm,
            PagoEm = pagamento.PagoEm
        };
    }
}
