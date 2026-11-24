import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import { SkeletonCertificados } from "../../components/Skeleton.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import {
  agruparAguardandoPagamento,
  agruparMatriculasPorSituacao,
  construirMapaStatusCertificados,
  deveMostrarNotaCertificado,
  formatarSeloSituacao
} from "../../lib/certificados.js";
import { WEB_BASE_URL } from "../../lib/config.js";
import { formatDate, formatDayMonth, formatGrade, normalizeStatus } from "../../lib/format.js";
import { hapticSucesso } from "../../lib/haptics.js";
import { ROUTES } from "../../lib/routes.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";

const SELO_COR_POR_SITUACAO = {
  AguardandoCorrecao: { cor: cores.aviso, fundo: cores.avisoFundo },
  AguardandoEncerramento: { cor: cores.informativo, fundo: cores.informativoFundo },
  NotaAbaixoDoMinimo: { cor: cores.erro, fundo: cores.erroFundo },
  EmAndamento: { cor: cores.textoSuave, fundo: cores.bordaCartao }
};

/* Reescrita (docs/certificados-mobile/PROMPT-agente-certificados-mobile.md):
   "Conquistados" vem de GET /Certificados/meus (certificado ja emitido
   sempre aparece, sem depender do POST). "Em andamento"/"Aguardando
   pagamento" vem de GET /Certificados/status, agrupado por `situacao`
   (lib/certificados.js) - nunca mais localmente. O POST .../emitir virou
   so reserva: dispara uma unica vez por matricula com situacao Disponivel
   (caso das antigas, de antes da emissao automatica existir no servidor),
   e recarrega /meus pra ela aparecer em Conquistados. */
export default function CertificadosScreen({ onSessionExpired, snapshot }) {
  const navigation = useNavigation();
  const [carregando, setCarregando] = useState(true);
  const [certificadosConquistados, setCertificadosConquistados] = useState([]);
  const [mapaStatusCertificados, setMapaStatusCertificados] = useState(() => construirMapaStatusCertificados([]));
  const [aguardandoPagamentoAberto, setAguardandoPagamentoAberto] = useState(false);
  const [chaveLinkCopiado, setChaveLinkCopiado] = useState(null);
  const requisitadosRef = useRef(new Set());

  const carregarConquistados = useCallback(async () => {
    try {
      const resposta = await apiRequest("/Certificados/meus");
      setCertificadosConquistados(resposta);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
      }
    }
  }, [onSessionExpired]);

  useEffect(() => {
    let ignorar = false;

    async function carregarTudo() {
      setCarregando(true);
      try {
        const [meus, status] = await Promise.all([apiRequest("/Certificados/meus"), apiRequest("/Certificados/status")]);
        if (ignorar) {
          return;
        }
        setCertificadosConquistados(meus);
        setMapaStatusCertificados(construirMapaStatusCertificados(status));
      } catch (err) {
        if (!ignorar && err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
        // Falha ao carregar nao deve quebrar a tela - certificados ficam
        // so indisponiveis (mais seguro que "liberados" por padrao).
      } finally {
        if (!ignorar) {
          setCarregando(false);
        }
      }
    }

    carregarTudo();
    return () => {
      ignorar = true;
    };
  }, [onSessionExpired, snapshot]);

  const matriculasAprovadas = useMemo(
    () => snapshot.matriculas.filter((matricula) => normalizeStatus(matricula.status) === "Aprovada"),
    [snapshot.matriculas]
  );

  const { emAndamento, disponiveisParaReserva } = useMemo(
    () => agruparMatriculasPorSituacao(matriculasAprovadas, mapaStatusCertificados),
    [matriculasAprovadas, mapaStatusCertificados]
  );

  const aguardandoPagamento = useMemo(
    () => agruparAguardandoPagamento(matriculasAprovadas, mapaStatusCertificados, snapshot.pagamentos),
    [matriculasAprovadas, mapaStatusCertificados, snapshot.pagamentos]
  );

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);
  const progressoCursoPorMatricula = useMemo(
    () => new Map((snapshot.progressos.cursos || []).map((progresso) => [progresso.matriculaId, progresso])),
    [snapshot.progressos.cursos]
  );

  // So reserva: dispara o POST uma vez por matricula "Disponivel" (sem
  // retroativo no servidor) e recarrega /meus pra ela aparecer em
  // Conquistados - nos casos novos o servidor ja emitiu antes.
  useEffect(() => {
    disponiveisParaReserva.forEach(({ matricula }) => {
      if (requisitadosRef.current.has(matricula.id)) {
        return;
      }
      requisitadosRef.current.add(matricula.id);

      apiRequest(`/Certificados/matricula/${matricula.id}/emitir`, { method: "POST" })
        .then(() => carregarConquistados())
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            onSessionExpired?.();
          }
        });
    });
  }, [carregarConquistados, disponiveisParaReserva, onSessionExpired]);

  function abrirCurso(cursoId) {
    navigation.navigate(ROUTES.ALUNO_TABS, { screen: ROUTES.CONTEUDOS, params: { cursoId } });
  }

  function verCertificado(certificado) {
    navigation.navigate(ROUTES.CERTIFICADO_DETALHE, { certificado });
  }

  async function copiarLink(codigoVerificacao, chave) {
    await Clipboard.setStringAsync(`${WEB_BASE_URL}/verificar/${codigoVerificacao}`);
    hapticSucesso();
    setChaveLinkCopiado(chave);
    setTimeout(() => setChaveLinkCopiado((atual) => (atual === chave ? null : atual)), 2000);
  }

  function compartilhar(certificado) {
    Share.share({
      message:
        `Certificado de conclusao — ${certificado.cursoTitulo}\n` +
        `${certificado.alunoNome} — nota final ${formatGrade(certificado.notaFinal)} de 10,0\n` +
        `Codigo de verificacao: ${certificado.codigoVerificacao}\n` +
        `${WEB_BASE_URL}/verificar/${certificado.codigoVerificacao}`
    }).catch(() => {});
  }

  if (carregando) {
    return <SkeletonCertificados />;
  }

  if (certificadosConquistados.length === 0 && emAndamento.length === 0 && aguardandoPagamento.length === 0) {
    return (
      <View style={estilos.container}>
        <EstadoVazio icone="ribbon-outline" mensagem="Assim que uma matrícula for aprovada e o curso concluído, o certificado aparece aqui." />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <View style={estilos.statsLinha}>
        <View style={estilos.statCartao}>
          <Text style={estilos.statRotulo}>Conquistados</Text>
          <View style={estilos.statLinha}>
            <Text style={estilos.statValor}>{certificadosConquistados.length}</Text>
            <Ionicons color={cores.destaque} name="ribbon" size={20} />
          </View>
        </View>
        <View style={estilos.statCartao}>
          <Text style={estilos.statRotulo}>Em andamento</Text>
          <View style={estilos.statLinha}>
            <Text style={estilos.statValor}>{emAndamento.length}</Text>
            <Ionicons color={cores.destaque} name="school" size={20} />
          </View>
        </View>
      </View>

      {certificadosConquistados.length > 0 ? (
        <>
          <Text style={estilos.tituloSecao}>Conquistados</Text>
          {certificadosConquistados.map((certificado, indice) => {
            const chave = `${certificado.codigoVerificacao}-${indice}`;
            return (
              <View key={chave} style={estilos.cartaoConquistado}>
                <View style={estilos.conquistadoIcone}>
                  <Ionicons color={cores.sucesso} name="medal" size={22} />
                </View>
                <View style={estilos.conquistadoCorpo}>
                  <Text numberOfLines={2} style={estilos.conquistadoTitulo}>
                    {certificado.cursoTitulo}
                  </Text>
                  <Text style={estilos.conquistadoSubtitulo}>
                    Emitido em {formatDate(certificado.emitidoEm)}
                    {deveMostrarNotaCertificado(certificado.notaFinal) ? ` · Nota ${formatGrade(certificado.notaFinal)}` : ""}
                  </Text>
                  <Text style={estilos.conquistadoCodigo}>{certificado.codigoVerificacao}</Text>

                  <View style={estilos.conquistadoAcoes}>
                    <Botao onPress={() => verCertificado(certificado)} style={estilos.botaoVerCertificado} variante="primario">
                      Ver certificado
                    </Botao>
                    <TouchableOpacity
                      accessibilityHint="Abre as opções de compartilhamento do aparelho"
                      accessibilityLabel="Compartilhar certificado"
                      accessibilityRole="button"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => compartilhar(certificado)}
                      style={estilos.botaoIcone}
                    >
                      <Ionicons color={cores.destaque} name="share-social-outline" size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityHint="Copia o link de verificação do certificado para a área de transferência"
                      accessibilityLabel="Copiar link de verificação"
                      accessibilityRole="button"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => copiarLink(certificado.codigoVerificacao, chave)}
                      style={estilos.botaoIcone}
                    >
                      <Ionicons color={cores.destaque} name="link-outline" size={18} />
                    </TouchableOpacity>
                  </View>
                  {chaveLinkCopiado === chave ? <Toast mensagem="Link copiado" tipo="sucesso" /> : null}
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {emAndamento.length > 0 ? (
        <>
          <Text style={estilos.tituloSecao}>Em andamento</Text>
          {emAndamento.map(({ matricula, status }) => {
            const curso = cursoPorId.get(matricula.cursoId);
            const progresso = progressoCursoPorMatricula.get(matricula.id);
            const percentual = Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100));
            const corSelo = SELO_COR_POR_SITUACAO[status.situacao] || SELO_COR_POR_SITUACAO.EmAndamento;

            return (
              <TouchableOpacity
                accessibilityHint="Abre a tela do curso na aba Cursos"
                accessibilityLabel={`Abrir ${curso?.titulo || "curso"}`}
                accessibilityRole="button"
                key={matricula.id}
                onPress={() => abrirCurso(matricula.cursoId)}
                style={estilos.cartaoEmAndamento}
              >
                <View style={estilos.emAndamentoTopo}>
                  <Text numberOfLines={2} style={estilos.emAndamentoTitulo}>
                    {curso?.titulo || `Curso #${matricula.cursoId}`}
                  </Text>
                  <View style={[estilos.selo, { backgroundColor: corSelo.fundo }]}>
                    <Text style={[estilos.seloTexto, { color: corSelo.cor }]}>{formatarSeloSituacao(status.situacao)}</Text>
                  </View>
                </View>

                <View style={estilos.emAndamentoRodape}>
                  <Text style={estilos.emAndamentoPercentual}>{Math.round(percentual)}% concluído</Text>
                  <Text style={estilos.emAndamentoLink}>{percentual >= 100 ? "Abrir curso ›" : "Continuar ›"}</Text>
                </View>
                <View style={estilos.barraFundo}>
                  <View style={[estilos.barraPreenchida, { width: `${percentual}%` }]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {aguardandoPagamento.length > 0 ? (
        <>
          <TouchableOpacity
            accessibilityHint="Mostra ou esconde a lista de cursos com pagamento pendente"
            accessibilityLabel={`Aguardando pagamento, ${aguardandoPagamento.length}`}
            accessibilityRole="button"
            onPress={() => setAguardandoPagamentoAberto((atual) => !atual)}
            style={estilos.aguardandoPagamentoCabecalho}
          >
            <Text style={estilos.tituloSecao}>Aguardando pagamento · {aguardandoPagamento.length}</Text>
            <Ionicons color={cores.textoSuave} name={aguardandoPagamentoAberto ? "chevron-up" : "chevron-down"} size={18} />
          </TouchableOpacity>

          {!aguardandoPagamentoAberto ? (
            <Text style={estilos.aguardandoPagamentoDica}>
              Cursos que você começou a comprar e ainda não pagou. Toque para ver e concluir a compra.
            </Text>
          ) : (
            aguardandoPagamento.map((item) => {
              const curso = cursoPorId.get(item.cursoId);
              return (
                <View key={item.cursoId} style={estilos.cartaoAguardandoPagamento}>
                  <Text numberOfLines={2} style={estilos.aguardandoPagamentoTitulo}>
                    {curso?.titulo || `Curso #${item.cursoId}`}
                  </Text>
                  {item.venceEm ? <Text style={estilos.aguardandoPagamentoPrazo}>Pague até {formatDayMonth(item.venceEm)}</Text> : null}
                  <Botao onPress={() => abrirCurso(item.cursoId)} style={estilos.botaoConcluirCompra} variante="primario">
                    Concluir compra
                  </Botao>
                </View>
              );
            })
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: cores.fundo, padding: espacamentos.xl, gap: espacamentos.md },
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
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, marginTop: espacamentos.sm },

  cartaoConquistado: {
    flexDirection: "row",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg
  },
  conquistadoIcone: {
    width: 40,
    height: 40,
    borderRadius: raios.md,
    backgroundColor: cores.sucessoFundo,
    alignItems: "center",
    justifyContent: "center"
  },
  conquistadoCorpo: { flex: 1, gap: 2 },
  conquistadoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  conquistadoSubtitulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  conquistadoCodigo: { color: cores.textoRotulo, fontSize: tipografia.legenda, letterSpacing: 0.5 },
  conquistadoAcoes: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, marginTop: espacamentos.sm },
  botaoVerCertificado: { flex: 1, paddingHorizontal: espacamentos.md },
  botaoIcone: {
    width: 44,
    height: 44,
    borderRadius: raios.sm,
    borderWidth: 1,
    borderColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center"
  },

  cartaoEmAndamento: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg
  },
  emAndamentoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: espacamentos.sm },
  emAndamentoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, flex: 1 },
  selo: { borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3 },
  seloTexto: { fontWeight: "700", fontSize: tipografia.legenda },
  emAndamentoRodape: { flexDirection: "row", justifyContent: "space-between", marginTop: espacamentos.md },
  emAndamentoPercentual: { color: cores.textoSuave, fontSize: tipografia.legenda },
  emAndamentoLink: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.legenda },
  barraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: 4 },
  barraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },

  aguardandoPagamentoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aguardandoPagamentoDica: { color: cores.textoSuave, fontSize: tipografia.rotulo, lineHeight: 18 },
  cartaoAguardandoPagamento: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.sm
  },
  aguardandoPagamentoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  aguardandoPagamentoPrazo: { color: cores.aviso, fontSize: tipografia.rotulo },
  botaoConcluirCompra: { alignSelf: "stretch" }
});
