namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Pra onde a liberacao de avaliacao por progresso e calculada (ver
/// IProgressoAlunoService.ObterLiberacaoAvaliacoesAsync):
/// - quiz vinculado a um conteudo (Avaliacao.ConteudoDidaticoId) libera assim
///   que ESSE conteudo e concluido (ordem estrita da trilha, docs/
///   TelaConteudosAlunos/PROMPT-agente-quiz-vinculado-ordem-estrita.md);
/// - quiz solto do modulo exige 100% dos conteudos DAQUELE modulo (sem contar o
///   proprio quiz, pra nao virar uma dependencia circular com o calculo de
///   ProgressoModuloAluno);
/// - avaliacao final (sem modulo) exige 100% dos conteudos do curso inteiro E
///   todos os quizzes de modulo ja enviados.
/// ConteudosPublicados guarda os conteudos que contam na trilha: um quiz
/// vinculado a um conteudo que saiu dela (excluido/despublicado) volta pra
/// regra do quiz solto, em vez de ficar travado pra sempre.
/// </summary>
public record LiberacaoAvaliacoesInfo(
    HashSet<int> ModulosComConteudoCompleto,
    bool CursoCompleto,
    HashSet<int> ConteudosConcluidos,
    HashSet<int> ConteudosPublicados);
