import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BannerGradiente from "../../components/BannerGradiente.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate, formatGrade, normalizeStatus } from "../../lib/format.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";

export default function CertificadosScreen({ onSessionExpired, snapshot }) {
  const [certificadoAberto, setCertificadoAberto] = useState(null);
  const [certificadoEmitido, setCertificadoEmitido] = useState(null);
  const [emitindo, setEmitindo] = useState(false);
  const [erroEmissao, setErroEmissao] = useState("");

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);
  const turmaPorId = useMemo(() => new Map(snapshot.turmas.map((turma) => [turma.id, turma])), [snapshot.turmas]);
  const progressoCursoPorMatricula = useMemo(
    () => new Map((snapshot.progressos.cursos || []).map((progresso) => [progresso.matriculaId, progresso])),
    [snapshot.progressos.cursos]
  );

  const notasPorCurso = useMemo(() => {
    const mapa = new Map();
    (snapshot.avaliacoes || []).forEach((avaliacao) => {
      if (avaliacao.ultimaNota === null || typeof avaliacao.ultimaNota === "undefined") {
        return;
      }
      const lista = mapa.get(avaliacao.cursoId) || [];
      lista.push(Number(avaliacao.ultimaNota));
      mapa.set(avaliacao.cursoId, lista);
    });
    return mapa;
  }, [snapshot.avaliacoes]);

  const certificados = useMemo(
    () =>
      snapshot.matriculas
        .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
        .map((matricula) => {
          const progresso = progressoCursoPorMatricula.get(matricula.id);
          const percentual = Number(progresso?.percentualConclusao) || 0;
          const notas = notasPorCurso.get(matricula.cursoId) || [];
          const mediaAvaliacoes = notas.length ? notas.reduce((soma, nota) => soma + nota, 0) / notas.length : null;
          const nota = matricula.notaFinal > 0 ? matricula.notaFinal : mediaAvaliacoes;

          return {
            matriculaId: matricula.id,
            cursoTitulo: cursoPorId.get(matricula.cursoId)?.titulo || `Curso #${matricula.cursoId}`,
            turmaNome: matricula.turmaId ? turmaPorId.get(matricula.turmaId)?.nomeTurma : null,
            percentual,
            nota,
            desbloqueado: percentual >= 100
          };
        }),
    [cursoPorId, notasPorCurso, progressoCursoPorMatricula, snapshot.matriculas, turmaPorId]
  );

  const desbloqueados = certificados.filter((certificado) => certificado.desbloqueado).length;

  async function verCertificado(certificado, { compartilharAoEmitir = false } = {}) {
    setCertificadoAberto(certificado);
    setCertificadoEmitido(null);
    setErroEmissao("");
    setEmitindo(true);

    try {
      const resposta = await apiRequest(`/Certificados/matricula/${certificado.matriculaId}/emitir`, { method: "POST" });
      setCertificadoEmitido(resposta);
      if (compartilharAoEmitir) {
        await compartilhar(resposta);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErroEmissao(err.message || "Nao foi possivel emitir o certificado agora.");
    } finally {
      setEmitindo(false);
    }
  }

  function fechar() {
    setCertificadoAberto(null);
    setCertificadoEmitido(null);
    setErroEmissao("");
  }

  async function compartilhar(certificado = certificadoEmitido) {
    if (!certificado) {
      return;
    }

    await Share.share({
      message:
        `Certificado de conclusao — ${certificado.cursoTitulo}\n` +
        `${certificado.alunoNome} — nota final ${formatGrade(certificado.notaFinal)} de 10,0\n` +
        `Codigo de verificacao: ${certificado.codigoVerificacao}`
    }).catch(() => {});
  }

  if (certificados.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Assim que uma matricula for aprovada e o curso concluido, o certificado aparece aqui.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <BannerGradiente accessibilityLabel={`${desbloqueados} certificados conquistados de ${certificados.length} cursos`} icone="trophy-outline">
        <View style={estilos.resumoStats}>
          <View style={estilos.resumoStatItem}>
            <Text style={estilos.resumoValor}>{desbloqueados}</Text>
            <Text style={estilos.resumoRotulo}>Conquistados</Text>
          </View>
          <View style={estilos.resumoSep} />
          <View style={estilos.resumoStatItem}>
            <Text style={estilos.resumoValor}>{certificados.length}</Text>
            <Text style={estilos.resumoRotulo}>Cursos</Text>
          </View>
        </View>
      </BannerGradiente>

      <ScrollView contentContainerStyle={estilos.corpo}>
        {certificados.map((certificado) => (
          <View key={certificado.matriculaId} style={estilos.cartao}>
            <Text style={estilos.cartaoTitulo}>{certificado.cursoTitulo}</Text>
            {certificado.turmaNome ? <Text style={estilos.cartaoMeta}>{certificado.turmaNome}</Text> : null}

            {certificado.desbloqueado ? (
              <Text style={estilos.notaTexto}>Nota {formatGrade(certificado.nota)} / 10</Text>
            ) : (
              <Text style={estilos.percentualTexto}>{Math.round(certificado.percentual)}% concluido</Text>
            )}

            <View style={estilos.cartaoAcoes}>
              <TouchableOpacity
                accessibilityLabel={`Ver certificado de ${certificado.cursoTitulo}`}
                accessibilityRole="button"
                disabled={!certificado.desbloqueado}
                onPress={() => verCertificado(certificado)}
                style={[estilos.botaoIcone, !certificado.desbloqueado ? estilos.botaoIconeDesabilitado : null]}
              >
                <Ionicons color={certificado.desbloqueado ? cores.destaque : cores.bloqueado} name="eye-outline" size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={`Baixar certificado de ${certificado.cursoTitulo}`}
                accessibilityRole="button"
                disabled={!certificado.desbloqueado}
                onPress={() => verCertificado(certificado, { compartilharAoEmitir: true })}
                style={[estilos.botaoIcone, !certificado.desbloqueado ? estilos.botaoIconeDesabilitado : null]}
              >
                <Ionicons color={certificado.desbloqueado ? cores.destaque : cores.bloqueado} name="download-outline" size={22} />
              </TouchableOpacity>
            </View>
            {!certificado.desbloqueado ? <Text style={estilos.bloqueadoTexto}>Conclua o curso para desbloquear</Text> : null}
          </View>
        ))}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={fechar} transparent visible={Boolean(certificadoAberto)}>
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCaixa}>
            <View style={estilos.modalCabecalho}>
              <Text numberOfLines={1} style={estilos.modalTitulo}>{certificadoAberto?.cursoTitulo}</Text>
              <TouchableOpacity
                accessibilityLabel="Fechar certificado"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={fechar}
                style={estilos.modalBotaoFechar}
              >
                <Ionicons color={cores.erro} name="close" size={22} style={estilos.iconeFechar} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={estilos.modalConteudo} style={estilos.modalScroll}>
              {emitindo ? (
                <ActivityIndicator color={cores.destaque} style={{ marginTop: 40 }} />
              ) : erroEmissao ? (
                <Toast mensagem={erroEmissao} onFechar={() => setErroEmissao("")} tipo="erro" />
              ) : certificadoEmitido ? (
                <View style={estilos.certificado}>
                  <Text style={estilos.certificadoEyebrow}>CERTIFICADO DE CONCLUSAO</Text>
                  <Text style={estilos.certificadoIntro}>Outorgado a</Text>
                  <Text style={estilos.certificadoNome}>{certificadoEmitido.alunoNome}</Text>
                  <Text style={estilos.certificadoTexto}>
                    Por ter concluido com aproveitamento o curso de{" "}
                    <Text style={estilos.certificadoDestaque}>{certificadoEmitido.cursoTitulo}</Text>
                    {certificadoEmitido.turmaNome ? ` na turma ${certificadoEmitido.turmaNome}` : ""}, com nota final{" "}
                    {formatGrade(certificadoEmitido.notaFinal)} de 10,0.
                  </Text>
                  <Text style={estilos.certificadoData}>{formatDate(certificadoEmitido.emitidoEm)}</Text>
                  <Text style={estilos.certificadoEscola}>Oferecido pela escola: CodeRyse Academy</Text>
                  <Text style={estilos.certificadoVerificacao}>Codigo de verificacao: {certificadoEmitido.codigoVerificacao}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={estilos.modalAcoes}>
              <TouchableOpacity
                disabled={!certificadoEmitido}
                onPress={() => compartilhar()}
                style={estilos.botaoPrimario}
              >
                <Ionicons color={cores.texto} name="share-social-outline" size={18} />
                <Text style={estilos.botaoPrimarioTexto}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  resumoStats: { flexDirection: "row", alignItems: "center", gap: espacamentos.lg, flex: 1 },
  resumoStatItem: { alignItems: "center" },
  resumoSep: { width: 1, height: 28, backgroundColor: "rgba(255, 255, 255, 0.25)" },
  resumoValor: { color: cores.texto, fontSize: 20, fontWeight: "800" },
  resumoRotulo: { color: cores.textoRotulo, fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.xs, gap: espacamentos.md },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: raios.md, padding: espacamentos.lg },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15 },
  cartaoMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  notaTexto: { color: cores.sucesso, fontWeight: "700", marginTop: 8 },
  percentualTexto: { color: cores.textoSuave, fontSize: 12, marginTop: 8 },
  cartaoAcoes: { flexDirection: "row", gap: espacamentos.md, marginTop: espacamentos.md },
  botaoIcone: { minWidth: 44, minHeight: 44, borderRadius: raios.sm, backgroundColor: cores.fundoCartaoAtivo, alignItems: "center", justifyContent: "center" },
  botaoIconeDesabilitado: { opacity: 0.4 },
  bloqueadoTexto: { color: cores.textoSuave, fontSize: 12, marginTop: espacamentos.sm },
  botaoPrimario: { flex: 1, flexDirection: "row", backgroundColor: cores.destaque, borderRadius: raios.sm, paddingVertical: 10, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", gap: 8 },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 60, paddingHorizontal: 24 },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCaixa: { backgroundColor: cores.fundoCartao, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", padding: 20 },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: espacamentos.md,
    marginBottom: espacamentos.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  modalTitulo: { color: cores.texto, fontSize: 16, fontWeight: "700", flex: 1, marginRight: espacamentos.md },
  modalBotaoFechar: { padding: 4 },
  iconeFechar: { opacity: 0.75 },
  modalScroll: { flexShrink: 1 },
  modalConteudo: { paddingBottom: 12 },
  modalAcoes: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "center" },
  certificado: { borderWidth: 1, borderColor: cores.destaque, borderRadius: 14, padding: 20, alignItems: "center", gap: 10 },
  certificadoEyebrow: { color: cores.destaque, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  certificadoIntro: { color: cores.textoSuave, fontSize: 12, marginTop: 8 },
  certificadoNome: { color: cores.texto, fontWeight: "800", fontSize: 20, textAlign: "center" },
  certificadoTexto: { color: cores.textoRotulo, fontSize: 13, textAlign: "center", lineHeight: 19 },
  certificadoDestaque: { color: cores.texto, fontWeight: "700" },
  certificadoData: { color: cores.textoSuave, fontSize: 12, marginTop: 6 },
  certificadoEscola: { color: cores.textoSuave, fontSize: 12 },
  certificadoVerificacao: { color: cores.textoSuave, fontSize: 11, marginTop: 8, textAlign: "center" }
});
