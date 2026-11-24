import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { cores, raios, tipografia } from "../lib/theme.js";

// Seletor segmentado reutilizavel (docs/certificados-mobile/PROMPT-agente-
// certificados-abas-topo.md) - mesmo mecanismo de pilula deslizante do
// CustomTabBar.jsx (onLayout mede a largura real, reanimated anima a
// posicao, respeita useReducedMotion), só que a pilula ocupa a opcao
// inteira (rotulo + contador ficam dentro dela) em vez de so o icone.
const PADDING_TRILHO = 4;
const ALTURA_TRILHO = 52;

export default function AbasSegmentadas({ onSelecionar, opcoes, valorSelecionado }) {
  const [largura, setLargura] = useState(0);
  const reduzMovimento = useReducedMotion();
  const indiceAtivo = Math.max(0, opcoes.findIndex((opcao) => opcao.chave === valorSelecionado));
  const larguraOpcao = opcoes.length > 0 ? Math.max(largura - PADDING_TRILHO * 2, 0) / opcoes.length : 0;
  const destino = indiceAtivo * larguraOpcao;
  const deslocamento = useSharedValue(destino);

  useEffect(() => {
    if (!largura) {
      return;
    }
    deslocamento.value = reduzMovimento ? destino : withTiming(destino, { duration: 180 });
  }, [deslocamento, destino, largura, reduzMovimento]);

  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ translateX: deslocamento.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
      style={estilos.trilho}
      testID="trilho-abas-segmentadas"
    >
      {largura > 0 ? (
        <Animated.View pointerEvents="none" style={[estilos.pilulaAtiva, { width: larguraOpcao }, estiloAnimado]} testID="pilula-aba-ativa" />
      ) : null}
      {opcoes.map((opcao) => {
        const ativa = opcao.chave === valorSelecionado;
        return (
          <TouchableOpacity
            accessibilityLabel={`${opcao.rotulo}, ${opcao.contador}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            key={opcao.chave}
            onPress={() => onSelecionar(opcao.chave)}
            style={estilos.opcao}
          >
            <Text numberOfLines={1} style={[estilos.texto, ativa ? estilos.textoAtivo : null]}>
              {opcao.rotulo} · {opcao.contador}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: {
    flexDirection: "row",
    backgroundColor: cores.fundoCartao,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    borderRadius: raios.pilula,
    padding: PADDING_TRILHO
  },
  opcao: { flex: 1, minHeight: ALTURA_TRILHO - PADDING_TRILHO * 2, alignItems: "center", justifyContent: "center" },
  texto: { color: cores.textoRotulo, fontWeight: "600", fontSize: tipografia.rotulo },
  textoAtivo: { color: "#fff" },
  pilulaAtiva: {
    position: "absolute",
    top: PADDING_TRILHO,
    left: 0,
    height: ALTURA_TRILHO - PADDING_TRILHO * 2,
    borderRadius: raios.pilula,
    backgroundColor: cores.destaque
  }
});
