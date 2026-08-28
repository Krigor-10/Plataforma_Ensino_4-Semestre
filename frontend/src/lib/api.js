import { DemoApiError, demoRequest } from "./demoApi.js";
import { readDemoMode } from "./demoMode.js";
import { createApiClient, ApiError } from "../../../shared/apiClient.js";
import { webStorage } from "./webStorage.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

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
