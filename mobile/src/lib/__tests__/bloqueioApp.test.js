import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import {
  TEMPO_PARA_BLOQUEAR_MS,
  deveBloquearAoVoltar,
  dispositivoTemTrava,
  useBloqueioPorInatividade
} from "../bloqueioApp.js";

jest.mock("expo-local-authentication", () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn()
}));

// Pacote 9 da auditoria de 26/11 (H1): trava ao voltar depois de 5 min.
describe("deveBloquearAoVoltar", () => {
  test("so trava com 5 minutos ou mais em segundo plano", () => {
    const agora = 1_000_000_000;
    expect(deveBloquearAoVoltar(null, agora)).toBe(false);
    expect(deveBloquearAoVoltar(agora - TEMPO_PARA_BLOQUEAR_MS + 1, agora)).toBe(false);
    expect(deveBloquearAoVoltar(agora - TEMPO_PARA_BLOQUEAR_MS, agora)).toBe(true);
  });
});

describe("dispositivoTemTrava", () => {
  test("PIN ou biometria contam; nenhum nivel ou erro, nao", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValueOnce(1);
    await expect(dispositivoTemTrava()).resolves.toBe(true);
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValueOnce(0);
    await expect(dispositivoTemTrava()).resolves.toBe(false);
    LocalAuthentication.getEnrolledLevelAsync.mockRejectedValueOnce(new Error("sem modulo"));
    await expect(dispositivoTemTrava()).resolves.toBe(false);
  });
});

describe("useBloqueioPorInatividade", () => {
  let ouvinte;
  const remover = jest.fn();

  beforeEach(() => {
    ouvinte = null;
    remover.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_evento, callback) => {
      ouvinte = callback;
      return { remove: remover };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("trava ao voltar depois de 5 minutos em segundo plano", async () => {
    const onBloquear = jest.fn();
    const agora = jest.spyOn(Date, "now").mockReturnValue(0);
    await renderHook(() => useBloqueioPorInatividade({ ativo: true, onBloquear }));

    ouvinte("background");
    agora.mockReturnValue(TEMPO_PARA_BLOQUEAR_MS);
    ouvinte("active");

    expect(onBloquear).toHaveBeenCalledTimes(1);
  });

  test("nao trava se voltou antes, nem com o app so 'inactive' (prompt da biometria)", async () => {
    const onBloquear = jest.fn();
    const agora = jest.spyOn(Date, "now").mockReturnValue(0);
    await renderHook(() => useBloqueioPorInatividade({ ativo: true, onBloquear }));

    ouvinte("background");
    agora.mockReturnValue(TEMPO_PARA_BLOQUEAR_MS - 1);
    ouvinte("active");
    ouvinte("inactive");
    agora.mockReturnValue(TEMPO_PARA_BLOQUEAR_MS * 3);
    ouvinte("active");

    expect(onBloquear).not.toHaveBeenCalled();
  });

  test("sem sessao a trava nunca dispara", async () => {
    const onBloquear = jest.fn();
    const agora = jest.spyOn(Date, "now").mockReturnValue(0);
    await renderHook(() => useBloqueioPorInatividade({ ativo: false, onBloquear }));

    // Outras partes do React Native tambem escutam o AppState; se alguem
    // registrou um ouvinte, ele nao pode ser o da trava.
    ouvinte?.("background");
    agora.mockReturnValue(TEMPO_PARA_BLOQUEAR_MS * 2);
    ouvinte?.("active");

    expect(onBloquear).not.toHaveBeenCalled();
  });
});
