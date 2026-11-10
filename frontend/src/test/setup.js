import "@testing-library/jest-dom/vitest";

// jsdom nao implementa ResizeObserver - stub minimo global pra qualquer
// componente/hook que precise dele nos testes (ex.
// useIndicadorRolagemHorizontal.js).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
