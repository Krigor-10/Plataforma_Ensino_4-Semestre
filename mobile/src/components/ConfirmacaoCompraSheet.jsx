import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import CapaCurso from "./CapaCurso.jsx";
import Toast from "./Toast.jsx";
import { apiRequest, ApiError } from "../lib/api.js";
import { formatMoney } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const MODELO_ACOMPANHADO = 3;

/* Painel de confirmacao de compra — bottom sheet, mesmo estilo do "Antes de
   comecar" do QuizModal.jsx (fase "confirmar" -> "enviando" -> "sucesso").
   Usado so pro fluxo PAGO (Comprar / Concluir compra de pagamento
   pendente): o fluxo gratuito ("Comecar gratis") e um POST /Matriculas
   direto, sem confirmacao, feito pela propria tela que chama (ver
   CatalogoScreen.jsx). Chama POST /Matriculas/comprar internamente, como o
   QuizModal chama a API de avaliacoes - a tela que abre este painel so
   precisa fornecer o curso e os callbacks de recarregar/navegar. */
export default function ConfirmacaoCompraSheet({ curso, onCompraConfirmada, onFechar, onIrParaCurso, onSessionExpired, visivel }) {
  const [fase, setFase] = useState("confirmar");
  const [erro, setErro] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visivel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional do estado interno do painel toda vez que ele reabre, mesmo padrao do QuizModal.jsx.
      setFase("confirmar");
      setErro("");
    }
  }, [visivel, curso?.id]);

  if (!curso) {
    return null;
  }

  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  async function confirmar() {
    setFase("enviando");
    setErro("");

    try {
      await apiRequest("/Matriculas/comprar", { method: "POST", body: JSON.stringify({ cursoId: curso.id }) });
      await onCompraConfirmada?.();
      setFase("sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErro(err.message || "Não foi possível concluir a compra agora.");
      setFase("confirmar");
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onFechar} transparent visible={visivel}>
      <View style={estilos.overlay}>
        <TouchableOpacity
          accessibilityElementsHidden
          accessibilityRole="none"
          activeOpacity={1}
          importantForAccessibility="no"
          onPress={fase === "confirmar" ? onFechar : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[estilos.sheet, { paddingBottom: insets.bottom + espacamentos.lg }]}>
          <View style={estilos.alcaLinha}>
            <View style={estilos.alca} />
          </View>

          {fase === "sucesso" ? (
            <View style={estilos.sucesso}>
              <View style={estilos.sucessoIconeContorno}>
                <Ionicons color={cores.sucesso} name="checkmark-circle-outline" size={40} />
              </View>
              <Text style={estilos.sucessoTitulo}>Compra concluída!</Text>
              <Text style={estilos.sucessoDescricao}>O curso já está liberado.</Text>
              <Botao icone="arrow-forward" onPress={() => onIrParaCurso?.(curso.id)} style={estilos.sucessoBotao} variante="primario">
                Ir para o curso
              </Botao>
            </View>
          ) : (
            <>
              <View style={estilos.cabecalho}>
                <CapaCurso curso={curso} size={48} />
                <View style={estilos.cabecalhoTextos}>
                  <Text numberOfLines={2} style={estilos.titulo}>{curso.titulo}</Text>
                  <View style={estilos.selo}>
                    <Text style={estilos.seloTexto}>{ehAcompanhado ? "COM ACOMPANHAMENTO" : "PAGO"}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityHint="Fecha o painel sem confirmar a compra"
                  accessibilityLabel="Fechar"
                  accessibilityRole="button"
                  disabled={fase === "enviando"}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={onFechar}
                  style={estilos.botaoFechar}
                >
                  <Ionicons color={cores.textoSuave} name="close" size={22} />
                </TouchableOpacity>
              </View>

              <View style={estilos.totalLinha}>
                <Text style={estilos.totalRotulo}>Total</Text>
                <Text style={estilos.totalValor}>{formatMoney(curso.preco)}</Text>
              </View>

              <View style={estilos.avisoCartao}>
                <Ionicons color={cores.acento} name="information-circle-outline" size={18} />
                <Text style={estilos.avisoTexto}>
                  Pagamento simulado — ambiente acadêmico, nenhuma cobrança real é feita.
                </Text>
              </View>

              <Toast mensagem={erro} onFechar={() => setErro("")} tipo="erro" />

              <Botao carregando={fase === "enviando"} icone="card" onPress={confirmar} style={estilos.botaoConfirmar} variante="primario">
                Confirmar compra
              </Botao>
              <Botao disabled={fase === "enviando"} onPress={onFechar} variante="fantasma">Cancelar</Botao>
            </>
          )}
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
  cabecalho: { flexDirection: "row", alignItems: "flex-start", gap: espacamentos.md, marginBottom: espacamentos.lg },
  cabecalhoTextos: { flex: 1, gap: espacamentos.xs },
  titulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "600" },
  selo: {
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.sm,
    alignSelf: "flex-start",
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  seloTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  botaoFechar: { minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.md,
    padding: espacamentos.md,
    marginBottom: espacamentos.md
  },
  totalRotulo: { color: cores.textoSuave, fontSize: tipografia.corpo, fontWeight: "600" },
  totalValor: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  avisoCartao: {
    flexDirection: "row",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.md,
    padding: espacamentos.md,
    marginBottom: espacamentos.lg
  },
  avisoTexto: { color: cores.textoSuave, fontSize: tipografia.corpo, lineHeight: 18, flex: 1 },
  botaoConfirmar: { minHeight: 48, marginBottom: espacamentos.xs },
  sucesso: { alignItems: "center", paddingTop: espacamentos.sm, paddingBottom: espacamentos.lg, gap: espacamentos.sm },
  sucessoIconeContorno: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.sucessoFundo,
    marginBottom: espacamentos.sm
  },
  sucessoTitulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  sucessoDescricao: { color: cores.textoSuave, textAlign: "center", marginBottom: espacamentos.lg },
  sucessoBotao: { alignSelf: "stretch" }
});
