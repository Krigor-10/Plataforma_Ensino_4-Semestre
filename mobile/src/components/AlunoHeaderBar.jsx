import { getFocusedRouteNameFromRoute, useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { View } from "react-native";
import HeaderGlobal from "./HeaderGlobal.jsx";
import ScreenIndicator from "./ScreenIndicator.jsx";
import { cores } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

// ROUTES.CONTEUDOS virou a aba "Cursos" no redesign (AlunoTabsNavigator.jsx)
// - titulo/icone aqui acompanham isso pro cabecalho bater com a bottom bar.
const TELAS_INFO = {
  [ROUTES.INICIO]: { icone: "home", titulo: "Início" },
  [ROUTES.CONTEUDOS]: { icone: "school", titulo: "Cursos" },
  [ROUTES.AVALIACOES]: { icone: "clipboard", titulo: "Avaliações" },
  [ROUTES.PROGRESSO]: { icone: "bar-chart", titulo: "Progresso" },
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

  // Reporta a rota ativa pro AlunoWorkspace.jsx repassar ao MenuLateral.jsx
  // (fora da arvore do Navigator, sem acesso direto a esse calculo) — mas
  // usando route.name (a rota do AlunoStack), nao nomeAtivo (a aba focada
  // DENTRO do AlunoTabs): o menu so tem itens para Perfil/Catalogo, nenhuma
  // aba da bottom bar corresponde a um item dele, entao estar em qualquer
  // aba (Inicio, Cursos, ...) deve limpar o destaque do menu, nunca manter
  // o de uma tela anterior. useFocusEffect, NAO useEffect comum: no
  // native-stack cada tela da pilha continua montada quando fica por baixo
  // (voltar e instantaneo), entao o header de uma tela que o aluno ja saiu
  // (ex.: Perfil) nunca desmonta nem muda suas deps ao voltar pro Inicio —
  // um useEffect comum so rodaria de novo se route.name mudasse, e o do
  // Inicio nunca muda. useFocusEffect roda de novo toda vez que ESTA tela
  // reganha foco de verdade, que e o sinal certo pra "voltei pra AlunoTabs,
  // atualiza o destaque do menu".
  useFocusEffect(
    useCallback(() => {
      onRotaAtivaMudou?.(route.name === ROUTES.ALUNO_TABS ? null : route.name);
    }, [route.name, onRotaAtivaMudou])
  );

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
