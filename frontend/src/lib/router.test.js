import { describe, expect, test } from "vitest";
import { readRoute } from "./router.js";

describe("readRoute", () => {
  test("cadastro sem curso pre-selecionado", () => {
    expect(readRoute("/cadastro")).toEqual({ kind: "cadastro", cursoId: null });
  });

  test("cadastro com curso pre-selecionado via segmento de rota", () => {
    expect(readRoute("/cadastro/42")).toEqual({ kind: "cadastro", cursoId: "42" });
  });

  test("redefinir-senha continua lendo o token do segmento (regressao)", () => {
    expect(readRoute("/redefinir-senha/abc123")).toEqual({ kind: "redefinir-senha", token: "abc123" });
  });

  test("link de notificacao de chamado de suporte le o id do segmento", () => {
    expect(readRoute("/chamados/42")).toEqual({ kind: "chamado", chamadoId: "42" });
  });

  test("curso sem modulo selecionado nao traz subsecao/subparam", () => {
    expect(readRoute("/app/cursos/12")).toEqual({ kind: "app", section: "cursos", param: "12", subsecao: null, subparam: null });
  });

  test("tela do modulo (Admin/Coordenador) le subsecao e subparam do segmento", () => {
    expect(readRoute("/app/cursos/12/modulos/34")).toEqual({
      kind: "app",
      section: "cursos",
      param: "12",
      subsecao: "modulos",
      subparam: "34"
    });
  });
});
