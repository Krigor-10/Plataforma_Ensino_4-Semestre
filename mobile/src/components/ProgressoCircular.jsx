import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cores } from "../lib/theme.js";

/* Anel de progresso via react-native-svg (unica dependencia nova desta
   sessao — nenhum componente circular existia no projeto, Mobile ou Web, e
   RN nao desenha arco parcial sem SVG: transform rotate so gira em torno do
   proprio centro do elemento, nao da pra fazer o "duas metades" classico do
   CSS sem transform-origin configuravel). strokeDasharray do tamanho da
   circunferencia inteira (repetido) + strokeDashoffset escondendo a parte
   nao preenchida e a tecnica padrao pra isso. */
export default function ProgressoCircular({ espessura = 4, percentual = 0, size = 48 }) {
  const pct = Math.max(0, Math.min(Number(percentual) || 0, 100));
  const raio = (size - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (pct / 100) * circunferencia;

  return (
    <View
      accessibilityLabel={`${Math.round(pct)}% de progresso no curso`}
      accessible
      style={[estilos.container, { width: size, height: size }]}
    >
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={raio} stroke={cores.bordaCartao} strokeWidth={espessura} />
        {pct > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            origin={`${size / 2}, ${size / 2}`}
            r={raio}
            rotation="-90"
            stroke={cores.destaque}
            strokeDasharray={`${circunferencia}, ${circunferencia}`}
            strokeDashoffset={circunferencia - preenchido}
            strokeLinecap="round"
            strokeWidth={espessura}
          />
        ) : null}
      </Svg>
      <Text style={[estilos.valor, { fontSize: size * 0.24 }]}>{Math.round(pct)}%</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  valor: { position: "absolute", color: cores.texto, fontWeight: "800" }
});
