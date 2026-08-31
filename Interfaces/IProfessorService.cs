using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IProfessorService
{
    Task<IEnumerable<Professor>> ListarProfessoresAsync();
    Task<Professor> CriarProfessorAsync(CriarProfessorDto dto);
    Task<Professor> AtualizarProfessorAsync(int id, AtualizarProfessorDto dto);
    Task ExcluirProfessorAsync(int id);
}
