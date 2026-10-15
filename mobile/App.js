import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import AcessoNaoSuportadoScreen from "./src/screens/AcessoNaoSuportadoScreen.jsx";
import AlunoWorkspace from "./src/screens/aluno/AlunoWorkspace.jsx";
import { apiRequest } from "./src/lib/api.js";
import { clearSession, persistSession, readSession } from "./src/lib/session.js";
import { ROUTES } from "./src/lib/routes.js";
import { envolverComSentry, inicializarSentry } from "./src/lib/sentry.js";

const RootStack = createNativeStackNavigator();

inicializarSentry();

function App() {
  const [session, setSession] = useState({ token: "", user: null });
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    readSession().then((sessaoSalva) => {
      setSession(sessaoSalva);
      setPronto(true);
    });
  }, []);

  async function handleLogin(novaSessao) {
    await persistSession(novaSessao);
    setSession(novaSessao);
  }

  function handleUsuarioAtualizado(usuarioAtualizado) {
    setSession((atual) => {
      const proximaSessao = { ...atual, user: { ...atual.user, ...usuarioAtualizado } };
      persistSession(proximaSessao);
      return proximaSessao;
    });
  }

  async function handleLogout() {
    if (session.refreshToken) {
      apiRequest("/Auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken })
      }).catch(() => {});
    }

    await clearSession();
    setSession({ token: "", user: null });
  }

  if (!pronto) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#191221" }}>
        <ActivityIndicator color="#7b2ff7" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!session.user ? (
            <RootStack.Screen name={ROUTES.AUTH}>
              {() => <LoginScreen onLogin={handleLogin} />}
            </RootStack.Screen>
          ) : session.user.tipoUsuario === "Aluno" ? (
            <RootStack.Screen name={ROUTES.ALUNO_APP}>
              {() => (
                <AlunoWorkspace
                  onLogout={handleLogout}
                  onSessionExpired={handleLogout}
                  onUsuarioAtualizado={handleUsuarioAtualizado}
                  token={session.token}
                  usuario={session.user}
                />
              )}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name={ROUTES.ACESSO_NAO_SUPORTADO}>
              {() => <AcessoNaoSuportadoScreen onLogout={handleLogout} usuario={session.user} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default envolverComSentry(App);
