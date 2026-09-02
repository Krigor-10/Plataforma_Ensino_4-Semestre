import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate, formatGrade, normalizeStatus } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";

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

  async function verCertificado(certificado) {
    setCertificadoAberto(certificado);
    setCertificadoEmitido(null);
    setErroEmissao("");
    setEmitindo(true);

    try {
      const resposta = await apiRequest(`/Certificados/matricula/${certificado.matriculaId}/emitir`, { method: "POST" });
      setCertificadoEmitido(resposta);
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

  async function compartilhar() {
    if (!certificadoEmitido) {
      return;
    }

    await Share.share({
      message:
        `Certificado de conclusao — ${certificadoEmitido.cursoTitulo}\n` +
        `${certificadoEmitido.alunoNome} — nota final ${formatGrade(certificadoEmitido.notaFinal)} de 10,0\n` +
        `Codigo de verificacao: ${certificadoEmitido.codigoVerificacao}`
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
      <View style={estilos.resumo}>
        <Text style={estilos.resumoValor}>{desbloqueados}</Text>
        <Text style={estilos.resumoRotulo}>de {certificados.length} certificado{certificados.length === 1 ? "" : "s"} conquistado{certificados.length === 1 ? "" : "s"}</Text>
      </View>

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

            <TouchableOpacity
              disabled={!certificado.desbloqueado}
              onPress={() => verCertificado(certificado)}
              style={[estilos.botaoPrimario, !certificado.desbloqueado ? estilos.botaoDesabilitado : null]}
            >
              <Text style={estilos.botaoPrimarioTexto}>{certificado.desbloqueado ? "Ver certificado" : "Conclua o curso para desbloquear"}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={fechar} transparent visible={Boolean(certificadoAberto)}>
        <View style={estilos.modalFundo}>
          <View style={estilos.modalCaixa}>
            <ScrollView contentContainerStyle={estilos.modalConteudo}>
              {emitindo ? (
                <ActivityIndicator color={cores.destaque} style={{ marginTop: 40 }} />
              ) : erroEmissao ? (
                <Text style={estilos.erro}>{erroEmissao}</Text>
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
                  <Text style={estilos.certificadoEscola}>Oferecido pela escola: EdTech Academy</Text>
                  <Text style={estilos.certificadoVerificacao}>Codigo de verificacao: {certificadoEmitido.codigoVerificacao}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={estilos.modalAcoes}>
              <TouchableOpacity onPress={fechar} style={estilos.botaoSecundario}>
                <Text style={estilos.botaoSecundarioTexto}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!certificadoEmitido} onPress={compartilhar} style={estilos.botaoPrimario}>
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
  resumo: { alignItems: "center", paddingTop: 24, paddingBottom: 12 },
  resumoValor: { color: cores.destaque, fontSize: 32, fontWeight: "800" },
  resumoRotulo: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  corpo: { padding: 20, paddingTop: 4, gap: 12 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16 },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15 },
  cartaoMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  notaTexto: { color: cores.sucesso, fontWeight: "700", marginTop: 8 },
  percentualTexto: { color: cores.textoSuave, fontSize: 12, marginTop: 8 },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  botaoDesabilitado: { backgroundColor: cores.bloqueado },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  botaoSecundario: { flex: 1, borderWidth: 1, borderColor: cores.bordaCartao, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  botaoSecundarioTexto: { color: cores.textoSuave, fontWeight: "700" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 60, paddingHorizontal: 24 },
  erro: { color: cores.erro, textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCaixa: { backgroundColor: cores.fundoCartao, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", padding: 20 },
  modalConteudo: { paddingBottom: 12 },
  modalAcoes: { flexDirection: "row", gap: 10, marginTop: 8 },
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
