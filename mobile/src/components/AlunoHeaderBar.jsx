import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { View } from "react-native";
import HeaderGlobal from "./HeaderGlobal.jsx";
import ScreenIndicator from "./ScreenIndicator.jsx";
import { cores } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

// Cabecalho completo (HeaderGlobal + faixa ScreenIndicator) — so para a
// rota ALUNO_TABS (as 5 abas da bottom bar). As demais telas empilhadas do
// AlunoStack (Perfil/Catalogo/Notificacoes) usam o cabecalho leve
// CabecalhoSimples.jsx, e Busca tem seu proprio cabecalho embutido — ver
// AlunoWorkspace.jsx.
const TELAS_INFO = {
  [ROUTES.INICIO]: { icone: "home", titulo: "Início" },
  [ROUTES.CONTEUDOS]: { icone: "school", titulo: "Cursos" },
  [ROUTES.AVALIACOES]: { icone: "clipboard", titulo: "Avaliações" },
  [ROUTES.PROGRESSO]: { icone: "bar-chart", titulo: "Progresso" },
  [ROUTES.CERTIFICADOS]: { icone: "ribbon", titulo: "Certificados" }
};

/* Header custom da rota ALUNO_TABS do AlunoStack (ver AlunoWorkspace.jsx) —
   compoe HeaderGlobal + ScreenIndicator e descobre qual das 5 abas esta
   focada via getFocusedRouteNameFromRoute. onAbrirMenu vem de
   AlunoWorkspace.jsx (o menu lateral fica fora da arvore do Navigator,
   precisa do estado la). */
export default function AlunoHeaderBar({ navigation, notificacoesVersao, onAbrirMenu, route, usuario }) {
  const nomeAtivo = getFocusedRouteNameFromRoute(route) ?? ROUTES.INICIO;
  const info = TELAS_INFO[nomeAtivo];

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
