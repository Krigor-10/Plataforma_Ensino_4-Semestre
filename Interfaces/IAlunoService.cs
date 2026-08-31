using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IAlunoService
{
    Task<(IEnumerable<AlunoResponseDto> Itens, int TotalItens)> ListarAlunosAsync(int? pagina, int? tamanhoPagina);
    Task<Aluno> CriarAlunoAsync(CriarAlunoDto dto);
    Task CadastrarAlunoCompletoAsync(CadastroAlunoDto dto);
}
