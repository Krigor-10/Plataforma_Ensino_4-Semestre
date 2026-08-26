export function iniciaisNome(nome = "") {
  return String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export function siglas(titulo = "") {
  const palavras = String(titulo || "").trim().split(/\s+/).filter(Boolean);

  if (!palavras.length) {
    return "--";
  }

  if (palavras.length === 1) {
    return palavras[0].slice(0, 2).toUpperCase();
  }

  return palavras.slice(0, 2).map((palavra) => palavra[0]).join("").toUpperCase();
}

export function normalizeStatus(status) {
  const labels = ["Pendente", "Aprovada", "Rejeitada", "Cancelada"];

  if (typeof status === "number") {
    return labels[status] || "Desconhecida";
  }

  return status || "Desconhecida";
}

export function normalizePublicationStatus(status) {
  const labels = {
    1: "Rascunho",
    2: "Publicado",
    3: "Arquivado"
  };

  if (typeof status === "number") {
    return labels[status] || "Desconhecido";
  }

  return status || "Desconhecido";
}

export function publicationStatusTone(status) {
  switch (normalizePublicationStatus(status)) {
    case "Publicado":
      return "success";
    case "Rascunho":
      return "warning";
    case "Arquivado":
      return "danger";
    default:
      return "info";
  }
}

export function normalizeContentType(type) {
  const labels = {
    1: "Texto",
    2: "PDF",
    3: "Video",
    4: "Link"
  };

  if (typeof type === "number") {
    return labels[type] || "Desconhecido";
  }

  return type || "Desconhecido";
}

export function normalizeProgressStatus(status) {
  const labels = {
    1: "Nao iniciado",
    2: "Em andamento",
    3: "Concluido"
  };

  if (typeof status === "number") {
    return labels[status] || "Desconhecido";
  }

  return status || "Nao iniciado";
}

export function progressStatusTone(status) {
  switch (normalizeProgressStatus(status)) {
    case "Concluido":
      return "success";
    case "Em andamento":
      return "warning";
    default:
      return "info";
  }
}

export function statusTone(status) {
  switch (normalizeStatus(status)) {
    case "Aprovada":
      return "success";
    case "Rejeitada":
    case "Cancelada":
      return "danger";
    case "Pendente":
      return "warning";
    default:
      return "info";
  }
}

export function compactText(value, maxLength) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function describeCourse(course) {
  if (course.descricao) {
    return compactText(course.descricao, 120);
  }

  return "Trilha estruturada, acompanhamento academico e jornadas pensadas para evolucao real.";
}

export function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

export function formatDate(value) {
  const parsed = parseApiDate(value);
  if (!parsed) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

export function parseApiDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  const serializedUtcWithoutZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?$/.test(text);
  const parsed = new Date(serializedUtcWithoutZone ? `${text}Z` : text);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function timestampFromApiDate(value, fallback = 0) {
  const parsed = parseApiDate(value);
  return parsed ? parsed.getTime() : fallback;
}

export function formatGrade(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? numeric.toFixed(1).replace(".", ",") : "-";
}

export function formatPercent(value) {
  const numeric = Number(value || 0);
  return `${Math.max(0, Math.min(numeric, 100)).toFixed(0)}%`;
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

export function maskCpf(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return value || "-";
  }

  return `***.***.***-${digits.slice(-2)}`;
}
