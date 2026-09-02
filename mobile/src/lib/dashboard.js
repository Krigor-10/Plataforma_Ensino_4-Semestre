import { apiRequest } from "./api.js";

export const EMPTY_SNAPSHOT = {
  cursos: [],
  turmas: [],
  matriculas: [],
  modulos: [],
  conteudos: [],
  avaliacoes: [],
  progressos: { conteudos: [], modulos: [], cursos: [] },
  pagamentos: []
};

export async function loadAlunoSnapshot(usuario) {
  const [cursos, turmas, matriculas, modulos, conteudos, avaliacoes, progressos, pagamentos] = await Promise.all([
    apiRequest("/Cursos"),
    apiRequest("/Turmas"),
    apiRequest(`/Matriculas/aluno/${usuario.id}`),
    apiRequest(`/Modulos/aluno/${usuario.id}`),
    apiRequest(`/ConteudosDidaticos/aluno/${usuario.id}`),
    apiRequest(`/Avaliacoes/aluno/${usuario.id}`),
    apiRequest(`/Progressos/aluno/${usuario.id}`),
    apiRequest("/Pagamentos/aluno")
  ]);

  return { ...EMPTY_SNAPSHOT, cursos, turmas, matriculas, modulos, conteudos, avaliacoes, progressos, pagamentos };
}

export function mapById(lista) {
  return new Map(lista.map((item) => [item.id, item]));
}
