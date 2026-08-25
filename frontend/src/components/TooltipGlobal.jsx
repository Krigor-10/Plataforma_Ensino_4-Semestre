import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function TooltipGlobal() {
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    function onMouseOver(e) {
      const el = e.target.closest("[data-tooltip]");
      if (!el) { setTooltip(null); return; }
      const texto = el.dataset.tooltip;
      if (!texto) return;
      const rect = el.getBoundingClientRect();
      setTooltip({
        texto,
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }

    function onMouseOut(e) {
      const el = e.target.closest("[data-tooltip]");
      if (!el) return;
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      setTooltip(null);
    }

    const hide = () => setTooltip(null);

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", hide);
    document.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("click", hide);
      document.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <div
      className="tooltip-portal"
      style={{ top: tooltip.top, left: tooltip.left }}
      aria-hidden="true"
    >
      {tooltip.texto}
    </div>,
    document.body
  );
}
