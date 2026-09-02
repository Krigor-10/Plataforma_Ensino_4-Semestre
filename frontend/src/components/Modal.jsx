/* ============================================================
   MODAL — Diálogo acessível reutilizável
   Fecha com Escape, prende foco internamente (focus trap) e
   bloqueia interação com o fundo via aria-modal="true".
   ============================================================ */
import { useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

export default function Modal({ titulo, onFechar, children, className, acoes, rodape }) {
  const refModal = useFocusTrap();

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onFechar]);

  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, []);

  return (
    <div
      className="modal-fundo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      /* Nao fecha o modal (clicar fora nao tem esse comportamento aqui, so
         Escape/botao fecham) — isola qualquer clique dentro do modal (incluindo
         o fundo) de listeners de "clique fora" em document, como os menus de
         contexto "..." de SecaoCursos/SecaoModulos/SecaoTurmas/SecaoAvaliacoesProfessor
         e o TooltipGlobal, que senao fechariam/escondiam ao interagir com o modal. */
      onClick={(e) => e.stopPropagation()}
    >
      <article ref={refModal} className={`modal-caixa${className ? ` ${className}` : ""}`}>
        <header className="modal-cabecalho">
          <h2 className="modal-titulo" id="modal-titulo">{titulo}</h2>
          {acoes && <div className="modal-cabecalho__acoes">{acoes}</div>}
          <button
            className="modal-fechar"
            onClick={onFechar}
            aria-label="Fechar modal"
            type="button"
          >
            ✕
          </button>
        </header>
        <div className="modal-conteudo">{children}</div>
        {rodape}
      </article>
    </div>
  );
}
