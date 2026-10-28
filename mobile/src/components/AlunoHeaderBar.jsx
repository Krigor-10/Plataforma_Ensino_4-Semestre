import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useEffect } from "react";
import { View } from "react-native";
import HeaderGlobal from "./HeaderGlobal.jsx";
import ScreenIndicator from "./ScreenIndicator.jsx";
import { cores } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

// ROUTES.CONTEUDOS virou a aba "Cursos" no redesign (AlunoTabsNavigator.jsx)
// - titulo/icone aqui acompanham isso pro cabecalho bater com a bottom bar.
// ROUTES.CURSOS (CursosScreen.jsx, ponte temporaria da Rodada 1 - ver
// MenuLateral.jsx) usa "Minhas matrículas" pra nao colidir com o nome novo.
const TELAS_INFO = {
  [ROUTES.INICIO]: { icone: "home", titulo: "Início" },
  [ROUTES.CONTEUDOS]: { icone: "school", titulo: "Cursos" },
  [ROUTES.AVALIACOES]: { icone: "clipboard", titulo: "Avaliações" },
  [ROUTES.PROGRESSO]: { icone: "bar-chart", titulo: "Progresso" },
  [ROUTES.CURSOS]: { icone: "receipt", titulo: "Minhas matrículas" },
  [ROUTES.CATALOGO]: { icone: "storefront", titulo: "Catálogo" },
  [ROUTES.CERTIFICADOS]: { icone: "ribbon", titulo: "Certificados" },
  [ROUTES.PERFIL]: { icone: "person", titulo: "Meu perfil" },
  [ROUTES.NOTIFICACOES]: { icone: "notifications", titulo: "Notificações" },
  [ROUTES.BUSCA]: { icone: "search", titulo: "Buscar" }
};

/* Header custom do AlunoStack (ver AlunoWorkspace.jsx) — compoe HeaderGlobal +
   ScreenIndicator e descobre qual das telas esta focada: quando a rota ativa
   e o Tab Navigator (AlunoTabs), getFocusedRouteNameFromRoute devolve o nome da
   aba focada dentro dele; nas demais rotas (Perfil/Notificacoes/Certificados/
   Busca) route.name ja e o suficiente. onAbrirMenu vem de AlunoWorkspace.jsx
   (o menu lateral fica fora da arvore do Navigator, precisa do estado la). */
export default function AlunoHeaderBar({ navigation, notificacoesVersao, onAbrirMenu, onRotaAtivaMudou, route, usuario }) {
  const nomeAtivo = route.name === ROUTES.ALUNO_TABS
    ? getFocusedRouteNameFromRoute(route) ?? ROUTES.INICIO
    : route.name;
  const info = TELAS_INFO[nomeAtivo];

  // Reporta a rota realmente focada pro AlunoWorkspace.jsx repassar ao
  // MenuLateral.jsx (fora da arvore do Navigator, sem acesso direto a esse
  // calculo) — mesmo nome que ja usamos aqui pra montar o ScreenIndicator,
  // sem duplicar a logica de foco em outro lugar.
  useEffect(() => {
    onRotaAtivaMudou?.(nomeAtivo);
  }, [nomeAtivo, onRotaAtivaMudou]);

  return (
    <View style={{ backgroundColor: cores.fundo }}>
      <HeaderGlobal
        notificacoesVersao={notificacoesVersao}
        onAbrirBusca={() => navigation.navigate(ROUTES.BUSCA)}
        onAbrirInicio={() => navigation.navigate(ROUTES.ALUNO_TABS, { screen: ROUTES.INICIO })}
        onAbrirMenu={onAbrirMenu}
        onAbrirNotificacoes={() => navigation.navigate(ROUTES.NOTIFICACOES)}
        onAbrirPerfil={() => navigation.navigate(ROUTES.PERFIL)}
        usuario={usuario}
      />
      <ScreenIndicator icone={info?.icone} titulo={info?.titulo || ""} />
    </View>
  );
}
