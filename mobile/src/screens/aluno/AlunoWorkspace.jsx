import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import AlunoHeaderBar from "../../components/AlunoHeaderBar.jsx";
import AlunoTabsNavigator from "./AlunoTabsNavigator.jsx";
import PerfilScreen from "./PerfilScreen.jsx";
import NotificacoesScreen from "./NotificacoesScreen.jsx";
import { ApiError } from "../../lib/api.js";
import { EMPTY_SNAPSHOT, loadAlunoSnapshot } from "../../lib/dashboard.js";
import { cores } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";

const AlunoStack = createNativeStackNavigator();

export default function AlunoWorkspace({ onLogout, onSessionExpired, onUsuarioAtualizado, token, usuario }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [notificacoesVersao, setNotificacoesVersao] = useState(0);

  // Ref em vez de dependencia direta: onSessionExpired e recriada a cada
  // render do App raiz (nao usa useCallback la), entao inclui-la nas
  // dependencias de recarregar faria o useEffect de carregamento inicial
  // (abaixo) refazer a busca a cada render em vez de so no mount.
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  const recarregar = useCallback(async () => {
    try {
      const proximoSnapshot = await loadAlunoSnapshot(usuario);
      setSnapshot(proximoSnapshot);
      setErro("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }

      setErro(err.message || "Nao foi possivel carregar seus dados agora.");
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function tentarNovamente() {
    setCarregando(true);
    recarregar();
  }

  return (
    <View style={estilos.container}>
      <AlunoStack.Navigator
        screenOptions={({ route, navigation }) => ({
          header: () => (
            <AlunoHeaderBar
              navigation={navigation}
              notificacoesVersao={notificacoesVersao}
              route={route}
              usuario={usuario}
            />
          )
        })}
      >
        <AlunoStack.Screen name={ROUTES.ALUNO_TABS}>
          {() => (
            <AlunoTabsNavigator
              carregando={carregando}
              erro={erro}
              onRecarregar={recarregar}
              onSessionExpired={onSessionExpired}
              snapshot={snapshot}
              tentarNovamente={tentarNovamente}
              token={token}
              usuario={usuario}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.PERFIL}>
          {({ navigation }) => (
            <PerfilScreen
              onLogout={onLogout}
              onSessionExpired={onSessionExpired}
              onUsuarioAtualizado={onUsuarioAtualizado}
              onVoltar={() => navigation.goBack()}
              usuario={usuario}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.NOTIFICACOES}>
          {({ navigation }) => (
            <NotificacoesScreen
              onNotificacoesAtualizadas={() => setNotificacoesVersao((atual) => atual + 1)}
              onSessionExpired={onSessionExpired}
              onVoltar={() => navigation.goBack()}
            />
          )}
        </AlunoStack.Screen>
      </AlunoStack.Navigator>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo }
});
