const TITULO_BASE = "CodeRyse Academy";

const METADADOS_POR_ROTA = {
  home: {
    titulo: `${TITULO_BASE} | Cursos digitais`,
    descricao: "CodeRyse Academy: cursos digitais, solicitacao de matricula e painel academico em uma unica plataforma."
  },
  login: {
    titulo: `Entrar | ${TITULO_BASE}`,
    descricao: "Acesse sua conta CodeRyse Academy para continuar seus cursos e acompanhar seu progresso."
  },
  cadastro: {
    titulo: `Criar conta | ${TITULO_BASE}`,
    descricao: "Crie sua conta gratuita na CodeRyse Academy e comece a estudar em cursos digitais."
  },
  "esqueci-senha": {
    titulo: `Recuperar senha | ${TITULO_BASE}`,
    descricao: "Recupere o acesso a sua conta CodeRyse Academy."
  },
  "redefinir-senha": {
    titulo: `Redefinir senha | ${TITULO_BASE}`,
    descricao: "Defina uma nova senha para sua conta CodeRyse Academy."
  },
  verificar: {
    titulo: `Verificar certificado | ${TITULO_BASE}`,
    descricao: "Confira a autenticidade de um certificado emitido pela CodeRyse Academy."
  },
  notfound: {
    titulo: `Pagina nao encontrada | ${TITULO_BASE}`,
    descricao: "A pagina que voce procura nao existe ou foi movida."
  },
  app: {
    titulo: `Painel | ${TITULO_BASE}`
  }
};

/* So mexe no <title>/meta description das paginas PUBLICAS (regra de SEO do
   CLAUDE.md) — a area logada (route.kind "app") so ganha um titulo de aba
   generico, sem alterar a meta description, ja que nao deve ser indexada. */
export function applyPageMetadata(routeKind) {
  const metadados = METADADOS_POR_ROTA[routeKind];
  if (!metadados) {
    return;
  }

  document.title = metadados.titulo;

  if (metadados.descricao) {
    document.querySelector('meta[name="description"]')?.setAttribute("content", metadados.descricao);
  }
}
