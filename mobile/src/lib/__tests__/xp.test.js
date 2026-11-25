import { calcularXp, XP_POR_CONTEUDO, XP_POR_CURSO, XP_POR_MODULO, XP_POR_NIVEL } from "../../../../shared/xp.js";

// docs/gamificacao/PROMPT-agente-barra-xp-mobile.md, item 1: shared/xp.js e
// a fonte unica de calculo (web reexporta de la, ver frontend/src/lib/
// xp.js e o teste equivalente em frontend/src/lib/xp.test.js) - este
// arquivo testa a mesma logica pelo lado do mobile (jest), incluindo o
// caso que so o mobile precisa (normalizeProgressStatus do mobile retorna
// "Concluído" com acento).
describe("calcularXp (shared)", () => {
  test("0 itens da nivel 1 com 0 XP", () => {
    expect(calcularXp()).toEqual({
      total: 0,
      nivel: 1,
      xpNoNivel: 0,
      xpPorNivel: 500,
      percentualNivel: 0,
      faltamParaProximo: 500
    });
    expect(calcularXp({})).toEqual({
      total: 0,
      nivel: 1,
      xpNoNivel: 0,
      xpPorNivel: 500,
      percentualNivel: 0,
      faltamParaProximo: 500
    });
  });

  test("3 conteudos + 1 modulo da 80 XP", () => {
    const resultado = calcularXp({
      conteudos: [{ statusProgresso: 3 }, { statusProgresso: 3 }, { statusProgresso: 3 }],
      modulos: [{ statusProgresso: 3 }]
    });

    expect(resultado.total).toBe(3 * XP_POR_CONTEUDO + XP_POR_MODULO);
    expect(resultado.total).toBe(80);
  });

  test("500 XP exatos da nivel 2 com 0 no nivel", () => {
    const conteudosPara = (quantidade) => Array.from({ length: quantidade }, () => ({ statusProgresso: 3 }));
    // 2 cursos (400) + 1 modulo (50) + 5 conteudos (50) = 500 XP exatos.
    const resultado = calcularXp({
      conteudos: conteudosPara(5),
      modulos: [{ statusProgresso: 3 }],
      cursos: [{ statusProgresso: 3 }, { statusProgresso: 3 }]
    });

    expect(resultado.total).toBe(2 * XP_POR_CURSO + XP_POR_MODULO + 5 * XP_POR_CONTEUDO);
    expect(resultado.total).toBe(500);
    expect(resultado.nivel).toBe(2);
    expect(resultado.xpNoNivel).toBe(0);
  });

  test("faltamParaProximo correto", () => {
    const resultado = calcularXp({ conteudos: [{ statusProgresso: 3 }] });

    expect(resultado.total).toBe(10);
    expect(resultado.faltamParaProximo).toBe(XP_POR_NIVEL - 10);

    const conteudosPara = (quantidade) => Array.from({ length: quantidade }, () => ({ statusProgresso: 3 }));
    const noNivel2 = calcularXp({
      conteudos: conteudosPara(5),
      cursos: [{ statusProgresso: 3 }, { statusProgresso: 3 }],
      modulos: [{ statusProgresso: 3 }]
    });
    expect(noNivel2.total).toBe(500);
    expect(noNivel2.nivel).toBe(2);
    expect(noNivel2.xpNoNivel).toBe(0);
    expect(noNivel2.faltamParaProximo).toBe(500);
  });

  test("aceita status numerico 3, 'Concluido' (sem acento, usado pelo web) e 'Concluído' (com acento, usado pelo mobile)", () => {
    const resultado = calcularXp({
      conteudos: [
        { statusProgresso: 3 },
        { statusProgresso: "Concluido" },
        { statusProgresso: "Concluído" },
        { statusProgresso: 2 },
        { statusProgresso: "Em andamento" },
        { statusProgresso: 1 }
      ]
    });

    expect(resultado.total).toBe(3 * XP_POR_CONTEUDO);
  });
});
