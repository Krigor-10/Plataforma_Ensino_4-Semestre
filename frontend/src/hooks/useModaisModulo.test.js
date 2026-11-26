import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useModaisModulo } from "./useModaisModulo.js";
import { apiRequest, ApiError } from "../lib/api.js";

vi.mock("../lib/api.js", async () => {
  const real = await vi.importActual("../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const MODULO = { id: 3, titulo: "Módulo 3", cursoId: 1 };

function configurar(overrides = {}) {
  return renderHook(() =>
    useModaisModulo({ cursoFixoId: 1, mostrarToast: vi.fn(), onSalvo: vi.fn(), onSessionExpired: vi.fn(), ...overrides })
  );
}

describe("useModaisModulo - pre-checagem e exclusao", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("abrirExclusaoModulo sem bloqueio: mensagemExclusao vazia, bloqueioExclusao.podeExcluir true", async () => {
    apiRequest.mockResolvedValue({ podeExcluir: true, motivo: null, temItemArquivado: false });
    const { result } = configurar();

    await act(async () => {
      await result.current.abrirExclusaoModulo(MODULO);
    });

    expect(apiRequest).toHaveBeenCalledWith("/Modulos/3/bloqueios-exclusao");
    expect(result.current.mensagemExclusao).toBe("");
    expect(result.current.bloqueioExclusao).toEqual({ podeExcluir: true, temItemArquivado: false });
  });

  test("abrirExclusaoModulo com bloqueio: usa o motivo da API e marca temItemArquivado", async () => {
    apiRequest.mockResolvedValue({
      podeExcluir: false,
      motivo: "Não é possível excluir: o módulo tem 1 quiz arquivado. Exclua ou restaure o item em 'Ver arquivados' antes.",
      temItemArquivado: true
    });
    const { result } = configurar();

    await act(async () => {
      await result.current.abrirExclusaoModulo(MODULO);
    });

    expect(result.current.mensagemExclusao).toContain("quiz arquivado");
    expect(result.current.bloqueioExclusao).toEqual({ podeExcluir: false, temItemArquivado: true });
  });

  test("confirmarExclusao com sucesso: chama DELETE, fecha a janela e avisa onSalvo", async () => {
    apiRequest.mockResolvedValue({ podeExcluir: true, motivo: null, temItemArquivado: false });
    const onSalvo = vi.fn();
    const mostrarToast = vi.fn();
    const { result } = configurar({ onSalvo, mostrarToast });

    await act(async () => {
      await result.current.abrirExclusaoModulo(MODULO);
    });

    apiRequest.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.confirmarExclusao();
    });

    expect(apiRequest).toHaveBeenCalledWith("/Modulos/3", { method: "DELETE" });
    expect(result.current.moduloParaExcluir).toBeNull();
    expect(onSalvo).toHaveBeenCalledTimes(1);
    expect(mostrarToast).toHaveBeenCalledWith("Modulo excluido com sucesso.", "sucesso");
  });

  test("confirmarExclusao com erro do backend: guarda o motivo e marca bloqueioExclusao", async () => {
    apiRequest.mockResolvedValue({ podeExcluir: true, motivo: null, temItemArquivado: false });
    const { result } = configurar();

    await act(async () => {
      await result.current.abrirExclusaoModulo(MODULO);
    });

    apiRequest.mockRejectedValue(new ApiError("Não é possível excluir: já existem notas lançadas neste módulo.", 422));
    await act(async () => {
      await result.current.confirmarExclusao();
    });

    await waitFor(() => {
      expect(result.current.mensagemExclusao).toContain("notas lançadas");
    });
    expect(result.current.bloqueioExclusao).toEqual({ podeExcluir: false, temItemArquivado: false });
    expect(result.current.moduloParaExcluir).toEqual(MODULO);
  });
});
