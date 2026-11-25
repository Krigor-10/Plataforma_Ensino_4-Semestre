import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";
import { resolverImagemCurso } from "../lib/courseCovers.js";
import { cores, raios } from "../lib/theme.js";

// 4 pares fixos (docs/redesign-mobile/PROMPT-agente-catalogo-vitrine.md,
// item 4) - escolhido por curso.id, nao por indice na lista, pra o mesmo
// curso sempre cair no mesmo degrade em qualquer tela/filtro.
const GRADIENTES_RESERVA = [
  ["#7b2ff7", "#3b82f6"],
  ["#22d3ee", "#4f46e5"],
  ["#7b2ff7", "#c4b5fd"],
  ["#22c55e", "#3b82f6"]
];

function obterGradienteReserva(cursoId) {
  const indice = Number(cursoId) || 0;
  return GRADIENTES_RESERVA[((indice % GRADIENTES_RESERVA.length) + GRADIENTES_RESERVA.length) % GRADIENTES_RESERVA.length];
}

// Iniciais das duas primeiras palavras do titulo (ex.: "Curso Teste Header"
// -> "CT") - diferente de obterIniciais (format.js), que usa 1a+ultima
// palavra (pensado pra nome de pessoa, nao titulo de curso).
function obterIniciaisCurso(titulo) {
  return String(titulo || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0).toUpperCase())
    .join("");
}

// `largura`/`altura` cobrem os casos onde a capa nao e quadrada (ex.: o
// cartao "Continue estudando" e o carrossel "Meus cursos" da Home, docs/
// redesign-mobile/PROMPT-agente-inicio-referencia.md) - sem eles, `size`
// continua definindo um quadrado como antes. `estilo` deixa quem chama
// ajustar algo pontual (ex.: zerar o raio quando o pai ja corta com
// overflow:hidden) sem precisar de mais uma prop pra cada caso.
// `reservaIniciais` (padrao false, pra nao mudar nenhuma tela existente):
// curso sem imagem mostra degrade+iniciais em vez do quadrado vazio com
// icone de livro - usado so no Catalogo em vitrine por enquanto.
export default function CapaCurso({ altura, curso, estilo, largura, reservaIniciais = false, size = 56 }) {
  const capa = resolverImagemCurso(curso);
  const estiloTamanho = { width: largura ?? size, height: altura ?? size, borderRadius: raios.md };
  const iconeTamanho = (altura ?? size) * 0.45;

  if (!capa && reservaIniciais) {
    return (
      <LinearGradient colors={obterGradienteReserva(curso?.id)} style={[estilos.marcadorReserva, estiloTamanho, estilo]}>
        <Text style={estilos.iniciaisReserva}>{obterIniciaisCurso(curso?.titulo)}</Text>
      </LinearGradient>
    );
  }

  if (!capa) {
    return (
      <View style={[estilos.marcador, estiloTamanho, estilo]}>
        <Ionicons color={cores.destaque} name="book-outline" size={iconeTamanho} />
      </View>
    );
  }

  return <Image source={capa} style={[estilos.imagem, estiloTamanho, estilo]} />;
}

const estilos = StyleSheet.create({
  imagem: { backgroundColor: cores.fundoCartaoAtivo },
  marcador: {
    backgroundColor: cores.fundoCartaoAtivo,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  marcadorReserva: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iniciaisReserva: { color: "rgba(255, 255, 255, 0.85)", fontWeight: "800", fontSize: 28 }
});
