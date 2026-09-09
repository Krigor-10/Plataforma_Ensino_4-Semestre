import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { cores, espacamentos } from "../lib/theme.js";

/* Indicador de "onde estou" — fica entre HeaderGlobal.jsx (acoes globais)
   e o conteudo da tela trocada por aba em AlunoWorkspace.jsx. Deliberadamente
   discreto (rotulo pequeno, maiusculo) pra nao competir com o Header nem
   parecer um segundo Header — so o icone/cor usam o roxo de marca (mesmo
   icone da aba ativa no menu inferior) pra reforcar contexto sem virar
   outro titulo grande. accessibilityRole="header" avisa leitores de tela
   que este texto identifica a secao atual; o icone e aria-hidden porque o
   texto sozinho ja transmite a mesma informacao. */
export default function ScreenIndicator({ icone, titulo }) {
  return (
    <View style={estilos.container}>
      {icone ? <Ionicons accessibilityElementsHidden color={cores.destaque} importantForAccessibility="no" name={icone} size={14} /> : null}
      <Text accessibilityRole="header" style={estilos.texto}>{titulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.xs,
    paddingHorizontal: espacamentos.xl,
    paddingVertical: espacamentos.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  texto: {
    color: cores.destaque,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  }
});
