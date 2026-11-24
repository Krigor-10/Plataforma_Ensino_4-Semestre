import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mesmas medidas do CustomTabBar (AlunoTabsNavigator.jsx) - a barra virou
// flutuante (docs/redesign-mobile/PROMPT-agente-barra-navegacao-quadrado-
// roxo.md, item 1/2), entao as telas das 5 abas precisam reservar esse
// espaco embaixo pra nenhuma lista ficar com o ultimo item escondido atras
// dela. Ponto unico de calculo pra nao cada tela inventar o proprio numero.
export const ALTURA_BARRA_ABAS = 72;
const MARGEM_INFERIOR_BARRA_ABAS = 10;
const RESPIRO_ACIMA_DA_BARRA = 16;

export function useAlturaBarraAbas() {
  const insets = useSafeAreaInsets();
  return insets.bottom + MARGEM_INFERIOR_BARRA_ABAS + ALTURA_BARRA_ABAS + RESPIRO_ACIMA_DA_BARRA;
}
