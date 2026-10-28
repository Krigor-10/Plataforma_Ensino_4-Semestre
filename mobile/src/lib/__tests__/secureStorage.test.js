import { Platform } from "react-native";
import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "../../../../shared/sessionKeys.js";

const mockSecureStoreDados = new Map();
const mockAsyncStorageDados = new Map();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((chave) => Promise.resolve(mockSecureStoreDados.has(chave) ? mockSecureStoreDados.get(chave) : null)),
  setItemAsync: jest.fn((chave, valor) => {
    mockSecureStoreDados.set(chave, valor);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((chave) => {
    mockSecureStoreDados.delete(chave);
    return Promise.resolve();
  })
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((chave) => Promise.resolve(mockAsyncStorageDados.has(chave) ? mockAsyncStorageDados.get(chave) : null)),
  setItem: jest.fn((chave, valor) => {
    mockAsyncStorageDados.set(chave, valor);
    return Promise.resolve();
  }),
  removeItem: jest.fn((chave) => {
    mockAsyncStorageDados.delete(chave);
    return Promise.resolve();
  })
}));

describe("secureStorage", () => {
  let secureStorage;
  let SecureStore;

  beforeEach(() => {
    mockSecureStoreDados.clear();
    mockAsyncStorageDados.clear();
    Platform.OS = "android";

    // require() em vez de import() dinamico: jest.resetModules() precisa de
    // um reimport sincrono pra zerar o singleton de migracao do modulo entre
    // os testes, e import() dinamico sob Jest+Babel (sem
    // --experimental-vm-modules) nao funciona.
    jest.resetModules();
    ({ secureStorage } = require("../secureStorage.js"));
    SecureStore = require("expo-secure-store");
  });

  it("plataforma nativa: token/refreshToken vao pro SecureStore, nao pro AsyncStorage", async () => {
    await secureStorage.setItem(TOKEN_KEY, "token-123");

    expect(mockSecureStoreDados.get(TOKEN_KEY)).toBe("token-123");
    expect(mockAsyncStorageDados.has(TOKEN_KEY)).toBe(false);

    const lido = await secureStorage.getItem(TOKEN_KEY);
    expect(lido).toBe("token-123");
  });

  it("USER_KEY sempre vai pro AsyncStorage, mesmo em plataforma nativa", async () => {
    await secureStorage.setItem(USER_KEY, "{\"nome\":\"Aluno Teste\"}");

    expect(mockAsyncStorageDados.get(USER_KEY)).toBe("{\"nome\":\"Aluno Teste\"}");
    expect(mockSecureStoreDados.has(USER_KEY)).toBe(false);
  });

  it("migracao: token antigo so no AsyncStorage e movido pro SecureStore na primeira leitura", async () => {
    mockAsyncStorageDados.set(TOKEN_KEY, "token-antigo");

    const lido = await secureStorage.getItem(TOKEN_KEY);

    expect(lido).toBe("token-antigo");
    expect(mockSecureStoreDados.get(TOKEN_KEY)).toBe("token-antigo");
    expect(mockAsyncStorageDados.has(TOKEN_KEY)).toBe(false);
  });

  it("migracao nao sobrescreve um valor que ja exista no SecureStore", async () => {
    mockSecureStoreDados.set(TOKEN_KEY, "token-ja-migrado");
    mockAsyncStorageDados.set(TOKEN_KEY, "token-antigo-nao-deve-prevalecer");

    const lido = await secureStorage.getItem(TOKEN_KEY);

    expect(lido).toBe("token-ja-migrado");
  });

  it("migracao roda uma unica vez (idempotente) mesmo com chamadas concorrentes", async () => {
    mockAsyncStorageDados.set(TOKEN_KEY, "token-antigo");
    mockAsyncStorageDados.set(REFRESH_TOKEN_KEY, "refresh-antigo");

    await Promise.all([secureStorage.getItem(TOKEN_KEY), secureStorage.getItem(REFRESH_TOKEN_KEY)]);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it("plataforma web: token/refreshToken tambem caem no AsyncStorage, SecureStore nunca e chamado", async () => {
    Platform.OS = "web";

    await secureStorage.setItem(TOKEN_KEY, "token-web");
    const lido = await secureStorage.getItem(TOKEN_KEY);

    expect(lido).toBe("token-web");
    expect(mockAsyncStorageDados.get(TOKEN_KEY)).toBe("token-web");
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("multiRemove apaga token/refreshToken (SecureStore) e usuario (AsyncStorage) juntos", async () => {
    await secureStorage.setItem(TOKEN_KEY, "token-123");
    await secureStorage.setItem(REFRESH_TOKEN_KEY, "refresh-123");
    await secureStorage.setItem(USER_KEY, "{}");

    await secureStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);

    expect(await secureStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await secureStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(await secureStorage.getItem(USER_KEY)).toBeNull();
  });
});
