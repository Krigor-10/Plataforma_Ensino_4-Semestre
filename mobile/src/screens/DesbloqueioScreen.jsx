import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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
import { desbloquearComDispositivo, dispositivoTemTrava } from "../lib/bloqueioApp.js";
import { cores, espacamentos, raios } from "../lib/theme.js";

/* Tela de desbloqueio (pacote 9 da auditoria de 26/11, decisoes H1 e H2).
   Cobre o app inteiro por cima da navegacao (App.js), entao o aluno volta
   exatamente onde estava. Ordem: biometria (com o PIN do celular como
   alternativa do sistema) -> senha da conta. Celular sem nenhuma trava
   configurada vai direto para a senha. */
export default function DesbloqueioScreen({ usuario, onDesbloqueado, onSair }) {
  // verificando | dispositivo | senha
  const [modo, setModo] = useState("verificando");
  const [temTravaNoCelular, setTemTravaNoCelular] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const montadoRef = useRef(true);

  // O botao voltar do Android nao pode navegar pelas telas escondidas.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => assinatura.remove();
  }, []);

  useEffect(() => {
    montadoRef.current = true;

    async function iniciar() {
      const temTrava = await dispositivoTemTrava();
      if (!montadoRef.current) {
        return;
      }

      setTemTravaNoCelular(temTrava);
      if (temTrava) {
        setModo("dispositivo");
        tentarDispositivo();
      } else {
        setModo("senha");
      }
    }

    iniciar();
    return () => {
      montadoRef.current = false;
    };
    // So na abertura da tela: a biometria comeca sozinha uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tentarDispositivo() {
    setAutenticando(true);
    setErro("");

    const resultado = await desbloquearComDispositivo();
    if (!montadoRef.current) {
      return;
    }

    setAutenticando(false);
    if (resultado.success) {
      onDesbloqueado();
      return;
    }

    // "Usar senha da conta" (cancelLabel) e o atalho "user_fallback" do iOS
    // levam direto para a senha; o resto deixa as duas opcoes na tela.
    if (resultado.error === "user_cancel" || resultado.error === "user_fallback") {
      setModo("senha");
      return;
    }

    if (resultado.error === "lockout") {
      setErro("Muitas tentativas. Use a senha da conta ou o PIN do celular.");
    }
  }

  async function desbloquearComSenha() {
    if (!senha) {
      setErro("Digite a senha da sua conta.");
      return;
    }

    setAutenticando(true);
    setErro("");

    try {
      const resposta = await apiRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({ email: usuario.email, senha })
      });

      if (!montadoRef.current) {
        return;
      }

      setSenha("");
      onDesbloqueado({ token: resposta.token, refreshToken: resposta.refreshToken, user: resposta.usuario });
    } catch (err) {
      if (montadoRef.current) {
        setErro(err.message || "Nao foi possivel confirmar a senha agora.");
      }
    } finally {
      if (montadoRef.current) {
        setAutenticando(false);
      }
    }
  }

  const primeiroNome = String(usuario?.nome || "").trim().split(" ")[0];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.icone}>
          <Ionicons color={cores.destaque} name="lock-closed" size={32} />
        </View>
        <Text style={styles.logo}>
          Code<Text style={styles.logoDestaque}>Ryse</Text>
        </Text>
        <Text style={styles.subtitulo}>
          {primeiroNome ? `Olá, ${primeiroNome}. ` : ""}
          {modo === "senha" && !temTravaNoCelular
            ? "Este celular não tem biometria nem PIN configurados. Confirme com a senha da sua conta."
            : modo === "senha"
              ? "Confirme com a senha da sua conta."
              : "Desbloqueie para continuar."}
        </Text>

        {modo === "verificando" ? <ActivityIndicator color={cores.destaque} /> : null}

        {modo === "dispositivo" ? (
          <>
            <TouchableOpacity
              accessibilityHint="Abre o pedido de digital, rosto ou PIN do celular"
              accessibilityLabel="Desbloquear com biometria ou PIN do celular"
              accessibilityRole="button"
              disabled={autenticando}
              onPress={tentarDispositivo}
              style={styles.botao}
            >
              {autenticando ? (
                <ActivityIndicator color={cores.texto} />
              ) : (
                <Text style={styles.botaoTexto}>Desbloquear</Text>
              )}
            </TouchableOpacity>
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={autenticando}
              onPress={() => {
                setErro("");
                setModo("senha");
              }}
              style={styles.link}
            >
              <Text style={styles.linkTexto}>Usar a senha da conta</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {modo === "senha" ? (
          <>
            <View style={styles.campo}>
              <Text style={styles.rotulo}>Senha</Text>
              <TextInput
                accessibilityHint="Digite a senha usada para entrar na CodeRyse"
                accessibilityLabel="Senha da conta"
                autoFocus
                editable={!autenticando}
                onChangeText={setSenha}
                onSubmitEditing={desbloquearComSenha}
                placeholder="Sua senha"
                placeholderTextColor={cores.textoSuave}
                secureTextEntry
                style={styles.entrada}
                value={senha}
              />
            </View>
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={autenticando}
              onPress={desbloquearComSenha}
              style={styles.botao}
            >
              {autenticando ? (
                <ActivityIndicator color={cores.texto} />
              ) : (
                <Text style={styles.botaoTexto}>Desbloquear</Text>
              )}
            </TouchableOpacity>
            {temTravaNoCelular ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={autenticando}
                onPress={() => {
                  setModo("dispositivo");
                  tentarDispositivo();
                }}
                style={styles.link}
              >
                <Text style={styles.linkTexto}>Usar biometria ou PIN do celular</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}

        <TouchableOpacity accessibilityRole="button" disabled={autenticando} onPress={onSair} style={styles.link}>
          <Text style={styles.linkSair}>Sair da conta</Text>
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
    paddingHorizontal: espacamentos.xxl,
    paddingVertical: 32
  },
  icone: {
    alignItems: "center",
    marginBottom: 12
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
    marginTop: 12,
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
  link: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  linkTexto: {
    color: cores.textoSuave,
    fontSize: 13
  },
  linkSair: {
    color: cores.erro,
    fontSize: 13
  }
});
