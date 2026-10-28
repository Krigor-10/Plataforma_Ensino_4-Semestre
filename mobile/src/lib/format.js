// Mesmo criterio do Web (frontend/src/lib/format.js): o backend serializa
// DateTime como ISO sem sufixo de timezone (ex. "2026-04-27T06:26:00", sem
// "Z") porque o EF Core le datetime2 do SQL Server como Kind=Unspecified,
// mesmo o valor sendo UTC. "2026-04-27T06:26:00" sem "Z" e interpretado pelo
// JS como hora LOCAL do dispositivo, nao UTC - no RN isso usa o fuso do
// aparelho do aluno, que pode diferir do servidor e fazer uma avaliacao ja
// aberta parecer "Agendada" (ou o inverso) ate a diferenca de fuso passar.
// Sem esse ajuste, mobile e Web podem calcular status de disponibilidade de
// avaliacao (obterDisponibilidadeAvaliacao) de forma diferente a partir do
// mesmo dado vindo da API.
export function parseApiDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const texto = String(value).trim();
  const serializadoUtcSemFuso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?$/.test(texto);
  const data = new Date(serializadoUtcSemFuso ? `${texto}Z` : texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatDate(value) {
  const data = parseApiDate(value);
  return data ? data.toLocaleDateString("pt-BR") : "-";
}

export function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

// Mesmo padrao do Web (frontend/src/lib/format.js): virgula decimal pt-BR e
// "-" em vez de "0,0" quando o valor e ausente/zero, pra nao sugerir uma nota
// que nunca foi lancada. Usada pra nota final/media — valores onde zero quase
// sempre significa "ainda sem nota", nao "o aluno tirou zero".
export function formatGrade(value) {
  const numero = Number(value || 0);
  return numero > 0 ? numero.toFixed(1).replace(".", ",") : "-";
}

export function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

// Mesma formatacao de formatGrade, mas sem o fallback "-": usada pra notas
// onde zero e um resultado real e ja confirmado (nota obtida numa tentativa
// ja enviada, nota maxima de uma questao), nao um valor ainda nao lancado.
export function formatScore(value) {
  return Number(value || 0).toFixed(1).replace(".", ",");
}

export function formatQuestoes(total) {
  const quantidade = Number(total) || 0;
  return `${quantidade} questão${quantidade === 1 ? "" : "ões"}`;
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
  const labels = { 1: "Texto", 2: "PDF", 3: "Vídeo", 4: "Link", 5: "Imagem" };
  return typeof type === "number" ? labels[type] || "Desconhecido" : type || "Desconhecido";
}

export function normalizeProgressStatus(status) {
  const labels = { 1: "Não iniciado", 2: "Em andamento", 3: "Concluído" };
  return typeof status === "number" ? labels[status] || "Desconhecido" : status || "Não iniciado";
}

export function normalizeEvaluationType(type) {
  const labels = { 1: "Quiz", 2: "Prova", 3: "Exercício" };
  return typeof type === "number" ? labels[type] || "Avaliação" : type || "Avaliação";
}

export function normalizeQuestionType(type) {
  const labels = { 1: "Múltipla escolha", 2: "Verdadeiro/Falso", 3: "Dissertativa", 4: "Afirmativas combinadas" };
  return typeof type === "number" ? labels[type] || "Questão" : type || "Questão";
}

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatCep(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 8) {
    return String(value || "").trim();
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// Celular (DDD + 9 digitos, 11 no total) vira "(11) 99999-0004"; fixo (DDD +
// 8 digitos, 10 no total) vira "(11) 3333-4444". Sem DDD ou com qualquer
// outro tamanho (numero incompleto, internacional etc.) mostra so os
// digitos, sem tentar adivinhar onde cortar.
export function formatTelefone(value) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

// Mesmo criterio de normalizarBusca em frontend/SecaoCursos.jsx — minusculas
// + sem acentos, pra "avaliacao"/"Avaliação" baterem na mesma busca.
export function normalizarTermoBusca(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function obterIniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}
