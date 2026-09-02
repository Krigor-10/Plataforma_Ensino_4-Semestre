using System.Security.Claims;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Centraliza a checagem de posse (Curso/Modulo/Turma pertence ao Coordenador autenticado)
/// usada pelos endpoints administrativos compartilhados entre Admin e Coordenador. Admin
/// sempre tem permissao; Coordenador so gerencia recursos vinculados ao seu proprio CoordenadorId.
/// </summary>
public interface ICursoAutorizacaoService
{
    Task<bool> PodeGerenciarCursoAsync(ClaimsPrincipal usuario, int cursoId);
    Task<bool> PodeGerenciarModuloAsync(ClaimsPrincipal usuario, int moduloId);
    Task<bool> PodeGerenciarTurmaAsync(ClaimsPrincipal usuario, int turmaId);
}
