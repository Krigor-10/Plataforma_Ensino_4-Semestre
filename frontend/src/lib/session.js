export function readSession() {
  try {
    const token = localStorage.getItem("token") || "";
    const refreshToken = localStorage.getItem("refreshToken") || "";
    const storedUser = localStorage.getItem("usuarioLogado");
    const user = storedUser ? JSON.parse(storedUser) : null;

    return {
      token,
      refreshToken,
      user
    };
  } catch {
    return {
      token: "",
      refreshToken: "",
      user: null
    };
  }
}

export function persistSession(session) {
  localStorage.setItem("token", session.token);
  localStorage.setItem("refreshToken", session.refreshToken || "");
  localStorage.setItem("usuarioLogado", JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("usuarioLogado");
}
