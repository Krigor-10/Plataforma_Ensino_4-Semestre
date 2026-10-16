import { Modal, StyleSheet, Text, View } from "react-native";
import Botao from "./Botao.jsx";
import { cores, espacamentos, raios, sombra, tipografia } from "../lib/theme.js";

/* Dialogo de confirmacao de logout — extraido de PerfilScreen.jsx (unico
   lugar que tinha "Sair" antes do menu lateral) pra ser reaproveitado tambem
   por MenuLateral.jsx, sem duplicar o mesmo Modal/estilos nos dois lugares. */
export default function ModalConfirmarSaida({ onCancelar, onConfirmar, visivel }) {
  return (
    <Modal animationType="fade" onRequestClose={onCancelar} transparent visible={visivel}>
      <View style={estilos.fundo}>
        <View style={estilos.painel}>
          <Text style={estilos.titulo}>Sair da conta</Text>
          <Text style={estilos.texto}>Deseja realmente sair da sua conta?</Text>
          <View style={estilos.acoes}>
            <Botao icone="close" onPress={onCancelar} style={estilos.botao} variante="perigo">
              Cancelar
            </Botao>
            <Botao icone="log-out-outline" onPress={onConfirmar} style={estilos.botao} variante="sucesso">
              Sair
            </Botao>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", alignItems: "center", justifyContent: "center", padding: espacamentos.xl },
  painel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.xl, width: "100%", maxWidth: 340, gap: espacamentos.sm, ...sombra.cartao },
  titulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700" },
  texto: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  acoes: { flexDirection: "row", gap: espacamentos.sm, marginTop: espacamentos.sm },
  botao: { flex: 1 }
});
