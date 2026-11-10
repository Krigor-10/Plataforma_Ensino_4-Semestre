/**
 * Adaptador de sessionStorage no formato esperado por shared/session.js e
 * shared/apiClient.js (mesma interface do AsyncStorage do React Native).
 *
 * Era localStorage (auditoria de segurança 09/11): o token sobrevivia a
 * fechar o navegador e reabrir, porque localStorage nunca expira por conta
 * própria. sessionStorage morre quando a última aba desta origem fecha, mas
 * sobrevive a F5 e a navegação entre páginas na mesma aba — exatamente o
 * comportamento pedido. Efeito colateral aceito (fora do escopo pedido):
 * abrir uma aba NOVA manualmente (Ctrl+T) durante a mesma sessão do
 * navegador pede login de novo nela, porque sessionStorage não é
 * compartilhado entre abas.
 */
export const webStorage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};
