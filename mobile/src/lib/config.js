import { Platform } from "react-native";

// Emulador Android nao enxerga "localhost"/"127.0.0.1" do host - precisa de 10.0.2.2.
// iOS Simulator e o alvo "web" do Expo enxergam localhost normalmente.
// Para testar em dispositivo fisico, troque pelo IP da maquina na rede local.
const GATEWAY_HOST = Platform.select({
  android: "10.0.2.2",
  default: "127.0.0.1"
});

export const API_BASE_URL = `http://${GATEWAY_HOST}:4000/api`;
