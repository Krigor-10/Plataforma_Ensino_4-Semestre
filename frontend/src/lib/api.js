import { DemoApiError, demoRequest } from "./demoApi.js";
import { readDemoMode } from "./demoMode.js";
import { createApiClient, ApiError } from "../../../shared/apiClient.js";
import { TOKEN_KEY } from "../../../shared/sessionKeys.js";
import { webStorage } from "./webStorage.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

const { apiRequest: apiRequestReal } = createApiClient({ baseUrl: API_BASE_URL, storage: webStorage });

export { ApiError };

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

  return apiRequestReal(endpoint, options);
}

/**
 * Baixa um arquivo binario (ex.: exportacao em Excel) que a apiRequest normal
 * nao suporta, ja que ela sempre le a resposta como JSON. Devolve o Blob e o
 * nome de arquivo sugerido pelo backend via Content-Disposition.
 */
export async function baixarArquivo(endpoint) {
  const token = webStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    let mensagem = "Nao foi possivel gerar o arquivo agora.";

    try {
      const corpo = await response.json();
      mensagem = corpo?.mensagem || corpo?.erro || mensagem;
    } catch {
      // resposta de erro nao veio em JSON — mantem a mensagem padrao
    }

    throw new ApiError(mensagem, response.status);
  }

  const blob = await response.blob();
  const nomeArquivo = extrairNomeArquivo(response.headers.get("Content-Disposition"));
  return { blob, nomeArquivo };
}

function extrairNomeArquivo(cabecalhoDisposicao) {
  const correspondencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecalhoDisposicao || "");
  return correspondencia ? decodeURIComponent(correspondencia[1]) : "arquivo";
}

/**
 * Arquivos em /uploads exigem o token de acesso (o endpoint nao aceita
 * requisicao anonima). Como <img>/<a> nao enviam o header Authorization,
 * o token vai como query string — o backend aceita isso so pra esse path.
 */
export function resolverUrlArquivo(url) {
  if (!url || !url.startsWith("/uploads/")) {
    return url;
  }

  const token = webStorage.getItem(TOKEN_KEY);
  if (!token) {
    return url;
  }

  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}access_token=${encodeURIComponent(token)}`;
}
