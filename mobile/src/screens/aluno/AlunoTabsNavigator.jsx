import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import HomeScreen from "../HomeScreen.jsx";
import ConteudosScreen from "./ConteudosScreen.jsx";
import AvaliacoesScreen from "./AvaliacoesScreen.jsx";
import ProgressoScreen from "./ProgressoScreen.jsx";
import CertificadosScreen from "./CertificadosScreen.jsx";
import CustomTabBar from "./CustomTabBar.jsx";
import { SkeletonInicio } from "../../components/Skeleton.jsx";
import TelaComTransicao from "../../components/TelaComTransicao.jsx";
import { ROUTES } from "../../lib/routes.js";
import { cores } from "../../lib/theme.js";

const Tab = createBottomTabNavigator();

export default function AlunoTabsNavigator({ carregando, erro, onAbrirXp, onRecarregar, onSessionExpired, snapshot, tentarNovamente, usuario, xp }) {
  if (carregando) {
    return <SkeletonInicio />;
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
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name={ROUTES.INICIO}>
        {({ navigation }) => (
          <TelaComTransicao>
            <HomeScreen
              onAbrirAba={(aba, params) => navigation.navigate(aba, params)}
              onAbrirXp={onAbrirXp}
              snapshot={snapshot}
              usuario={usuario}
              xp={xp}
            />
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
            <ProgressoScreen onSessionExpired={onSessionExpired} snapshot={snapshot} />
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
  botaoTentarNovamenteTexto: { color: cores.texto, fontWeight: "700" }
});
