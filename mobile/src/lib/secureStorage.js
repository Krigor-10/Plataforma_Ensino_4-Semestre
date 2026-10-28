import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "../../../shared/sessionKeys.js";

// So token/refreshToken vao pro Keychain/Keystore (expo-secure-store) - o
// resto da sessao (usuario em JSON, ver shared/sessionKeys.js USER_KEY) fica
// no AsyncStorage normal, sem precisar de criptografia de SO pra isso.
const CHAVES_SEGURAS = new Set([TOKEN_KEY, REFRESH_TOKEN_KEY]);

// expo-secure-store nao tem suporte a web no SDK 57 (sem fallback
// documentado) - cai pro AsyncStorage nessa plataforma, igual ao resto do
// app quando roda via "npm run web".
function usaArmazenamentoSeguro(chave) {
  return Platform.OS !== "web" && CHAVES_SEGURAS.has(chave);
}

/**
 * Migra token/refreshToken do AsyncStorage (onde ficavam antes desta
 * mudanca) pro SecureStore, uma unica vez. Idempotente e so copia quando o
 * SecureStore ainda esta vazio pra essa chave - nunca sobrescreve um valor
 * mais novo que ja esteja la. Sem isso, um usuario ja logado seria
 * deslogado silenciosamente so por atualizar o app (o SecureStore comeca
 * sempre vazio, mesmo com uma sessao valida salva no AsyncStorage antigo).
 */
async function migrarChave(chave) {
  const valorSeguro = await SecureStore.getItemAsync(chave);
  if (valorSeguro !== null) {
    return;
  }

  const valorAntigo = await AsyncStorage.getItem(chave);
  if (valorAntigo === null) {
    return;
  }

  await SecureStore.setItemAsync(chave, valorAntigo);
  await AsyncStorage.removeItem(chave);
}

let migracaoPromise = null;

function garantirMigracao() {
  if (Platform.OS === "web") {
    return Promise.resolve();
  }

  if (!migracaoPromise) {
    migracaoPromise = Promise.all([...CHAVES_SEGURAS].map(migrarChave));
  }

  return migracaoPromise;
}

export const secureStorage = {
  async getItem(chave) {
    await garantirMigracao();
    return usaArmazenamentoSeguro(chave) ? SecureStore.getItemAsync(chave) : AsyncStorage.getItem(chave);
  },

  async setItem(chave, valor) {
    await garantirMigracao();
    return usaArmazenamentoSeguro(chave) ? SecureStore.setItemAsync(chave, valor) : AsyncStorage.setItem(chave, valor);
  },

  async removeItem(chave) {
    await garantirMigracao();
    return usaArmazenamentoSeguro(chave) ? SecureStore.deleteItemAsync(chave) : AsyncStorage.removeItem(chave);
  },

  async multiRemove(chaves) {
    await garantirMigracao();
    await Promise.all(chaves.map((chave) => secureStorage.removeItem(chave)));
  }
};
