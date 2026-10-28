import { createApiClient } from "../../../../shared/apiClient.js";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "../../../../shared/sessionKeys.js";

// Sem Buffer/atob aqui de proposito - mesma razao de shared/apiClient.js nao
// usar nenhum dos dois: este arquivo roda sob Jest (Node), mas o codigo real
// (createApiClient) roda tanto no navegador quanto no Hermes do app mobile,
// entao o helper de (des)codificacao evita qualquer API especifica de um so
// ambiente.
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Url(texto) {
  let bits = 0;
  let buffer = 0;
  let saida = "";

  for (let i = 0; i < texto.length; i++) {
    buffer = (buffer << 8) | texto.charCodeAt(i);
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      saida += BASE64_CHARS[(buffer >> bits) & 0x3f];
    }
  }

  if (bits > 0) {
    saida += BASE64_CHARS[(buffer << (6 - bits)) & 0x3f];
  }

  return saida.replace(/\+/g, "-").replace(/\//g, "_");
}

function criarTokenFake(exp) {
  const cabecalho = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ usuarioId: 1, exp }));
  return `${cabecalho}.${payload}.assinatura-fake`;
}

function criarStorageFake(valoresIniciais = {}) {
  const dados = { ...valoresIniciais };
  return {
    async getItem(chave) {
      return Object.prototype.hasOwnProperty.call(dados, chave) ? dados[chave] : null;
    },
    async setItem(chave, valor) {
      dados[chave] = valor;
    },
    async removeItem(chave) {
      delete dados[chave];
    },
    multiRemove: undefined,
    _dados: dados
  };
}

describe("createApiClient / obterTokenValido", () => {
  const agoraEmSegundos = () => Math.floor(Date.now() / 1000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("token valido (exp bem no futuro): devolve o mesmo token, sem chamar /auth/refresh", async () => {
    const tokenValido = criarTokenFake(agoraEmSegundos() + 60 * 60);
    const storage = criarStorageFake({ [TOKEN_KEY]: tokenValido, [REFRESH_TOKEN_KEY]: "refresh-valido" });
    const fetchMock = jest.spyOn(global, "fetch");

    const { obterTokenValido } = createApiClient({ baseUrl: "http://api.teste", storage });
    const resultado = await obterTokenValido();

    expect(resultado).toBe(tokenValido);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token vencendo (dentro da folga de 60s): renova via /auth/refresh e devolve o token novo", async () => {
    const tokenVencendo = criarTokenFake(agoraEmSegundos() + 10);
    const tokenNovo = criarTokenFake(agoraEmSegundos() + 60 * 60);
    const storage = criarStorageFake({ [TOKEN_KEY]: tokenVencendo, [REFRESH_TOKEN_KEY]: "refresh-valido" });

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ token: tokenNovo, refreshToken: "refresh-novo" })
    });

    const { obterTokenValido } = createApiClient({ baseUrl: "http://api.teste", storage });
    const resultado = await obterTokenValido();

    expect(resultado).toBe(tokenNovo);
    expect(await storage.getItem(TOKEN_KEY)).toBe(tokenNovo);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.teste/auth/refresh",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("token ja vencido, sem refresh token no storage: devolve o token atual mesmo vencido (nao ha outro valor disponivel)", async () => {
    const tokenVencido = criarTokenFake(agoraEmSegundos() - 60);
    const storage = criarStorageFake({ [TOKEN_KEY]: tokenVencido });
    const fetchMock = jest.spyOn(global, "fetch");

    const { obterTokenValido } = createApiClient({ baseUrl: "http://api.teste", storage });
    const resultado = await obterTokenValido();

    expect(resultado).toBe(tokenVencido);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem token nenhum no storage: devolve null", async () => {
    const storage = criarStorageFake({});

    const { obterTokenValido } = createApiClient({ baseUrl: "http://api.teste", storage });
    const resultado = await obterTokenValido();

    expect(resultado).toBeNull();
  });

  it("renovacao falha (refresh invalido): devolve o token atual mesmo vencendo, em vez de null", async () => {
    const tokenVencendo = criarTokenFake(agoraEmSegundos() - 5);
    const storage = criarStorageFake({ [TOKEN_KEY]: tokenVencendo, [REFRESH_TOKEN_KEY]: "refresh-invalido" });

    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, json: async () => ({}) });

    const { obterTokenValido } = createApiClient({ baseUrl: "http://api.teste", storage });
    const resultado = await obterTokenValido();

    expect(resultado).toBe(tokenVencendo);
  });
});
