const HIDDEN_PUBLIC_COURSE_TITLES = new Set(["product analytics para edtech"]);
const MODELO_CURSO_GRATUITO = 1;
const MODELO_CURSO_PAGO_PACOTE = 2;
const MODELO_CURSO_ACOMPANHADO = 3;

/**
 * Mesma regra de visibilidade usada pela Home Publica (web), pelo Catalogo
 * do Aluno (web e mobile) e pelo Cadastro (web): um curso so conta como
 * "disponivel pra quem ainda nao o tem" se nao estiver na lista de titulos
 * ocultos e:
 * - Acompanhado ou Gratuito: se ainda nao tiver sido encerrado pelo
 *   coordenador (pendencia_compra_cursos - quem nao tem o curso nao pode
 *   mais comprar/comecar um curso encerrado; quem ja tem matricula continua
 *   vendo o curso normalmente nas proprias telas, essa regra so afeta
 *   descoberta);
 * - PagoPacote: so se estiver publicado pra venda (publicadoParaVendaEm) -
 *   plano fluxo-venda-cursos, Round 3/4.
 *
 * Extraida pra shared/ (Round 7) pra parar de duplicar entre
 * frontend/src/data/appConfig.js (que passa a reexportar esta funcao) e o
 * filtro inline que existia em mobile/src/screens/aluno/CatalogoScreen.jsx.
 * Deixa pronto pro prompt da Home Publica (docs/home-publica/, ainda nao
 * aplicado) reaproveitar quando integrar destaques/EmDestaque depois.
 */
export function isCursoVisivelNoCatalogoPublico(curso) {
  const titulo = String(curso?.titulo || "").trim().toLowerCase();
  if (HIDDEN_PUBLIC_COURSE_TITLES.has(titulo)) {
    return false;
  }

  const modeloCurso = Number(curso?.modeloCurso);

  if ((modeloCurso === MODELO_CURSO_ACOMPANHADO || modeloCurso === MODELO_CURSO_GRATUITO) && curso?.encerradoEm) {
    return false;
  }

  if (modeloCurso === MODELO_CURSO_PAGO_PACOTE && !curso?.publicadoParaVendaEm) {
    return false;
  }

  return true;
}
