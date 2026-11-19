import { useEffect, useRef } from "react";

/* Um passo da linha do tempo (docs/TelaConteudosProfessor/PROMPT-agente-
   tela-modulo-roteiro.md, item 1): o conteudo de verdade (miniatura+titulo+
   selo+menu quando fechado; cabecalho+PreviaItemAluno+navegacao quando
   aberto) e construido por quem chama RoteiroModulo (`renderFechado`/
   `renderAberto`) - este componente so cuida do numero/linha da trilha e de
   qual dos dois estados mostrar, pra Professor e Coordenador/Admin nao
   duplicarem essa estrutura. So o passo ABERTO manda renderAberto(): os
   outros nunca instanciam PreviaItemAluno (evita buscar questoes/montar
   visualizador de PDF para blocos fechados). */
function PassoRoteiro({ aberto, passo, registrarRef }) {
  return (
    <li
      aria-current={aberto ? "true" : undefined}
      className={`roteiro-passo${passo.pendurado ? " roteiro-passo--pendurado" : ""}${aberto ? " roteiro-passo--aberto" : ""}`}
      ref={(elemento) => registrarRef(passo.id, elemento)}
    >
      <div aria-hidden="true" className="roteiro-passo__marcador">
        {passo.pendurado ? null : <span className="roteiro-passo__numero">{passo.numero}</span>}
      </div>
      <div className="roteiro-passo__corpo">{aberto ? passo.renderAberto() : passo.renderFechado()}</div>
    </li>
  );
}

export default function RoteiroModulo({ barraSelecao, itemAbertoId, passos, rodapeModulos }) {
  const refsPassos = useRef(new Map());

  useEffect(() => {
    if (!itemAbertoId) {
      return;
    }

    const elemento = refsPassos.current.get(itemAbertoId);
    if (!elemento) {
      return;
    }

    const prefereMovimentoReduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollIntoView?.({ behavior: prefereMovimentoReduzido ? "auto" : "smooth", block: "start" });
  }, [itemAbertoId]);

  function registrarRef(id, elemento) {
    if (elemento) {
      refsPassos.current.set(id, elemento);
    } else {
      refsPassos.current.delete(id);
    }
  }

  return (
    <div className="roteiro-modulo">
      {barraSelecao}
      <ol aria-label="Roteiro do módulo" className="roteiro-modulo__linha-tempo">
        {passos.map((passo) => (
          <PassoRoteiro aberto={passo.id === itemAbertoId} key={passo.id} passo={passo} registrarRef={registrarRef} />
        ))}
      </ol>
      {rodapeModulos}
    </div>
  );
}
