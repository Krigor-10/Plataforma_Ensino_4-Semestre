import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import AlunoHeaderBar from "../../components/AlunoHeaderBar.jsx";
import CabecalhoSimples from "../../components/CabecalhoSimples.jsx";
import MenuLateral from "../../components/MenuLateral.jsx";
import ModalConfirmarSaida from "../../components/ModalConfirmarSaida.jsx";
import AlunoTabsNavigator from "./AlunoTabsNavigator.jsx";
import BuscaScreen from "./BuscaScreen.jsx";
import CatalogoScreen from "./CatalogoScreen.jsx";
import PerfilScreen from "./PerfilScreen.jsx";
import NotificacoesScreen from "./NotificacoesScreen.jsx";
import { ApiError } from "../../lib/api.js";
import { EMPTY_SNAPSHOT, loadAlunoSnapshot } from "../../lib/dashboard.js";
import { cores } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";

const AlunoStack = createNativeStackNavigator();

// Telas empilhadas que usam o cabecalho leve (seta + titulo) em vez do
// HeaderGlobal+ScreenIndicator completo — ver CabecalhoSimples.jsx. Busca
// fica fora: tem seu proprio cabecalho embutido (voltar + campo de busca),
// entao recebe `header: () => null` em vez de um titulo aqui.
const TITULOS_CABECALHO_SIMPLES = {
  [ROUTES.PERFIL]: "Meu perfil",
  [ROUTES.CATALOGO]: "Catálogo",
  [ROUTES.NOTIFICACOES]: "Notificações"
};

export default function AlunoWorkspace({ onLogout, onSessionExpired, onUsuarioAtualizado, usuario }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [notificacoesVersao, setNotificacoesVersao] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const [rotaAtivaChave, setRotaAtivaChave] = useState(null);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  // Guarda o `navigation` do AlunoStack recebido via screenOptions (o mesmo
  // objeto que cada tela ja recebe) pra poder navegar a partir do menu
  // lateral, que fica fora da arvore do Navigator (nao e um Screen).
  const navigationRef = useRef(null);

  // Ref em vez de dependencia direta: onSessionExpired e recriada a cada
  // render do App raiz (nao usa useCallback la), entao inclui-la nas
  // dependencias de recarregar faria o useEffect de carregamento inicial
  // (abaixo) refazer a busca a cada render em vez de so no mount.
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  });

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial dos dados do Aluno ao montar o workspace; e o padrao recomendado de fetch-on-mount, nao ha estado derivado alternativo aqui.
    recarregar();
  }, [recarregar]);

  function tentarNovamente() {
    setCarregando(true);
    recarregar();
  }

  function navegarDoMenu(rota) {
    setMenuAberto(false);
    navigationRef.current?.navigate(rota);
  }

  function solicitarSairDoMenu() {
    setMenuAberto(false);
    setConfirmandoSaida(true);
  }

  return (
    <View style={estilos.container}>
      <AlunoStack.Navigator
        screenListeners={({ route }) => ({
          // Reporta a rota ativa do AlunoStack pro MenuLateral.jsx destacar o
          // item certo (fora da arvore do Navigator, sem acesso direto a
          // route). ALUNO_TABS (as 5 abas) limpa o destaque: nenhum item do
          // menu corresponde a uma aba da bottom bar. Era responsabilidade
          // de AlunoHeaderBar.jsx antes desta rodada — agora Perfil/Catalogo/
          // Notificacoes usam CabecalhoSimples.jsx e Busca nao tem header
          // nenhum, entao precisa viver no proprio Navigator pra continuar
          // funcionando nas 5 rotas.
          focus: () => setRotaAtivaChave(route.name === ROUTES.ALUNO_TABS ? null : route.name)
        })}
        screenOptions={({ route, navigation }) => {
          navigationRef.current = navigation;

          // Busca tem seu proprio cabecalho embutido (voltar + campo de
          // busca) — ver BuscaScreen.jsx.
          if (route.name === ROUTES.BUSCA) {
            return { animation: "slide_from_right", header: () => null };
          }

          const tituloCabecalhoSimples = TITULOS_CABECALHO_SIMPLES[route.name];
          if (tituloCabecalhoSimples) {
            return {
              animation: "slide_from_right",
              header: () => <CabecalhoSimples onVoltar={() => navigation.goBack()} titulo={tituloCabecalhoSimples} />
            };
          }

          return {
            animation: "slide_from_right",
            header: () => (
              <AlunoHeaderBar
                navigation={navigation}
                notificacoesVersao={notificacoesVersao}
                onAbrirMenu={() => setMenuAberto(true)}
                route={route}
                usuario={usuario}
              />
            )
          };
        }}
      >
        <AlunoStack.Screen name={ROUTES.ALUNO_TABS}>
          {() => (
            <AlunoTabsNavigator
              carregando={carregando}
              erro={erro}
              onRecarregar={recarregar}
              onSessionExpired={onSessionExpired}
              snapshot={snapshot}
              tentarNovamente={tentarNovamente}
              usuario={usuario}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.PERFIL}>
          {() => (
            <PerfilScreen
              onLogout={onLogout}
              onSessionExpired={onSessionExpired}
              onUsuarioAtualizado={onUsuarioAtualizado}
              usuario={usuario}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.NOTIFICACOES}>
          {() => (
            <NotificacoesScreen
              onNotificacoesAtualizadas={() => setNotificacoesVersao((atual) => atual + 1)}
              onSessionExpired={onSessionExpired}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.CATALOGO}>
          {() => (
            <CatalogoScreen
              onRecarregar={recarregar}
              onSessionExpired={onSessionExpired}
              snapshot={snapshot}
              usuario={usuario}
            />
          )}
        </AlunoStack.Screen>
        <AlunoStack.Screen name={ROUTES.BUSCA}>
          {({ navigation }) => <BuscaScreen navigation={navigation} onVoltar={() => navigation.goBack()} snapshot={snapshot} />}
        </AlunoStack.Screen>
      </AlunoStack.Navigator>

      <MenuLateral
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        onNavegar={navegarDoMenu}
        onSolicitarSair={solicitarSairDoMenu}
        rotaAtiva={rotaAtivaChave}
        usuario={usuario}
      />

      <ModalConfirmarSaida onCancelar={() => setConfirmandoSaida(false)} onConfirmar={onLogout} visivel={confirmandoSaida} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo }
});
