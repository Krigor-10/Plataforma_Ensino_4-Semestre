import { describe, expect, test } from "vitest";
import { calcularXp } from "./xp.js";

describe("calcularXp", () => {
  test("progressos vazio ou indefinido: total 0, nivel 1, percentualNivel 0", () => {
    expect(calcularXp()).toEqual({ total: 0, nivel: 1, xpNoNivel: 0, xpPorNivel: 500, percentualNivel: 0 });
    expect(calcularXp({})).toEqual({ total: 0, nivel: 1, xpNoNivel: 0, xpPorNivel: 500, percentualNivel: 0 });
  });

  test("status numerico 3 e texto Concluido contam; Em andamento e Nao iniciado nao", () => {
    const resultado = calcularXp({
      conteudos: [
        { statusProgresso: 3 },
        { statusProgresso: "Concluido" },
        { statusProgresso: 2 },
        { statusProgresso: "Em andamento" },
        { statusProgresso: 1 },
        { statusProgresso: "Nao iniciado" }
      ]
    });

    expect(resultado.total).toBe(20);
  });

  test("2 conteudos, 1 modulo e 1 curso concluidos: total 270", () => {
    const resultado = calcularXp({
      conteudos: [{ statusProgresso: 3 }, { statusProgresso: 3 }],
      modulos: [{ statusProgresso: 3 }],
      cursos: [{ statusProgresso: 3 }]
    });

    expect(resultado.total).toBe(270);
  });

  test("so abaixo de 500 XP fica no nivel 1; 500 XP vira nivel 2 com xpNoNivel 0", () => {
    const conteudosPara = (quantidade) => Array.from({ length: quantidade }, () => ({ statusProgresso: 3 }));

    // 49 conteudos = 490 XP, o mais perto de 500 que da pra chegar so com
    // conteudos (XP e sempre multiplo de 10 - 499 exato nao e alcancavel).
    const abaixoDoNivel2 = calcularXp({ conteudos: conteudosPara(49) });
    expect(abaixoDoNivel2.total).toBe(490);
    expect(abaixoDoNivel2.nivel).toBe(1);

    // 2 cursos (400) + 1 modulo (50) + 5 conteudos (50) = 500 XP exatos.
    const noNivel2 = calcularXp({
      conteudos: conteudosPara(5),
      modulos: [{ statusProgresso: 3 }],
      cursos: [{ statusProgresso: 3 }, { statusProgresso: 3 }]
    });
    expect(noNivel2.total).toBe(500);
    expect(noNivel2.nivel).toBe(2);
    expect(noNivel2.xpNoNivel).toBe(0);
  });
});
