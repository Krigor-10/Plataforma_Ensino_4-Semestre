/**
 * Adaptador de localStorage no formato esperado por shared/session.js e
 * shared/apiClient.js (mesma interface do AsyncStorage do React Native).
 */
export const webStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key)
};
