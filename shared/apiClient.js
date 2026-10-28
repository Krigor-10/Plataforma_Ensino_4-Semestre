import { createSessionStore } from "./session.js";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "./sessionKeys.js";

const AUTH_ENDPOINTS_SEM_RETRY = ["/auth/login", "/auth/refresh"];

// Folga antes do "exp" do JWT pra considerar o token "vencendo" - cobre o
// tempo de uma chamada de rede subsequente (ex.: abrir um arquivo logo apos
// checar o token) nao cair numa janela de poucos segundos onde o token
// ainda era valido na checagem mas ja expirou no servidor.
const FOLGA_EXPIRACAO_TOKEN_MS = 60_000;

// Base64url -> string, sem depender de atob/Buffer (nenhum dos dois e
// garantido em todo ambiente que esse modulo roda - navegador, Node/Vitest
// no Web, e Hermes/Jest no mobile). So decodifica o payload do JWT pra ler o
// "exp"; nao precisa lidar com UTF-8 multibyte (claims desse token sao
// numericos/ASCII).
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodificarBase64(base64) {
  let buffer = 0;
  let bits = 0;
  let saida = "";

  for (const caractere of base64) {
    const valor = BASE64_CHARS.indexOf(caractere);
    if (valor === -1) {
      continue;
    }
    buffer = (buffer << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      saida += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return saida;
}

function obterExpiracaoDoToken(token) {
  try {
    const payloadBase64Url = token.split(".")[1];
    if (!payloadBase64Url) {
      return null;
    }

    const payloadBase64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(decodificarBase64(payloadBase64));

    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Núcleo de chamadas HTTP (injeta o token, renova automaticamente num 401,
 * repete a chamada original uma vez), compartilhado entre frontend web e
 * mobile. `storage` no formato do AsyncStorage — ver shared/session.js.
 */
export function createApiClient({ baseUrl, storage }) {
  const sessionStore = createSessionStore(storage);
  let refreshEmAndamento = null;

  async function apiRequest(endpoint, options = {}) {
    const response = await fetchComToken(endpoint, options);

    if (response.status === 401 && !AUTH_ENDPOINTS_SEM_RETRY.includes(endpoint.toLowerCase())) {
      const novoToken = await renovarToken();

      if (novoToken) {
        const novaResposta = await fetchComToken(endpoint, options);
        return lerRespostaOuFalhar(novaResposta);
      }
    }

    return lerRespostaOuFalhar(response);
  }

  async function fetchComToken(endpoint, options) {
    const token = await storage.getItem(TOKEN_KEY);
    const headers = {
      ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData) && !hasContentType(headers)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers
    });
  }

  async function renovarToken() {
    const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      return null;
    }

    if (!refreshEmAndamento) {
      refreshEmAndamento = executarRenovacao(refreshToken).finally(() => {
        refreshEmAndamento = null;
      });
    }

    return refreshEmAndamento;
  }

  async function executarRenovacao(refreshToken) {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        await sessionStore.clearSession();
        return null;
      }

      const data = await readJson(response);
      await storage.setItem(TOKEN_KEY, data.token);
      await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

      return data.token;
    } catch {
      await sessionStore.clearSession();
      return null;
    }
  }

  /**
   * Le o token do storage e, se estiver vencendo (ou ja vencido), renova
   * antes de devolver - pensado pra usos fora do apiRequest normal, onde o
   * token precisa ir embutido numa URL (ex.: abrir um arquivo de /uploads
   * via Linking.openURL no mobile, que nao passa pelo fetch com retry
   * automatico de 401 acima). Reaproveita renovarToken/refreshEmAndamento,
   * entao nunca dispara duas renovacoes concorrentes.
   *
   * Sem refresh token disponivel (ou se a renovacao falhar), devolve o
   * token atual mesmo vencendo - e o unico valor que temos, e ainda assim
   * cobre o caso comum (chamada acontece antes da expiracao real do
   * servidor), em vez de simplesmente desistir de abrir o arquivo.
   */
  async function obterTokenValido() {
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    const expiraEm = obterExpiracaoDoToken(token);
    const estaVencendo = expiraEm !== null && expiraEm - FOLGA_EXPIRACAO_TOKEN_MS <= Date.now();

    if (!estaVencendo) {
      return token;
    }

    const tokenRenovado = await renovarToken();
    return tokenRenovado || token;
  }

  return { apiRequest, obterTokenValido };
}

async function lerRespostaOuFalhar(response) {
  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.mensagem || data?.erro || "Nao foi possivel concluir a operacao.";
    throw new ApiError(message, response.status);
  }

  return data;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function hasContentType(headers) {
  return Object.keys(headers).some((key) => key.toLowerCase() === "content-type");
}
