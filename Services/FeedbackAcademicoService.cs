using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class FeedbackAcademicoService : IFeedbackAcademicoService
{
    private readonly PlataformaContext _context;

    public FeedbackAcademicoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<FeedbackAcademicoResponseDto> CriarFeedbackAsync(int professorId, int alunoId, CriarFeedbackAcademicoDto dto)
    {
        var alunoNaTurmaDoProfessor = await _context.Matriculas.AnyAsync(matricula =>
            matricula.AlunoId == alunoId &&
            matricula.Status == StatusMatricula.Aprovada &&
            matricula.Turma != null &&
            matricula.Turma.ProfessorId == professorId);

        if (!alunoNaTurmaDoProfessor)
        {
            throw new InvalidOperationException("O aluno informado nao esta matriculado em nenhuma turma do professor autenticado.");
        }

        var professorNome = await _context.Usuarios
            .Where(usuario => usuario.Id == professorId)
            .Select(usuario => usuario.Nome)
            .FirstOrDefaultAsync() ?? string.Empty;

        var feedback = new FeedbackAcademico
        {
            DestinatarioId = alunoId,
            AutorId = professorId,
            Origem = dto.Origem.Trim(),
            Mensagem = dto.Mensagem.Trim()
        };

        _context.FeedbacksAcademicos.Add(feedback);
        await _context.SaveChangesAsync();

        return MapResponse(feedback, professorNome);
    }

    public async Task<IEnumerable<FeedbackAcademicoResponseDto>> ListarPorAlunoAsync(int alunoId, int usuarioLogadoId, string tipoUsuarioLogado)
    {
        var query = _context.FeedbacksAcademicos
            .AsNoTracking()
            .Where(feedback => feedback.DestinatarioId == alunoId);

        query = tipoUsuarioLogado switch
        {
            "Aluno" when usuarioLogadoId == alunoId => query,
            "Professor" => query.Where(feedback => feedback.AutorId == usuarioLogadoId),
            _ => throw new InvalidOperationException("Sem permissao para consultar os feedbacks deste aluno.")
        };

        var feedbacks = await query
            .OrderByDescending(feedback => feedback.CriadoEm)
            .Select(feedback => new
            {
                feedback.Id,
                AutorNome = feedback.Autor != null ? feedback.Autor.Nome : "Sistema",
                feedback.Origem,
                feedback.Mensagem,
                feedback.CriadoEm,
                feedback.Lido
            })
            .ToListAsync();

        return feedbacks.Select(feedback => new FeedbackAcademicoResponseDto
        {
            Id = feedback.Id,
            AutorNome = feedback.AutorNome,
            Origem = feedback.Origem,
            Mensagem = feedback.Mensagem,
            CriadoEm = feedback.CriadoEm,
            Lido = feedback.Lido
        });
    }

    public async Task MarcarComoLidoAsync(int feedbackId, int alunoId)
    {
        var feedback = await _context.FeedbacksAcademicos
            .FirstOrDefaultAsync(item => item.Id == feedbackId)
            ?? throw new KeyNotFoundException("Feedback nao encontrado.");

        if (feedback.DestinatarioId != alunoId)
        {
            throw new InvalidOperationException("Este feedback nao pertence ao aluno autenticado.");
        }

        feedback.MarcarComoLido();
        await _context.SaveChangesAsync();
    }

    private static FeedbackAcademicoResponseDto MapResponse(FeedbackAcademico feedback, string autorNome) => new()
    {
        Id = feedback.Id,
        AutorNome = autorNome,
        Origem = feedback.Origem,
        Mensagem = feedback.Mensagem,
        CriadoEm = feedback.CriadoEm,
        Lido = feedback.Lido
    };
}
