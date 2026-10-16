import { useEffect, useRef } from "react";
import { Animated, BackHandler, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { obterIniciais } from "../lib/format.js";
import { cores, espacamentos, raios, sombra, tipografia } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

const LARGURA_MENU = Math.min(320, Dimensions.get("window").width * 0.8);

const ITENS = [
  { chave: ROUTES.CERTIFICADOS, dica: "Abre a tela de certificados", icone: "ribbon-outline", rotulo: "Certificados" },
  { chave: ROUTES.PERFIL, dica: "Abre a tela de perfil", icone: "person-outline", rotulo: "Meu perfil" }
];

/* Menu lateral (drawer) do Aluno — consolida os destinos secundarios que
   saem da Bottom Nav (Certificados) + atalho de Perfil + Sair, sem duplicar
   o que ja fica na barra inferior (Inicio/Conteudos/Avaliacoes/Progresso/
   Matriculas continuam la, nao aparecem aqui). Usa o <Modal> nativo do RN
   (mesmo padrao ja usado em QuizModal/PerfilScreen/ConteudosScreen) pra
   ganhar o onRequestClose do botao fisico de voltar do Android de graca;
   o slide lateral e so um Animated.View por cima, nao e o Modal que anima. */
export default function MenuLateral({ aberto, onFechar, onNavegar, onSolicitarSair, usuario }) {
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
        <TouchableOpacity
          accessibilityHint="Fecha o menu lateral"
          accessibilityLabel="Fechar menu"
          activeOpacity={1}
          onPress={onFechar}
          style={estilos.fundo}
        />
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
            <View style={estilos.avatar}>
              <Text style={estilos.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
            </View>
            <Text numberOfLines={1} style={estilos.nome}>{usuario?.nome}</Text>
            <Text style={estilos.papel}>{usuario?.tipoUsuario}</Text>
          </View>

          <ScrollView contentContainerStyle={estilos.lista}>
            {ITENS.map((item) => (
              <TouchableOpacity
                accessibilityHint={item.dica}
                accessibilityLabel={item.rotulo}
                accessibilityRole="button"
                key={item.chave}
                onPress={() => onNavegar(item.chave)}
                style={estilos.item}
              >
                <Ionicons color={cores.textoSuave} name={item.icone} size={20} />
                <Text style={estilos.itemTexto}>{item.rotulo}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            accessibilityHint="Abre a confirmacao pra sair da conta"
            accessibilityLabel="Sair da conta"
            accessibilityRole="button"
            onPress={onSolicitarSair}
            style={estilos.itemSair}
          >
            <Ionicons color={cores.erro} name="log-out-outline" size={20} />
            <Text style={estilos.itemSairTexto}>Sair</Text>
          </TouchableOpacity>
        </Animated.View>
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
    borderBottomColor: cores.bordaCartao,
    marginBottom: espacamentos.sm
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: cores.destaque, alignItems: "center", justifyContent: "center", marginBottom: espacamentos.sm },
  avatarTexto: { color: cores.texto, fontSize: 20, fontWeight: "800" },
  nome: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, maxWidth: "100%" },
  papel: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 2 },
  lista: { gap: 4, paddingVertical: espacamentos.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    minHeight: 48,
    paddingHorizontal: espacamentos.sm,
    borderRadius: raios.md
  },
  itemTexto: { color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  itemSair: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    minHeight: 48,
    paddingHorizontal: espacamentos.sm,
    borderRadius: raios.md,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao,
    marginTop: espacamentos.sm,
    paddingTop: espacamentos.md
  },
  itemSairTexto: { color: cores.erro, fontWeight: "700", fontSize: tipografia.corpo }
});
