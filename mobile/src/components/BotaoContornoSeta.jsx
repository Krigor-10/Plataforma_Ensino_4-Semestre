import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { raios, tipografia } from "../lib/theme.js";

// Botao pilula com borda + seta -> (docs/redesign-mobile/PROMPT-agente-
// inicio-seta-e-catalogo.md, item 1, opcao B escolhida pelo usuario) -
// substitui "Ver"/chevron-forward nos banners da Inicio. O alinhamento
// vertical do icone com o texto vem so do `lineHeight` igual ao tamanho do
// icone (~16) - nenhum ajuste manual de marginTop, que e o que deixava a
// seta fina "subida" antes (o <Text> sem lineHeight pegava a sobra de linha
// da fonte, principalmente no Android com includeFontPadding).
//
// Relevo (docs/redesign-mobile/PROMPT-agente-botao-seta-relevo.md): o antigo
// contorno fino sem preenchimento parecia um selo, nao um botao. O preset
// `sombra` do theme.js e preto/unico (pra cartoes/modais) e nao serve pra
// alternar cor/intensidade no toque, por isso a sombra roxa e definida aqui.
// Degrade + view (wrapper com a sombra/borda) separado da view com
// overflow:"hidden" (que recorta o degrade na pilula) - sombra do RN e
// cortada pelo proprio overflow:"hidden" se estiverem na mesma view.
const CORES_TEXTO = "#efe7ff";
const DEGRADE_NORMAL = ["rgba(157, 103, 255, 0.30)", "rgba(123, 47, 247, 0.14)"];
const DEGRADE_PRESSIONADO = ["rgba(123, 47, 247, 0.14)", "rgba(157, 103, 255, 0.30)"];

export default function BotaoContornoSeta({ accessibilityHint, accessibilityLabel, onPress, rotulo, style }) {
  const reduzMovimento = useReducedMotion();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.envoltorio,
        pressed ? estilos.envoltorioPressionado : estilos.envoltorioElevado,
        pressed && !reduzMovimento ? estilos.envoltorioDeslocado : null,
        style
      ]}
    >
      {({ pressed }) => (
        <View style={estilos.recorte}>
          <LinearGradient colors={pressed ? DEGRADE_PRESSIONADO : DEGRADE_NORMAL} style={StyleSheet.absoluteFill} />
          <View style={estilos.brilhoTopo} />
          <Text style={estilos.texto}>{rotulo}</Text>
          <Ionicons color={CORES_TEXTO} name="arrow-forward" size={15} testID="icone-seta" />
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  envoltorio: {
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.65)",
    borderRadius: raios.pilula
  },
  envoltorioElevado: {
    shadowColor: "#7b2ff7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3
  },
  envoltorioPressionado: { shadowOpacity: 0, elevation: 0 },
  envoltorioDeslocado: { transform: [{ translateY: 1 }] },
  recorte: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: raios.pilula,
    paddingHorizontal: 14,
    minHeight: 34,
    overflow: "hidden"
  },
  brilhoTopo: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.18)"
  },
  texto: {
    color: CORES_TEXTO,
    fontWeight: "800",
    fontSize: tipografia.rotulo,
    lineHeight: 16,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : null)
  }
});
