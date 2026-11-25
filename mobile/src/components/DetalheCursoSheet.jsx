import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import CapaCurso from "./CapaCurso.jsx";
import { formatMoney } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const MODELO_ACOMPANHADO = 3;

/* Painel de detalhes do curso — bottom sheet aberto ao tocar na capa ou em
   "Detalhes" do cartao de vitrine (docs/redesign-mobile/PROMPT-agente-
   catalogo-vitrine.md, item 3). So mostra informacao: nao decide nada por
   conta propria — o botao principal chama os MESMOS onComecarGratis/
   onComprar que o cartao ja usa (CatalogoScreen.jsx fecha este painel e
   abre o ConfirmacaoCompraSheet/chama comecarGratis em seguida, igual o
   cartao faria direto). Aqui o preco aparece no botao porque esta e a tela
   de confirmacao — no cartao ele so aparece uma vez, na etiqueta da capa.
   Mesmo padrao de Modal/alca/overlay do ConfirmacaoCompraSheet.jsx. */
export default function DetalheCursoSheet({ curso, onComecarGratis, onComprar, onFechar, processando, visivel }) {
  const insets = useSafeAreaInsets();

  if (!curso) {
    return null;
  }

  const gratuito = !(Number(curso.preco) > 0);
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
            <View style={[estilos.etiquetaPreco, gratuito ? estilos.etiquetaPrecoGratis : null]}>
              <Text style={[estilos.etiquetaPrecoTexto, gratuito ? estilos.etiquetaPrecoTextoGratis : null]}>
                {gratuito ? "Grátis" : formatMoney(curso.preco)}
              </Text>
            </View>
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

          <Botao
            accessibilityHint={gratuito ? `Começa o curso ${curso.titulo} gratuitamente` : `Abre a confirmação de compra de ${curso.titulo}`}
            accessibilityLabel={gratuito ? "Confirmar começar grátis no painel de detalhes" : "Confirmar compra no painel de detalhes"}
            carregando={processando}
            icone={gratuito ? undefined : "card"}
            onPress={gratuito ? onComecarGratis : onComprar}
            style={estilos.botaoPrincipal}
            variante={gratuito ? "sucesso" : "primario"}
          >
            {gratuito ? "Começar grátis" : `Comprar · ${formatMoney(curso.preco)}`}
          </Botao>
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4
  },
  etiquetaPrecoGratis: { backgroundColor: cores.sucesso },
  etiquetaPrecoTexto: { color: cores.texto, fontWeight: "800", fontSize: 11.5 },
  etiquetaPrecoTextoGratis: { color: cores.fundo },
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
