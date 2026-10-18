import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import CapaCurso from "./CapaCurso.jsx";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Padrao "escolha um curso antes de ver o conteudo" compartilhado por
   Avaliacoes e Progresso (cada tela so entra em detalhe depois que o aluno
   escolhe o curso) — extraido de duas copias quase identicas do mesmo
   StyleSheet pra virar uma unica implementacao. */
export default function SeletorCurso({ accessibilityLabelPrefix, itens, onSelecionar, titulo = "Selecione um curso" }) {
  return (
    <>
      <Text style={estilos.titulo}>{titulo}</Text>
      <ScrollView contentContainerStyle={estilos.lista}>
        {itens.map(({ curso, id }) => {
          const tituloCurso = curso?.titulo || `Curso #${id}`;
          return (
            <TouchableOpacity
              accessibilityLabel={`${accessibilityLabelPrefix} ${tituloCurso}`}
              key={id}
              onPress={() => onSelecionar(id)}
              style={estilos.cartao}
            >
              <CapaCurso curso={curso} size={56} />
              <Text numberOfLines={2} style={estilos.cartaoTitulo}>{tituloCurso}</Text>
              <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, padding: espacamentos.xl, paddingBottom: espacamentos.md },
  lista: { paddingHorizontal: espacamentos.xl, paddingBottom: espacamentos.xl, gap: espacamentos.md },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque,
    padding: 14
  },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, flex: 1 }
});
