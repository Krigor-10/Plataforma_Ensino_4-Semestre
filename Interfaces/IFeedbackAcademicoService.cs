using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IFeedbackAcademicoService
{
    Task<FeedbackAcademicoResponseDto> CriarFeedbackAsync(int professorId, int alunoId, CriarFeedbackAcademicoDto dto);
    Task<IEnumerable<FeedbackAcademicoResponseDto>> ListarPorAlunoAsync(int alunoId, int usuarioLogadoId, string tipoUsuarioLogado);
    Task MarcarComoLidoAsync(int feedbackId, int alunoId);
}
