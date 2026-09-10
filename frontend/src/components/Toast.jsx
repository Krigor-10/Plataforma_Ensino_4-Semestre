import { TbAlertTriangle, TbCheck, TbInfoCircle, TbX } from "react-icons/tb";

const ICONE_POR_TIPO = {
  sucesso: TbCheck,
  erro: TbX,
  aviso: TbAlertTriangle
};

export default function Toast({ toasts, onFechar }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        const Icone = ICONE_POR_TIPO[t.tipo] || TbInfoCircle;

        return (
          <article key={t.id} className={`toast toast--${t.tipo}`}>
            <span className="toast__icone" aria-hidden="true">
              <Icone size={16} />
            </span>
            <span className="toast__mensagem" role="status">{t.mensagem}</span>
            <button
              className="toast__fechar"
              onClick={() => onFechar(t.id)}
              type="button"
              aria-label="Fechar notificação"
            >
              <TbX aria-hidden="true" size={14} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
