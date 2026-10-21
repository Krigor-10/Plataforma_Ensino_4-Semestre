import { getCourseCover } from "../data/courseCovers.js";
import { resolverUrlArquivo } from "./api.js";

/**
 * Resolve a imagem de capa de um curso: prioriza o upload real feito pelo
 * Admin (curso.imagemUrl, servido por /uploads/cursos/* - publico, sem
 * autenticacao), com fallback pro dicionario estatico por titulo
 * (getCourseCover) quando o curso nao tiver imagem propria cadastrada.
 */
export function resolverImagemCurso(curso) {
  const imagemUrl = String(curso?.imagemUrl || "").trim();
  if (imagemUrl) {
    return resolverUrlArquivo(imagemUrl);
  }

  return getCourseCover(curso);
}
