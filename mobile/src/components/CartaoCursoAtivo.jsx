import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Cartao "CURSO ATIVO" do redesign (docs/redesign-mobile/PROMPT-agente-
   mobile.md, 3_avaliacoes.png e 4_progresso.png - mesmo bloco nas duas
   telas) - substitui o link "< Trocar de curso" que cada tela reimplementava
   por conta propria. Usado por AvaliacoesScreen.jsx e ProgressoScreen.jsx. */
export default function CartaoCursoAtivo({ titulo, onTrocar }) {
  return (
    <View style={estilos.cartao}>
      <View style={estilos.icone}>
        <Ionicons color={cores.destaque} name="school" size={18} />
      </View>
      <View style={estilos.textos}>
        <Text style={estilos.rotulo}>CURSO ATIVO</Text>
        <Text numberOfLines={1} style={estilos.titulo}>{titulo}</Text>
      </View>
      <TouchableOpacity
        accessibilityHint="Volta para a lista de cursos"
        accessibilityLabel="Trocar de curso"
        accessibilityRole="button"
        onPress={onTrocar}
        style={estilos.botaoTrocar}
      >
        <Text style={estilos.botaoTrocarTexto}>Trocar</Text>
        <Ionicons color={cores.destaque} name="chevron-down" size={14} />
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md,
    marginHorizontal: espacamentos.xl,
    marginTop: espacamentos.sm
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  textos: { flex: 1 },
  rotulo: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, marginTop: 1 },
  botaoTrocar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    minHeight: 36
  },
  botaoTrocarTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.rotulo }
});
