import AsyncStorage from "@react-native-async-storage/async-storage";
import { createApiClient, ApiError } from "../../../shared/apiClient.js";
import { API_BASE_URL } from "./config.js";

const { apiRequest } = createApiClient({ baseUrl: API_BASE_URL, storage: AsyncStorage });

export { apiRequest, ApiError };
