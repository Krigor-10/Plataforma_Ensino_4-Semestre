import { useEffect, useRef } from "react";

const FOCAVEIS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function useFocusTrap(ativo = true) {
  const refContainer = useRef(null);
  const refAcionador = useRef(null);

  useEffect(() => {
    if (!ativo) return;

    refAcionador.current = document.activeElement;

    const elementos = () =>
      refContainer.current
        ? Array.from(refContainer.current.querySelectorAll(FOCAVEIS))
        : [];

    const prender = (e) => {
      if (e.key !== "Tab") return;
      const lista = elementos();
      if (!lista.length) return;
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        }
      } else {
        if (document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };

    elementos()[0]?.focus();
    document.addEventListener("keydown", prender);
    return () => {
      document.removeEventListener("keydown", prender);
      refAcionador.current?.focus();
    };
  }, [ativo]);

  return refContainer;
}
