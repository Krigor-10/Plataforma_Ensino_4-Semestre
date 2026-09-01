import { GATEWAY_BASE_URL } from "./config.js";

export function resolverUrlArquivo(url, token) {
  if (!url) {
    return url;
  }

  const urlAbsoluta = url.startsWith("/uploads/") ? `${GATEWAY_BASE_URL}${url}` : url;

  if (!url.startsWith("/uploads/") || !token) {
    return urlAbsoluta;
  }

  const separador = urlAbsoluta.includes("?") ? "&" : "?";
  return `${urlAbsoluta}${separador}access_token=${encodeURIComponent(token)}`;
}
