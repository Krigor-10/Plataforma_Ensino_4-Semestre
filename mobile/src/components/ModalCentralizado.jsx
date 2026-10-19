import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Dialogo centralizado generico — extraido do modal de pre-avaliacao do
   QuizModal.jsx (fase "confirmar") pra ser reaproveitado tambem pelo modal
   de edicao de perfil (PerfilScreen.jsx). Largura responsiva (nunca mais que
   420 nem mais que a tela menos as margens), altura limitada a 85% da tela
   com scroll interno no `children` e o `rodape` (acoes) fixo fora do scroll,
   sempre acessivel. X de fechar em vermelho (cores.erro) — comunica "sair/
   fechar" sem se confundir com confirmacao de nenhuma acao destrutiva
   especifica, essa fica a cargo de quem usa o dialogo (ex.: ModalConfirmarSaida
   quando a saida precisar de confirmacao). KeyboardAvoidingView envolve
   scroll+rodape pra telas com campos de texto (ex.: edicao de perfil) sem
   afetar quem nao tem nenhum TextInput (ex.: confirmacao de avaliacao). */
export default function ModalCentralizado({ children, onFechar, rodape, titulo, visivel }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" onRequestClose={onFechar} transparent visible={visivel}>
      <View style={[estilos.overlay, { paddingTop: insets.top + espacamentos.xl, paddingBottom: insets.bottom + espacamentos.xl }]}>
        <TouchableOpacity
          accessibilityElementsHidden
          accessibilityRole="none"
          activeOpacity={1}
          importantForAccessibility="no"
          onPress={onFechar}
          style={StyleSheet.absoluteFill}
        />
        <View style={estilos.dialogo}>
          <View style={estilos.cabecalho}>
            <Text numberOfLines={2} style={estilos.titulo}>{titulo}</Text>
            <TouchableOpacity
              accessibilityHint="Fecha esta janela"
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={onFechar}
              style={estilos.botaoFechar}
            >
              <Ionicons color={cores.erro} name="close" size={22} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={estilos.corpoFlex}>
            <ScrollView contentContainerStyle={estilos.corpo} style={estilos.scroll}>
              {children}
            </ScrollView>

            {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacamentos.xl
  },
  dialogo: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    overflow: "hidden"
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacamentos.sm,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.lg,
    paddingBottom: espacamentos.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  titulo: { color: cores.texto, fontSize: tipografia.titulo, fontWeight: "700", flex: 1 },
  botaoFechar: { minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
  corpoFlex: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  corpo: { padding: espacamentos.xl },
  rodape: {
    padding: espacamentos.xl,
    paddingTop: espacamentos.md,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao
  }
});
