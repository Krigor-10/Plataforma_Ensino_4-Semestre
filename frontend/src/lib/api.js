import { DemoApiError, demoRequest } from "./demoApi.js";
import { readDemoMode } from "./demoMode.js";
import { clearSession } from "./session.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const AUTH_ENDPOINTS_SEM_RETRY = ["/auth/login", "/auth/refresh"];

let refreshEmAndamento = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(endpoint, options = {}) {
  if (readDemoMode()) {
    try {
      return await demoRequest(endpoint, options);
    } catch (error) {
      if (error instanceof DemoApiError) {
        throw new ApiError(error.message, error.status);
      }

      throw error;
    }
  }

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
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData) && !hasContentType(headers)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
}

async function renovarToken() {
  const refreshToken = localStorage.getItem("refreshToken");

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
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await readJson(response);
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);

    return data.token;
  } catch {
    clearSession();
    return null;
  }
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
