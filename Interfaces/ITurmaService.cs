using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface ITurmaService
{
    Task<Turma> CriarTurmaAsync(Turma turma);
    Task<Turma> ObterTurmaPorIdAsync(int id);
    Task<IEnumerable<Turma>> ListarTurmasAsync();
    Task<IEnumerable<Turma>> ListarTurmasPorProfessorAsync(int professorId);
    Task AtribuirProfessorAsync(int turmaId, int professorId);
    Task<Turma> AtualizarNomeTurmaAsync(int turmaId, string nomeTurma);
    Task ExcluirTurmaAsync(int turmaId);
    Task<IEnumerable<TurmaDesempenhoResponseDto>> ObterDesempenhoPorProfessorAsync(int professorId);
    Task<TurmaDesempenhoResponseDto> ObterDesempenhoPorTurmaAsync(int turmaId, int professorId);
}
