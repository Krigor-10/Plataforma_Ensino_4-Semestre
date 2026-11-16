using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IProgressoAlunoService
{
    Task<ProgressoAlunoSnapshotDto> ObterSnapshotAsync(int alunoId);
    Task<ProgressoAlunoSnapshotDto> MarcarConteudoConcluidoAsync(int alunoId, int conteudoId);
    Task RecalcularNotaAvaliacaoAsync(int matriculaId, int avaliacaoId);

    /// <summary>
    /// Quiz e atividade formativa: nao gera nota (ver RecalcularNotaAvaliacaoAsync,
    /// usado so por Prova/Exercicio), so conta pro percentual de progresso do
    /// modulo/curso quando o aluno envia uma tentativa.
    /// </summary>
    Task RecalcularProgressoQuizAsync(int matriculaId, int avaliacaoId);

    /// <summary>
    /// Usado pra decidir se uma avaliacao (quiz de modulo ou avaliacao final do
    /// curso) ja pode ser respondida pelo aluno, com base no progresso dos
    /// conteudos — ver LiberacaoAvaliacoesInfo pra regra exata.
    /// </summary>
    Task<LiberacaoAvaliacoesInfo> ObterLiberacaoAvaliacoesAsync(int matriculaId);

    /// <summary>
    /// Recalcula o progresso de todas as matriculas aprovadas do curso -
    /// chamado pelo professor publicar/despublicar/excluir conteudo ou quiz,
    /// ou excluir modulo. Nao faz nada em curso que nao aceita edicao
    /// (encerrado ou concluido-travado).
    /// </summary>
    Task RecalcularProgressoDoCursoAsync(int cursoId);

    /// <summary>
    /// Migracao de dados: recalcula todas as matriculas aprovadas de todo
    /// curso nao encerrado (inclusive concluido-travado - excecao so pra
    /// esta correcao historica). Ver implementacao pra detalhes.
    /// </summary>
    Task RecalcularProgressoDeCursosNaoEncerradosAsync();
}
