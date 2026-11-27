import { formatDate, parseApiDate } from "./format.js";

export const TIPO_AVALIACAO_PROVA = 2;
export const TIPO_AVALIACAO_EXERCICIO = 3;

// Icone+cor por tipo de avaliacao (docs/redesign-mobile/PROMPT-agente-
// avaliacoes-ajustes-2-icone.md, item 1, opcao A) - mapa central pra
// reaproveitar depois na Home e no Progresso, nao so em AvaliacoesScreen.jsx.
// Quiz (tipo 1) nunca passa por aqui - fica fora da aba Avaliacoes.
export const VISUAL_TIPO_AVALIACAO = {
  [TIPO_AVALIACAO_PROVA]: {
    rotulo: "PROVA",
    corRotulo: "#a78bfa",
    icone: "clipboard-check-outline",
    corIcone: "#d6c8ff",
    gradiente: ["rgba(123, 47, 247, 0.38)", "rgba(123, 47, 247, 0.12)"],
    corBorda: "rgba(157, 103, 255, 0.45)"
  },
  [TIPO_AVALIACAO_EXERCICIO]: {
    rotulo: "EXERCÍCIO",
    corRotulo: "#93c5fd",
    icone: "clipboard-edit-outline",
    corIcone: "#bfdbfe",
    gradiente: ["rgba(59, 130, 246, 0.36)", "rgba(59, 130, 246, 0.1)"],
    corBorda: "rgba(96, 165, 250, 0.45)"
  }
};

export function obterVisualTipoAvaliacao(tipoAvaliacao) {
  return VISUAL_TIPO_AVALIACAO[Number(tipoAvaliacao)] || VISUAL_TIPO_AVALIACAO[TIPO_AVALIACAO_PROVA];
}

export function criarRespostasIniciais(questoes) {
  return Object.fromEntries(
    questoes.map((questao) => [questao.id, { questaoId: questao.id, alternativaId: null, respostaTexto: "" }])
  );
}

export function obterDisponibilidadeAvaliacao(avaliacao) {
  const agora = new Date();
  const abertura = parseApiDate(avaliacao.dataAbertura);
  const fechamento = parseApiDate(avaliacao.dataFechamento);

  if (!avaliacao.totalQuestoes) {
    return { podeRealizar: false, label: "Sem questões", mensagem: "Esta avaliação ainda não possui questões publicadas.", tone: "aviso" };
  }

  if (avaliacao.progressoLiberado === false) {
    return {
      podeRealizar: false,
      label: "Bloqueada",
      mensagem: avaliacao.conteudoDidaticoId
        ? "Conclua o conteúdo deste quiz para liberá-lo."
        : avaliacao.moduloId
        ? "Conclua todos os conteúdos deste módulo para liberar esta avaliação."
        : "Conclua todos os conteúdos e quizzes do curso para liberar a avaliação final.",
      tone: "aviso"
    };
  }

  if (Number(avaliacao.tentativasRestantes || 0) <= 0) {
    return { podeRealizar: false, label: "Concluída", mensagem: "Você já usou todas as tentativas desta avaliação.", tone: "neutro" };
  }

  if (abertura && abertura > agora) {
    return { podeRealizar: false, label: "Agendada", mensagem: `Esta avaliação abre em ${formatDate(avaliacao.dataAbertura)}.`, tone: "aviso" };
  }

  if (fechamento && fechamento < agora) {
    return { podeRealizar: false, label: "Encerrada", mensagem: "O período para responder esta avaliação já foi encerrado.", tone: "erro" };
  }

  return { podeRealizar: true, label: "Disponível", mensagem: "Avaliação disponível para resposta.", tone: "sucesso" };
}
