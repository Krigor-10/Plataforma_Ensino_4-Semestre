import { describe, expect, test } from "vitest";
import { resolverImagemCurso } from "./courseImage.js";

describe("resolverImagemCurso", () => {
  test("curso com imagemUrl preenchida retorna a URL do upload (sem sessao, sem token anexado)", () => {
    const curso = { titulo: "Curso Qualquer", imagemUrl: "/uploads/cursos/capa-123.jpg" };

    expect(resolverImagemCurso(curso)).toBe("/uploads/cursos/capa-123.jpg");
  });

  test("curso sem imagemUrl cai no dicionario estatico por titulo conhecido", () => {
    const curso = { titulo: "Python para Automacao e Dados", imagemUrl: "" };

    expect(resolverImagemCurso(curso)).toMatch(/couse-python|course-test-cover/);
  });

  test("curso sem imagemUrl e com titulo desconhecido cai no SVG generico", () => {
    const curso = { titulo: "Curso Totalmente Inventado Sem Capa", imagemUrl: null };

    expect(resolverImagemCurso(curso)).toMatch(/course-test-cover\.svg/);
  });
});
