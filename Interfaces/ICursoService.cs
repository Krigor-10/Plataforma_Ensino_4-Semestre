using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface ICursoService
{
    Task<Curso> CriarCursoAsync(CriarCursoDto dto, int criadoPorId);
    Task<Curso> AtualizarCursoAsync(int id, AtualizarCursoDto dto);
    Task<Curso> ObterCursoPorIdAsync(int id);
    Task<IEnumerable<Curso>> ListarTodosCursosAsync();
    Task<IEnumerable<Curso>> ListarCursosPorProfessorAsync(int professorId);
    Task VincularProfessorAsync(int cursoId, int professorId);
    Task DesvincularProfessorAsync(int cursoId, int professorId);
    Task<bool> ProfessorPertenceAoCursoAsync(int professorId, int cursoId);
    Task AdicionarModuloAsync(int cursoId, Modulo novoModulo);
    Task AtribuirCoordenadorAsync(int cursoId, int coordenadorId);
    Task<Curso> DefinirImagemAsync(int cursoId, string imagemUrl);
}
