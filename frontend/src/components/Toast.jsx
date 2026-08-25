export default function Toast({ toasts, onFechar }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <article key={t.id} className={`toast toast--${t.tipo}`}>
          <span className="toast__icone" aria-hidden="true">
            {t.tipo === "sucesso" ? "✓" : t.tipo === "erro" ? "✕" : t.tipo === "aviso" ? "!" : "i"}
          </span>
          <span className="toast__mensagem" role="status">{t.mensagem}</span>
          <button
            className="toast__fechar"
            onClick={() => onFechar(t.id)}
            type="button"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </article>
      ))}
    </div>
  );
}
