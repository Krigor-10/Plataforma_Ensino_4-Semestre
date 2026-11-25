import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CapaCurso from "./CapaCurso.jsx";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const COR_TEXTO_POR_VARIANTE_ACAO = {
  ambar: cores.fundo,
  contornoRoxo: cores.destaque,
  roxo: cores.texto,
  verde: cores.fundo
};

const ESTILO_POR_VARIANTE_ACAO = {
  ambar: { backgroundColor: cores.aviso },
  contornoRoxo: { backgroundColor: "transparent", borderWidth: 1, borderColor: cores.destaque },
  roxo: { backgroundColor: cores.destaque },
  verde: { backgroundColor: cores.sucesso }
};

/* Cartão de vitrine comum ao Catálogo e à aba Cursos (meus cursos) —
   extraído de CatalogoScreen.jsx (docs/redesign-mobile/PROMPT-agente-
   cursos-vitrine.md, item 2, pré-requisito PROMPT-agente-catalogo-
   vitrine.md): capa grande com etiqueta/selo sobrepostos, barra fina
   opcional colada embaixo da capa, corpo com título + linha de apoio +
   rodapé. Cor/rótulo de cada peça fica a cargo de quem chama (cada tela
   calcula sua própria situação) — este componente só desenha a forma do
   cartão, igual nas duas telas. `rodapeConteudo`, quando passado, substitui
   o rodapé padrão (link + pílula) por um conteúdo livre — usado pela aba
   Cursos pra mostrar a confirmação de "Desistir da compra" no lugar das
   ações normais, sem a tela do Catálogo precisar saber que isso existe. */
export default function CartaoVitrineCurso({
  acaoPrincipal,
  acaoSecundaria,
  alturaCapa = 118,
  apoioLinhas = 2,
  apoioTexto,
  barra,
  capaAccessibilityHint,
  capaAccessibilityLabel,
  curso,
  etiqueta,
  onAbrirCapa,
  rodapeConteudo,
  selo
}) {
  return (
    <View style={estilos.cartao}>
      <Pressable
        accessibilityHint={capaAccessibilityHint}
        accessibilityLabel={capaAccessibilityLabel}
        accessibilityRole="button"
        onPress={onAbrirCapa}
        style={[estilos.capaContainer, { height: alturaCapa }]}
      >
        <CapaCurso altura={alturaCapa} curso={curso} estilo={estilos.capaImagem} largura="100%" reservaIniciais />

        {etiqueta ? (
          <View
            style={[
              estilos.etiqueta,
              { backgroundColor: etiqueta.corFundo },
              etiqueta.corBorda ? { borderWidth: 1, borderColor: etiqueta.corBorda } : null
            ]}
          >
            <Text style={[estilos.etiquetaTexto, { color: etiqueta.corTexto }]}>{etiqueta.rotulo}</Text>
          </View>
        ) : null}

        {selo ? (
          <View style={[estilos.selo, { backgroundColor: selo.corFundo, borderColor: selo.corBorda }]}>
            <Text style={[estilos.seloTexto, { color: selo.corTexto }]}>{selo.rotulo}</Text>
          </View>
        ) : null}
      </Pressable>

      {barra ? (
        <View style={estilos.barraFundo}>
          <View
            style={[
              estilos.barraPreenchida,
              { width: `${Math.max(0, Math.min(Number(barra.percentual) || 0, 100))}%`, backgroundColor: barra.concluido ? cores.sucesso : cores.destaque }
            ]}
          />
        </View>
      ) : null}

      <View style={estilos.corpo}>
        <Text numberOfLines={2} style={estilos.titulo}>{curso?.titulo}</Text>
        {apoioTexto ? <Text numberOfLines={apoioLinhas} style={estilos.apoio}>{apoioTexto}</Text> : null}

        {rodapeConteudo ? (
          rodapeConteudo
        ) : (
          <View style={estilos.rodape}>
            <View style={estilos.rodapeEsquerda}>
              {acaoSecundaria ? (
                <TouchableOpacity
                  accessibilityHint={acaoSecundaria.accessibilityHint}
                  accessibilityLabel={acaoSecundaria.accessibilityLabel || acaoSecundaria.rotulo}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={acaoSecundaria.onPress}
                  style={estilos.linkSecundario}
                >
                  <Text style={[estilos.linkSecundarioTexto, acaoSecundaria.tom === "cinza" ? estilos.linkSecundarioTextoCinza : null]}>
                    {acaoSecundaria.rotulo}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {acaoPrincipal ? (
              <TouchableOpacity
                accessibilityHint={acaoPrincipal.accessibilityHint}
                accessibilityLabel={acaoPrincipal.accessibilityLabel || acaoPrincipal.rotulo}
                accessibilityRole="button"
                disabled={acaoPrincipal.processando}
                onPress={acaoPrincipal.onPress}
                style={[estilos.acao, ESTILO_POR_VARIANTE_ACAO[acaoPrincipal.variante]]}
              >
                {acaoPrincipal.processando ? (
                  <ActivityIndicator color={COR_TEXTO_POR_VARIANTE_ACAO[acaoPrincipal.variante]} size="small" />
                ) : (
                  <Text style={[estilos.acaoTexto, { color: COR_TEXTO_POR_VARIANTE_ACAO[acaoPrincipal.variante] }]}>{acaoPrincipal.rotulo}</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderRadius: raios.lg,
    backgroundColor: cores.fundoCartao,
    borderWidth: 1,
    borderColor: "rgba(123, 47, 247, 0.2)",
    overflow: "hidden"
  },
  capaContainer: { width: "100%", position: "relative" },
  capaImagem: { borderRadius: 0 },
  etiqueta: {
    position: "absolute",
    top: espacamentos.sm,
    right: espacamentos.sm,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4
  },
  etiquetaTexto: { fontWeight: "800", fontSize: 11.5 },
  selo: {
    position: "absolute",
    bottom: espacamentos.sm,
    left: espacamentos.sm,
    borderWidth: 1,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  seloTexto: { fontSize: 10, fontWeight: "700" },
  barraFundo: { height: 4, width: "100%", backgroundColor: cores.bordaCartao, overflow: "hidden" },
  barraPreenchida: { height: 4 },

  corpo: { padding: espacamentos.md },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: 14 },
  apoio: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  rodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espacamentos.sm
  },
  rodapeEsquerda: { flex: 1 },
  linkSecundario: { alignSelf: "flex-start", paddingVertical: espacamentos.xs },
  linkSecundarioTexto: { color: "#c4b5fd", fontWeight: "700", fontSize: tipografia.rotulo },
  linkSecundarioTextoCinza: { color: cores.textoSuave },
  acao: {
    borderRadius: raios.pilula,
    paddingHorizontal: 14,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  acaoTexto: { fontWeight: "700", fontSize: tipografia.rotulo }
});
