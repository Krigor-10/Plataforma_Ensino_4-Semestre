import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/* So inicializa de verdade quando EXPO_PUBLIC_SENTRY_DSN existir (conta
   sentry.io ainda nao criada nesta rodada) — ate la, envolverComSentry e
   um passthrough e o app se comporta exatamente igual a antes do SDK. */
export function inicializarSentry() {
  if (!dsn) return;
  Sentry.init({ dsn });
}

export const envolverComSentry = dsn ? Sentry.wrap : (componente) => componente;
