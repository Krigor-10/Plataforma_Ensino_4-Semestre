import { createApiClient, ApiError } from "../../../shared/apiClient.js";
import { API_BASE_URL } from "./config.js";
import { secureStorage } from "./secureStorage.js";

const { apiRequest, obterTokenValido } = createApiClient({ baseUrl: API_BASE_URL, storage: secureStorage });

export { apiRequest, obterTokenValido, ApiError };
