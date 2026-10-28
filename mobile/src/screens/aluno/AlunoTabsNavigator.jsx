import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import HomeScreen from "../HomeScreen.jsx";
import ConteudosScreen from "./ConteudosScreen.jsx";
import AvaliacoesScreen from "./AvaliacoesScreen.jsx";
import ProgressoScreen from "./ProgressoScreen.jsx";
import CertificadosScreen from "./CertificadosScreen.jsx";
import TelaComTransicao from "../../components/TelaComTransicao.jsx";
import { ROUTES } from "../../lib/routes.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";

const Tab = createBottomTabNavigator();

// 5 abas do redesign (docs/redesign-mobile/PROMPT-agente-mobile.md, secao 1).
// ROUTES.CONTEUDOS aponta pra ConteudosScreen.jsx - virou a aba "Cursos"
// porque e essa tela que concentra a trilha do aluno (grade de selecao +
// modulos). A antiga tela "Cursos" (CursosScreen.jsx) foi removida na
// Rodada 3: suas funcoes ainda necessarias (confirmar pagamento) ja
// migraram pra GradeCursosConteudos.jsx; "Cancelar solicitacao" nao migrou
// de proposito - matricula e sempre automatica desde pendencia_matriculas_
// sempre_automatica_2026_10_27, entao nenhum card real alcancava mais
// aquele estado.
const ABAS = [
  { chave: ROUTES.INICIO, icone: "home-outline", iconeAtivo: "home", rotulo: "Início" },
  { chave: ROUTES.CONTEUDOS, icone: "school-outline", iconeAtivo: "school", rotulo: "Cursos" },
  { chave: ROUTES.AVALIACOES, icone: "clipboard-outline", iconeAtivo: "clipboard", rotulo: "Avaliações" },
  { chave: ROUTES.PROGRESSO, icone: "bar-chart-outline", iconeAtivo: "bar-chart", rotulo: "Progresso" },
  { chave: ROUTES.CERTIFICADOS, icone: "ribbon-outline", iconeAtivo: "ribbon", rotulo: "Certificados" }
];
const ABAS_POR_CHAVE = Object.fromEntries(ABAS.map((aba) => [aba.chave, aba]));

// Pequeno "pulso" de escala no icone ao selecionar a aba — unico sinal de
// destaque que a propria bottom bar da (a troca de conteudo em si e
// responsabilidade do TelaComTransicao.jsx, que anima a tela destino). So
// dispara quando a aba PASSA a ficar ativa, nunca ao ser desselecionada.
function ItemAba({ ativa, config, onPress }) {
  const reduzMovimento = useReducedMotion();
  const escala = useSharedValue(1);

  useEffect(() => {
    if (!ativa || reduzMovimento) {
      return;
    }
    escala.value = withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 120 }));
  }, [ativa, escala, reduzMovimento]);

  const estiloIcone = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <TouchableOpacity
      accessibilityLabel={config.rotulo}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativa }}
      onPress={onPress}
      style={estilos.tabItem}
    >
      <View style={[estilos.tabPilula, ativa ? estilos.tabPilulaAtiva : null]}>
        <Animated.View style={estiloIcone}>
          <Ionicons color={ativa ? cores.destaque : cores.textoRotulo} name={ativa ? config.iconeAtivo : config.icone} size={20} />
        </Animated.View>
        <Text style={[estilos.tabTexto, ativa ? estilos.tabTextoAtivo : null]}>{config.rotulo}</Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.tabBar, { paddingBottom: insets.bottom || 10 }]}>
      {state.routes.map((route, index) => {
        const config = ABAS_POR_CHAVE[route.name];
        // Guarda defensiva: hoje toda rota do Tab.Navigator tem entrada em
        // ABAS, mas se algum dia voltar a existir uma rota nested sem icone
        // proprio (mesmo truque ja usado antes pra Certificados/Cursos), ela
        // simplesmente nao vira um icone quebrado aqui.
        if (!config) {
          return null;
        }
        const ativa = state.index === index;
        return (
          <ItemAba
            ativa={ativa}
            config={config}
            key={route.key}
            onPress={() => {
              const evento = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!ativa && !evento.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

export default function AlunoTabsNavigator({ carregando, erro, onRecarregar, onSessionExpired, snapshot, tentarNovamente, usuario }) {
  const insets = useSafeAreaInsets();

  if (carregando) {
    return <ActivityIndicator color={cores.destaque} style={{ marginTop: 60 }} />;
  }

  if (erro) {
    return (
      <View style={estilos.erroContainer}>
        <Text style={estilos.erro}>{erro}</Text>
        <TouchableOpacity accessibilityLabel="Tentar novamente" onPress={tentarNovamente} style={estilos.botaoTentarNovamente}>
          <Ionicons color={cores.texto} name="refresh" size={16} />
          <Text style={estilos.botaoTentarNovamenteTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ paddingBottom: insets.bottom }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name={ROUTES.INICIO}>
        {({ navigation }) => (
          <TelaComTransicao>
            <HomeScreen onAbrirAba={(aba, params) => navigation.navigate(aba, params)} snapshot={snapshot} usuario={usuario} />
          </TelaComTransicao>
        )}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.CONTEUDOS}>
        {() => (
          <TelaComTransicao>
            <ConteudosScreen onRecarregar={onRecarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} />
          </TelaComTransicao>
        )}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.AVALIACOES}>
        {() => (
          <TelaComTransicao>
            <AvaliacoesScreen onRecarregar={onRecarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} />
          </TelaComTransicao>
        )}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.PROGRESSO}>
        {() => (
          <TelaComTransicao>
            <ProgressoScreen snapshot={snapshot} />
          </TelaComTransicao>
        )}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.CERTIFICADOS}>
        {() => (
          <TelaComTransicao>
            <CertificadosScreen onSessionExpired={onSessionExpired} snapshot={snapshot} />
          </TelaComTransicao>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const estilos = StyleSheet.create({
  erroContainer: { marginTop: 60, paddingHorizontal: 24, alignItems: "center", gap: 16 },
  erro: { color: cores.erro, textAlign: "center" },
  botaoTentarNovamente: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: cores.destaque,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44
  },
  botaoTentarNovamenteTexto: { color: cores.texto, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    backgroundColor: cores.fundoCartao,
    paddingTop: 10
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  // Pilula de destaque da aba ativa (fundo roxo a 15%) - só aparece em volta
  // do icone+rotulo quando selecionada, do contrario fica transparente (sem
  // alterar o layout/alinhamento das abas inativas).
  tabPilula: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4,
    borderRadius: raios.pilula,
    backgroundColor: "transparent"
  },
  tabPilulaAtiva: { backgroundColor: "rgba(123, 47, 247, 0.15)" },
  tabTexto: { color: cores.textoRotulo, fontSize: 10, fontWeight: "600", textAlign: "center" },
  tabTextoAtivo: { color: cores.destaque }
});
