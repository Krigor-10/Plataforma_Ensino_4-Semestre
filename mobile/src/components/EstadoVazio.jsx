import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

/* Estado vazio padronizado (docs/redesign-mobile/PENDENTE-segunda-23-11-
   auditoria-ux-ui-mobile.md, Fase 2) - substitui o texto cinza solto que
   cada tela desenhava por conta propria (HomeScreen, Certificados,
   Progresso, Avaliacoes, Catalogo, Notificacoes, Conteudos...) por um
   icone num circulo + mensagem, sempre igual. So visual: nenhuma tela
   muda a REGRA de quando mostrar o estado vazio, so como ele e desenhado. */
export default function EstadoVazio({ icone = "sparkles-outline", mensagem, style }) {
  return (
    <View style={[estilos.container, style]}>
      <View style={estilos.iconeCirculo}>
        <Ionicons color={cores.textoSuave} name={icone} size={28} />
      </View>
      <Text style={estilos.mensagem}>{mensagem}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", gap: espacamentos.md, paddingVertical: espacamentos.xxl, paddingHorizontal: espacamentos.xl },
  iconeCirculo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.fundoCartao,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  mensagem: { color: cores.textoSuave, textAlign: "center", fontSize: tipografia.corpo, lineHeight: 20 }
});
