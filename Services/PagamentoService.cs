using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class PagamentoService : IPagamentoService
{
    private readonly PlataformaContext _context;
    private readonly INotificacaoService _notificacaoService;
    private readonly IConfiguration _configuration;
    private readonly ICertificadoService? _certificadoService;

    // certificadoService opcional so pra nao obrigar os testes existentes
    // (que instanciam PagamentoService direto) a passar um fake - ver o
    // mesmo padrao em CertificadoService/ProgressoAlunoService.
    public PagamentoService(PlataformaContext context, INotificacaoService notificacaoService, IConfiguration configuration, ICertificadoService? certificadoService = null)
    {
        _context = context;
        _notificacaoService = notificacaoService;
        _configuration = configuration;
        _certificadoService = certificadoService;
    }

    public async Task<IEnumerable<PagamentoAlunoResponseDto>> ListarPagamentosDoAlunoAsync(int alunoId)
    {
        // Materializa ANTES de mapear: MapResponse agora e metodo de instancia
        // (le _configuration pro VenceEm) - encadear .Select(MapResponse) direto
        // no IQueryable faria o EF tentar traduzir/avaliar a query capturando
        // "this", e ele avisa (CoreEventId.ClientProjectionCapturingConstantInQueryWarning)
        // que isso pode vazar memoria. Com o ToListAsync() aqui, o Select()
        // roda em memoria (LINQ to Objects), sem esse problema.
        var pagamentos = await _context.Pagamentos
            .AsNoTracking()
            .Include(pagamento => pagamento.Matricula)
            .ThenInclude(matricula => matricula!.Curso)
            .Where(pagamento => pagamento.Matricula!.AlunoId == alunoId)
            .OrderByDescending(pagamento => pagamento.CriadoEm)
            .ToListAsync();

        return pagamentos.Select(MapResponse);
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

        if (_certificadoService is not null)
        {
            await _certificadoService.TentarEmitirAutomaticamenteAsync(matriculaId);
        }

        return MapResponse(pagamento);
    }

    public async Task<PagamentoAlunoResponseDto> CancelarAsync(int matriculaId, int alunoId)
    {
        var matriculaPertenceAoAluno = await _context.Matriculas
            .AnyAsync(matricula => matricula.Id == matriculaId && matricula.AlunoId == alunoId);
        if (!matriculaPertenceAoAluno)
        {
            throw new KeyNotFoundException("Matricula nao encontrada.");
        }

        var pagamento = await _context.Pagamentos
            .Include(item => item.Matricula)
            .ThenInclude(matricula => matricula!.Curso)
            .FirstOrDefaultAsync(item => item.MatriculaId == matriculaId && item.Status == StatusPagamento.Pendente)
            ?? throw new ConflitoDeNegocioException("Nao ha pagamento pendente para esta matricula.");

        pagamento.Cancelar();
        await _context.SaveChangesAsync();

        return MapResponse(pagamento);
    }

    private PagamentoAlunoResponseDto MapResponse(Pagamento pagamento)
    {
        var diasParaVencer = _configuration.GetValue("Pagamentos:DiasParaVencer", PagamentoVencimentoExecutor.DiasParaVencerPadrao);

        return new PagamentoAlunoResponseDto
        {
            Id = pagamento.Id,
            MatriculaId = pagamento.MatriculaId,
            CursoId = pagamento.Matricula?.CursoId ?? 0,
            CursoTitulo = pagamento.Matricula?.Curso?.Titulo ?? string.Empty,
            Valor = pagamento.Valor,
            Status = pagamento.Status,
            CriadoEm = pagamento.CriadoEm,
            PagoEm = pagamento.PagoEm,
            VenceEm = pagamento.Status == StatusPagamento.Pendente ? pagamento.CriadoEm.AddDays(diasParaVencer) : null
        };
    }
}
