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
    return { podeRealizar: false, label: "Sem questões", mensagem: "Esta avaliação ainda não possui questões publicadas.", tone: "aviso" };
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
