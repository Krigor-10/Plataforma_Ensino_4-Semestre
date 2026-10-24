import { useIsFocused } from "@react-navigation/native";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { DURACAO_TRANSICAO } from "../lib/transitions.js";

/* Envolve o conteudo de cada aba do AlunoTabsNavigator.jsx com um fade +
   leve deslocamento vertical de entrada, disparado toda vez que a aba ganha
   foco. @react-navigation/bottom-tabs nao anima troca de aba por padrao
   (diferente do native-stack, que ja tem transicao propria) - sem isso a
   troca de tela e instantanea e o unico sinal visivel de navegacao e o texto
   do ScreenIndicator.jsx, dando a impressao de "continuar na mesma pagina".
   Respeita reducao de movimento do sistema operacional (useReducedMotion). */
export default function TelaComTransicao({ children }) {
  const focado = useIsFocused();
  const reduzMovimento = useReducedMotion();
  const progresso = useSharedValue(reduzMovimento ? 1 : 0);

  useEffect(() => {
    if (!focado) {
      return;
    }

    if (reduzMovimento) {
      progresso.value = 1;
      return;
    }

    progresso.value = 0;
    progresso.value = withTiming(1, { duration: DURACAO_TRANSICAO });
  }, [focado, progresso, reduzMovimento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: progresso.value,
    transform: [{ translateY: (1 - progresso.value) * 8 }]
  }));

  return <Animated.View style={[estilos.container, estiloAnimado]}>{children}</Animated.View>;
}

const estilos = StyleSheet.create({
  container: { flex: 1 }
});
