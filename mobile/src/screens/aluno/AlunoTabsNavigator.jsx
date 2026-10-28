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
import CursosScreen from "./CursosScreen.jsx";
import CertificadosScreen from "./CertificadosScreen.jsx";
import TelaComTransicao from "../../components/TelaComTransicao.jsx";
import { ROUTES } from "../../lib/routes.js";
import { cores } from "../../lib/theme.js";

const Tab = createBottomTabNavigator();

const ABAS = [
  { chave: ROUTES.INICIO, icone: "home-outline", iconeAtivo: "home", rotulo: "Início" },
  { chave: ROUTES.CONTEUDOS, icone: "book-outline", iconeAtivo: "book", rotulo: "Conteúdos" },
  { chave: ROUTES.AVALIACOES, icone: "clipboard-outline", iconeAtivo: "clipboard", rotulo: "Avaliações" },
  { chave: ROUTES.PROGRESSO, icone: "bar-chart-outline", iconeAtivo: "bar-chart", rotulo: "Progresso" },
  { chave: ROUTES.CURSOS, icone: "school-outline", iconeAtivo: "school", rotulo: "Cursos" }
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
      <Animated.View style={estiloIcone}>
        <Ionicons color={ativa ? cores.destaque : cores.textoRotulo} name={ativa ? config.iconeAtivo : config.icone} size={20} />
      </Animated.View>
      <Text style={[estilos.tabTexto, ativa ? estilos.tabTextoAtivo : null]}>{config.rotulo}</Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.tabBar, { paddingBottom: insets.bottom || 10 }]}>
      {state.routes.map((route, index) => {
        const config = ABAS_POR_CHAVE[route.name];
        // Rotas nested no Tab.Navigator que nao sao abas visiveis (ex.:
        // Certificados, que mora aqui so pra manter a CustomTabBar visivel —
        // ver AlunoWorkspace.jsx) nao tem entrada em ABAS/ABAS_POR_CHAVE de
        // proposito, entao nao viram um 6o icone quebrado aqui.
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
      <Tab.Screen name={ROUTES.CURSOS}>
        {({ navigation }) => (
          <TelaComTransicao>
            <CursosScreen
              navigation={navigation}
              onRecarregar={onRecarregar}
              onSessionExpired={onSessionExpired}
              snapshot={snapshot}
              usuario={usuario}
            />
          </TelaComTransicao>
        )}
      </Tab.Screen>
      {/* Nested aqui (nao como AlunoStack.Screen irmao do Tab.Navigator em
          AlunoWorkspace.jsx) de proposito: navegar pra uma Screen de fora do
          Tab.Navigator troca a arvore inteira, derrubando a CustomTabBar
          junto. Vivendo dentro do Tab.Navigator, a barra permanece visivel
          (so nao aparece como icone, ver CustomTabBar acima). Acessivel via
          sidebar (MenuLateral.jsx) e pelo botao "Ver certificado" em
          CursosScreen.jsx, nenhum dos dois muda. */}
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
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, minHeight: 44 },
  tabTexto: { color: cores.textoRotulo, fontSize: 10, fontWeight: "600", textAlign: "center" },
  tabTextoAtivo: { color: cores.destaque }
});
