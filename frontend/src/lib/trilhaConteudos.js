// Helpers compartilhados entre as trilhas de Conteudos do Professor
// (SecaoConteudosProfessor.jsx/TelaModuloGestaoProfessor.jsx) e do Aluno
// (SecoesAluno.jsx), extraidos pra nao duplicar a mesma logica de
// normalizacao/titulo-generico/status entre as telas (e pra SecaoConteudos
// Professor.jsx e TelaModuloGestaoProfessor.jsx nao precisarem de import
// circular um do outro).

export const STATUS_RASCUNHO = 1;
export const STATUS_PUBLICADO = 2;
export const STATUS_ARQUIVADO = 3;

export const TITULO_LOTE_POR_ACAO = {
  publicar: "Publicar selecionados",
  rascunho: "Voltar para rascunho",
  arquivar: "Arquivar selecionados",
  excluir: "Excluir selecionados"
};

export function montarPayloadConteudo(conteudo, overrides = {}) {
  return {
    titulo: conteudo.titulo,
    descricao: conteudo.descricao || "",
    tipoConteudo: Number(conteudo.tipoConteudo),
    corpoTexto: conteudo.corpoTexto || "",
    arquivoUrl: conteudo.arquivoUrl || "",
    linkUrl: conteudo.linkUrl || "",
    moduloId: conteudo.moduloId,
    statusPublicacao: Number(conteudo.statusPublicacao),
    ordemExibicao: conteudo.ordemExibicao ?? 0,
    pesoProgresso: conteudo.pesoProgresso ?? 1,
    ...overrides
  };
}

// Espelha montarDadosEnvioAvaliacao (AssistenteQuizAvaliacao.jsx) - mesmos campos
// que o PUT /Avaliacoes/{id} exige, reaproveitando os dados que o quiz ja tem pra
// trocar so o status (publicar/voltar a rascunho/restaurar) sem abrir o modal
// inteiro. Nao e rota nova, e o mesmo PUT que o modal ja usa pra salvar.
export function montarPayloadAvaliacao(quiz, overrides = {}) {
  return {
    titulo: quiz.titulo,
    descricao: quiz.descricao || "",
    cursoId: quiz.cursoId,
    moduloId: quiz.moduloId ?? null,
    conteudoDidaticoId: quiz.conteudoDidaticoId ?? null,
    tipoAvaliacao: Number(quiz.tipoAvaliacao),
    statusPublicacao: Number(quiz.statusPublicacao),
    dataAbertura: quiz.dataAbertura || null,
    dataFechamento: quiz.dataFechamento || null,
    tentativasPermitidas: quiz.tentativasPermitidas ?? 1,
    tempoLimiteMinutos: quiz.tempoLimiteMinutos ?? null,
    notaMaxima: quiz.notaMaxima ?? 10,
    pesoNota: quiz.pesoNota ?? 1,
    pesoProgresso: quiz.pesoProgresso ?? 1,
    ...overrides
  };
}

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

const STATUS_PUBLICADO_CONTEUDO = 2;

// Filtra modulos/conteudos/quizzes pro que esta Publicado e descarta modulo
// vazio - usado pela previa "Visualizar como aluno" (PreviaTrilhaAluno), que
// consome os mesmos dados de GET /Cursos/{id}/revisao-conteudo.
export function montarModulosPublicados(modulosDoCurso, conteudosPorModuloId, quizzesPorModuloId) {
  return modulosDoCurso
    .map((modulo, indice) => {
      const itens = (conteudosPorModuloId.get(modulo.id) || []).filter(
        (conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO_CONTEUDO
      );
      const quizzesDoModulo = (quizzesPorModuloId.get(modulo.id) || []).filter(
        (quiz) => Number(quiz.statusPublicacao) === STATUS_PUBLICADO_CONTEUDO
      );
      return { indice, itens, modulo, quizzesDoModulo };
    })
    .filter(({ itens, quizzesDoModulo }) => itens.length > 0 || quizzesDoModulo.length > 0);
}

// Situacao do curso pro cartao do topo da tela do modulo (Coordenador/Admin,
// docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md,
// item 1) - mesma regra de rotulo da tela Inscricoes (SecaoMatriculas.jsx,
// ROTULO_SITUACAO_CURSO), calculada aqui a partir do proprio Curso (sem
// endpoint novo): encerrado > a venda > aguardando encerramento > andamento.
export function obterSituacaoCurso(curso) {
  if (curso.encerradoEm) {
    return "Encerrado";
  }
  if (curso.publicadoParaVendaEm) {
    return "À venda";
  }
  if (curso.concluidoPeloProfessorEm) {
    return "Aguardando encerramento";
  }
  return "Em andamento";
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
