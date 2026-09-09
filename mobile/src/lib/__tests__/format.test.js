import {
  formatCep,
  formatGrade,
  formatPercent,
  formatScore,
  formatarTempoRestante,
  normalizeContentType,
  normalizeEvaluationType,
  normalizeProgressStatus,
  normalizeQuestionType,
  normalizeStatus,
  onlyDigits,
  parseApiDate
} from "../format.js";

describe("parseApiDate", () => {
  it("converte uma data ISO valida", () => {
    expect(parseApiDate("2026-09-09T10:00:00Z")).toBeInstanceOf(Date);
  });

  it("retorna null para valor vazio", () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate("")).toBeNull();
  });

  it("retorna null para data invalida", () => {
    expect(parseApiDate("nao-e-uma-data")).toBeNull();
  });
});

describe("formatPercent", () => {
  it("arredonda e adiciona simbolo de porcentagem", () => {
    expect(formatPercent(66.6)).toBe("67%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("trata valores invalidos como zero", () => {
    expect(formatPercent(undefined)).toBe("0%");
    expect(formatPercent(null)).toBe("0%");
  });
});

describe("formatGrade / formatScore", () => {
  it("formata com uma casa decimal", () => {
    expect(formatGrade(8)).toBe("8.0");
    expect(formatScore(7.25)).toBe("7.3");
  });

  it("trata valores ausentes como zero", () => {
    expect(formatGrade(undefined)).toBe("0.0");
    expect(formatScore(null)).toBe("0.0");
  });
});

describe("formatarTempoRestante", () => {
  it("formata segundos como mm:ss", () => {
    expect(formatarTempoRestante(125)).toBe("02:05");
    expect(formatarTempoRestante(59)).toBe("00:59");
    expect(formatarTempoRestante(0)).toBe("00:00");
  });

  it("suporta mais de 59 minutos", () => {
    expect(formatarTempoRestante(3600)).toBe("60:00");
  });
});

describe("normalizeStatus", () => {
  it("mapeia codigos numericos conhecidos", () => {
    expect(normalizeStatus(0)).toBe("Pendente");
    expect(normalizeStatus(1)).toBe("Aprovada");
    expect(normalizeStatus(2)).toBe("Rejeitada");
    expect(normalizeStatus(3)).toBe("Cancelada");
  });

  it("repassa strings como estao", () => {
    expect(normalizeStatus("Aprovada")).toBe("Aprovada");
  });

  it("cai em Desconhecida para codigo fora do range ou valor vazio", () => {
    expect(normalizeStatus(99)).toBe("Desconhecida");
    expect(normalizeStatus(null)).toBe("Desconhecida");
  });
});

describe("normalizeContentType", () => {
  it("mapeia os tipos conhecidos", () => {
    expect(normalizeContentType(1)).toBe("Texto");
    expect(normalizeContentType(2)).toBe("PDF");
    expect(normalizeContentType(3)).toBe("Video");
    expect(normalizeContentType(4)).toBe("Link");
    expect(normalizeContentType(5)).toBe("Imagem");
  });

  it("cai em Desconhecido para codigo nao mapeado", () => {
    expect(normalizeContentType(99)).toBe("Desconhecido");
  });
});

describe("normalizeProgressStatus", () => {
  it("mapeia os status conhecidos", () => {
    expect(normalizeProgressStatus(1)).toBe("Nao iniciado");
    expect(normalizeProgressStatus(2)).toBe("Em andamento");
    expect(normalizeProgressStatus(3)).toBe("Concluido");
  });

  it("cai em Nao iniciado quando o valor e vazio", () => {
    expect(normalizeProgressStatus(null)).toBe("Nao iniciado");
  });
});

describe("normalizeEvaluationType", () => {
  it("mapeia os tipos conhecidos", () => {
    expect(normalizeEvaluationType(1)).toBe("Quiz");
    expect(normalizeEvaluationType(2)).toBe("Prova");
    expect(normalizeEvaluationType(3)).toBe("Exercicio");
  });
});

describe("normalizeQuestionType", () => {
  it("mapeia os tipos conhecidos, incluindo dissertativa", () => {
    expect(normalizeQuestionType(1)).toBe("Multipla escolha");
    expect(normalizeQuestionType(2)).toBe("Verdadeiro/Falso");
    expect(normalizeQuestionType(3)).toBe("Dissertativa");
  });
});

describe("onlyDigits", () => {
  it("remove tudo que nao for digito", () => {
    expect(onlyDigits("123.456-789")).toBe("123456789");
    expect(onlyDigits(null)).toBe("");
  });
});

describe("formatCep", () => {
  it("formata 8 digitos como 00000-000", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("retorna o valor original (trim) quando nao tem 8 digitos", () => {
    expect(formatCep("123")).toBe("123");
  });
});
