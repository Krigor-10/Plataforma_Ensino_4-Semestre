// Fonte unica de mapeamento texto de status -> variante semantica.
// Antes, Insignia.jsx e StatusPill (Primitives.jsx) tinham cada um sua propria
// logica de inferencia (ou nenhuma), com vocabularios diferentes (pt vs en) —
// isso divergia sempre que um status novo era adicionado so num dos dois lados.
const VARIANTE_POR_TEXTO = {
  Aprovada: "sucesso",
  Ativa: "sucesso",
  "Concluído": "sucesso",
  Publicada: "sucesso",
  Publicado: "sucesso",
  "Parcialmente publicado": "info",
  "Em andamento": "info",
  Pendente: "aviso",
  Rascunho: "aviso",
  Rejeitada: "erro",
  Cancelada: "erro",
  Inativo: "erro",
  "Não iniciado": "neutro",
  "Concluída": "neutro"
};

const TOM_POR_VARIANTE = {
  sucesso: "success",
  aviso: "warning",
  erro: "danger",
  info: "info",
  neutro: "info"
};

export function inferirVarianteStatus(texto) {
  return VARIANTE_POR_TEXTO[texto] || "neutro";
}

export function inferirTomStatus(texto) {
  return TOM_POR_VARIANTE[inferirVarianteStatus(texto)];
}
