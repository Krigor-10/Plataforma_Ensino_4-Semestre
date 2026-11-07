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

    /// <summary>
    /// Regra especifica pra criar modulo (rodada 2 "tela do curso do
    /// Coordenador" - a criacao passou do Coordenador pro Professor):
    /// Admin sempre pode; Professor so se tiver vinculo em ProfessoresCursos
    /// com o curso informado. Coordenador NAO entra aqui (continua podendo
    /// editar/excluir via PodeGerenciarCursoAsync/PodeGerenciarModuloAsync,
    /// so nao cria).
    /// </summary>
    Task<bool> PodeCriarModuloAsync(ClaimsPrincipal usuario, int cursoId);
}
