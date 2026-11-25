using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IAlunoService
{
    /// <summary>
    /// <paramref name="incluirDadosInativacao"/>: só o Admin vê InativadoEm/
    /// InativadoPorNome/MotivoInativacao (A5) - o Coordenador continua
    /// recebendo o mesmo DTO, só que com esses três campos vazios.
    /// </summary>
    Task<(IEnumerable<AlunoResponseDto> Itens, int TotalItens)> ListarAlunosAsync(int? pagina, int? tamanhoPagina, bool incluirDadosInativacao);
    Task<Aluno> CriarAlunoAsync(CriarAlunoDto dto);
    Task<bool> CadastrarAlunoCompletoAsync(CadastroAlunoDto dto);

    /// <summary>PUT /Alunos/{id}, só Admin - nome/e-mail/telefone/RA.</summary>
    Task<AlunoResponseDto> AtualizarDadosAdminAsync(int id, AtualizarAlunoAdminDto dto);

    /// <summary>POST /Alunos/{id}/inativar, só Admin.</summary>
    Task<AlunoResponseDto> InativarAsync(int id, int adminId, string motivo);

    /// <summary>POST /Alunos/{id}/reativar, só Admin.</summary>
    Task<AlunoResponseDto> ReativarAsync(int id);
}
