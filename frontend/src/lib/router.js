import { startTransition } from "react";

export function readRoute(pathname = window.location.pathname) {
  const normalized = normalizePath(pathname || "/");
  const segments = normalized.split("/").filter(Boolean);

  if (normalized === "/" || normalized === "/index.html") {
    return { kind: "home" };
  }

  if (segments[0] === "login") {
    return { kind: "login" };
  }

  if (segments[0] === "cadastro") {
    return { kind: "cadastro" };
  }

  if (segments[0] === "esqueci-senha") {
    return { kind: "esqueci-senha" };
  }

  if (segments[0] === "redefinir-senha") {
    return { kind: "redefinir-senha", token: segments[1] || "" };
  }

  if (segments[0] === "verificar") {
    return { kind: "verificar", codigo: segments[1] || "" };
  }

  if (segments[0] === "app") {
    return {
      kind: "app",
      section: segments[1] || "dashboard"
    };
  }

  return { kind: "notfound" };
}

export function navigate(path, setRoute, options = {}) {
  const target = normalizePath(path);
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](null, "", target);

  startTransition(() => {
    setRoute(readRoute(target));
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function normalizePath(path) {
  if (!path || path === "/") {
    return "/";
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}
