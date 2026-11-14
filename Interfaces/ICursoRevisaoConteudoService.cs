using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface ICursoRevisaoConteudoService
{
    Task<RevisaoConteudoCursoResponseDto> ObterRevisaoConteudoAsync(int cursoId);
}
