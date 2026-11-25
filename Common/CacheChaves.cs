namespace PlataformaEnsino.API.Common;

/// <summary>
/// Chaves de IMemoryCache usadas em mais de um lugar - hoje só o corte "na
/// hora" de usuário inativo (docs/alunos-admin/PROMPT-agente-editar-e-
/// inativar-aluno.md, item A4): Program.cs (JwtBearerEvents.OnTokenValidated)
/// lê, AlunoService escreve/invalida ao inativar/reativar. Centralizado para
/// os dois lados nunca formatarem a chave de jeitos diferentes.
/// </summary>
public static class CacheChaves
{
    public static string UsuarioAtivo(int usuarioId) => $"usuario-ativo-{usuarioId}";
}
