import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderGlobal from "../../components/HeaderGlobal.jsx";
import ScreenIndicator from "../../components/ScreenIndicator.jsx";
import HomeScreen from "../HomeScreen.jsx";
import ConteudosScreen from "./ConteudosScreen.jsx";
import AvaliacoesScreen from "./AvaliacoesScreen.jsx";
import ProgressoScreen from "./ProgressoScreen.jsx";
import MatriculasScreen from "./MatriculasScreen.jsx";
import CertificadosScreen from "./CertificadosScreen.jsx";
import PerfilScreen from "./PerfilScreen.jsx";
import NotificacoesScreen from "./NotificacoesScreen.jsx";
import { ApiError } from "../../lib/api.js";
import { EMPTY_SNAPSHOT, loadAlunoSnapshot } from "../../lib/dashboard.js";
import { cores } from "../../lib/theme.js";

const ABAS = [
  { chave: "inicio", icone: "home-outline", iconeAtivo: "home", rotulo: "Inicio" },
  { chave: "conteudos", icone: "book-outline", iconeAtivo: "book", rotulo: "Conteudos" },
  { chave: "avaliacoes", icone: "clipboard-outline", iconeAtivo: "clipboard", rotulo: "Avaliacoes" },
  { chave: "progresso", icone: "bar-chart-outline", iconeAtivo: "bar-chart", rotulo: "Progresso" },
  { chave: "matriculas", icone: "school-outline", iconeAtivo: "school", rotulo: "Matriculas" },
  { chave: "certificados", icone: "ribbon-outline", iconeAtivo: "ribbon", rotulo: "Certificados" }
];

/* Titulo/icone do ScreenIndicator por aba — reaproveita rotulo e iconeAtivo
   que ABAS ja tem pras 6 abas com item no menu inferior (fonte unica, sem
   duplicar string/icone), so acrescenta as 2 telas alcancadas pelo
   HeaderGlobal (perfil/notificacoes) que nao tem item proprio no rodape. */
const TELAS_INFO = {
  ...Object.fromEntries(ABAS.map((aba) => [aba.chave, { icone: aba.iconeAtivo, titulo: aba.rotulo }])),
  perfil: { icone: "person", titulo: "Meu perfil" },
  notificacoes: { icone: "notifications", titulo: "Notificacoes" }
};

export default function AlunoWorkspace({ onLogout, onSessionExpired, onUsuarioAtualizado, token, usuario }) {
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [notificacoesVersao, setNotificacoesVersao] = useState(0);
  const insets = useSafeAreaInsets();

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

  return (
    <View style={estilos.container}>
      <HeaderGlobal
        notificacoesVersao={notificacoesVersao}
        onAbrirNotificacoes={() => setAbaAtiva("notificacoes")}
        onAbrirPerfil={() => setAbaAtiva("perfil")}
        onLogout={onLogout}
        usuario={usuario}
      />

      <ScreenIndicator icone={TELAS_INFO[abaAtiva]?.icone} titulo={TELAS_INFO[abaAtiva]?.titulo || ""} />

      <View style={[estilos.corpo, { paddingBottom: insets.bottom }]}>
        {carregando ? (
          <ActivityIndicator color={cores.destaque} style={{ marginTop: 60 }} />
        ) : erro ? (
          <Text style={estilos.erro}>{erro}</Text>
        ) : (
          <>
            {abaAtiva === "inicio" ? <HomeScreen onAbrirAba={setAbaAtiva} snapshot={snapshot} /> : null}
            {abaAtiva === "perfil" ? (
              <PerfilScreen
                onSessionExpired={onSessionExpired}
                onUsuarioAtualizado={onUsuarioAtualizado}
                onVoltar={() => setAbaAtiva("inicio")}
                usuario={usuario}
              />
            ) : null}
            {abaAtiva === "notificacoes" ? (
              <NotificacoesScreen
                onNotificacoesAtualizadas={() => setNotificacoesVersao((atual) => atual + 1)}
                onSessionExpired={onSessionExpired}
                onVoltar={() => setAbaAtiva("inicio")}
              />
            ) : null}
            {abaAtiva === "conteudos" ? (
              <ConteudosScreen onRecarregar={recarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} token={token} />
            ) : null}
            {abaAtiva === "avaliacoes" ? (
              <AvaliacoesScreen onRecarregar={recarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} />
            ) : null}
            {abaAtiva === "progresso" ? <ProgressoScreen snapshot={snapshot} /> : null}
            {abaAtiva === "matriculas" ? (
              <MatriculasScreen onRecarregar={recarregar} onSessionExpired={onSessionExpired} snapshot={snapshot} usuario={usuario} />
            ) : null}
            {abaAtiva === "certificados" ? (
              <CertificadosScreen onSessionExpired={onSessionExpired} snapshot={snapshot} />
            ) : null}
          </>
        )}
      </View>

      <View style={[estilos.tabBar, { paddingBottom: insets.bottom || 10 }]}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.chave;
          return (
            <TouchableOpacity
              accessibilityLabel={aba.rotulo}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              key={aba.chave}
              onPress={() => setAbaAtiva(aba.chave)}
              style={estilos.tabItem}
            >
              <Ionicons color={ativa ? cores.destaque : cores.textoSuave} name={ativa ? aba.iconeAtivo : aba.icone} size={20} />
              <Text style={[estilos.tabTexto, ativa ? estilos.tabTextoAtivo : null]}>{aba.rotulo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  corpo: { flex: 1 },
  erro: { color: cores.erro, textAlign: "center", marginTop: 60, paddingHorizontal: 24 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    backgroundColor: cores.fundoCartao,
    paddingTop: 10
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, minHeight: 44 },
  tabTexto: { color: cores.textoSuave, fontSize: 10, fontWeight: "600", textAlign: "center" },
  tabTextoAtivo: { color: cores.destaque }
});
