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
}
