const HIDDEN_PUBLIC_COURSE_TITLES = new Set(["product analytics para edtech"]);
const MODELO_CURSO_GRATUITO = 1;
const MODELO_CURSO_PAGO_PACOTE = 2;
const MODELO_CURSO_ACOMPANHADO = 3;

/**
 * Mesma regra de visibilidade usada pela Home Publica (web), pelo Catalogo
 * do Aluno (web e mobile) e pelo Cadastro (web): um curso so conta como
 * "disponivel pra quem ainda nao o tem" se nao estiver na lista de titulos
 * ocultos e:
 * - Acompanhado: se ainda nao tiver sido encerrado pelo coordenador (quem ja
 *   tem matricula continua vendo o curso normalmente nas proprias telas,
 *   essa regra so afeta descoberta);
 * - Gratuito e PagoPacote: so se estiver PUBLICADO pelo Admin
 *   (publicadoParaVendaEm), mesmo encerrado - pacote 7 da auditoria de 26/11,
 *   decisao D3 (regra do servidor: Curso.DisponivelParaNovosAlunos).
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

  if (modeloCurso === MODELO_CURSO_ACOMPANHADO) {
    return !curso?.encerradoEm;
  }

  if (modeloCurso === MODELO_CURSO_GRATUITO || modeloCurso === MODELO_CURSO_PAGO_PACOTE) {
    return Boolean(curso?.publicadoParaVendaEm);
  }

  return true;
}
