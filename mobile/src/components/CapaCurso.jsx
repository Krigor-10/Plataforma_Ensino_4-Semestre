import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { getCourseCover } from "../lib/courseCovers.js";
import { cores, raios } from "../lib/theme.js";

export default function CapaCurso({ curso, size = 56 }) {
  const capa = getCourseCover(curso);
  const estiloTamanho = { width: size, height: size, borderRadius: raios.md };

  if (!capa) {
    return (
      <View style={[estilos.marcador, estiloTamanho]}>
        <Ionicons color={cores.textoSuave} name="book-outline" size={size * 0.45} />
      </View>
    );
  }

  return <Image source={capa} style={[estilos.imagem, estiloTamanho]} />;
}

const estilos = StyleSheet.create({
  imagem: { backgroundColor: cores.fundoCartaoAtivo },
  marcador: { backgroundColor: cores.fundoCartaoAtivo, alignItems: "center", justifyContent: "center" }
});
