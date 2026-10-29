import { StyleSheet, View } from "react-native";
import { cores } from "../lib/theme.js";

// Alvo web (react-native-web) nao tem suporte do react-native-pdf (depende
// de modulos nativos via react-native-blob-util) - fallback com o
// visualizador nativo do navegador via <iframe>, sem dependencia nova.
// Sem navegacao de pagina/zoom customizados aqui: quem controla isso e o
// proprio navegador (Chrome/Edge/Firefox ja tem paginacao e zoom no viewer
// embutido deles).
export default function VisualizadorPdf({ url }) {
  return (
    <View style={estilos.container}>
      <iframe src={url} style={estilos.iframe} title="Documento PDF" />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  iframe: { flex: 1, border: "none", width: "100%", height: "100%" }
});
