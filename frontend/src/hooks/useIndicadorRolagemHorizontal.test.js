import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { useIndicadorRolagemHorizontal } from "./useIndicadorRolagemHorizontal.js";

// jsdom nao tem layout real - clientWidth/scrollWidth sao getters so-leitura
// que sempre retornam 0, entao precisam ser sobrescritos pra simular um
// elemento com (ou sem) conteudo escondido pelo overflow horizontal.
function criarElementoComScroll({ clientWidth, scrollWidth, scrollLeft = 0 }) {
  const elemento = document.createElement("div");
  document.body.appendChild(elemento);
  Object.defineProperty(elemento, "clientWidth", { value: clientWidth, configurable: true });
  Object.defineProperty(elemento, "scrollWidth", { value: scrollWidth, configurable: true });
  elemento.scrollLeft = scrollLeft;
  return elemento;
}

describe("useIndicadorRolagemHorizontal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("sem conteudo escondido (scrollWidth igual a clientWidth): retorna false", () => {
    const elemento = criarElementoComScroll({ clientWidth: 300, scrollWidth: 300 });
    const ref = { current: elemento };

    const { result } = renderHook(() => useIndicadorRolagemHorizontal(ref));

    expect(result.current).toBe(false);
  });

  test("com conteudo escondido a direita (scrollWidth maior que clientWidth): retorna true", () => {
    const elemento = criarElementoComScroll({ clientWidth: 300, scrollWidth: 400, scrollLeft: 0 });
    const ref = { current: elemento };

    const { result } = renderHook(() => useIndicadorRolagemHorizontal(ref));

    expect(result.current).toBe(true);
  });

  test("depois de rolar até o fim, deixa de ter conteudo escondido", () => {
    const elemento = criarElementoComScroll({ clientWidth: 300, scrollWidth: 400, scrollLeft: 0 });
    const ref = { current: elemento };

    const { result } = renderHook(() => useIndicadorRolagemHorizontal(ref));
    expect(result.current).toBe(true);

    act(() => {
      elemento.scrollLeft = 100;
      elemento.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(false);
  });

  test("sem elemento montado (ref.current nulo): retorna false sem lancar erro", () => {
    const ref = { current: null };

    const { result } = renderHook(() => useIndicadorRolagemHorizontal(ref));

    expect(result.current).toBe(false);
  });
});
