import { describe, expect, test } from "vitest";
import { isCursoVisivelNoCatalogoPublico } from "../data/appConfig.js";
import { cursoTravadoParaEdicao, motivoTravaEdicao, textoOrigemConversao, vinculosOpcionais } from "./situacaoCurso.js";

// Pacote 7 da auditoria de 26/11: trava de edicao e catalogo por publicacao.
describe("cursoTravadoParaEdicao", () => {
  test("usa permiteEdicaoConteudo quando o servidor envia", () => {
    expect(cursoTravadoParaEdicao({ permiteEdicaoConteudo: true, encerradoEm: "2026-01-01" })).toBe(false);
    expect(cursoTravadoParaEdicao({ permiteEdicaoConteudo: false })).toBe(true);
  });

  test("sem o campo, trava se publicado, concluido ou encerrado", () => {
    expect(cursoTravadoParaEdicao({ modeloCurso: 2 })).toBe(false);
    expect(cursoTravadoParaEdicao({ modeloCurso: 2, publicadoParaVendaEm: "2026-01-01" })).toBe(true);
    expect(cursoTravadoParaEdicao({ modeloCurso: 2, concluidoPeloProfessorEm: "2026-01-01" })).toBe(true);
    expect(cursoTravadoParaEdicao({ modeloCurso: 3, encerradoEm: "2026-01-01" })).toBe(true);
  });
});

describe("motivoTravaEdicao", () => {
  test("explica o motivo da trava", () => {
    expect(motivoTravaEdicao({ modeloCurso: 1 })).toBe("");
    expect(motivoTravaEdicao({ modeloCurso: 1, publicadoParaVendaEm: "2026-01-01" })).toMatch(/publicado/);
    expect(motivoTravaEdicao({ modeloCurso: 3, encerradoEm: "2026-01-01" })).toMatch(/encerrado/);
    expect(motivoTravaEdicao({ modeloCurso: 2, concluidoPeloProfessorEm: "2026-01-01" })).toMatch(/publicação pelo Admin/);
    expect(motivoTravaEdicao({ modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-01" })).toMatch(/coordenador/);
  });
});

describe("isCursoVisivelNoCatalogoPublico", () => {
  test("Acompanhado aparece enquanto nao encerrado", () => {
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 3 })).toBe(true);
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 3, encerradoEm: "2026-01-01" })).toBe(false);
  });

  test("Gratuito e Pago so aparecem publicados", () => {
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 1 })).toBe(false);
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 1, publicadoParaVendaEm: "2026-01-01" })).toBe(true);
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 2, preco: 29.9 })).toBe(false);
    expect(isCursoVisivelNoCatalogoPublico({ modeloCurso: 2, preco: 29.9, publicadoParaVendaEm: "2026-01-01" })).toBe(true);
  });
});

// Pacote 8 da auditoria de 26/11 (D4) e decisao D12.
describe("textoOrigemConversao", () => {
  test("so aparece em curso convertido", () => {
    expect(textoOrigemConversao({ modeloCurso: 2 })).toBe("");
    expect(textoOrigemConversao({ modeloCurso: 2, modeloCursoOriginal: 3 })).toBe("convertido de Acompanhado");
    expect(textoOrigemConversao({ modeloCurso: 1, modeloCursoOriginal: 3 })).toBe("convertido de Acompanhado");
  });
});

describe("vinculosOpcionais", () => {
  test("Gratuito/Pago pronto: professor e coordenador opcionais", () => {
    expect(vinculosOpcionais({ modeloCurso: 1, encerradoEm: "2026-01-01" })).toBe(true);
    expect(vinculosOpcionais({ modeloCurso: 2, concluidoPeloProfessorEm: "2026-01-01" })).toBe(true);
    expect(vinculosOpcionais({ modeloCurso: 2, publicadoParaVendaEm: "2026-01-01" })).toBe(true);
  });

  test("em montagem, aguardando coordenador ou Acompanhado: continuam obrigatorios", () => {
    expect(vinculosOpcionais({ modeloCurso: 2 })).toBe(false);
    expect(vinculosOpcionais({ modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-01" })).toBe(false);
    expect(vinculosOpcionais({ modeloCurso: 3, encerradoEm: "2026-01-01" })).toBe(false);
  });
});
