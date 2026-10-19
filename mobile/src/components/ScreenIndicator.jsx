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
   texto sozinho ja transmite a mesma informacao.

   backgroundColor precisa ser explicito (nao herdar transparencia): este
   componente e renderizado dentro do `header` customizado do
   AlunoStack.Navigator (ver AlunoHeaderBar.jsx) — no Android nativo, a area
   do header do native-stack mantem um fundo claro padrao do Material Design
   por baixo de qualquer conteudo que nao cubra 100% com cor propria, mesmo
   com header totalmente customizado. Sem isso, a faixa aparecia clara/fora
   do tema escuro mesmo com o texto certo por cima. */
// Placeholder visual pro futuro recurso de gamificacao (medalhas/conquistas/
// pontuacao) — so o icone por enquanto, sem pontuacao, ranking, notificacao
// ou destino de navegacao nenhum por tras. Quando o recurso definitivo for
// escolhido, troca-se so esta constante (ou a linha que a usa abaixo); nao
// ha mais nenhum outro lugar do componente que precise mudar.
const ICONE_GAMIFICACAO_PLACEHOLDER = "medal-outline";

export default function ScreenIndicator({ icone, titulo }) {
  return (
    <View style={estilos.container}>
      <View style={estilos.identificacao}>
        {icone ? <Ionicons accessibilityElementsHidden color={cores.destaque} importantForAccessibility="no" name={icone} size={14} /> : null}
        <Text accessibilityRole="header" numberOfLines={1} style={estilos.texto}>{titulo}</Text>
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={cores.textoSuave}
        importantForAccessibility="no"
        name={ICONE_GAMIFICACAO_PLACEHOLDER}
        size={14}
      />
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
  }
});
