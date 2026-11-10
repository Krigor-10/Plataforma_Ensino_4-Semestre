import { useEffect, useState } from "react";

/* Indica se um elemento com overflow horizontal (scrollWidth > clientWidth)
   tem conteudo escondido pra rolar - usado pra ligar/desligar a pista visual
   (degrade na borda, ex. .abas-matriculas--mais-a-direita) so quando ha algo
   realmente escondido, em vez de sempre (ver "bug: borda direita esmaecida
   nas abas Ativos/Inativos", docs/bugs/PROMPT-agente-abas-borda-direita-
   esmaecida.md). Recalcula ao rolar o proprio elemento, quando o tamanho dele
   muda (ResizeObserver - cobre abrir/fechar a sidebar, redimensionar a
   janela) e quando o conteudo interno muda (MutationObserver - o numero de
   abas ou o texto delas, ex. a contagem "Inativos 0", pode variar sem o
   elemento em si mudar de tamanho). */
export function useIndicadorRolagemHorizontal(ref) {
  const [temConteudoEscondido, setTemConteudoEscondido] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) {
      return undefined;
    }

    function recalcular() {
      setTemConteudoEscondido(elemento.scrollLeft + elemento.clientWidth < elemento.scrollWidth - 1);
    }

    recalcular();

    const observadorRedimensionamento = new ResizeObserver(recalcular);
    observadorRedimensionamento.observe(elemento);

    const observadorConteudo = new MutationObserver(recalcular);
    observadorConteudo.observe(elemento, { childList: true, subtree: true, characterData: true });

    elemento.addEventListener("scroll", recalcular);

    return () => {
      observadorRedimensionamento.disconnect();
      observadorConteudo.disconnect();
      elemento.removeEventListener("scroll", recalcular);
    };
  }, [ref]);

  return temConteudoEscondido;
}
