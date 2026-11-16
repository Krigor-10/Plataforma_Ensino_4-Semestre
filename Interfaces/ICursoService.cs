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
    Task<IEnumerable<Professor>> ListarProfessoresVinculadosAsync(int cursoId);
    Task<bool> ProfessorPertenceAoCursoAsync(int professorId, int cursoId);
    Task GarantirCursoAbertoParaEdicaoAsync(int cursoId);
    Task GarantirCursoAbertoParaMatriculaAsync(int cursoId);
    Task ConcluirCursoComoProfessorAsync(int cursoId, int professorId);
    Task EncerrarCursoAsync(int cursoId, int coordenadorId);
    Task ReabrirCursoAsync(int cursoId, int coordenadorId);
    Task DevolverAoProfessorAsync(int cursoId, int coordenadorId, string? motivo);
    Task AdicionarModuloAsync(int cursoId, Modulo novoModulo);
    Task AtribuirCoordenadorAsync(int cursoId, int coordenadorId);
    Task<Curso> DefinirImagemAsync(int cursoId, string imagemUrl);
    Task<Curso> DefinirPacoteAsync(int cursoId, AtualizarPacoteCursoDto dto);
    Task PublicarParaVendaAsync(int cursoId);
    Task DespublicarDaVendaAsync(int cursoId);
}
