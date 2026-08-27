import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = await AsyncStorage.getItem("token");
  const headers = { ...(options.headers || {}) };

  if (options.body && !hasContentType(headers)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

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
