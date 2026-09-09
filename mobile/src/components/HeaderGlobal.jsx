import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../lib/api.js";
import { cores, espacamentos } from "../lib/theme.js";

/* Header global do Aluno — antes vivia so dentro de HomeScreen.jsx, entao
   notificacoes/perfil/logout sumiam ao navegar pras outras abas (AlunoWorkspace.jsx
   nao usa Stack/Tab/Drawer Navigator, e um switcher proprio por state). Agora e
   montado uma unica vez acima da area trocada por aba, preservando exatamente o
   visual/comportamento que a Home ja tinha. notificacoesVersao muda quando
   NotificacoesScreen marca algo como lido, pra badge acompanhar sem precisar
   remontar o header inteiro. */
export default function HeaderGlobal({ notificacoesVersao, onAbrirNotificacoes, onAbrirPerfil, onLogout, usuario }) {
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let ignore = false;

    // Falha aqui e silenciosa de proposito (mesmo criterio do web): o badge
    // de notificacao nao e critico o suficiente pra interromper a tela.
    apiRequest("/Notificacoes/nao-lidas/contagem")
      .then((resposta) => {
        if (!ignore) {
          setNotificacoesNaoLidas(resposta?.total || 0);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [notificacoesVersao]);

  return (
    <View style={[estilos.container, { paddingTop: insets.top + 12 }]}>
      <View>
        <Text style={estilos.saudacao}>Ola, {usuario.nome}</Text>
        <Text style={estilos.papel}>{usuario.tipoUsuario}</Text>
      </View>
      <View style={estilos.acoes}>
        <TouchableOpacity accessibilityLabel="Notificacoes" onPress={onAbrirNotificacoes} style={estilos.botao}>
          <Ionicons color={cores.textoSuave} name="notifications-outline" size={22} />
          {notificacoesNaoLidas > 0 ? (
            <View style={estilos.badge}>
              <Text style={estilos.badgeTexto}>{notificacoesNaoLidas > 9 ? "9+" : notificacoesNaoLidas}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Perfil" onPress={onAbrirPerfil} style={estilos.botao}>
          <Ionicons color={cores.textoSuave} name="person-outline" size={22} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Sair" onPress={onLogout} style={estilos.botao}>
          <Ionicons color={cores.erro} name="log-out-outline" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: espacamentos.xl,
    paddingBottom: espacamentos.md,
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  saudacao: { color: cores.texto, fontSize: 20, fontWeight: "700" },
  papel: { color: cores.textoSuave, marginTop: 2 },
  acoes: { flexDirection: "row", alignItems: "center", gap: 4 },
  botao: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: cores.erro,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeTexto: { color: cores.texto, fontSize: 9, fontWeight: "700" }
});
