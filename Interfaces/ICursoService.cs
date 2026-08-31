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
    Task AdicionarModuloAsync(int cursoId, Modulo novoModulo);
    Task AtribuirCoordenadorAsync(int cursoId, int coordenadorId);
    Task<Curso> DefinirImagemAsync(int cursoId, string imagemUrl);
}
