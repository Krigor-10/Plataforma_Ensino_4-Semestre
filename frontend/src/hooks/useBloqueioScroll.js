import { useEffect, useId } from "react";

/* Gerenciador central de bloqueio de scroll do body. Varios componentes
   (Modal, drawer do menu lateral, confirmacao de logout, prova em execucao)
   podem precisar bloquear o scroll ao mesmo tempo. Em vez de cada um salvar e
   restaurar document.body.style.overflow de forma independente — o que só
   funciona se eles fecharem em ordem estritamente inversa à que abriram —,
   mantemos aqui um conjunto de locks ativos e só restauramos o valor
   original quando o ULTIMO lock é removido, nao importa a ordem em que os
   componentes desmontam (ex.: quando o logout desmonta varios de uma vez). */
const locksAtivos = new Set();
let overflowOriginal = null;

function bloquear(id) {
  if (locksAtivos.size === 0) {
    overflowOriginal = document.body.style.overflow;
  }
  locksAtivos.add(id);
  document.body.style.overflow = "hidden";
}

function desbloquear(id) {
  locksAtivos.delete(id);
  if (locksAtivos.size === 0) {
    document.body.style.overflow = overflowOriginal ?? "";
    overflowOriginal = null;
  }
}

/* Rede de seguranca: limpa qualquer lock residual, usada no logout para
   garantir que o scroll da home publica nunca fique bloqueado mesmo se
   algum componente nao tiver desmontado corretamente. */
export function limparBloqueiosScroll() {
  locksAtivos.clear();
  document.body.style.overflow = overflowOriginal ?? "";
  overflowOriginal = null;
}

export function useBloqueioScroll(ativo) {
  const id = useId();

  useEffect(() => {
    if (!ativo) return undefined;

    bloquear(id);
    return () => desbloquear(id);
  }, [ativo, id]);
}
