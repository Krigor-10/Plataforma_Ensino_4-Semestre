import { useEffect, useState } from "react";

/* Largura atual da janela, atualizada no resize - usado pra decisoes de JS
   que o CSS sozinho nao resolve (ex.: TelaModuloGestao.jsx so abre o 1o item
   da leitura automaticamente em telas >= 768px). Nao usa matchMedia pra nao
   precisar de polyfill no jsdom (window.innerWidth e "resize" ja funcionam
   nos testes). */
export function useLarguraJanela() {
  const [largura, setLargura] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));

  useEffect(() => {
    function atualizar() {
      setLargura(window.innerWidth);
    }

    window.addEventListener("resize", atualizar);
    return () => window.removeEventListener("resize", atualizar);
  }, []);

  return largura;
}
