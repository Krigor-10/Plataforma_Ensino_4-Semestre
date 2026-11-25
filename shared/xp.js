export const XP_POR_CONTEUDO = 10;
export const XP_POR_MODULO = 50;
export const XP_POR_CURSO = 200;
export const XP_POR_NIVEL = 500;

// Normalizacao propria (nao reaproveita normalizeProgressStatus de nenhum
// dos dois apps - o do mobile retorna "Concluído" com acento, o do web
// retorna "Concluido" sem acento): aceita o numero 3 (StatusProgresso.
// Concluido no backend) OU qualquer uma das duas grafias em texto, pra este
// modulo compartilhado nao depender de qual app o esta chamando.
function statusConcluido(status) {
  if (typeof status === "number") {
    return status === 3;
  }

  const texto = String(status || "").trim().toLowerCase();
  return texto === "concluido" || texto === "concluído";
}

function contarConcluidos(itens) {
  return itens.filter((item) => statusConcluido(item.statusProgresso)).length;
}

/**
 * XP e nivel do aluno (docs/gamificacao) - valor derivado do progresso que
 * ja existe (ProgressoConteudoAluno/ProgressoModuloAluno/ProgressoCursoAluno),
 * calculado no cliente, nada e gravado no backend. 10 XP por conteudo
 * concluido, 50 por modulo, 200 por curso; um nivel a cada 500 XP. Quiz,
 * avaliacao e nota ficam de fora - quiz nao gera nota e essa regra ainda
 * nao foi decidida. Fonte unica usada pela web (frontend/src/lib/xp.js
 * reexporta este arquivo) e pelo mobile (ConteudosScreen/HomeScreen etc.),
 * pra nao mostrar niveis diferentes pro mesmo aluno nos dois apps.
 */
export function calcularXp(progressos = {}) {
  const total =
    contarConcluidos(progressos.conteudos || []) * XP_POR_CONTEUDO +
    contarConcluidos(progressos.modulos || []) * XP_POR_MODULO +
    contarConcluidos(progressos.cursos || []) * XP_POR_CURSO;

  const nivel = Math.floor(total / XP_POR_NIVEL) + 1;
  const xpNoNivel = total % XP_POR_NIVEL;
  const percentualNivel = Math.round((xpNoNivel / XP_POR_NIVEL) * 100);

  return {
    total,
    nivel,
    xpNoNivel,
    xpPorNivel: XP_POR_NIVEL,
    percentualNivel,
    faltamParaProximo: XP_POR_NIVEL - xpNoNivel
  };
}
