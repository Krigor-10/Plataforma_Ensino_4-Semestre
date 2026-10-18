import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../HomeScreen.jsx";
import ConteudosScreen from "./ConteudosScreen.jsx";
import AvaliacoesScreen from "./AvaliacoesScreen.jsx";
import ProgressoScreen from "./ProgressoScreen.jsx";
import CursosScreen from "./CursosScreen.jsx";
import CertificadosScreen from "./CertificadosScreen.jsx";
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
          <TouchableOpacity
            accessibilityLabel={config.rotulo}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            key={route.key}
            onPress={() => {
              const evento = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!ativa && !evento.defaultPrevented) navigation.navigate(route.name);
            }}
            style={estilos.tabItem}
          >
            <Ionicons color={ativa ? cores.destaque : cores.textoSuave} name={ativa ? config.iconeAtivo : config.icone} size={20} />
            <Text style={[estilos.tabTexto, ativa ? estilos.tabTextoAtivo : null]}>{config.rotulo}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AlunoTabsNavigator({ carregando, erro, onRecarregar, onSessionExpired, snapshot, tentarNovamente, token, usuario }) {
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
          <HomeScreen onAbrirAba={(aba, params) => navigation.navigate(aba, params)} snapshot={snapshot} usuario={usuario} />
        )}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.CONTEUDOS}>
        {() => <ConteudosScreen onRecarregar={onRecarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} token={token} />}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.AVALIACOES}>
        {() => <AvaliacoesScreen onRecarregar={onRecarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} />}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.PROGRESSO}>
        {() => <ProgressoScreen snapshot={snapshot} />}
      </Tab.Screen>
      <Tab.Screen name={ROUTES.CURSOS}>
        {({ navigation }) => (
          <CursosScreen
            navigation={navigation}
            onRecarregar={onRecarregar}
            onSessionExpired={onSessionExpired}
            snapshot={snapshot}
            usuario={usuario}
          />
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
        {() => <CertificadosScreen onSessionExpired={onSessionExpired} snapshot={snapshot} />}
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
  tabTexto: { color: cores.textoSuave, fontSize: 10, fontWeight: "600", textAlign: "center" },
  tabTextoAtivo: { color: cores.destaque }
});
