import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { cores } from "../lib/theme.js";

/* Link "< Voltar" compartilhado pelas telas empilhadas no AlunoStack que nao
   tem seta de voltar no header global (ver AlunoHeaderBar.jsx) — Perfil,
   Notificacoes e Catalogo reimplementavam o mesmo JSX cada uma antes desta
   extracao. BuscaScreen.jsx usa um padrao visual diferente de proposito
   (icone isolado dentro da propria barra de busca, sem o texto "Voltar"),
   entao nao foi migrada pra este componente. `style` permite cada tela
   ajustar margem/alinhamento externo sem duplicar o visual do botao em si. */
export default function BotaoVoltar({ onPress, style }) {
  return (
    <TouchableOpacity
      accessibilityHint="Volta para a tela anterior"
      accessibilityLabel="Voltar"
      accessibilityRole="button"
      onPress={onPress}
      style={[estilos.container, style]}
    >
      <Ionicons color={cores.destaque} name="chevron-back" size={18} />
      <Text style={estilos.texto}>Voltar</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, marginLeft: -6 },
  texto: { color: cores.destaque, fontWeight: "600" }
});
