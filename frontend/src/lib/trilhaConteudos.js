// Helpers compartilhados entre as trilhas de Conteudos do Professor
// (SecaoConteudosProfessor.jsx) e do Aluno (SecoesAluno.jsx), extraidos pra
// nao duplicar a mesma logica de normalizacao/titulo-generico nas duas telas.

export function normalizarTextoComparavel(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Descricao vazia ou identica ao titulo (ignorando acentuacao/caixa) conta
// como "sem descricao": sem seta, sem expansao, sem painel.
export function temDescricaoPropria(descricao, titulo) {
  const descricaoNormalizada = normalizarTextoComparavel(descricao);
  return descricaoNormalizada.length > 0 && descricaoNormalizada !== normalizarTextoComparavel(titulo);
}

// Titulo de quiz vinculado "generico" (repete o nome do conteudo, com ou sem
// prefixo "Quiz"): vira "Quiz do conteudo" na linha, pra nao duplicar o nome
// que ja aparece no material acima - exceto se dois ou mais quizzes do mesmo
// conteudo cairiam nessa regra ao mesmo tempo (ai mostra os titulos reais,
// senao eles ficariam todos identicos entre si).
export function tituloQuizEhGenerico(tituloQuiz, tituloConteudo) {
  const quizNormalizado = normalizarTextoComparavel(tituloQuiz);
  const conteudoNormalizado = normalizarTextoComparavel(tituloConteudo);
  if (!quizNormalizado || !conteudoNormalizado) {
    return false;
  }
  if (quizNormalizado === conteudoNormalizado) {
    return true;
  }
  return [`quiz - ${conteudoNormalizado}`, `quiz – ${conteudoNormalizado}`, `quiz: ${conteudoNormalizado}`].includes(quizNormalizado);
}

export function montarNomesExibicaoQuizzesVinculados(quizzes, tituloConteudo) {
  const genericos = quizzes.filter((quiz) => tituloQuizEhGenerico(quiz.titulo, tituloConteudo));
  const usarNomeGenerico = genericos.length === 1;
  const nomes = new Map();
  quizzes.forEach((quiz) => {
    const ehGenerico = usarNomeGenerico && tituloQuizEhGenerico(quiz.titulo, tituloConteudo);
    nomes.set(quiz.id, ehGenerico ? "Quiz do conteúdo" : quiz.titulo);
  });
  return nomes;
}
