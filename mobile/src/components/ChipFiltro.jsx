import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { cores, raios, tipografia } from "../lib/theme.js";

// Chip de filtro por situação — extraído de CatalogoScreen.jsx
// (docs/redesign-mobile/PROMPT-agente-cursos-vitrine.md, item 1: "os chips
// no mesmo componente e estilo do Catálogo") pra ser reaproveitado também
// na aba Cursos (meus cursos), sem duplicar o mesmo botão em dois lugares.
export default function ChipFiltro({ ativo, onPress, rotulo }) {
  return (
    <TouchableOpacity
      accessibilityHint={`Mostra ${rotulo === "Todos" ? "todos os cursos" : `só ${rotulo.toLowerCase()}`}`}
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={onPress}
      style={[estilos.chip, ativo ? estilos.chipAtivo : null]}
    >
      <Text numberOfLines={1} style={[estilos.chipTexto, ativo ? estilos.chipTextoAtivo : null]}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  chip: {
    borderRadius: raios.pilula,
    backgroundColor: cores.fundoCartao,
    paddingHorizontal: 10,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  chipAtivo: { backgroundColor: "rgba(123, 47, 247, 0.18)", borderWidth: 1, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.legenda },
  chipTextoAtivo: { color: cores.acento, fontWeight: "700" }
});
