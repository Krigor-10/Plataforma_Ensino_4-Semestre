import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useConsultaCep } from "./useConsultaCep.js";

function mockFetchResposta(corpo, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(corpo)
  });
}

describe("useConsultaCep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("CEP com 8 digitos dispara busca apos debounce e chama onEncontrado com os campos mapeados", async () => {
    globalThis.fetch = mockFetchResposta({
      logradouro: "Rua das Flores",
      bairro: "Centro",
      localidade: "Sao Paulo",
      uf: "SP"
    });
    const onEncontrado = vi.fn();
    const { result } = renderHook(() => useConsultaCep({ onEncontrado }));

    act(() => {
      result.current.consultarCep("01001-000");
    });
    expect(result.current.status).toBe("buscando");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("https://viacep.com.br/ws/01001000/json/");
    expect(onEncontrado).toHaveBeenCalledWith({ rua: "Rua das Flores", bairro: "Centro", cidade: "Sao Paulo", estado: "SP" });
    expect(result.current.status).toBe("encontrado");
  });

  test("CEP com menos de 8 digitos nunca dispara fetch", async () => {
    globalThis.fetch = vi.fn();
    const { result } = renderHook(() => useConsultaCep({}));

    act(() => {
      result.current.consultarCep("0100");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  test("CEP nao encontrado (erro: true) nao chama onEncontrado e mostra mensagem clara", async () => {
    globalThis.fetch = mockFetchResposta({ erro: true });
    const onEncontrado = vi.fn();
    const { result } = renderHook(() => useConsultaCep({ onEncontrado }));

    act(() => {
      result.current.consultarCep("00000000");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onEncontrado).not.toHaveBeenCalled();
    expect(result.current.status).toBe("nao-encontrado");
    expect(result.current.mensagem).toMatch(/nao encontrado/i);
  });

  test("falha de rede nao chama onEncontrado nem lanca excecao nao tratada", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("rede indisponivel"));
    const onEncontrado = vi.fn();
    const { result } = renderHook(() => useConsultaCep({ onEncontrado }));

    act(() => {
      result.current.consultarCep("01001000");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onEncontrado).not.toHaveBeenCalled();
    expect(result.current.status).toBe("erro");
  });

  test("duas chamadas em sequencia rapida: so a mais recente aplica o resultado", async () => {
    const respostaAntiga = { logradouro: "Rua Antiga", bairro: "B1", localidade: "C1", uf: "S1" };
    const respostaNova = { logradouro: "Rua Nova", bairro: "B2", localidade: "C2", uf: "S2" };

    let resolverAntiga;
    const promessaAntiga = new Promise((resolve) => {
      resolverAntiga = resolve;
    });

    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => promessaAntiga)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(respostaNova) }));

    const onEncontrado = vi.fn();
    const { result } = renderHook(() => useConsultaCep({ onEncontrado }));

    act(() => {
      result.current.consultarCep("11111111");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    act(() => {
      result.current.consultarCep("22222222");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // So agora a requisicao antiga (ja obsoleta) resolve.
    await act(async () => {
      resolverAntiga({ ok: true, json: () => Promise.resolve(respostaAntiga) });
      await Promise.resolve();
    });

    expect(onEncontrado).toHaveBeenCalledTimes(1);
    expect(onEncontrado).toHaveBeenCalledWith({ rua: "Rua Nova", bairro: "B2", cidade: "C2", estado: "S2" });
  });
});
