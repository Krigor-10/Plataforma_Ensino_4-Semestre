namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Pra onde a liberacao de avaliacao por progresso e calculada (ver
/// IProgressoAlunoService.ObterLiberacaoAvaliacoesAsync): quiz de modulo exige
/// 100% dos conteudos DAQUELE modulo (sem contar o proprio quiz, pra nao virar
/// uma dependencia circular com o calculo de ProgressoModuloAluno); avaliacao
/// final (sem modulo) exige 100% dos conteudos do curso inteiro E todos os
/// quizzes de modulo ja enviados.
/// </summary>
public record LiberacaoAvaliacoesInfo(HashSet<int> ModulosComConteudoCompleto, bool CursoCompleto);
