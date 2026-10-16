import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { View } from "react-native";
import HeaderGlobal from "./HeaderGlobal.jsx";
import ScreenIndicator from "./ScreenIndicator.jsx";
import { ROUTES } from "../lib/routes.js";

const TELAS_INFO = {
  [ROUTES.INICIO]: { icone: "home", titulo: "Inicio" },
  [ROUTES.CONTEUDOS]: { icone: "book", titulo: "Conteudos" },
  [ROUTES.AVALIACOES]: { icone: "clipboard", titulo: "Avaliacoes" },
  [ROUTES.PROGRESSO]: { icone: "bar-chart", titulo: "Progresso" },
  [ROUTES.MATRICULAS]: { icone: "school", titulo: "Matriculas" },
  [ROUTES.CERTIFICADOS]: { icone: "ribbon", titulo: "Certificados" },
  [ROUTES.PERFIL]: { icone: "person", titulo: "Meu perfil" },
  [ROUTES.NOTIFICACOES]: { icone: "notifications", titulo: "Notificacoes" },
  [ROUTES.BUSCA]: { icone: "search", titulo: "Buscar" }
};

/* Header custom do AlunoStack (ver AlunoWorkspace.jsx) — compoe HeaderGlobal +
   ScreenIndicator e descobre qual das telas esta focada: quando a rota ativa
   e o Tab Navigator (AlunoTabs), getFocusedRouteNameFromRoute devolve o nome da
   aba focada dentro dele; nas demais rotas (Perfil/Notificacoes/Certificados/
   Busca) route.name ja e o suficiente. onAbrirMenu vem de AlunoWorkspace.jsx
   (o menu lateral fica fora da arvore do Navigator, precisa do estado la). */
export default function AlunoHeaderBar({ navigation, notificacoesVersao, onAbrirMenu, route, usuario }) {
  const nomeAtivo = route.name === ROUTES.ALUNO_TABS
    ? getFocusedRouteNameFromRoute(route) ?? ROUTES.INICIO
    : route.name;
  const info = TELAS_INFO[nomeAtivo];

  return (
    <View>
      <HeaderGlobal
        notificacoesVersao={notificacoesVersao}
        onAbrirBusca={() => navigation.navigate(ROUTES.BUSCA)}
        onAbrirMenu={onAbrirMenu}
        onAbrirNotificacoes={() => navigation.navigate(ROUTES.NOTIFICACOES)}
        onAbrirPerfil={() => navigation.navigate(ROUTES.PERFIL)}
        usuario={usuario}
      />
      <ScreenIndicator icone={info?.icone} titulo={info?.titulo || ""} />
    </View>
  );
}
