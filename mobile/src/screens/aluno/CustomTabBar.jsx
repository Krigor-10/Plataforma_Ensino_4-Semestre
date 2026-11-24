import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { ROUTES } from "../../lib/routes.js";
import { cores, tamanhosIcone } from "../../lib/theme.js";

// Barra flutuante com a aba ativa num quadrado roxo (docs/redesign-mobile/
// PROMPT-agente-barra-navegacao-quadrado-roxo.md) - mesmas medidas usadas
// por useAlturaBarraAbas.js, que as telas das 5 abas usam pra nao deixar
// o ultimo item de cada lista escondido atras da barra. Arquivo proprio
// (nao dentro de AlunoTabsNavigator.jsx) de proposito: assim o teste
// (__tests__/CustomTabBar.test.jsx) importa so isto - as 5 telas das abas
// trazem modulos nativos pesados (expo-video, async-storage etc.) que nao
// tem mock pronto no jest deste projeto e nada tem a ver com a barra.
const MARGEM_LATERAL_BARRA_ABAS = 14;
const MARGEM_INFERIOR_BARRA_ABAS = 10;
const ALTURA_BARRA_ABAS = 72;
const RAIO_BARRA_ABAS = 24;
const TAMANHO_QUADRADO_ATIVO = 56;
const RAIO_QUADRADO_ATIVO = 18;

// 5 abas do redesign (docs/redesign-mobile/PROMPT-agente-mobile.md, secao 1).
// ROUTES.CONTEUDOS aponta pra ConteudosScreen.jsx - virou a aba "Cursos"
// porque e essa tela que concentra a trilha do aluno (grade de selecao +
// modulos). A antiga tela "Cursos" (CursosScreen.jsx) foi removida na
// Rodada 3: suas funcoes ainda necessarias (confirmar pagamento) ja
// migraram pra GradeCursosConteudos.jsx; "Cancelar solicitacao" nao migrou
// de proposito - matricula e sempre automatica desde pendencia_matriculas_
// sempre_automatica_2026_10_27, entao nenhum card real alcancava mais
// aquele estado.
const ABAS = [
  { chave: ROUTES.INICIO, icone: "home-outline", iconeAtivo: "home", rotulo: "Início" },
  { chave: ROUTES.CONTEUDOS, icone: "school-outline", iconeAtivo: "school", rotulo: "Cursos" },
  { chave: ROUTES.AVALIACOES, icone: "clipboard-outline", iconeAtivo: "clipboard", rotulo: "Avaliações" },
  { chave: ROUTES.PROGRESSO, icone: "bar-chart-outline", iconeAtivo: "bar-chart", rotulo: "Progresso" },
  { chave: ROUTES.CERTIFICADOS, icone: "ribbon-outline", iconeAtivo: "ribbon", rotulo: "Certificados" }
];
const ABAS_POR_CHAVE = Object.fromEntries(ABAS.map((aba) => [aba.chave, aba]));

// Aba inativa: icone outline + rotulo em cinza. A aba ativa fica muda aqui
// (opacity 0, so pra manter a area de toque de 44px e o accessibilityState)
// - quem mostra o icone dela e o quadrado roxo flutuante abaixo, que desliza
// por cima (CustomTabBar).
function ItemAba({ ativa, config, onPress }) {
  return (
    <TouchableOpacity
      accessibilityLabel={config.rotulo}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativa }}
      onPress={onPress}
      style={estilos.tabItem}
    >
      <View style={[estilos.tabConteudo, ativa ? estilos.tabConteudoOculto : null]}>
        <Ionicons color={cores.textoRotulo} name={config.icone} size={tamanhosIcone.xl} />
        <Text numberOfLines={1} style={estilos.tabTexto}>
          {config.rotulo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Quadrado roxo da aba ativa: um unico View absoluto que desliza (translateX)
// pra posicao da aba tocada, com o icone preenchido branco dela dentro. Da o
// mesmo "pulso" de escala que a bottom bar antiga dava, so que agora no
// quadrado (nao tem mais icone proprio na aba ativa, ver ItemAba acima).
// So anima a posicao/pulso com reanimated quando ja sabe a largura real da
// barra (onLayout) - sem isso o calculo de onde cada aba fica no eixo X nao
// existe ainda.
function QuadradoAbaAtiva({ config, indice, larguraBarra, totalAbas }) {
  const reduzMovimento = useReducedMotion();
  const larguraItem = larguraBarra / totalAbas;
  const destino = larguraItem * indice + larguraItem / 2 - TAMANHO_QUADRADO_ATIVO / 2;
  const deslocamento = useSharedValue(destino);
  const escala = useSharedValue(1);

  useEffect(() => {
    if (reduzMovimento) {
      deslocamento.value = destino;
      return;
    }
    deslocamento.value = withTiming(destino, { duration: 200 });
    escala.value = withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 120 }));
  }, [deslocamento, destino, escala, reduzMovimento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ translateX: deslocamento.value }, { scale: escala.value }]
  }));

  return (
    <Animated.View pointerEvents="none" style={[estilos.quadradoAtivo, estiloAnimado]} testID="quadrado-aba-ativa">
      <Ionicons color="#fff" name={config.iconeAtivo} size={tamanhosIcone.xl} />
    </Animated.View>
  );
}

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const [larguraBarra, setLarguraBarra] = useState(0);
  const abaAtivaConfig = ABAS_POR_CHAVE[state.routes[state.index].name];

  return (
    <View
      onLayout={(evento) => setLarguraBarra(evento.nativeEvent.layout.width)}
      style={[estilos.tabBar, { bottom: insets.bottom + MARGEM_INFERIOR_BARRA_ABAS }]}
      testID="barra-abas"
    >
      {larguraBarra > 0 && abaAtivaConfig ? (
        <QuadradoAbaAtiva
          config={abaAtivaConfig}
          indice={state.index}
          larguraBarra={larguraBarra}
          totalAbas={state.routes.length}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const config = ABAS_POR_CHAVE[route.name];
        // Guarda defensiva: hoje toda rota do Tab.Navigator tem entrada em
        // ABAS, mas se algum dia voltar a existir uma rota nested sem icone
        // proprio (mesmo truque ja usado antes pra Certificados/Cursos), ela
        // simplesmente nao vira um icone quebrado aqui.
        if (!config) {
          return null;
        }
        const ativa = state.index === index;
        return (
          <ItemAba
            ativa={ativa}
            config={config}
            key={route.key}
            onPress={() => {
              const evento = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!ativa && !evento.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Barra flutuante (nao mais encostada na borda): margem lateral fixa,
  // "bottom" calculado no componente (insets.bottom + margem), sem
  // borderTop - a sombra e que separa ela do conteudo por tras.
  tabBar: {
    position: "absolute",
    left: MARGEM_LATERAL_BARRA_ABAS,
    right: MARGEM_LATERAL_BARRA_ABAS,
    height: ALTURA_BARRA_ABAS,
    borderRadius: RAIO_BARRA_ABAS,
    backgroundColor: cores.fundoBarra,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  tabConteudo: { alignItems: "center", justifyContent: "center", gap: 4 },
  // Aba ativa: o icone/rotulo dela fica mudo (o quadrado roxo flutuante e
  // quem mostra o icone) - opacity em vez de nao renderizar, pra manter a
  // mesma area de toque das abas inativas.
  tabConteudoOculto: { opacity: 0 },
  tabTexto: { color: cores.textoRotulo, fontSize: 11, fontWeight: "600", textAlign: "center" },
  // Quadrado da aba ativa: posicionado no canto esquerdo da barra (top fixo,
  // pra centralizar verticalmente - (ALTURA_BARRA_ABAS - TAMANHO)/2) e
  // deslocado em X via transform (QuadradoAbaAtiva, reanimated). Sombra roxa
  // leve pra destacar do fundo preto da barra.
  quadradoAtivo: {
    position: "absolute",
    top: (ALTURA_BARRA_ABAS - TAMANHO_QUADRADO_ATIVO) / 2,
    left: 0,
    width: TAMANHO_QUADRADO_ATIVO,
    height: TAMANHO_QUADRADO_ATIVO,
    borderRadius: RAIO_QUADRADO_ATIVO,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: cores.destaque,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  }
});
