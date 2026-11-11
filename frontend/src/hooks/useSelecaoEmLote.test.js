import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useSelecaoEmLote } from "./useSelecaoEmLote.js";

const PAGINA_A = [{ id: 1 }, { id: 2 }, { id: 3 }];
const PAGINA_B = [{ id: 4 }, { id: 5 }];

describe("useSelecaoEmLote", () => {
  test("comeca sem nenhum item selecionado", () => {
    const { result } = renderHook(() => useSelecaoEmLote(PAGINA_A));

    expect(result.current.selecionados.size).toBe(0);
    expect(result.current.todosSelecionadosNaPagina).toBe(false);
    expect(result.current.algunsSelecionadosNaPagina).toBe(false);
  });

  test("alternarSelecao marca e desmarca um item isolado", () => {
    const { result } = renderHook(() => useSelecaoEmLote(PAGINA_A));

    act(() => result.current.alternarSelecao(2));
    expect(result.current.selecionados.has(2)).toBe(true);
    expect(result.current.algunsSelecionadosNaPagina).toBe(true);
    expect(result.current.todosSelecionadosNaPagina).toBe(false);

    act(() => result.current.alternarSelecao(2));
    expect(result.current.selecionados.has(2)).toBe(false);
  });

  test("alternarSelecaoPagina marca todos da pagina e, numa segunda chamada, desmarca todos", () => {
    const { result } = renderHook(() => useSelecaoEmLote(PAGINA_A));

    act(() => result.current.alternarSelecaoPagina());
    expect(result.current.todosSelecionadosNaPagina).toBe(true);
    expect([...result.current.selecionados].sort()).toEqual([1, 2, 3]);

    act(() => result.current.alternarSelecaoPagina());
    expect(result.current.selecionados.size).toBe(0);
  });

  test("limparSelecao esvazia a selecao mesmo com itens de paginas diferentes", () => {
    const { result } = renderHook(() => useSelecaoEmLote(PAGINA_A));

    act(() => result.current.alternarSelecao(1));
    act(() => result.current.limparSelecao());

    expect(result.current.selecionados.size).toBe(0);
  });

  test("poda a selecao pros ids que deixam de estar visiveis (troca de aba/pagina)", () => {
    const { result, rerender } = renderHook(({ itensPagina }) => useSelecaoEmLote(itensPagina), {
      initialProps: { itensPagina: PAGINA_A }
    });

    act(() => result.current.alternarSelecao(1));
    expect(result.current.selecionados.has(1)).toBe(true);

    rerender({ itensPagina: PAGINA_B });

    expect(result.current.selecionados.has(1)).toBe(false);
    expect(result.current.selecionados.size).toBe(0);
  });

  test("mantem selecionados que continuam visiveis apos a pagina mudar de referencia", () => {
    const { result, rerender } = renderHook(({ itensPagina }) => useSelecaoEmLote(itensPagina), {
      initialProps: { itensPagina: PAGINA_A }
    });

    act(() => result.current.alternarSelecao(2));

    rerender({ itensPagina: [...PAGINA_A] });

    expect(result.current.selecionados.has(2)).toBe(true);
  });

  test("refCheckboxCabecalho fica indeterminado quando so alguns da pagina estao selecionados", () => {
    const { result } = renderHook(() => useSelecaoEmLote(PAGINA_A));
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    result.current.refCheckboxCabecalho.current = checkbox;

    act(() => result.current.alternarSelecao(1));
    expect(checkbox.indeterminate).toBe(true);

    act(() => result.current.alternarSelecaoPagina());
    expect(checkbox.indeterminate).toBe(false);
  });
});
