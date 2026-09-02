import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest, ApiError } from "../lib/api.js";

export default function HomeScreen({ onAbrirNotificacoes, onAbrirPerfil, onLogout, onSessionExpired, usuario }) {
  const [cursos, setCursos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [erro, setErro] = useState("");
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const insets = useSafeAreaInsets();

  // Ref em vez de dependencia direta: onSessionExpired vem do App raiz sem
  // useCallback, entao muda de referencia a cada render — colocar na
  // dependencia do effect refaria o GET /Cursos a cada render em vez de so
  // no mount (mesmo motivo do AlunoWorkspace.jsx).
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    let ignore = false;

    apiRequest("/Cursos")
      .then((resposta) => {
        if (!ignore) {
          setCursos(resposta || []);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (ignore) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpiredRef.current?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar os cursos.");
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!onAbrirNotificacoes) {
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so verifica presenca do prop no mount, nao precisa refazer a busca se a referencia mudar
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.saudacao}>Ola, {usuario.nome}</Text>
          <Text style={styles.perfil}>{usuario.tipoUsuario}</Text>
        </View>
        <View style={styles.acoesCabecalho}>
          {onAbrirNotificacoes ? (
            <TouchableOpacity onPress={onAbrirNotificacoes} style={styles.notificacoesBotao}>
              <Text style={styles.perfilLink}>Notificacoes</Text>
              {notificacoesNaoLidas > 0 ? (
                <View style={styles.notificacoesBadge}>
                  <Text style={styles.notificacoesBadgeTexto}>{notificacoesNaoLidas > 9 ? "9+" : notificacoesNaoLidas}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {onAbrirPerfil ? (
            <TouchableOpacity onPress={onAbrirPerfil}>
              <Text style={styles.perfilLink}>Perfil</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.sair}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.tituloSecao}>Cursos disponiveis</Text>

      {status === "loading" ? <ActivityIndicator color="#7b2ff7" style={{ marginTop: 24 }} /> : null}
      {status === "error" ? <Text style={styles.erro}>{erro}</Text> : null}

      {status === "ready" ? (
        <FlatList
          data={cursos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>{item.titulo}</Text>
              <Text style={styles.cartaoCodigo}>{item.codigoRegistro}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum curso cadastrado ainda.</Text>}
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#191221",
    paddingHorizontal: 20
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  saudacao: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700"
  },
  perfil: {
    color: "#a89fb3",
    marginTop: 2
  },
  acoesCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  perfilLink: {
    color: "#a89fb3",
    fontWeight: "600"
  },
  notificacoesBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  notificacoesBadge: {
    backgroundColor: "#f87171",
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  notificacoesBadgeTexto: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700"
  },
  sair: {
    color: "#f87171",
    fontWeight: "600"
  },
  tituloSecao: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12
  },
  lista: {
    flex: 1
  },
  listaConteudo: {
    paddingBottom: 24
  },
  cartao: {
    backgroundColor: "#241a30",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#7b2ff7"
  },
  cartaoTitulo: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4
  },
  cartaoCodigo: {
    color: "#a89fb3",
    fontSize: 12
  },
  vazio: {
    color: "#a89fb3",
    textAlign: "center",
    marginTop: 24
  },
  erro: {
    color: "#f87171",
    marginTop: 24,
    textAlign: "center"
  }
});
