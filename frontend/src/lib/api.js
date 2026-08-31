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
