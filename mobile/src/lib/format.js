export function parseApiDate(value) {
  if (!value) {
    return null;
  }

  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatDate(value) {
  const data = parseApiDate(value);
  return data ? data.toLocaleDateString("pt-BR") : "-";
}

export function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

export function formatGrade(value) {
  return Number(value ?? 0).toFixed(1);
}

export function formatScore(value) {
  return Number(value ?? 0).toFixed(1);
}

export function formatarTempoRestante(segundosRestantes) {
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function normalizeStatus(status) {
  const labels = ["Pendente", "Aprovada", "Rejeitada", "Cancelada"];
  return typeof status === "number" ? labels[status] || "Desconhecida" : status || "Desconhecida";
}

export function normalizeContentType(type) {
  const labels = { 1: "Texto", 2: "PDF", 3: "Video", 4: "Link", 5: "Imagem" };
  return typeof type === "number" ? labels[type] || "Desconhecido" : type || "Desconhecido";
}

export function normalizeProgressStatus(status) {
  const labels = { 1: "Nao iniciado", 2: "Em andamento", 3: "Concluido" };
  return typeof status === "number" ? labels[status] || "Desconhecido" : status || "Nao iniciado";
}

export function normalizeEvaluationType(type) {
  const labels = { 1: "Quiz", 2: "Prova", 3: "Exercicio" };
  return typeof type === "number" ? labels[type] || "Avaliacao" : type || "Avaliacao";
}

export function normalizeQuestionType(type) {
  const labels = { 1: "Multipla escolha", 2: "Verdadeiro/Falso", 3: "Dissertativa" };
  return typeof type === "number" ? labels[type] || "Questao" : type || "Questao";
}
