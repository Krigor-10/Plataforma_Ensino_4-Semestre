import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

/* Barra de cabecalho leve (seta de voltar + titulo) usada pelas telas
   empilhadas que NAO fazem parte das 5 abas principais do Aluno — Perfil,
   Catalogo e Notificacoes (ver AlunoWorkspace.jsx). Sem HeaderGlobal.jsx
   (logo/menu/busca/sino/avatar) nem a faixa ScreenIndicator.jsx, que ficam
   reservadas pras abas (redesign, docs/redesign-mobile/PROMPT-agente-
   mobile-rodada3.md, secao 2, 8_meu_perfil.png). Busca.jsx tem seu proprio
   padrao visual (busca embutida no lugar do titulo) e nao usa este
   componente — ver BuscaScreen.jsx. */
export default function CabecalhoSimples({ onVoltar, titulo }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.container, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        accessibilityHint="Volta para a tela anterior"
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onVoltar}
        style={estilos.botaoVoltar}
      >
        <Ionicons color={cores.texto} name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text numberOfLines={1} style={estilos.titulo}>{titulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    paddingHorizontal: espacamentos.xl,
    paddingBottom: espacamentos.md,
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  botaoVoltar: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", marginLeft: -10 },
  titulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "700", flex: 1 }
});
