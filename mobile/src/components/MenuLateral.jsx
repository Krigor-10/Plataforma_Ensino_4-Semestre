import { useEffect, useRef } from "react";
import { Animated, BackHandler, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { obterIniciais } from "../lib/format.js";
import { cores, espacamentos, raios, sombra, tipografia } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

const LARGURA_MENU = Math.min(320, Dimensions.get("window").width * 0.8);

// Redesign (docs/redesign-mobile/PROMPT-agente-mobile.md, secao 1): o menu
// fica so com Meu perfil + Catalogo - Cursos e Certificados viraram abas da
// bottom bar (ver AlunoTabsNavigator.jsx). A antiga tela "Cursos"
// (CursosScreen.jsx, confirmar pagamento/ver matricula) foi removida na
// Rodada 3 do redesign: suas funcoes ainda necessarias ja migraram pra
// GradeCursosConteudos.jsx.
const GRUPOS = [
  {
    titulo: "Conta",
    itens: [
      { chave: ROUTES.PERFIL, dica: "Abre a tela de perfil", icone: "person-outline", rotulo: "Meu perfil" }
    ]
  },
  {
    titulo: "Explorar",
    itens: [
      { chave: ROUTES.CATALOGO, dica: "Abre o catalogo de cursos disponiveis", icone: "storefront-outline", rotulo: "Catálogo de cursos" }
    ]
  }
];

/* Menu lateral (drawer) do Aluno — agrupa Navegacao (so Catalogo) e
   Conta (Meu perfil + Sair). Usa o <Modal> nativo do RN (mesmo padrao ja usado em QuizModal/
   PerfilScreen/ConteudosScreen) pra ganhar o onRequestClose do botao fisico
   de voltar do Android de graca; o slide lateral e so um Animated.View por
   cima, nao e o Modal que anima. O painel precisa vir ANTES do overlay
   `fundo` no JSX: `raiz` e um flex row, entao a 1a posicao fica encostada a
   esquerda (onde o painel deve nascer quando aberto) e a 2a preenche o
   resto (onde o overlay cobre o conteudo). */
export default function MenuLateral({ aberto, onFechar, onNavegar, onSolicitarSair, rotaAtiva, usuario }) {
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line react-hooks/refs -- padrao idiomatico useRef(valorInicial).current pra extrair um Animated.Value estavel (mesma instancia em todo render); nao ha mutacao aqui, so leitura do valor ja criado.
  const deslocamento = useRef(new Animated.Value(-LARGURA_MENU)).current;

  useEffect(() => {
    Animated.timing(deslocamento, {
      duration: 220,
      toValue: aberto ? 0 : -LARGURA_MENU,
      useNativeDriver: true
    }).start();
  }, [aberto, deslocamento]);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      onFechar();
      return true;
    });

    return () => assinatura.remove();
  }, [aberto, onFechar]);

  return (
    <Modal animationType="none" onRequestClose={onFechar} transparent visible={aberto}>
      <View style={estilos.raiz}>
        <Animated.View
          style={[
            estilos.painel,
            {
              paddingTop: insets.top + espacamentos.md,
              paddingBottom: insets.bottom + espacamentos.md,
              transform: [{ translateX: deslocamento }]
            }
          ]}
        >
          <TouchableOpacity
            accessibilityHint="Fecha o menu lateral"
            accessibilityLabel="Fechar menu"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onFechar}
            style={estilos.botaoFechar}
          >
            <Ionicons color={cores.textoSuave} name="close" size={22} />
          </TouchableOpacity>

          <View style={estilos.identidade}>
            <LinearGradient colors={[cores.destaque, cores.acento]} style={estilos.avatar}>
              <Text style={estilos.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
            </LinearGradient>
            <Text numberOfLines={1} style={estilos.nome}>{usuario?.nome}</Text>
            <View style={estilos.papelPilula}>
              <Text style={estilos.papelPilulaTexto}>{usuario?.tipoUsuario}</Text>
            </View>
            <Text numberOfLines={1} style={estilos.email}>{usuario?.email}</Text>
          </View>

          <ScrollView contentContainerStyle={estilos.lista}>
            {GRUPOS.map((grupo) => (
              <View key={grupo.titulo} style={estilos.grupo}>
                <Text style={estilos.grupoTitulo}>{grupo.titulo}</Text>
                {grupo.itens.map((item) => {
                  const ativo = item.chave === rotaAtiva;
                  return (
                    <TouchableOpacity
                      accessibilityHint={item.dica}
                      accessibilityLabel={item.rotulo}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo }}
                      key={item.chave}
                      onPress={() => onNavegar(item.chave)}
                      style={[estilos.item, ativo ? estilos.itemAtivo : null]}
                    >
                      <View style={estilos.itemEsquerda}>
                        <Ionicons color={ativo ? cores.destaque : cores.textoSuave} name={item.icone} size={20} />
                        <Text style={[estilos.itemTexto, ativo ? estilos.itemTextoAtivo : null]}>{item.rotulo}</Text>
                      </View>
                      <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            accessibilityHint="Abre a confirmação pra sair da conta"
            accessibilityLabel="Sair da conta"
            accessibilityRole="button"
            onPress={onSolicitarSair}
            style={estilos.itemSair}
          >
            <Ionicons color={cores.erro} name="log-out-outline" size={20} />
            <Text style={estilos.itemSairTexto}>Sair</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          accessibilityHint="Fecha o menu lateral"
          accessibilityLabel="Fechar menu"
          activeOpacity={1}
          onPress={onFechar}
          style={estilos.fundo}
        />
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, flexDirection: "row" },
  fundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)" },
  painel: {
    width: LARGURA_MENU,
    backgroundColor: cores.fundoCartao,
    paddingHorizontal: espacamentos.lg,
    ...sombra.cartao
  },
  botaoFechar: { alignSelf: "flex-end", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", marginRight: -espacamentos.sm },
  identidade: {
    alignItems: "center",
    paddingBottom: espacamentos.lg,
    borderBottomWidth: 1,
    borderBottomColor: cores.divisoria,
    marginBottom: espacamentos.sm
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: espacamentos.sm },
  avatarTexto: { color: cores.texto, fontSize: 20, fontWeight: "800" },
  nome: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, maxWidth: "100%" },
  papelPilula: {
    borderWidth: 1,
    borderColor: cores.destaque,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.md,
    paddingVertical: 2,
    marginTop: espacamentos.xs
  },
  papelPilulaTexto: { color: cores.destaque, fontSize: tipografia.rotulo, fontWeight: "700" },
  email: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: espacamentos.xs, maxWidth: "100%" },
  lista: { gap: espacamentos.sm, paddingVertical: espacamentos.sm },
  grupo: { gap: 4 },
  grupoTitulo: {
    color: cores.textoSuave,
    fontSize: tipografia.legenda,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: espacamentos.sm,
    marginBottom: 2
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: espacamentos.sm,
    borderRadius: 12
  },
  itemEsquerda: { flexDirection: "row", alignItems: "center", gap: espacamentos.md, flex: 1 },
  itemAtivo: { backgroundColor: cores.fundoCartaoAtivo },
  itemTexto: { color: cores.texto, fontWeight: "600", fontSize: 15 },
  itemTextoAtivo: { color: cores.destaque, fontWeight: "700" },
  itemSair: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    minHeight: 48,
    paddingHorizontal: espacamentos.sm,
    borderRadius: raios.md,
    borderTopWidth: 1,
    borderTopColor: cores.divisoria,
    marginTop: espacamentos.sm,
    paddingTop: espacamentos.md
  },
  itemSairTexto: { color: cores.erro, fontWeight: "700", fontSize: tipografia.corpo }
});
