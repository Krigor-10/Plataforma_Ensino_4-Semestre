import { formatDate, parseApiDate } from "./format.js";

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
    return { podeRealizar: false, label: "Sem questoes", mensagem: "Esta avaliacao ainda nao possui questoes publicadas.", tone: "aviso" };
  }

  if (Number(avaliacao.tentativasRestantes || 0) <= 0) {
    return { podeRealizar: false, label: "Concluida", mensagem: "Voce ja usou todas as tentativas desta avaliacao.", tone: "sucesso" };
  }

  if (abertura && abertura > agora) {
    return { podeRealizar: false, label: "Agendada", mensagem: `Esta avaliacao abre em ${formatDate(avaliacao.dataAbertura)}.`, tone: "aviso" };
  }

  if (fechamento && fechamento < agora) {
    return { podeRealizar: false, label: "Encerrada", mensagem: "O periodo para responder esta avaliacao ja foi encerrado.", tone: "erro" };
  }

  return { podeRealizar: true, label: "Disponivel", mensagem: "Avaliacao disponivel para resposta.", tone: "sucesso" };
}
