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
import { cores, raios } from "../lib/theme.js";

export default function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState("");

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

  function abrirRecuperacao() {
    setModo("esqueci");
    setEmailRecuperacao(email);
    setMensagemRecuperacao("");
  }

  async function enviarRecuperacao() {
    setEnviandoRecuperacao(true);
    setMensagemRecuperacao("");

    try {
      const resposta = await apiRequest("/Auth/esqueci-senha", {
        method: "POST",
        body: JSON.stringify({ email: emailRecuperacao.trim() })
      });

      setMensagemRecuperacao(
        resposta.mensagem || "Se o e-mail informado estiver cadastrado, enviaremos as instrucoes de recuperacao."
      );
    } catch (err) {
      setMensagemRecuperacao(err.message || "Nao foi possivel processar a solicitacao agora.");
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  if (modo === "esqueci") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>
            Ed<Text style={styles.logoDestaque}>Tech</Text>
          </Text>
          <Text style={styles.subtitulo}>
            Informe o e-mail cadastrado. Se ele existir na base, enviaremos um link para redefinir sua senha (abra o
            link no navegador).
          </Text>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>E-mail</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmailRecuperacao}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor={cores.textoSuave}
              style={styles.entrada}
              value={emailRecuperacao}
            />
          </View>

          {mensagemRecuperacao ? <Text style={styles.mensagemInfo}>{mensagemRecuperacao}</Text> : null}

          <TouchableOpacity disabled={enviandoRecuperacao} onPress={enviarRecuperacao} style={styles.botao}>
            {enviandoRecuperacao ? <ActivityIndicator color={cores.texto} /> : <Text style={styles.botaoTexto}>Enviar instrucoes</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModo("login")} style={styles.linkVoltar}>
            <Text style={styles.linkVoltarTexto}>{"< Voltar para o login"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
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
            placeholderTextColor={cores.textoSuave}
            style={styles.entrada}
            value={email}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            onChangeText={setSenha}
            placeholder="Sua senha"
            placeholderTextColor={cores.textoSuave}
            secureTextEntry
            style={styles.entrada}
            value={senha}
          />
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <TouchableOpacity disabled={carregando} onPress={entrar} style={styles.botao}>
          {carregando ? <ActivityIndicator color={cores.texto} /> : <Text style={styles.botaoTexto}>Abrir painel</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={abrirRecuperacao} style={styles.linkEsqueciSenha}>
          <Text style={styles.linkEsqueciSenhaTexto}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo
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
    color: cores.texto,
    textAlign: "center"
  },
  logoDestaque: {
    color: cores.destaque
  },
  subtitulo: {
    color: cores.textoSuave,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32
  },
  campo: {
    marginBottom: 16
  },
  rotulo: {
    color: cores.textoRotulo,
    marginBottom: 6,
    fontSize: 13
  },
  entrada: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: cores.texto,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  erro: {
    color: cores.erro,
    marginBottom: 12,
    textAlign: "center"
  },
  botao: {
    backgroundColor: cores.destaque,
    borderRadius: raios.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8
  },
  botaoTexto: {
    color: cores.texto,
    fontWeight: "700"
  },
  linkEsqueciSenha: {
    marginTop: 16,
    alignItems: "center"
  },
  linkEsqueciSenhaTexto: {
    color: cores.textoSuave,
    fontSize: 13
  },
  mensagemInfo: {
    color: cores.destaque,
    marginBottom: 12,
    textAlign: "center"
  },
  linkVoltar: {
    marginTop: 20,
    alignItems: "center"
  },
  linkVoltarTexto: {
    color: cores.textoSuave,
    fontSize: 13
  }
});
