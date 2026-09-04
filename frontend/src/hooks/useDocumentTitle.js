import { useEffect } from "react";

const DESCRICAO_PADRAO =
  "CodeRyse Academy: cursos digitais, solicitacao de matricula e painel academico em uma unica plataforma.";

export function useDocumentTitle(titulo, descricao = DESCRICAO_PADRAO) {
  useEffect(() => {
    if (!titulo) return;

    const tituloAnterior = document.title;
    document.title = titulo;

    const metaDescricao = document.querySelector('meta[name="description"]');
    const descricaoAnterior = metaDescricao?.getAttribute("content");
    if (metaDescricao && descricao) {
      metaDescricao.setAttribute("content", descricao);
    }

    return () => {
      document.title = tituloAnterior;
      if (metaDescricao && descricaoAnterior) {
        metaDescricao.setAttribute("content", descricaoAnterior);
      }
    };
  }, [titulo, descricao]);
}
