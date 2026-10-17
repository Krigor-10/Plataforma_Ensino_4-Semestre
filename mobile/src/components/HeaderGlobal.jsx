import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../lib/api.js";
import { obterIniciais } from "../lib/format.js";
import { cores, espacamentos } from "../lib/theme.js";

/* Header global do Aluno — antes vivia so dentro de HomeScreen.jsx, entao
   notificacoes/perfil sumiam ao navegar pras outras abas. Hoje e o `header`
   custom do AlunoStack (ver AlunoHeaderBar.jsx/AlunoWorkspace.jsx), montado uma
   unica vez acima de qualquer tela do Aluno (abas ou Perfil/Notificacoes),
   preservando exatamente o visual/comportamento que a Home ja tinha.
   notificacoesVersao muda quando NotificacoesScreen marca algo como lido, pra
   badge acompanhar sem precisar remontar o header inteiro. "Sair" nao mora aqui
   de proposito — e uma acao destrutiva, fica no menu lateral/Perfil pra nao
   virar tap acidental ao lado de Notificacoes. Hamburguer (abre o menu lateral,
   ver MenuLateral.jsx) e busca (ver BuscaScreen.jsx) sao os dois botoes novos. */
export default function HeaderGlobal({ notificacoesVersao, onAbrirBusca, onAbrirMenu, onAbrirNotificacoes, onAbrirPerfil, usuario }) {
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
      <View style={estilos.esquerda}>
        <TouchableOpacity accessibilityHint="Abre o menu lateral" accessibilityLabel="Menu" onPress={onAbrirMenu} style={estilos.botao}>
          <Ionicons color={cores.textoSuave} name="menu" size={24} />
        </TouchableOpacity>
        <View style={estilos.marca}>
          <Text style={estilos.marcaCode}>Code</Text>
          <Text style={estilos.marcaRyse}>Ryse</Text>
        </View>
      </View>
      <View style={estilos.acoes}>
        <TouchableOpacity accessibilityHint="Abre a busca de cursos, conteudos e avaliacoes" accessibilityLabel="Buscar" onPress={onAbrirBusca} style={estilos.botao}>
          <Ionicons color={cores.textoSuave} name="search-outline" size={22} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityHint="Abre a lista de notificações" accessibilityLabel="Notificações" onPress={onAbrirNotificacoes} style={estilos.botao}>
          <Ionicons color={cores.textoSuave} name={notificacoesNaoLidas > 0 ? "notifications" : "notifications-outline"} size={22} />
          {notificacoesNaoLidas > 0 ? (
            <View style={estilos.badge}>
              <Text style={estilos.badgeTexto}>{notificacoesNaoLidas > 9 ? "9+" : notificacoesNaoLidas}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityHint="Abre a tela de perfil"
          accessibilityLabel="Perfil"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onAbrirPerfil}
          style={estilos.avatar}
        >
          <Text style={estilos.avatarTexto}>{obterIniciais(usuario.nome)}</Text>
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
  esquerda: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: -10 },
  marca: { flexDirection: "row", alignItems: "baseline" },
  marcaCode: { color: cores.texto, fontSize: 20, fontWeight: "800" },
  marcaRyse: { color: cores.destaque, fontSize: 20, fontWeight: "800" },
  acoes: { flexDirection: "row", alignItems: "center", gap: 4 },
  botao: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4
  },
  avatarTexto: { color: cores.texto, fontSize: 13, fontWeight: "800" },
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
