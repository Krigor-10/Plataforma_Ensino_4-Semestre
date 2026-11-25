// Calculo movido para shared/xp.js (docs/gamificacao/PROMPT-agente-barra-
// xp-mobile.md, item 1) - mesma fonte unica que o mobile usa, pra nao
// mostrar nivel/XP diferentes pro mesmo aluno nos dois apps. Mesmo padrao
// de reexport que frontend/src/data/appConfig.js ja faz com
// isCursoVisivelNoCatalogoPublico.
export { calcularXp, XP_POR_CONTEUDO, XP_POR_CURSO, XP_POR_MODULO, XP_POR_NIVEL } from "../../../shared/xp.js";
