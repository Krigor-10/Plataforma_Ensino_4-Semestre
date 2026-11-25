import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { cores, raios, tipografia } from "../lib/theme.js";

// Botao pilula com borda + seta -> (docs/redesign-mobile/PROMPT-agente-
// inicio-seta-e-catalogo.md, item 1, opcao B escolhida pelo usuario) -
// substitui "Ver"/chevron-forward nos banners da Inicio. O alinhamento
// vertical do icone com o texto vem so do `lineHeight` igual ao tamanho do
// icone (~16) - nenhum ajuste manual de marginTop, que e o que deixava a
// seta fina "subida" antes (o <Text> sem lineHeight pegava a sobra de linha
// da fonte, principalmente no Android com includeFontPadding).
export default function BotaoContornoSeta({ accessibilityHint, accessibilityLabel, onPress, rotulo, style }) {
  return (
    <TouchableOpacity
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={[estilos.botao, style]}
    >
      <Text style={estilos.texto}>{rotulo}</Text>
      <Ionicons color={cores.destaque} name="arrow-forward" size={15} testID="icone-seta" />
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: cores.destaque,
    borderRadius: raios.pilula,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: "center"
  },
  texto: {
    color: cores.destaque,
    fontWeight: "700",
    fontSize: tipografia.rotulo,
    lineHeight: 16,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : null)
  }
});
