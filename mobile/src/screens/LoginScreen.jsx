import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { apiRequest } from "../lib/api.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await apiRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), senha })
      });

      await onLogin({ token: resposta.token, refreshToken: resposta.refreshToken, user: resposta.usuario });
    } catch (err) {
      setErro(err.message || "Nao foi possivel entrar agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>
          Ed<Text style={styles.logoDestaque}>Tech</Text>
        </Text>
        <Text style={styles.subtitulo}>Entre com sua conta para abrir o painel.</Text>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="seu.email@exemplo.com"
            placeholderTextColor="#6d6478"
            style={styles.entrada}
            value={email}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            onChangeText={setSenha}
            placeholder="Sua senha"
            placeholderTextColor="#6d6478"
            secureTextEntry
            style={styles.entrada}
            value={senha}
          />
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <TouchableOpacity disabled={carregando} onPress={entrar} style={styles.botao}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Abrir painel</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#191221"
  },
  conteudo: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  logo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center"
  },
  logoDestaque: {
    color: "#7b2ff7"
  },
  subtitulo: {
    color: "#a89fb3",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32
  },
  campo: {
    marginBottom: 16
  },
  rotulo: {
    color: "#d8d2e0",
    marginBottom: 6,
    fontSize: 13
  },
  entrada: {
    backgroundColor: "#241a30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#3a2a4a"
  },
  erro: {
    color: "#f87171",
    marginBottom: 12,
    textAlign: "center"
  },
  botao: {
    backgroundColor: "#7b2ff7",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "700"
  }
});
