import { Ionicons } from "@expo/vector-icons";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getCourseCover } from "../lib/courseCovers.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Grade de 2 colunas pra selecao de curso na tela Conteudos, isolada de
   SeletorCurso.jsx (usado por Avaliacoes/Progresso) e CapaCurso.jsx (usado
   tambem por Cursos/Catalogo/Home) — nao reutiliza esses dois componentes
   visuais pra nao vazar a mudanca de layout pra essas outras telas, so a
   funcao getCourseCover (resolucao de imagem por titulo) e compartilhada. */
export default function GradeCursosConteudos({ accessibilityLabelPrefix, itens, onSelecionar, titulo = "Selecione um curso" }) {
  return (
    <>
      <Text style={estilos.titulo}>{titulo}</Text>
      <FlatList
        columnWrapperStyle={estilos.linha}
        contentContainerStyle={estilos.lista}
        data={itens}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <CardCurso accessibilityLabelPrefix={accessibilityLabelPrefix} curso={item.curso} id={item.id} onSelecionar={onSelecionar} />
        )}
      />
    </>
  );
}

function CardCurso({ accessibilityLabelPrefix, curso, id, onSelecionar }) {
  const tituloCurso = curso?.titulo || `Curso #${id}`;
  const capa = getCourseCover(curso);

  return (
    <TouchableOpacity
      accessibilityLabel={`${accessibilityLabelPrefix} ${tituloCurso}`}
      accessibilityRole="button"
      onPress={() => onSelecionar(id)}
      style={estilos.cartao}
    >
      <View style={estilos.capa}>
        {capa ? (
          <Image resizeMode="cover" source={capa} style={estilos.capaImagem} />
        ) : (
          <View style={[StyleSheet.absoluteFill, estilos.capaMarcador]}>
            <Ionicons color={cores.destaque} name="book-outline" size={32} />
          </View>
        )}
      </View>

      <View style={estilos.corpo}>
        <Text numberOfLines={2} style={estilos.cartaoTitulo}>{tituloCurso}</Text>
        <View style={estilos.rodape}>
          <View style={estilos.botaoAcesso}>
            <Ionicons color={cores.destaque} name="chevron-forward" size={18} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, padding: espacamentos.xl, paddingBottom: espacamentos.md },
  lista: { paddingHorizontal: espacamentos.xl, paddingBottom: espacamentos.xl },
  linha: { justifyContent: "space-between" },
  cartao: {
    width: "48%",
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    marginBottom: espacamentos.md,
    overflow: "hidden"
  },
  capa: { width: "100%", aspectRatio: 5 / 3, position: "relative", overflow: "hidden" },
  capaImagem: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  capaMarcador: { backgroundColor: cores.fundoCartaoAtivo, alignItems: "center", justifyContent: "center" },
  corpo: { padding: espacamentos.sm },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo, minHeight: tipografia.corpo * 2.4 },
  rodape: { flexDirection: "row", justifyContent: "flex-end", marginTop: espacamentos.xs },
  botaoAcesso: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  }
});
