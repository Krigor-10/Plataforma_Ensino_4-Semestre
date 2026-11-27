import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

/* Trava do app (pacote 9 da auditoria de 26/11, docs/auditorias/
   AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md):
   - H1: pede a biometria ao ABRIR o app com sessao salva e ao VOLTAR depois
     de 5 minutos ou mais em segundo plano;
   - H2: sem biometria, vale o PIN/padrao do celular (fallback do proprio
     sistema) ou a senha da conta (DesbloqueioScreen).
   No navegador (expo start --web) nao existe trava de dispositivo. */

export const TEMPO_PARA_BLOQUEAR_MS = 5 * 60 * 1000;

export function travaDisponivelNestaPlataforma() {
  return Platform.OS !== "web";
}

export function deveBloquearAoVoltar(saiuEm, agora = Date.now()) {
  return typeof saiuEm === "number" && agora - saiuEm >= TEMPO_PARA_BLOQUEAR_MS;
}

// true se o celular tem biometria OU PIN/padrao/senha configurados.
export async function dispositivoTemTrava() {
  try {
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    return nivel > LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

// Biometria com o PIN do celular como alternativa do proprio sistema
// (disableDeviceFallback: false). Devolve o resultado do expo-local-authentication.
export async function desbloquearComDispositivo() {
  try {
    return await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloquear a CodeRyse",
      cancelLabel: "Usar senha da conta",
      disableDeviceFallback: false
    });
  } catch {
    return { success: false, error: "unknown" };
  }
}

// Chama onBloquear quando o app volta ao primeiro plano depois de
// TEMPO_PARA_BLOQUEAR_MS ou mais em segundo plano. So "background" conta: o
// proprio prompt de biometria deixa o app "inactive" no iOS.
export function useBloqueioPorInatividade({ ativo, onBloquear }) {
  const saiuEmRef = useRef(null);
  const onBloquearRef = useRef(onBloquear);

  useEffect(() => {
    onBloquearRef.current = onBloquear;
  }, [onBloquear]);

  useEffect(() => {
    if (!ativo) {
      saiuEmRef.current = null;
      return undefined;
    }

    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "background") {
        saiuEmRef.current = Date.now();
        return;
      }

      if (estado === "active") {
        if (deveBloquearAoVoltar(saiuEmRef.current)) {
          onBloquearRef.current?.();
        }
        saiuEmRef.current = null;
      }
    });

    return () => assinatura.remove();
  }, [ativo]);
}
