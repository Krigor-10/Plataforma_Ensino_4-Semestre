/* ============================================================
   MODAL — Diálogo acessível reutilizável
   Fecha com Escape, prende foco internamente (focus trap) e
   bloqueia interação com o fundo via aria-modal="true".
   ============================================================ */
import { useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

export default function Modal({ titulo, onFechar, children, className, acoes }) {
  const refModal = useFocusTrap();

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onFechar]);

  return (
    <div
      className="modal-fundo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
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
        {children}
      </article>
    </div>
  );
}
