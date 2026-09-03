using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class PagamentoService : IPagamentoService
{
    private readonly PlataformaContext _context;
    private readonly INotificacaoService _notificacaoService;

    public PagamentoService(PlataformaContext context, INotificacaoService notificacaoService)
    {
        _context = context;
        _notificacaoService = notificacaoService;
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

        var tituloCurso = pagamento.Matricula?.Curso?.Titulo ?? "seu curso";
        await _notificacaoService.NotificarAsync(
            alunoId,
            "Pagamento confirmado",
            $"Seu pagamento do curso \"{tituloCurso}\" foi confirmado. Seu acesso ja esta liberado.",
            TipoNotificacao.PagamentoConfirmado,
            "/app/cursos-matriculados");

        return MapResponse(pagamento);
    }

    private static PagamentoAlunoResponseDto MapResponse(Pagamento pagamento)
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
