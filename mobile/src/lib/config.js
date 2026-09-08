import { Platform } from "react-native";

// EXPO_PUBLIC_API_URL (definida por perfil no eas.json) tem prioridade -
// e o que permite builds instalaveis (APK de rede local ou producao na nuvem)
// apontarem pro gateway certo sem editar codigo. Sem essa env var (dev local
// via "npm run start/web"), cai no fallback por plataforma de sempre:
// emulador Android nao enxerga "localhost"/"127.0.0.1" do host - precisa de
// 10.0.2.2. iOS Simulator e o alvo "web" do Expo enxergam localhost normalmente.
const GATEWAY_HOST = Platform.select({
  android: "10.0.2.2",
  default: "127.0.0.1"
});

export const GATEWAY_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${GATEWAY_HOST}:4000`;
export const API_BASE_URL = `${GATEWAY_BASE_URL}/api/v1`;
