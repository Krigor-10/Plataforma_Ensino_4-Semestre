import * as Haptics from "expo-haptics";

// Fino sobre expo-haptics (docs/redesign-mobile/PENDENTE-segunda-23-11-
// auditoria-ux-ui-mobile.md, Fase 2 — item de risco baixo/alto impacto):
// nomes semanticos (selecao/sucesso/erro/toque) em vez de cada tela
// escolher o ImpactFeedbackStyle/NotificationFeedbackType certo sozinha.
// Sempre engole erro - falha de haptics (ex.: web via react-native-web, ou
// aparelho sem motor de vibracao) nunca pode quebrar a acao que a originou.
export function hapticSelecao() {
  Haptics.selectionAsync().catch(() => {});
}

export function hapticToqueLeve() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSucesso() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticErro() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
