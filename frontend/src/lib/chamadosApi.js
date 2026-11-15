import { apiRequest } from "./api.js";

export async function abrirChamado({ texto, cursoId = null, conversaId = null }) {
  return apiRequest("/Chamados", {
    method: "POST",
    body: JSON.stringify({ texto, cursoId, conversaId })
  });
}

export async function listarMeusChamados() {
  return apiRequest("/Chamados/meus");
}

export async function obterChamado(chamadoId) {
  return apiRequest(`/Chamados/${chamadoId}`);
}

export async function responderChamado(chamadoId, texto) {
  return apiRequest(`/Chamados/${chamadoId}/mensagens`, {
    method: "POST",
    body: JSON.stringify({ texto })
  });
}

export async function reabrirChamado(chamadoId) {
  return apiRequest(`/Chamados/${chamadoId}/reabrir`, { method: "POST" });
}

// Admin/Coordenador (tela de Chamados) - o service ja filtra pra so trazer
// os chamados do Coordenador quando quem pediu nao e Admin.
export async function listarChamadosParaStaff(status = null) {
  const query = status != null ? `?status=${status}` : "";
  return apiRequest(`/Chamados${query}`);
}

export async function resolverChamado(chamadoId) {
  return apiRequest(`/Chamados/${chamadoId}/resolver`, { method: "POST" });
}
