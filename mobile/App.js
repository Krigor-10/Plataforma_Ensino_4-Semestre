import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import HomeScreen from "./src/screens/HomeScreen.jsx";
import { clearSession, persistSession, readSession } from "./src/lib/session.js";

export default function App() {
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

  async function handleLogout() {
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
        {session.user ? (
          <HomeScreen onLogout={handleLogout} usuario={session.user} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
