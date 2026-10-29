import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

// iOS/Android (Expo managed, modulo nativo via react-native-blob-util) -
// navegacao de pagina, zoom por pinch e rolagem vertical ja vem de fabrica
// no componente. Sem equivalente no alvo web, ver VisualizadorPdf.web.jsx.
export default function VisualizadorPdf({ url }) {
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [erro, setErro] = useState("");

  return (
    <View style={estilos.container}>
      <Pdf
        enablePaging={false}
        onError={() => setErro("Não foi possível carregar o documento.")}
        onLoadComplete={(paginas) => setTotalPaginas(paginas)}
        onPageChanged={(paginaAtual) => setPagina(paginaAtual)}
        source={{ uri: url, cache: true }}
        style={estilos.pdf}
        trustAllCerts={false}
      />

      {erro ? (
        <View style={estilos.erroContainer}>
          <Text style={estilos.erroTexto}>{erro}</Text>
        </View>
      ) : totalPaginas > 0 ? (
        <View style={estilos.rodape}>
          <Text style={estilos.rodapeTexto}>Página {pagina} de {totalPaginas}</Text>
        </View>
      ) : (
        <View style={estilos.carregando}>
          <ActivityIndicator color={cores.destaque} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  pdf: { flex: 1, backgroundColor: cores.fundo },
  carregando: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  rodape: { alignItems: "center", paddingVertical: espacamentos.sm, borderTopWidth: 1, borderTopColor: cores.bordaCartao },
  rodapeTexto: { color: cores.textoRotulo, fontSize: tipografia.rotulo },
  erroContainer: { alignItems: "center", paddingVertical: espacamentos.xl, paddingHorizontal: espacamentos.xl },
  erroTexto: { color: cores.erro, fontSize: tipografia.corpo, textAlign: "center" }
});
