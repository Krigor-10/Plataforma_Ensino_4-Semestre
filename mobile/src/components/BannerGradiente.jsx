import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cores, espacamentos, raios } from "../lib/theme.js";

/* Banner com gradiente roxo + chip de icone, extraido do banner de
   Certificados (troféu) pra virar um padrao visual reutilizavel — usado tanto
   em Certificados quanto no seletor de curso de Conteudos. Vira tocavel
   quando `onPress` e passado. Gradiente deliberadamente sutil (2 tons perto
   da cor de marca, baixa opacidade) — a versao anterior usava 3 paradas de
   roxo saturado que destoava do resto do app, mais escuro/opaco demais. */
export default function BannerGradiente({ accessibilityLabel, accessibilityRole, children, estiloContainer, icone, onPress }) {
  const conteudo = (
    <LinearGradient
      colors={["rgba(123, 47, 247, 0.5)", "rgba(123, 47, 247, 0.28)"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[estilos.container, estiloContainer]}
    >
      <View style={estilos.iconeArea}>
        <Ionicons color={cores.texto} name={icone} size={24} />
      </View>
      <View style={estilos.conteudo}>{children}</View>
    </LinearGradient>
  );

  if (!onPress) {
    return conteudo;
  }

  return (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole || "button"} onPress={onPress}>
      {conteudo}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.lg,
    borderRadius: raios.lg,
    overflow: "hidden",
    paddingVertical: espacamentos.md,
    paddingHorizontal: espacamentos.lg,
    marginHorizontal: espacamentos.xl,
    marginTop: espacamentos.lg,
    marginBottom: espacamentos.md
  },
  iconeArea: {
    width: 44,
    height: 44,
    borderRadius: raios.md,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  conteudo: { flex: 1 }
});
