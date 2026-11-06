import { normalizeProgressStatus } from "./format.js";

// XP e nivel do aluno (prompt "barra de XP do aluno", docs/gamificacao):
// valor derivado do progresso que ja existe, calculado no frontend, nada e
// gravado no backend. Mesmo criterio dos cartoes "Conteudos concluidos" e
// "Modulos concluidos" do Panorama (DashboardAluno.jsx), pra nao mostrar
// numeros que se contradizem. Quiz/avaliacao/nota ficam de fora - quiz nao
// gera nota e essa regra ainda nao foi decidida.
export const XP_POR_CONTEUDO = 10;
export const XP_POR_MODULO = 50;
export const XP_POR_CURSO = 200;
export const XP_POR_NIVEL = 500;

function contarConcluidos(itens) {
  return itens.filter((item) => normalizeProgressStatus(item.statusProgresso) === "Concluido").length;
}

export function calcularXp(progressos = {}) {
  const total =
    contarConcluidos(progressos.conteudos || []) * XP_POR_CONTEUDO +
    contarConcluidos(progressos.modulos || []) * XP_POR_MODULO +
    contarConcluidos(progressos.cursos || []) * XP_POR_CURSO;

  const nivel = Math.floor(total / XP_POR_NIVEL) + 1;
  const xpNoNivel = total % XP_POR_NIVEL;
  const percentualNivel = Math.round((xpNoNivel / XP_POR_NIVEL) * 100);

  return { total, nivel, xpNoNivel, xpPorNivel: XP_POR_NIVEL, percentualNivel };
}
