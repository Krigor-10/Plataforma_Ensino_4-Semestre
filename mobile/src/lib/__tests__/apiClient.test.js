import { createApiClient } from "../../../../shared/apiClient.js";
import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "../../../../shared/sessionKeys.js";

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

// docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md, item A4: corte
// "na hora" de usuario inativado - o apiClient e compartilhado entre web e
// mobile, por isso o teste fica aqui (unico lugar que ja cobre apiRequest).
describe("createApiClient / apiRequest - USUARIO_INATIVO", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("401 com codigo USUARIO_INATIVO: nao tenta o refresh, limpa a sessao e lanca ApiError com a mensagem", async () => {
    const storage = criarStorageFake({
      [TOKEN_KEY]: "token-ainda-valido",
      [REFRESH_TOKEN_KEY]: "refresh-valido",
      [USER_KEY]: JSON.stringify({ id: 1, nome: "Aluno Teste" })
    });

    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ erro: "Seu acesso foi inativado. Entre em contato com a administração.", codigo: "USUARIO_INATIVO" })
    });

    const { apiRequest } = createApiClient({ baseUrl: "http://api.teste", storage });

    await expect(apiRequest("/cursos")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      codigo: "USUARIO_INATIVO",
      message: "Seu acesso foi inativado. Entre em contato com a administração."
    });

    // So a chamada original pra /cursos - nenhuma tentativa de /auth/refresh.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await storage.getItem(TOKEN_KEY)).toBeNull();
    expect(await storage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(await storage.getItem(USER_KEY)).toBeNull();
  });

  it("401 comum (sem USUARIO_INATIVO) continua tentando o refresh normalmente", async () => {
    const tokenNovo = "token-novo-fake";
    const storage = criarStorageFake({ [TOKEN_KEY]: "token-vencido", [REFRESH_TOKEN_KEY]: "refresh-valido" });

    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ erro: "Nao autorizado." }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenNovo, refreshToken: "refresh-novo" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: "ok" }) });

    const { apiRequest } = createApiClient({ baseUrl: "http://api.teste", storage });

    const resultado = await apiRequest("/cursos");

    expect(resultado).toEqual({ dados: "ok" });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
