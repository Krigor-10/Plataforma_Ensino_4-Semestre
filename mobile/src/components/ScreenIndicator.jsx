import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores, espacamentos, raios } from "../lib/theme.js";

/* Indicador de "onde estou" — fica entre HeaderGlobal.jsx (acoes globais)
   e o conteudo da tela trocada por aba em AlunoWorkspace.jsx. Deliberadamente
   discreto (rotulo pequeno, maiusculo) pra nao competir com o Header nem
   parecer um segundo Header — so o icone/cor usam o roxo de marca (mesmo
   icone da aba ativa no menu inferior) pra reforcar contexto sem virar
   outro titulo grande. accessibilityRole="header" avisa leitores de tela
   que este texto identifica a secao atual; o icone e aria-hidden porque o
   texto sozinho ja transmite a mesma informacao.

   backgroundColor precisa ser explicito (nao herdar transparencia): este
   componente e renderizado dentro do `header` customizado do
   AlunoStack.Navigator (ver AlunoHeaderBar.jsx) — no Android nativo, a area
   do header do native-stack mantem um fundo claro padrao do Material Design
   por baixo de qualquer conteudo que nao cubra 100% com cor propria, mesmo
   com header totalmente customizado. Sem isso, a faixa aparecia clara/fora
   do tema escuro mesmo com o texto certo por cima.

   Regra (docs/redesign-mobile/PROMPT-agente-avaliacoes-ajustes-1.md, item
   6): este titulo e o UNICO "onde estou" grande das 5 telas de aba
   (Inicio/Cursos/Avaliacoes/Progresso/Certificados) - nenhuma delas repete
   um titulo grande igual "Avaliações"/"Progresso"/"Cursos" logo abaixo
   deste breadcrumb. Telas empilhadas (detalhe do curso, do modulo etc.)
   continuam com titulo proprio do CONTEUDO (nome do curso, "CURSO" + nome
   do modulo...), que nao e repeticao do nome da aba. */
// O placeholder de medalha (so o icone, sem numero nenhum atras) foi
// trocado pelo chip de XP real (docs/gamificacao/PROMPT-agente-barra-xp-
// mobile.md, item 3) - `xp` vem de calcularXp (shared/xp.js), calculado
// uma unica vez em AlunoWorkspace.jsx e repassado via AlunoHeaderBar.jsx.
// Sem `xp` (aluno sem matricula liberada, ou na aba Inicio - que mostra o
// XP na propria saudacao), nao renderiza nada a direita.
export default function ScreenIndicator({ icone, onAbrirXp, titulo, xp }) {
  return (
    <View style={estilos.container}>
      <View style={estilos.identificacao}>
        {icone ? <Ionicons accessibilityElementsHidden color={cores.destaque} importantForAccessibility="no" name={icone} size={14} /> : null}
        <Text accessibilityRole="header" numberOfLines={1} style={estilos.texto}>{titulo}</Text>
      </View>
      {xp ? (
        <TouchableOpacity
          accessibilityHint="Abre o painel com nível, XP e como ganhar mais"
          accessibilityLabel={`Nível ${xp.nivel}: ${xp.xpNoNivel} de ${xp.xpPorNivel} XP. Toque para ver detalhes.`}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onAbrirXp}
          style={estilos.chipXp}
        >
          <Ionicons color="#d6c8ff" name="flash" size={12} />
          <Text style={estilos.chipXpTexto}>Nv {xp.nivel}</Text>
          <View style={estilos.chipXpBarraFundo}>
            <LinearGradient
              colors={["#7b2ff7", "#a78bfa"]}
              style={[estilos.chipXpBarraPreenchida, { width: `${xp.percentualNivel}%` }]}
            />
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacamentos.sm,
    paddingHorizontal: espacamentos.xl,
    paddingVertical: espacamentos.sm,
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  identificacao: { flexDirection: "row", alignItems: "center", gap: espacamentos.xs, flexShrink: 1 },
  texto: {
    color: cores.destaque,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink: 1
  },
  chipXp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 22,
    borderRadius: raios.pilula,
    backgroundColor: "rgba(123, 47, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(157, 103, 255, 0.45)",
    paddingHorizontal: 8
  },
  chipXpTexto: { color: "#d6c8ff", fontSize: 10.5, fontWeight: "800" },
  chipXpBarraFundo: { width: 42, height: 4, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.15)", overflow: "hidden" },
  chipXpBarraPreenchida: { height: 4, borderRadius: 4 }
});
