import { Modal, StyleSheet, Text, View } from "react-native";
import Botao from "./Botao.jsx";
import { cores, espacamentos, raios, sombra, tipografia } from "../lib/theme.js";

/* Dialogo de confirmacao generico (nao so de logout) — nasceu extraido de
   PerfilScreen.jsx (unico lugar que tinha "Sair" antes do menu lateral) e
   hoje tambem e usado pelo AlunoWorkspace.jsx (acionado via MenuLateral.jsx).
   Textos/icones/variantes tem default identico ao uso original de logout
   (zero mudanca de comportamento pros chamadores existentes), mas ficam
   sobrescritiveis — reaproveitado pelo QuizModal.jsx pra confirmar saida de
   uma avaliacao em andamento, so trocando titulo/texto/rotulos dos botoes. */
export default function ModalConfirmarSaida({
  acaoCancelar = "Cancelar",
  acaoConfirmar = "Sair",
  iconeCancelar = "close",
  iconeConfirmar = "log-out-outline",
  onCancelar,
  onConfirmar,
  texto = "Deseja realmente sair da sua conta?",
  titulo = "Sair da conta",
  varianteCancelar = "perigo",
  varianteConfirmar = "sucesso",
  visivel
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancelar} transparent visible={visivel}>
      <View style={estilos.fundo}>
        <View style={estilos.painel}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.texto}>{texto}</Text>
          <View style={estilos.acoes}>
            <Botao icone={iconeCancelar} onPress={onCancelar} style={estilos.botao} variante={varianteCancelar}>
              {acaoCancelar}
            </Botao>
            <Botao icone={iconeConfirmar} onPress={onConfirmar} style={estilos.botao} variante={varianteConfirmar}>
              {acaoConfirmar}
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
