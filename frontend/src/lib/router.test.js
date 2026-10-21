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
});
