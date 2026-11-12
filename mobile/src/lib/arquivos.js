import { GATEWAY_BASE_URL } from "./config.js";

// Arquivo proprio (servido pelo nosso backend, via gateway) exige token pra
// autenticar; link externo (tipo "Link") nao.
export function ehArquivoProprio(url) {
  return Boolean(url) && url.startsWith("/uploads/");
}

// So resolve pro absoluto, sem token na query - usado em todo fluxo que
// autentica via header Authorization (download seguro, ver abrirArquivoSeguro)
// em vez de expor o token na URL.
export function resolverUrlArquivoAbsoluta(url) {
  if (!url) {
    return url;
  }
  return ehArquivoProprio(url) ? `${GATEWAY_BASE_URL}${url}` : url;
}

// Mantido pros visualizadores embutidos (Image/VideoView/Pdf/iframe) que nao
// tem como mandar header Authorization customizado - unico lugar onde o
// token ainda vai na query string, de proposito. Qualquer fluxo que abra o
// arquivo fora do app (download, compartilhar) deve usar abrirArquivoSeguro
// em vez de montar essa URL.
export function resolverUrlArquivo(url, token) {
  const urlAbsoluta = resolverUrlArquivoAbsoluta(url);

  if (!ehArquivoProprio(url) || !token) {
    return urlAbsoluta;
  }

  const separador = urlAbsoluta.includes("?") ? "&" : "?";
  return `${urlAbsoluta}${separador}access_token=${encodeURIComponent(token)}`;
}

// Extrai o nome (com extensao) do ultimo segmento do caminho, pra sugerir
// como nome do arquivo baixado/compartilhado.
export function extrairNomeArquivo(url, nomeFallback = "arquivo") {
  if (!url) {
    return nomeFallback;
  }
  const semQuery = url.split("?")[0];
  const partes = semQuery.split("/");
  const nome = decodeURIComponent(partes[partes.length - 1] || "");
  return nome || nomeFallback;
}
