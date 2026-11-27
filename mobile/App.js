import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import AcessoNaoSuportadoScreen from "./src/screens/AcessoNaoSuportadoScreen.jsx";
import AlunoWorkspace from "./src/screens/aluno/AlunoWorkspace.jsx";
import DesbloqueioScreen from "./src/screens/DesbloqueioScreen.jsx";
import { apiRequest } from "./src/lib/api.js";
import { travaDisponivelNestaPlataforma, useBloqueioPorInatividade } from "./src/lib/bloqueioApp.js";
import { clearSession, persistSession, readSession } from "./src/lib/session.js";
import { ROUTES } from "./src/lib/routes.js";
import { envolverComSentry, inicializarSentry } from "./src/lib/sentry.js";
import { cores } from "./src/lib/theme.js";

const RootStack = createNativeStackNavigator();

// NavigationContainer sem `theme` usa o DefaultTheme (fundo branco). Nesse
// app sempre escuro, qualquer vao entre telas - o fade do TelaComTransicao.jsx
// na troca de aba, ou o slide nativo do native-stack ao empilhar/voltar -
// revelava esse branco por baixo antes do conteudo da tela cobrir tudo: a
// causa do "flash branco" na navegacao. Corrigido dando ao container o
// mesmo fundo do app, igual pra toda tela/transicao (pendencia-mobile-
// transicoes-flash-telas).
const temaNavegacao = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: cores.fundo,
    card: cores.fundoCartao,
    border: cores.bordaCartao,
    primary: cores.destaque,
    text: cores.texto
  }
};

inicializarSentry();

function App() {
  const [session, setSession] = useState({ token: "", user: null });
  const [pronto, setPronto] = useState(false);
  // Pacote 9 da auditoria de 26/11 (H1): sessao salva abre travada; volta a
  // travar depois de 5 min ou mais em segundo plano.
  const [bloqueado, setBloqueado] = useState(false);
  const travaAtiva = Boolean(session.user) && travaDisponivelNestaPlataforma();

  useBloqueioPorInatividade({ ativo: travaAtiva, onBloquear: () => setBloqueado(true) });

  useEffect(() => {
    readSession().then((sessaoSalva) => {
      setSession(sessaoSalva);
      setBloqueado(Boolean(sessaoSalva.user) && travaDisponivelNestaPlataforma());
      setPronto(true);
    });
  }, []);

  async function handleLogin(novaSessao) {
    await persistSession(novaSessao);
    setBloqueado(false);
    setSession(novaSessao);
  }

  // H2: desbloqueio pela senha da conta gera tokens novos; o refresh token
  // antigo e invalidado para nao ficar um par sobrando.
  async function handleDesbloqueado(novaSessao) {
    if (novaSessao) {
      if (session.refreshToken && session.refreshToken !== novaSessao.refreshToken) {
        apiRequest("/Auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken })
        }).catch(() => {});
      }
      await persistSession(novaSessao);
      setSession(novaSessao);
    }
    setBloqueado(false);
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
    setBloqueado(false);
    setSession({ token: "", user: null });
  }

  if (!pronto) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.destaque} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer theme={temaNavegacao}>
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
      {session.user && bloqueado ? (
        <View style={StyleSheet.absoluteFill}>
          <DesbloqueioScreen onDesbloqueado={handleDesbloqueado} onSair={handleLogout} usuario={session.user} />
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

export default envolverComSentry(App);
