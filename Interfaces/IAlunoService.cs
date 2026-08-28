using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IAlunoService
{
    Task<IEnumerable<AlunoResponseDto>> ListarAlunosAsync();
    Task<Aluno> CriarAlunoAsync(CriarAlunoDto dto);
    Task CadastrarAlunoCompletoAsync(CadastroAlunoDto dto);
}
