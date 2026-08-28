import { createSessionStore } from "./session.js";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "./sessionKeys.js";

const AUTH_ENDPOINTS_SEM_RETRY = ["/auth/login", "/auth/refresh"];

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

  return { apiRequest };
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
