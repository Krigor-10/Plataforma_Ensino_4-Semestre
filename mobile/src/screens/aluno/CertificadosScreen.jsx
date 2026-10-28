import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Botao from "../../components/Botao.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { construirMapaStatusCertificados, obterStatusCertificado } from "../../lib/certificados.js";
import { formatDate, formatGrade, normalizeStatus } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";

const NOTA_MINIMA_APROVACAO = 7;

export default function CertificadosScreen({ onSessionExpired, snapshot }) {
  // Mesmo padrao do Web (SecaoCertificados.jsx): o servidor e a unica fonte de
  // verdade pra "desbloqueado" - comeca vazio (= tudo bloqueado) de proposito,
  // nunca libera por padrao enquanto o status real nao chega. Recarrega
  // sempre que o snapshot do workspace for recarregado (onRecarregar em
  // AlunoWorkspace.jsx troca a referencia de `snapshot`).
  const [mapaStatusCertificados, setMapaStatusCertificados] = useState(() => construirMapaStatusCertificados([]));

  useEffect(() => {
    let ignorar = false;

    async function carregarStatus() {
      try {
        const resposta = await apiRequest("/Certificados/status");
        if (!ignorar) {
          setMapaStatusCertificados(construirMapaStatusCertificados(resposta));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }
        // Falha ao carregar o status nao deve quebrar a tela - certificados
        // so ficam indisponiveis (mais seguro que "liberados" por padrao).
      }
    }

    carregarStatus();

    return () => {
      ignorar = true;
    };
  }, [onSessionExpired, snapshot]);

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
          // Percentual e nota aqui sao so pra EXIBICAO (ex.: "73% concluido")
          // - nunca usados pra decidir se o certificado pode ser emitido,
          // isso vem exclusivamente do status do servidor abaixo.
          const percentual = Number(progresso?.percentualConclusao) || 0;
          const notas = notasPorCurso.get(matricula.cursoId) || [];
          const mediaAvaliacoes = notas.length ? notas.reduce((soma, nota) => soma + nota, 0) / notas.length : null;
          const nota = matricula.notaFinal > 0 ? matricula.notaFinal : mediaAvaliacoes;
          const status = obterStatusCertificado(mapaStatusCertificados, matricula.id);

          return {
            matriculaId: matricula.id,
            cursoTitulo: cursoPorId.get(matricula.cursoId)?.titulo || `Curso #${matricula.cursoId}`,
            turmaNome: matricula.turmaId ? turmaPorId.get(matricula.turmaId)?.nomeTurma : null,
            percentual,
            nota,
            desbloqueado: status.desbloqueado,
            pendencias: status.pendencias
          };
        }),
    [cursoPorId, mapaStatusCertificados, notasPorCurso, progressoCursoPorMatricula, snapshot.matriculas, turmaPorId]
  );

  const certificadosDesbloqueados = useMemo(() => certificados.filter((certificado) => certificado.desbloqueado), [certificados]);
  const certificadosBloqueados = useMemo(() => certificados.filter((certificado) => !certificado.desbloqueado), [certificados]);

  // O aluno nunca "pede" o certificado (regra do redesign) - assim que o
  // status do servidor confirma que esta desbloqueado, a tela ja emite
  // (POST e idempotente - Matricula.EmitirCertificado usa ??=, nunca troca
  // a data de quem ja tinha) e mostra o certificado inteiro na propria tela,
  // sem precisar de um toque extra nem de modal.
  const requisitadosRef = useRef(new Set());
  const [certificadosEmitidos, setCertificadosEmitidos] = useState(() => new Map());

  useEffect(() => {
    certificadosDesbloqueados.forEach((certificado) => {
      if (requisitadosRef.current.has(certificado.matriculaId)) {
        return;
      }
      requisitadosRef.current.add(certificado.matriculaId);

      apiRequest(`/Certificados/matricula/${certificado.matriculaId}/emitir`, { method: "POST" })
        .then((dados) => {
          setCertificadosEmitidos((atual) => new Map(atual).set(certificado.matriculaId, { dados, erro: "" }));
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            onSessionExpired?.();
            return;
          }
          setCertificadosEmitidos((atual) =>
            new Map(atual).set(certificado.matriculaId, { dados: null, erro: err.message || "Não foi possível carregar o certificado agora." })
          );
        });
    });
  }, [certificadosDesbloqueados, onSessionExpired]);

  function compartilhar(dados) {
    Share.share({
      message:
        `Certificado de conclusao — ${dados.cursoTitulo}\n` +
        `${dados.alunoNome} — nota final ${formatGrade(dados.notaFinal)} de 10,0\n` +
        `Codigo de verificacao: ${dados.codigoVerificacao}`
    }).catch(() => {});
  }

  if (certificados.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Assim que uma matrícula for aprovada e o curso concluído, o certificado aparece aqui.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <Text style={estilos.tituloTela}>Suas certificações acadêmicas e conquistas profissionais</Text>

      <View style={estilos.statsLinha}>
        <View style={estilos.statCartao}>
          <Text style={estilos.statRotulo}>Conquistados</Text>
          <View style={estilos.statLinha}>
            <Text style={estilos.statValor}>{certificadosDesbloqueados.length}</Text>
            <Ionicons color={cores.destaque} name="ribbon" size={20} />
          </View>
        </View>
        <View style={estilos.statCartao}>
          <Text style={estilos.statRotulo}>Cursos em trilha</Text>
          <View style={estilos.statLinha}>
            <Text style={estilos.statValor}>{certificados.length}</Text>
            <Ionicons color={cores.destaque} name="school" size={20} />
          </View>
        </View>
      </View>

      <View style={estilos.avisoCartao}>
        <Ionicons color={cores.destaque} name="shield-checkmark-outline" size={18} />
        <Text style={estilos.avisoTexto}>
          O certificado é liberado automaticamente quando você conclui 100% do curso com média final ≥ 7,00.
        </Text>
      </View>

      {certificadosDesbloqueados.map((certificado) => {
        const emitido = certificadosEmitidos.get(certificado.matriculaId);

        return (
          <View key={certificado.matriculaId}>
            <View style={estilos.secaoCabecalho}>
              <Text style={estilos.tituloSecao}>Certificado Conquistado</Text>
              <View style={estilos.pillAutentico}>
                <Text style={estilos.pillAutenticoTexto}>Autêntico</Text>
              </View>
            </View>

            {!emitido ? (
              <View style={estilos.cartaoCertificado}>
                <ActivityIndicator color={cores.destaque} />
              </View>
            ) : emitido.erro ? (
              <View style={estilos.cartaoCertificado}>
                <Toast mensagem={emitido.erro} tipo="erro" />
              </View>
            ) : (
              <View style={estilos.cartaoCertificado}>
                <Text style={estilos.certificadoMarca}>CODERYSE ACADEMY · OFICIAL</Text>
                <Text style={estilos.certificadoEyebrow}>CERTIFICADO DE CONCLUSÃO</Text>
                <Text style={estilos.certificadoIntro}>Outorgado a</Text>
                <Text style={estilos.certificadoNome}>{emitido.dados.alunoNome}</Text>
                <Text style={estilos.certificadoTexto}>
                  pela conclusão com êxito de{" "}
                  <Text style={estilos.certificadoDestaque}>{emitido.dados.cursoTitulo}</Text>
                  {emitido.dados.turmaNome ? ` na turma ${emitido.dados.turmaNome}` : ""}, com nota final{" "}
                  {formatGrade(emitido.dados.notaFinal)} de 10,0.
                </Text>

                <View style={estilos.certificadoDivisor} />

                <View style={estilos.certificadoInfoLinha}>
                  <View style={estilos.certificadoInfoItem}>
                    <Text style={estilos.certificadoInfoRotulo}>Emitido em</Text>
                    <Text style={estilos.certificadoInfoValor}>{formatDate(emitido.dados.emitidoEm)}</Text>
                  </View>
                  <View style={estilos.certificadoInfoItem}>
                    <Text style={estilos.certificadoInfoRotulo}>Instituição</Text>
                    <Text style={estilos.certificadoInfoValor}>CodeRyse</Text>
                  </View>
                </View>

                <Text style={estilos.certificadoVerificacaoRotulo}>Código de verificação</Text>
                <Text style={estilos.certificadoVerificacaoValor}>{emitido.dados.codigoVerificacao}</Text>

                <Botao
                  icone="share-social-outline"
                  onPress={() => compartilhar(emitido.dados)}
                  style={estilos.botaoCompartilhar}
                  variante="primario"
                >
                  Compartilhar
                </Botao>
              </View>
            )}
          </View>
        );
      })}

      {certificadosBloqueados.length > 0 ? (
        <>
          <View style={estilos.secaoCabecalho}>
            <Text style={estilos.tituloSecao}>Em andamento</Text>
            <Text style={estilos.contagemRestantes}>{certificadosBloqueados.length} restante{certificadosBloqueados.length === 1 ? "" : "s"}</Text>
          </View>

          {certificadosBloqueados.map((certificado) => (
            <View key={certificado.matriculaId} style={estilos.cartaoBloqueado}>
              <View style={estilos.bloqueadoTopo}>
                <Text numberOfLines={2} style={estilos.bloqueadoTitulo}>{certificado.cursoTitulo}</Text>
                <Ionicons color={cores.textoSuave} name="lock-closed-outline" size={18} />
              </View>
              <Text numberOfLines={2} style={estilos.bloqueadoPendencia}>
                {certificado.pendencias[0] || "Conclua o curso para desbloquear"}
              </Text>

              <View style={estilos.bloqueadoRodape}>
                <Text style={estilos.bloqueadoPercentual}>{Math.round(certificado.percentual)}% concluído</Text>
                <Text style={estilos.bloqueadoMeta}>Média ≥ {formatGrade(NOTA_MINIMA_APROVACAO)}</Text>
              </View>
              <View style={estilos.barraFundo}>
                <View style={[estilos.barraPreenchida, { width: `${Math.max(0, Math.min(certificado.percentual, 100))}%` }]} />
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: cores.fundo, padding: espacamentos.xl, gap: espacamentos.md },
  tituloTela: { color: cores.textoRotulo, fontSize: tipografia.rotulo },
  statsLinha: { flexDirection: "row", gap: espacamentos.sm },
  statCartao: {
    flex: 1,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md
  },
  statRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  statLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: espacamentos.xs },
  statValor: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  avisoCartao: {
    flexDirection: "row",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md,
    alignItems: "center"
  },
  avisoTexto: { color: cores.textoRotulo, fontSize: tipografia.rotulo, flex: 1, lineHeight: 18 },
  secaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: espacamentos.sm },
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  pillAutentico: { backgroundColor: cores.bordaCartao, borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3 },
  pillAutenticoTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.legenda },
  contagemRestantes: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  cartaoCertificado: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.destaque,
    padding: espacamentos.xl,
    alignItems: "center",
    gap: 6,
    minHeight: 80,
    justifyContent: "center"
  },
  certificadoMarca: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5, alignSelf: "flex-start" },
  certificadoEyebrow: { color: cores.destaque, fontWeight: "800", fontSize: tipografia.rotulo, letterSpacing: 1, marginTop: espacamentos.sm },
  certificadoIntro: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: espacamentos.sm },
  certificadoNome: { color: cores.texto, fontWeight: "800", fontSize: tipografia.destaque, textAlign: "center" },
  certificadoTexto: { color: cores.textoRotulo, fontSize: tipografia.corpo, textAlign: "center", lineHeight: 19, marginTop: 4 },
  certificadoDestaque: { color: cores.texto, fontWeight: "700" },
  certificadoDivisor: { height: 1, backgroundColor: cores.divisoria, alignSelf: "stretch", marginVertical: espacamentos.md },
  certificadoInfoLinha: { flexDirection: "row", gap: espacamentos.xl, alignSelf: "stretch", justifyContent: "center" },
  certificadoInfoItem: { alignItems: "center" },
  certificadoInfoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  certificadoInfoValor: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, marginTop: 2 },
  certificadoVerificacaoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: espacamentos.md },
  certificadoVerificacaoValor: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, letterSpacing: 1 },
  botaoCompartilhar: { marginTop: espacamentos.lg, alignSelf: "stretch" },
  cartaoBloqueado: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, borderWidth: 1, borderColor: cores.bordaCartao, padding: espacamentos.lg },
  bloqueadoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: espacamentos.sm },
  bloqueadoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, flex: 1 },
  bloqueadoPendencia: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  bloqueadoRodape: { flexDirection: "row", justifyContent: "space-between", marginTop: espacamentos.md },
  bloqueadoPercentual: { color: cores.textoSuave, fontSize: tipografia.legenda },
  bloqueadoMeta: { color: cores.textoSuave, fontSize: tipografia.legenda },
  barraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: 4 },
  barraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 60, paddingHorizontal: 24 }
});
