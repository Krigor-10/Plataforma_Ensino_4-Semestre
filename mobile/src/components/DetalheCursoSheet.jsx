import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import CapaCurso from "./CapaCurso.jsx";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const MODELO_ACOMPANHADO = 3;

/* Painel de detalhes do curso — bottom sheet aberto ao tocar na capa ou em
   "Detalhes" do cartao de vitrine (docs/redesign-mobile/PROMPT-agente-
   catalogo-vitrine.md, item 3; reaproveitado pela aba Cursos em
   PROMPT-agente-cursos-vitrine.md). So mostra informacao: nao decide nada
   por conta propria — `acaoPrincipal` e um objeto pronto (rotulo/onPress/
   variante/...) que cada tela monta com a acao que faz sentido pra ela
   (Catalogo: Comprar/Comecar gratis com o preco no rotulo; Cursos: Continuar/
   Comecar/Revisar/Concluir compra/Comprar, sem preco - so o botao da
   situacao). `etiqueta` (preco/gratis) e opcional - Cursos nao mostra
   nenhuma, so capa + descricao + botao. Mesmo padrao de Modal/alca/overlay
   do ConfirmacaoCompraSheet.jsx. */
export default function DetalheCursoSheet({ acaoPrincipal, curso, etiqueta, onFechar, visivel }) {
  const insets = useSafeAreaInsets();

  if (!curso) {
    return null;
  }

  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  return (
    <Modal animationType="slide" onRequestClose={onFechar} transparent visible={visivel}>
      <View style={estilos.overlay}>
        <TouchableOpacity
          accessibilityElementsHidden
          accessibilityRole="none"
          activeOpacity={1}
          importantForAccessibility="no"
          onPress={onFechar}
          style={StyleSheet.absoluteFill}
        />
        <View style={[estilos.sheet, { paddingBottom: insets.bottom + espacamentos.lg }]}>
          <View style={estilos.alcaLinha}>
            <View style={estilos.alca} />
          </View>

          <View style={estilos.capaContainer}>
            <CapaCurso altura={150} curso={curso} estilo={estilos.capaImagem} largura="100%" reservaIniciais />
            {etiqueta ? (
              <View style={[estilos.etiquetaPreco, { backgroundColor: etiqueta.corFundo }]}>
                <Text style={[estilos.etiquetaPrecoTexto, { color: etiqueta.corTexto }]}>{etiqueta.rotulo}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              accessibilityHint="Fecha o painel de detalhes"
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={onFechar}
              style={estilos.botaoFechar}
            >
              <Ionicons color={cores.texto} name="close" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={estilos.titulo}>{curso.titulo}</Text>

          {ehAcompanhado ? (
            <View style={estilos.selo}>
              <Text style={estilos.seloTexto}>COM ACOMPANHAMENTO</Text>
            </View>
          ) : null}

          {curso.descricao ? <Text style={estilos.descricao}>{curso.descricao}</Text> : null}

          {acaoPrincipal ? (
            <Botao
              accessibilityHint={acaoPrincipal.accessibilityHint}
              accessibilityLabel={acaoPrincipal.accessibilityLabel}
              carregando={acaoPrincipal.processando}
              icone={acaoPrincipal.icone}
              onPress={acaoPrincipal.onPress}
              style={estilos.botaoPrincipal}
              variante={acaoPrincipal.variante}
            >
              {acaoPrincipal.rotulo}
            </Botao>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(123, 47, 247, 0.3)",
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.sm,
    maxHeight: "90%"
  },
  alcaLinha: { alignItems: "center", paddingVertical: espacamentos.sm },
  alca: { width: 36, height: 4, borderRadius: raios.pilula, backgroundColor: cores.divisoria },
  capaContainer: { position: "relative", marginBottom: espacamentos.md },
  capaImagem: { borderRadius: raios.lg },
  etiquetaPreco: {
    position: "absolute",
    top: espacamentos.sm,
    right: espacamentos.sm,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4
  },
  etiquetaPrecoTexto: { fontWeight: "800", fontSize: 11.5 },
  botaoFechar: {
    position: "absolute",
    top: espacamentos.sm,
    left: espacamentos.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  titulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "700" },
  selo: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(17, 19, 25, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(157, 103, 255, 0.45)",
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3,
    marginTop: espacamentos.sm
  },
  seloTexto: { color: "#c4b5fd", fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.4 },
  descricao: { color: cores.textoSuave, fontSize: tipografia.corpo, lineHeight: 20, marginTop: espacamentos.md },
  botaoPrincipal: { minHeight: 48, marginTop: espacamentos.lg }
});
