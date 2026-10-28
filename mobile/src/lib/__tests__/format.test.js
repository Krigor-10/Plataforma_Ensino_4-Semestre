import {
  formatCep,
  formatGrade,
  formatPercent,
  formatScore,
  formatTelefone,
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

  it("interpreta data ISO sem sufixo de fuso como UTC, igual ao Web (frontend/src/lib/format.js)", () => {
    // Formato real devolvido pela API (EF Core le datetime2 do SQL Server como
    // Kind=Unspecified, entao o JSON sai sem "Z") - sem esse ajuste, new Date()
    // interpretaria como hora local do dispositivo em vez de UTC, podendo
    // divergir do status calculado pelo Web pro mesmo dado (ver
    // obterDisponibilidadeAvaliacao em avaliacoes.js).
    const comZ = parseApiDate("2026-04-27T06:26:00Z");
    const semZ = parseApiDate("2026-04-27T06:26:00");
    expect(semZ.getTime()).toBe(comZ.getTime());
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
  it("formata com uma casa decimal e virgula pt-BR", () => {
    expect(formatGrade(8)).toBe("8,0");
    expect(formatScore(7.25)).toBe("7,3");
  });

  it("formatGrade trata valor ausente/zero como traco, nao '0,0'", () => {
    expect(formatGrade(undefined)).toBe("-");
    expect(formatGrade(null)).toBe("-");
    expect(formatGrade(0)).toBe("-");
  });

  it("formatScore mantem zero real como '0,0' (resultado ja confirmado)", () => {
    expect(formatScore(null)).toBe("0,0");
    expect(formatScore(0)).toBe("0,0");
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
    expect(normalizeContentType(3)).toBe("Vídeo");
    expect(normalizeContentType(4)).toBe("Link");
    expect(normalizeContentType(5)).toBe("Imagem");
  });

  it("cai em Desconhecido para codigo nao mapeado", () => {
    expect(normalizeContentType(99)).toBe("Desconhecido");
  });
});

describe("normalizeProgressStatus", () => {
  it("mapeia os status conhecidos", () => {
    expect(normalizeProgressStatus(1)).toBe("Não iniciado");
    expect(normalizeProgressStatus(2)).toBe("Em andamento");
    expect(normalizeProgressStatus(3)).toBe("Concluído");
  });

  it("cai em Não iniciado quando o valor e vazio", () => {
    expect(normalizeProgressStatus(null)).toBe("Não iniciado");
  });
});

describe("normalizeEvaluationType", () => {
  it("mapeia os tipos conhecidos", () => {
    expect(normalizeEvaluationType(1)).toBe("Quiz");
    expect(normalizeEvaluationType(2)).toBe("Prova");
    expect(normalizeEvaluationType(3)).toBe("Exercício");
  });
});

describe("normalizeQuestionType", () => {
  it("mapeia os tipos conhecidos, incluindo dissertativa", () => {
    expect(normalizeQuestionType(1)).toBe("Múltipla escolha");
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

describe("formatTelefone", () => {
  it("formata celular (11 digitos) como (DD) 9XXXX-XXXX", () => {
    expect(formatTelefone("11999990004")).toBe("(11) 99999-0004");
  });

  it("formata fixo (10 digitos) como (DD) XXXX-XXXX", () => {
    expect(formatTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("ignora caracteres nao numericos antes de formatar", () => {
    expect(formatTelefone("(11) 99999-0004")).toBe("(11) 99999-0004");
  });

  it("mostra so os digitos quando nao tem DDD ou o tamanho e outro", () => {
    expect(formatTelefone("999990004")).toBe("999990004");
    expect(formatTelefone("123")).toBe("123");
    expect(formatTelefone("")).toBe("");
  });
});
