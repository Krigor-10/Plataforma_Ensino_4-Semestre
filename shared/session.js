import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "./sessionKeys.js";

/**
 * Núcleo de leitura/escrita da sessão (token, refreshToken, usuário logado),
 * compartilhado entre frontend web e mobile. `storage` precisa expor
 * getItem/setItem/removeItem no formato do AsyncStorage (síncrono ou
 * assíncrono — sempre usado com `await`, o que funciona nos dois casos).
 */
export function createSessionStore(storage) {
  async function readSession() {
    try {
      const token = (await storage.getItem(TOKEN_KEY)) || "";
      const refreshToken = (await storage.getItem(REFRESH_TOKEN_KEY)) || "";
      const storedUser = await storage.getItem(USER_KEY);
      const user = storedUser ? JSON.parse(storedUser) : null;

      return { token, refreshToken, user };
    } catch {
      return { token: "", refreshToken: "", user: null };
    }
  }

  async function persistSession(session) {
    await storage.setItem(TOKEN_KEY, session.token);
    await storage.setItem(REFRESH_TOKEN_KEY, session.refreshToken || "");
    await storage.setItem(USER_KEY, JSON.stringify(session.user));
  }

  async function clearSession() {
    if (storage.multiRemove) {
      await storage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
      return;
    }

    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  }

  return { readSession, persistSession, clearSession };
}
