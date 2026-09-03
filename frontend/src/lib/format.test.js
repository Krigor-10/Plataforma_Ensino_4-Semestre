import { describe, expect, test } from "vitest";
import {
  compactText,
  formatCep,
  formatGrade,
  formatPercent,
  iniciaisNome,
  maskCpf,
  normalizeContentType,
  normalizePublicationStatus,
  parseApiDate,
  siglas
} from "./format.js";

/* Testes de unidade das funcoes puras mais reutilizadas de format.js —
   consumidas por praticamente toda tela do workspace (Conteudos, Avaliacoes,
   Progresso, cards de curso, avatar do usuario). Achado da auditoria de
   engenharia de software de 2026-09-03: infraestrutura de teste do frontend
   (vitest + testing-library) configurada no CI mas cobrindo so 1 smoke test
   de modo demo — nenhuma funcao pura tinha teste. */

describe("iniciaisNome", () => {
  test("pega a primeira letra dos 2 primeiros nomes", () => {
    expect(iniciaisNome("Maria Silva")).toBe("MS");
  });

  test("nome com 3 palavras usa so as 2 primeiras", () => {
    expect(iniciaisNome("Joao Carlos Souza")).toBe("JC");
  });

  test("nome unico usa so 1 letra", () => {
    expect(iniciaisNome("Maria")).toBe("M");
  });

  test("string vazia ou undefined nao quebra", () => {
    expect(iniciaisNome("")).toBe("");
    expect(iniciaisNome(undefined)).toBe("");
  });

  test("espacos extras entre palavras nao geram iniciais vazias", () => {
    expect(iniciaisNome("  Maria   Silva  ")).toBe("MS");
  });
});

describe("siglas", () => {
  test("titulo com 1 palavra usa as 2 primeiras letras", () => {
    expect(siglas("Matematica")).toBe("MA");
  });

  test("titulo com 2+ palavras usa a inicial de cada uma", () => {
    expect(siglas("Desenvolvimento Web Full Stack")).toBe("DW");
  });

  test("titulo vazio retorna o placeholder", () => {
    expect(siglas("")).toBe("--");
    expect(siglas(undefined)).toBe("--");
  });
});

describe("normalizePublicationStatus", () => {
  test.each([
    [1, "Rascunho"],
    [2, "Publicado"],
    [3, "Arquivado"]
  ])("codigo %i vira %s", (codigo, esperado) => {
    expect(normalizePublicationStatus(codigo)).toBe(esperado);
  });

  test("codigo numerico desconhecido nao quebra, cai no fallback", () => {
    expect(normalizePublicationStatus(99)).toBe("Desconhecido");
  });

  test("string ja normalizada passa direto", () => {
    expect(normalizePublicationStatus("Publicado")).toBe("Publicado");
  });
});

describe("normalizeContentType", () => {
  test.each([
    [1, "Texto"],
    [2, "PDF"],
    [3, "Video"],
    [4, "Link"],
    [5, "Imagem"]
  ])("codigo %i vira %s", (codigo, esperado) => {
    expect(normalizeContentType(codigo)).toBe(esperado);
  });
});

describe("compactText", () => {
  test("texto menor que o limite passa intacto", () => {
    expect(compactText("Texto curto", 50)).toBe("Texto curto");
  });

  test("texto maior que o limite trunca com reticencias", () => {
    const resultado = compactText("Um texto bem mais longo que o limite permitido", 20);
    expect(resultado).toHaveLength(20);
    expect(resultado.endsWith("...")).toBe(true);
  });

  test("valor vazio retorna traco", () => {
    expect(compactText("", 20)).toBe("-");
    expect(compactText(null, 20)).toBe("-");
  });
});

describe("formatGrade", () => {
  test("nota positiva formata com virgula decimal", () => {
    expect(formatGrade(8.5)).toBe("8,5");
  });

  test("nota zero ou ausente retorna traco (sem nota, nao zero)", () => {
    expect(formatGrade(0)).toBe("-");
    expect(formatGrade(null)).toBe("-");
    expect(formatGrade(undefined)).toBe("-");
  });

  test("arredonda pra 1 casa decimal", () => {
    expect(formatGrade(7.666)).toBe("7,7");
  });
});

describe("formatPercent", () => {
  test("valores dentro do intervalo formatam sem decimais", () => {
    expect(formatPercent(42.4)).toBe("42%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
  });

  test("valor negativo e travado em 0% (nunca deveria vir do backend, mas nao pode quebrar a UI)", () => {
    expect(formatPercent(-15)).toBe("0%");
  });

  test("valor acima de 100 e travado em 100%", () => {
    expect(formatPercent(150)).toBe("100%");
  });

  test("valor ausente vira 0%", () => {
    expect(formatPercent(undefined)).toBe("0%");
  });
});

describe("parseApiDate", () => {
  test("data ISO com timezone parseia normalmente", () => {
    const data = parseApiDate("2026-09-03T10:00:00Z");
    expect(data).toBeInstanceOf(Date);
    expect(data.getUTCFullYear()).toBe(2026);
  });

  test("data serializada sem timezone e tratada como UTC", () => {
    const data = parseApiDate("2026-09-03T10:00:00");
    expect(data.toISOString()).toBe("2026-09-03T10:00:00.000Z");
  });

  test("valor nulo/vazio retorna null em vez de lancar erro", () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate("")).toBeNull();
  });

  test("string invalida retorna null em vez de Invalid Date", () => {
    expect(parseApiDate("nao-e-uma-data")).toBeNull();
  });
});

describe("formatCep", () => {
  test("8 digitos formata com hifen", () => {
    expect(formatCep("01001000")).toBe("01001-000");
  });

  test("quantidade de digitos diferente de 8 retorna o valor original", () => {
    expect(formatCep("123")).toBe("123");
  });
});

describe("maskCpf", () => {
  test("11 digitos mascara mantendo so os 2 ultimos visiveis", () => {
    expect(maskCpf("11122233344")).toBe("***.***.***-44");
  });

  test("quantidade de digitos invalida retorna o valor original ou traco", () => {
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf(null)).toBe("-");
  });
});
