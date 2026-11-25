import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XP_POR_CONTEUDO, XP_POR_CURSO, XP_POR_MODULO } from "../../../shared/xp.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const COMO_GANHAR_XP = [
  { rotulo: "Conteúdo concluído", valor: XP_POR_CONTEUDO },
  { rotulo: "Módulo concluído", valor: XP_POR_MODULO },
  { rotulo: "Curso concluído", valor: XP_POR_CURSO }
];

/* Painel "Seu nível" (docs/gamificacao/PROMPT-agente-barra-xp-mobile.md,
   item 4) - aberto pelo chip de XP (ScreenIndicator.jsx, outras abas) ou
   pela linha de XP da saudacao (HomeScreen.jsx), ambos via o mesmo estado
   em AlunoWorkspace.jsx. So mostra o que calcularXp (shared/xp.js) ja
   calculou - os valores de "Como ganhar XP" vem das constantes exportadas
   por shared/xp.js, nunca hardcoded aqui. Mesmo padrao de sheet (Modal +
   alca + overlay) do ConfirmacaoCompraSheet.jsx/DetalheCursoSheet.jsx. */
export default function PainelXp({ onFechar, visivel, xp }) {
  const insets = useSafeAreaInsets();

  if (!xp) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onFechar} transparent visible={visivel}>
      <View style={estilos.overlay}>
        <TouchableOpacity
          accessibilityElementsHidden
          accessibilityRole="none"
          activeOpacity={1}
          importantForAccessibility="no"
          onPress={onFechar}
          style={StyleSheet.absoluteFill}
        />
        <View style={[estilos.sheet, { paddingBottom: insets.bottom + espacamentos.lg }]}>
          <View style={estilos.alcaLinha}>
            <View style={estilos.alca} />
          </View>

          <View style={estilos.cabecalho}>
            <View style={estilos.cabecalhoNivel}>
              <Ionicons color={cores.destaque} name="flash" size={18} />
              <Text style={estilos.cabecalhoNivelTexto}>Nível {xp.nivel}</Text>
            </View>
            <Text style={estilos.cabecalhoContagem}>{xp.xpNoNivel} / {xp.xpPorNivel} XP</Text>
            <TouchableOpacity
              accessibilityHint="Fecha o painel de XP"
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={onFechar}
              style={estilos.botaoFechar}
            >
              <Ionicons color={cores.textoSuave} name="close" size={20} />
            </TouchableOpacity>
          </View>

          <View style={estilos.barraFundo}>
            <LinearGradient colors={["#7b2ff7", "#a78bfa"]} style={[estilos.barraPreenchida, { width: `${xp.percentualNivel}%` }]} />
          </View>

          <Text style={estilos.faltamTexto}>Faltam {xp.faltamParaProximo} XP para o nível {xp.nivel + 1}</Text>

          <Text style={estilos.subtitulo}>Como ganhar XP</Text>
          {COMO_GANHAR_XP.map((item) => (
            <View key={item.rotulo} style={estilos.linhaComoGanhar}>
              <Text style={estilos.linhaComoGanharRotulo}>{item.rotulo}</Text>
              <Text style={estilos.linhaComoGanharValor}>+{item.valor} XP</Text>
            </View>
          ))}

          <Text style={estilos.nota}>Quizzes e avaliações ainda não contam XP.</Text>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(123, 47, 247, 0.3)",
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.sm,
    maxHeight: "90%"
  },
  alcaLinha: { alignItems: "center", paddingVertical: espacamentos.sm },
  alca: { width: 36, height: 4, borderRadius: raios.pilula, backgroundColor: cores.divisoria },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, marginTop: espacamentos.sm },
  cabecalhoNivel: { flexDirection: "row", alignItems: "center", gap: 6 },
  cabecalhoNivelTexto: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  cabecalhoContagem: { flex: 1, textAlign: "right", color: cores.textoSuave, fontSize: tipografia.corpo, fontWeight: "600" },
  botaoFechar: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  barraFundo: { height: 8, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: espacamentos.md },
  barraPreenchida: { height: 8, borderRadius: raios.sm },
  faltamTexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: espacamentos.sm, marginBottom: espacamentos.lg },
  subtitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, marginBottom: espacamentos.sm },
  linhaComoGanhar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: espacamentos.sm,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao
  },
  linhaComoGanharRotulo: { color: cores.texto, fontSize: tipografia.corpo },
  linhaComoGanharValor: { color: "#c4b5fd", fontWeight: "700", fontSize: tipografia.corpo },
  nota: { color: cores.textoRotulo, fontSize: tipografia.legenda, marginTop: espacamentos.md }
});
