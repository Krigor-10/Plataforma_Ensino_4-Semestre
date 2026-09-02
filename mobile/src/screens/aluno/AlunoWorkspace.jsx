import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../HomeScreen.jsx";
import ConteudosScreen from "./ConteudosScreen.jsx";
import AvaliacoesScreen from "./AvaliacoesScreen.jsx";
import ProgressoScreen from "./ProgressoScreen.jsx";
import MatriculasScreen from "./MatriculasScreen.jsx";
import { ApiError } from "../../lib/api.js";
import { EMPTY_SNAPSHOT, loadAlunoSnapshot } from "../../lib/dashboard.js";
import { cores } from "../../lib/theme.js";

const ABAS = [
  { chave: "inicio", rotulo: "Inicio" },
  { chave: "conteudos", rotulo: "Conteudos" },
  { chave: "avaliacoes", rotulo: "Avaliacoes" },
  { chave: "progresso", rotulo: "Progresso" },
  { chave: "matriculas", rotulo: "Matriculas" }
];

export default function AlunoWorkspace({ onLogout, onSessionExpired, token, usuario }) {
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
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
      <View style={[estilos.corpo, { paddingBottom: insets.bottom }]}>
        {carregando ? (
          <ActivityIndicator color={cores.destaque} style={{ marginTop: 60 }} />
        ) : erro ? (
          <Text style={estilos.erro}>{erro}</Text>
        ) : (
          <>
            {abaAtiva === "inicio" ? (
              <HomeScreen onLogout={onLogout} onSessionExpired={onSessionExpired} usuario={usuario} />
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
          </>
        )}
      </View>

      <View style={[estilos.tabBar, { paddingBottom: insets.bottom || 10 }]}>
        {ABAS.map((aba) => (
          <TouchableOpacity
            accessibilityLabel={aba.rotulo}
            key={aba.chave}
            onPress={() => setAbaAtiva(aba.chave)}
            style={estilos.tabItem}
          >
            <Text style={[estilos.tabTexto, abaAtiva === aba.chave ? estilos.tabTextoAtivo : null]}>{aba.rotulo}</Text>
          </TouchableOpacity>
        ))}
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
  tabItem: { flex: 1, alignItems: "center" },
  tabTexto: { color: cores.textoSuave, fontSize: 11, fontWeight: "600" },
  tabTextoAtivo: { color: cores.destaque }
});
