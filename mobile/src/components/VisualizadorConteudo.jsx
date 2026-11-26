import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import VisualizadorPdf from "./VisualizadorPdf";
import Toast from "./Toast.jsx";
import { abrirArquivoSeguro } from "../lib/abrirArquivoSeguro";
import { extrairNomeArquivo, resolverUrlArquivoAbsoluta } from "../lib/arquivos.js";
import { obterTokenValido } from "../lib/api.js";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

const TIPO_PDF = 2;
const TIPO_VIDEO = 3;
const TIPO_IMAGEM = 5;

/**
 * Painel full-screen (mesmo padrao `presentationStyle="pageSheet"` do
 * QuizModal) pra abrir video/imagem/PDF de conteudo didatico sem sair do
 * app. Marca a conclusao automaticamente: imagem/PDF na abertura, video no
 * inicio efetivo da reproducao (nao so ao abrir o player) - ver
 * pendencia_auditoria_conteudos_conclusao_exclusao_visualizacao na memoria
 * do projeto, item B.
 */
export default function VisualizadorConteudo({ conteudo, jaConcluido, onConcluir, onErroVideo, onFechar, url, visivel }) {
  const insets = useSafeAreaInsets();
  const tipo = conteudo?.tipoConteudo;
  const concluidoRef = useRef(false);
  const [baixando, setBaixando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    concluidoRef.current = false;
  }, [conteudo?.id]);

  // So reseta o erro de download aqui (em vez de a cada troca de `conteudo`)
  // porque o modal e full-screen: o usuario so consegue selecionar outro
  // conteudo depois de fechar este, nunca com o viewer ainda aberto.
  function fechar() {
    setMensagemErro("");
    onFechar?.();
  }

  async function baixarArquivo() {
    if (!conteudo?.arquivoUrl || baixando) {
      return;
    }
    setBaixando(true);
    setMensagemErro("");
    try {
      const token = await obterTokenValido();
      await abrirArquivoSeguro({
        nomeArquivo: extrairNomeArquivo(conteudo.arquivoUrl, conteudo.titulo),
        token,
        urlAbsoluta: resolverUrlArquivoAbsoluta(conteudo.arquivoUrl)
      });
    } catch {
      setMensagemErro("Não foi possível baixar o arquivo.");
    } finally {
      setBaixando(false);
    }
  }

  useEffect(() => {
    if (!visivel || !conteudo || jaConcluido || concluidoRef.current) {
      return;
    }
    if (tipo === TIPO_IMAGEM || tipo === TIPO_PDF) {
      concluidoRef.current = true;
      onConcluir(conteudo.id);
    }
  }, [visivel, conteudo, jaConcluido, tipo, onConcluir]);

  function marcarVideoAssistido() {
    if (!concluidoRef.current && !jaConcluido && conteudo) {
      concluidoRef.current = true;
      onConcluir(conteudo.id);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={fechar} presentationStyle="pageSheet" visible={visivel}>
      <View style={estilos.container}>
        <View style={[estilos.cabecalho, { paddingTop: insets.top + 16 }]}>
          <Text numberOfLines={1} style={estilos.titulo}>{conteudo?.titulo}</Text>
          <View style={estilos.cabecalhoDireita}>
            {conteudo?.arquivoUrl ? (
              <TouchableOpacity
                accessibilityHint="Baixa o arquivo original e abre a opção de compartilhar/abrir"
                accessibilityLabel="Baixar arquivo"
                accessibilityRole="button"
                accessibilityState={{ disabled: baixando }}
                disabled={baixando}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={baixarArquivo}
                style={estilos.botaoIcone}
              >
                {baixando ? (
                  <ActivityIndicator color={cores.texto} size="small" />
                ) : (
                  <Ionicons color={cores.texto} name="download-outline" size={20} />
                )}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityHint="Fecha o visualizador e volta para a lista de conteúdos"
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={fechar}
              style={estilos.botaoIcone}
            >
              <Ionicons color={cores.erro} name="close" size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {mensagemErro ? (
          <View style={estilos.toastContainer}>
            <Toast mensagem={mensagemErro} onFechar={() => setMensagemErro("")} tipo="erro" />
          </View>
        ) : null}

        <View style={estilos.corpo}>
          {!visivel || !url ? null : tipo === TIPO_IMAGEM ? (
            <VisualizadorImagem url={url} />
          ) : tipo === TIPO_VIDEO ? (
            <VisualizadorVideo onComecouAReproduzir={marcarVideoAssistido} onErro={onErroVideo} url={url} />
          ) : tipo === TIPO_PDF ? (
            <VisualizadorPdf url={url} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function VisualizadorImagem({ url }) {
  const [carregando, setCarregando] = useState(true);

  return (
    <ScrollView
      centerContent
      contentContainerStyle={estilos.imagemScrollConteudo}
      maximumZoomScale={3}
      minimumZoomScale={1}
      style={estilos.imagemScroll}
    >
      {carregando ? (
        <View style={estilos.carregandoOverlay}>
          <ActivityIndicator color={cores.destaque} />
        </View>
      ) : null}
      <Image accessibilityIgnoresInvertColors onLoadEnd={() => setCarregando(false)} resizeMode="contain" source={{ uri: url }} style={estilos.imagem} />
    </ScrollView>
  );
}

function VisualizadorVideo({ onComecouAReproduzir, onErro, url }) {
  // Quando `onErro` troca a URL (token renovado), useVideoPlayer recria o
  // player do zero com a nova fonte (ver expo-video: a factory depende do
  // source) - guarda aqui a posicao de antes do erro pra retomar assim que
  // o player novo estiver pronto, no proprio `setup`.
  const posicaoParaRetomarRef = useRef(null);

  const player = useVideoPlayer(url, (instancia) => {
    instancia.loop = false;
    if (posicaoParaRetomarRef.current != null) {
      instancia.currentTime = posicaoParaRetomarRef.current;
      posicaoParaRetomarRef.current = null;
    }
  });

  useEffect(() => {
    const assinaturaPlaying = player.addListener("playingChange", (evento) => {
      if (evento.isPlaying) {
        onComecouAReproduzir();
      }
    });

    const assinaturaStatus = player.addListener("statusChange", (evento) => {
      if (evento.status === "error" && onErro) {
        posicaoParaRetomarRef.current = player.currentTime;
        onErro();
      }
    });

    return () => {
      assinaturaPlaying.remove();
      assinaturaStatus.remove();
    };
  }, [player, onComecouAReproduzir, onErro]);

  return (
    <VideoView
      allowsPictureInPicture
      contentFit="contain"
      nativeControls
      player={player}
      style={estilos.video}
    />
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamentos.xl,
    paddingBottom: espacamentos.lg,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  titulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700", flex: 1, marginRight: espacamentos.md },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: espacamentos.md },
  botaoIcone: { padding: 4 },
  toastContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.sm },
  corpo: { flex: 1 },
  imagemScroll: { flex: 1 },
  imagemScrollConteudo: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  carregandoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  imagem: { width: "100%", height: "100%", minHeight: 320 },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" }
});
