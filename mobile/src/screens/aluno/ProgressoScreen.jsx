import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import Botao from "../../components/Botao.jsx";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import ProgressoCircular from "../../components/ProgressoCircular.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { construirMapaStatusCertificados, obterStatusCertificado } from "../../lib/certificados.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { formatDate, formatGrade } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { useAlturaBarraAbas } from "../../lib/useAlturaBarraAbas.js";
import { ROUTES } from "../../lib/routes.js";

const CORES_GRADIENTE = ["rgba(123, 47, 247, 0.28)", "rgba(157, 103, 255, 0.06)"];
// Mesma chave usada por CertificadosScreen.jsx (ABA_CONQUISTADOS, so string
// local la - nao exportada) pra abrir a aba Certificados ja em "Conquistados"
// quando o certificado deste curso ja foi emitido.
const ABA_CERTIFICADOS_CONQUISTADOS = "conquistados";

// Selo de situacao do curso (item 1/2 do prompt) - mesma regra e cores da
// aba Certificados (lib/certificados.js), so que aqui tambem cobre "🏆
// Certificado" (Emitido, que formatarSeloSituacao() nao tem - aquela e so
// pros 4 estados "em andamento" bloqueados) e "Nao iniciado" (0% de
// progresso, que nem e um campo do servidor, e so uma leitura do
// percentual). "Disponivel" (reserva antiga, ver docs/certificados-mobile)
// cai no fallback "Em andamento": tecnicamente ja cumpriu tudo, mas sem
// CertificadoEmitidoEm preenchido ainda, mostrar "🏆 Certificado" aqui
// seria antecipar um dado que o servidor ainda nao gravou.
function obterSeloCurso(situacao, percentual) {
  if (situacao === "Emitido") {
    return { cor: cores.sucesso, fundo: cores.sucessoFundo, rotulo: "🏆 Certificado" };
  }
  if (situacao === "AguardandoCorrecao") {
    return { cor: cores.aviso, fundo: cores.avisoFundo, rotulo: "Aguardando correção" };
  }
  if (situacao === "NotaAbaixoDoMinimo") {
    return { cor: cores.erro, fundo: cores.erroFundo, rotulo: "Nota abaixo de 7,0" };
  }
  if (situacao === "AguardandoEncerramento") {
    return { cor: cores.informativo, fundo: cores.informativoFundo, rotulo: "Aguardando encerramento" };
  }
  if (percentual <= 0) {
    return { cor: cores.textoRotulo, fundo: cores.fundoCartaoAtivo, rotulo: "Não iniciado" };
  }
  return { cor: cores.textoSuave, fundo: cores.bordaCartao, rotulo: "Em andamento" };
}

/* Visao geral direta (docs/redesign-mobile/PROMPT-agente-progresso-visao-
   geral.md): mesma ideia de Avaliacoes/Conteudos (resumo + cartao por
   curso + detalhe), so que agora a lista de cursos e a tela inicial - sem
   passo de SeletorCurso. cursoDetalheId controla so se o detalhe de um
   curso esta aberto (estado local, nao rota, pelo mesmo motivo de sempre:
   o voltar fisico do Android precisa fechar o detalhe antes de sair da
   aba). A tela passa a ler GET /Certificados/status (como Certificados/
   SecaoCertificados na web) so pra saber a `situacao` real de cada
   matricula - nunca recalcula a regra do certificado aqui, so le. */
export default function ProgressoScreen({ onSessionExpired, snapshot }) {
  const alturaBarraAbas = useAlturaBarraAbas();
  const [cursoDetalheId, setCursoDetalheId] = useState(null);
  const [mapaStatusCertificados, setMapaStatusCertificados] = useState(() => construirMapaStatusCertificados([]));
  const navigation = useNavigation();

  useEffect(() => {
    let ignorar = false;

    apiRequest("/Certificados/status")
      .then((status) => {
        if (!ignorar) {
          setMapaStatusCertificados(construirMapaStatusCertificados(status));
        }
      })
      .catch((err) => {
        if (!ignorar && err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
        // Falha ao carregar nao quebra a tela - os cursos ficam com o selo
        // padrao "Em andamento" (fallback de obterStatusCertificado).
      });

    return () => {
      ignorar = true;
    };
  }, [onSessionExpired, snapshot]);

  // Mesmo ajuste de ConteudosScreen.jsx/AvaliacoesScreen.jsx: o detalhe
  // aberto e estado local, nao rota - sem isso o voltar fisico do Android
  // pulava direto pra fora da aba em vez de voltar pra visao geral.
  useEffect(() => {
    if (!cursoDetalheId) {
      return undefined;
    }

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      setCursoDetalheId(null);
      return true;
    });

    return () => assinatura.remove();
  }, [cursoDetalheId]);

  // Mesmo ajuste de ConteudosScreen.jsx/AvaliacoesScreen.jsx: reseta o
  // detalhe aberto toda vez que a aba PROGRESSO e tocada na barra inferior,
  // mesmo se ja estiver nela - `tabPress`, nao useFocusEffect.
  useEffect(() => {
    return navigation.addListener("tabPress", () => setCursoDetalheId(null));
  }, [navigation]);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const progressosPorCurso = useMemo(
    () =>
      [...(snapshot.progressos.cursos || [])].sort((a, b) => {
        const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
        const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
        return tituloA.localeCompare(tituloB);
      }),
    [cursoPorId, snapshot.progressos.cursos]
  );

  const gruposPorCursoId = useMemo(() => {
    const grupos = agruparConteudosPorCurso({
      avaliacoes: snapshot.avaliacoes,
      conteudos: snapshot.conteudos,
      cursos: snapshot.cursos,
      matriculas: snapshot.matriculas,
      modulos: snapshot.modulos,
      progressos: snapshot.progressos
    });
    return new Map(grupos.map((grupo) => [grupo.id, grupo]));
  }, [snapshot]);

  // "Seus cursos" (item 1): fora os que so tem pagamento pendente/cancelado
  // (situacao AguardandoPagamento) - os demais, qualquer que seja a
  // situacao, ja tem acesso liberado ao curso.
  const progressosComAcesso = useMemo(
    () =>
      progressosPorCurso.filter(
        (progresso) => obterStatusCertificado(mapaStatusCertificados, progresso.matriculaId).situacao !== "AguardandoPagamento"
      ),
    [progressosPorCurso, mapaStatusCertificados]
  );

  // Em andamento (do maior pro menor progresso) -> nao iniciados -> depois
  // concluidos (100%, com ou sem certificado) - item "Ordem" do prompt.
  // Nao-iniciados/concluidos mantem a ordem alfabetica ja vinda de
  // progressosPorCurso (sort estavel).
  const progressosOrdenados = useMemo(() => {
    const comPercentual = progressosComAcesso.map((progresso) => ({
      percentual: Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100)),
      progresso
    }));
    const emAndamento = comPercentual.filter((item) => item.percentual > 0 && item.percentual < 100).sort((a, b) => b.percentual - a.percentual);
    const naoIniciados = comPercentual.filter((item) => item.percentual === 0);
    const concluidos = comPercentual.filter((item) => item.percentual >= 100);
    return [...emAndamento, ...naoIniciados, ...concluidos].map((item) => item.progresso);
  }, [progressosComAcesso]);

  if (progressosPorCurso.length === 0) {
    return (
      <View style={estilos.container}>
        <EstadoVazio icone="trending-up-outline" mensagem="Você ainda não começou nenhum curso." />
        <Botao
          icone="compass-outline"
          onPress={() => navigation.navigate(ROUTES.CATALOGO)}
          style={estilos.botaoVazioCatalogo}
          variante="primario"
        >
          Ver catálogo
        </Botao>
      </View>
    );
  }

  if (cursoDetalheId) {
    return (
      <DetalheCurso
        cursoPorId={cursoPorId}
        cursoId={cursoDetalheId}
        grupo={gruposPorCursoId.get(cursoDetalheId)}
        mapaStatusCertificados={mapaStatusCertificados}
        navigation={navigation}
        onVoltar={() => setCursoDetalheId(null)}
        paddingBottom={alturaBarraAbas}
        progresso={progressosPorCurso.find((item) => item.cursoId === cursoDetalheId)}
      />
    );
  }

  const emAndamentoCount = progressosComAcesso.filter((p) => Number(p.percentualConclusao || 0) < 100).length;
  const concluidosCount = progressosComAcesso.filter((p) => Number(p.percentualConclusao || 0) >= 100).length;
  const certificadosCount = progressosComAcesso.filter(
    (p) => obterStatusCertificado(mapaStatusCertificados, p.matriculaId).situacao === "Emitido"
  ).length;
  const mediasValidas = progressosComAcesso.map((p) => Number(p.mediaCurso) || 0).filter((media) => media > 0);
  const mediaGeral = mediasValidas.length > 0 ? mediasValidas.reduce((soma, media) => soma + media, 0) / mediasValidas.length : null;

  return (
    <View style={estilos.container}>
      <Text style={estilos.tituloTela}>Progresso</Text>
      <Text style={estilos.subtituloTela}>Acompanhamento da sua evolução acadêmica</Text>

      <ScrollView contentContainerStyle={[estilos.corpo, { paddingBottom: alturaBarraAbas }]}>
        <LinearGradient colors={CORES_GRADIENTE} style={estilos.cartaoResumo}>
          <ResumoNumero rotulo="Em andamento" valor={String(emAndamentoCount)} />
          <View style={estilos.resumoDivisoria} />
          <ResumoNumero rotulo="Concluídos" valor={String(concluidosCount)} />
          <View style={estilos.resumoDivisoria} />
          <ResumoNumero rotulo="Certificados" valor={String(certificadosCount)} />
          <View style={estilos.resumoDivisoria} />
          <ResumoNumero rotulo="Média geral" valor={mediaGeral !== null ? formatGrade(mediaGeral) : "—"} />
        </LinearGradient>

        <Text style={estilos.tituloSecao}>Seus cursos</Text>

        {progressosOrdenados.map((progresso) => {
          const curso = cursoPorId.get(progresso.cursoId);
          const percentual = Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100));
          const situacao = obterStatusCertificado(mapaStatusCertificados, progresso.matriculaId).situacao;
          const selo = obterSeloCurso(situacao, percentual);
          const mediaCurso = Number(progresso.mediaCurso) || 0;
          const titulo = curso?.titulo || `Curso #${progresso.cursoId}`;

          return (
            <TouchableOpacity
              accessibilityHint="Abre o detalhe deste curso"
              accessibilityLabel={`${titulo}. ${selo.rotulo}.`}
              accessibilityRole="button"
              key={progresso.cursoId}
              onPress={() => setCursoDetalheId(progresso.cursoId)}
              style={estilos.cartaoCurso}
            >
              <ProgressoCircular cor={percentual >= 100 ? cores.sucesso : cores.destaque} espessura={5} percentual={percentual} size={52} />
              <View style={estilos.cartaoCursoTextos}>
                <Text numberOfLines={2} style={estilos.cartaoCursoTitulo}>{titulo}</Text>
                <Text numberOfLines={1} style={estilos.cartaoCursoSubtitulo}>
                  {progresso.modulosConcluidos || 0} de {progresso.totalModulos || 0} módulos
                  {mediaCurso > 0 ? ` · nota ${formatGrade(mediaCurso)}` : ""}
                </Text>
              </View>
              <View style={[estilos.selo, { backgroundColor: selo.fundo }]}>
                <Text numberOfLines={1} style={[estilos.seloTexto, { color: selo.cor }]}>{selo.rotulo}</Text>
              </View>
              <Ionicons color={cores.textoRotulo} name="chevron-forward" size={18} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ResumoNumero({ rotulo, valor }) {
  return (
    <View style={estilos.resumoItem}>
      <Text numberOfLines={1} style={estilos.resumoValor}>{valor}</Text>
      <Text numberOfLines={1} style={estilos.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

function DetalheCurso({ cursoPorId, cursoId, grupo, mapaStatusCertificados, navigation, onVoltar, paddingBottom, progresso }) {
  const curso = cursoPorId.get(cursoId);
  const titulo = curso?.titulo || `Curso #${cursoId}`;
  const percentual = Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100));
  const mediaCurso = Number(progresso?.mediaCurso) || 0;
  const status = obterStatusCertificado(mapaStatusCertificados, progresso?.matriculaId);
  const selo = obterSeloCurso(status.situacao, percentual);

  const totalConteudos = (grupo?.modulos || []).reduce((soma, modulo) => soma + modulo.conteudos.length, 0);
  const conteudosConcluidos = (grupo?.modulos || []).reduce((soma, modulo) => soma + modulo.concluidos, 0);

  function abrirCertificados() {
    navigation.navigate(ROUTES.ALUNO_TABS, { screen: ROUTES.CERTIFICADOS, params: { aba: ABA_CERTIFICADOS_CONQUISTADOS } });
  }

  return (
    <View style={estilos.container}>
      <BotaoVoltar onPress={onVoltar} style={estilos.botaoVoltar} />

      <ScrollView contentContainerStyle={[estilos.corpo, { paddingBottom }]}>
        <LinearGradient colors={CORES_GRADIENTE} style={estilos.cabecalhoCurso}>
          <View style={estilos.cabecalhoCursoTopo}>
            <ProgressoCircular cor={percentual >= 100 ? cores.sucesso : cores.destaque} espessura={6} percentual={percentual} size={70} />
            <View style={estilos.cabecalhoCursoTextos}>
              <Text style={estilos.cabecalhoEyebrow}>CURSO</Text>
              <Text numberOfLines={2} style={estilos.cabecalhoTitulo}>{titulo}</Text>
              <View style={[estilos.selo, estilos.seloInline, { backgroundColor: selo.fundo }]}>
                <Text numberOfLines={1} style={[estilos.seloTexto, { color: selo.cor }]}>{selo.rotulo}</Text>
              </View>
            </View>
          </View>

          <View style={estilos.cabecalhoMetricas}>
            <Metrica rotulo="módulos" valor={`${progresso?.modulosConcluidos || 0}/${progresso?.totalModulos || 0}`} />
            <View style={estilos.resumoDivisoria} />
            <Metrica rotulo="conteúdos" valor={`${conteudosConcluidos}/${totalConteudos}`} />
            <View style={estilos.resumoDivisoria} />
            <Metrica rotulo="nota final" valor={mediaCurso > 0 ? formatGrade(mediaCurso) : "—"} />
          </View>
        </LinearGradient>

        <View style={estilos.cartaoCertificado}>
          <View style={estilos.certificadoCabecalho}>
            <View style={estilos.certificadoIcone}>
              <Ionicons color={cores.destaque} name="ribbon-outline" size={18} />
            </View>
            <Text style={estilos.certificadoTitulo}>Certificado</Text>
          </View>

          {status.situacao === "Emitido" ? (
            <>
              <Text style={estilos.certificadoDescricao}>
                🏆 Certificado emitido em {formatDate(status.certificadoEmitidoEm)}
              </Text>
              <Botao onPress={abrirCertificados} style={estilos.botaoVerCertificado} variante="secundario">
                Ver certificado
              </Botao>
            </>
          ) : (
            <Text style={estilos.certificadoDescricao}>
              Falta: {status.pendencias[0] || "Verifique os requisitos do certificado."}
            </Text>
          )}
        </View>

        <View style={estilos.modulosCabecalho}>
          <Text style={estilos.tituloSecao}>Módulos</Text>
          {grupo ? <Text style={estilos.modulosContagem}>{grupo.modulos.length} módulo(s)</Text> : null}
        </View>

        <View style={estilos.modulosLista}>
          {!grupo || grupo.modulos.length === 0 ? (
            <Text style={estilos.vazioModulo}>Nenhum módulo publicado neste curso ainda.</Text>
          ) : (
            grupo.modulos.map((modulo, indice) => {
              const totalConteudosModulo = modulo.conteudos.length;
              // Modulo so com quiz (sem nenhum conteudo) tambem conta aqui -
              // prompt-agente-progresso-e-trava-ao-concluir.md, Parte B, item 7.
              const totalItensModulo = totalConteudosModulo + modulo.quizzes.length;
              // modulo.concluido/progresso ja vem do backend (ProgressoModuloAluno,
              // ver agruparConteudosPorCurso) e pondera o(s) quiz(zes) do modulo
              // junto com os conteudos - nao so os conteudos.
              const moduloConcluido = totalItensModulo > 0 && modulo.concluido;
              const percentualModulo = totalItensModulo > 0 ? Math.max(0, Math.min(modulo.progresso, 100)) : 0;
              // modulo.concluidos so conta conteudo - com quiz no modulo, "X
              // de Y conteudos" ficaria incoerente com a porcentagem (que
              // pondera os dois); descrever pelo percentual evita isso.
              const descricaoItensConcluidos =
                modulo.quizzes.length > 0
                  ? `${Math.round(percentualModulo)}% concluído`
                  : `${modulo.concluidos} de ${totalConteudosModulo} concluídos`;

              return (
                <View
                  accessibilityLabel={`${modulo.titulo}. ${descricaoItensConcluidos}.`}
                  accessible
                  key={modulo.id}
                  style={[estilos.modulo, modulo.bloqueado ? estilos.moduloBloqueado : null]}
                >
                  <View
                    style={[
                      estilos.moduloNumero,
                      modulo.bloqueado ? estilos.moduloNumeroBloqueado : moduloConcluido ? estilos.moduloNumeroConcluido : null
                    ]}
                  >
                    {modulo.bloqueado ? (
                      <Ionicons color={cores.textoSuave} name="lock-closed" size={14} />
                    ) : moduloConcluido ? (
                      <Ionicons color="#fff" name="checkmark" size={14} />
                    ) : (
                      <Text style={estilos.moduloNumeroTexto}>{indice + 1}</Text>
                    )}
                  </View>

                  <View style={estilos.moduloTextos}>
                    <Text numberOfLines={2} style={[estilos.moduloTitulo, modulo.bloqueado ? { color: cores.textoSuave } : null]}>
                      {modulo.titulo}
                    </Text>
                    <Text style={estilos.moduloContagem}>{descricaoItensConcluidos}</Text>
                  </View>

                  <View style={estilos.moduloMiniBarraFundo}>
                    <View
                      style={[
                        estilos.moduloMiniBarraPreenchida,
                        { width: `${percentualModulo}%`, backgroundColor: moduloConcluido ? cores.sucesso : cores.destaque }
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Metrica({ rotulo, valor }) {
  return (
    <View style={estilos.metricaItem}>
      <Text numberOfLines={1} style={estilos.metricaValor}>{valor}</Text>
      <Text numberOfLines={1} style={estilos.metricaRotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  tituloTela: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo, paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.xl },
  subtituloTela: { color: cores.textoRotulo, fontSize: tipografia.rotulo, paddingHorizontal: espacamentos.xl, marginTop: 2 },
  botaoVazioCatalogo: { alignSelf: "center", marginTop: espacamentos.md },
  botaoVoltar: { marginHorizontal: espacamentos.xl, marginTop: espacamentos.md },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },

  cartaoResumo: {
    flexDirection: "row",
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    paddingVertical: espacamentos.lg
  },
  resumoItem: { flex: 1, alignItems: "center", gap: 2 },
  resumoDivisoria: { width: 1, backgroundColor: cores.divisoria },
  resumoValor: { color: cores.texto, fontWeight: "800", fontSize: tipografia.destaque },
  resumoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda, textAlign: "center" },

  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },

  cartaoCurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md
  },
  cartaoCursoTextos: { flex: 1, gap: 2 },
  cartaoCursoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  cartaoCursoSubtitulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  selo: { borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3, flexShrink: 1 },
  seloInline: { alignSelf: "flex-start", marginTop: espacamentos.xs },
  seloTexto: { fontSize: tipografia.legenda, fontWeight: "700" },

  cabecalhoCurso: {
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.md
  },
  cabecalhoCursoTopo: { flexDirection: "row", alignItems: "center", gap: espacamentos.md },
  cabecalhoCursoTextos: { flex: 1, gap: 2 },
  cabecalhoEyebrow: { color: cores.destaque, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  cabecalhoTitulo: { color: cores.texto, fontWeight: "800", fontSize: tipografia.titulo },
  cabecalhoMetricas: { flexDirection: "row", borderTopWidth: 1, borderTopColor: cores.divisoria, paddingTop: espacamentos.md },
  metricaItem: { flex: 1, alignItems: "center", gap: 2 },
  metricaValor: { color: cores.texto, fontWeight: "800", fontSize: tipografia.subtitulo },
  metricaRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },

  cartaoCertificado: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.sm
  },
  certificadoCabecalho: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm },
  certificadoIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  certificadoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  certificadoDescricao: { color: cores.textoSuave, fontSize: tipografia.rotulo, lineHeight: 18 },
  botaoVerCertificado: { alignSelf: "flex-start", marginTop: espacamentos.xs },

  modulosCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: espacamentos.sm },
  modulosContagem: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  modulosLista: { gap: espacamentos.sm },
  modulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md
  },
  moduloBloqueado: { opacity: 0.7 },
  moduloNumero: {
    width: 32,
    height: 32,
    borderRadius: raios.md,
    backgroundColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  moduloNumeroConcluido: { backgroundColor: cores.sucesso },
  moduloNumeroBloqueado: { backgroundColor: cores.fundoCartaoAtivo },
  moduloNumeroTexto: { color: cores.destaque, fontWeight: "800", fontSize: tipografia.rotulo },
  moduloTextos: { flex: 1, gap: 2 },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  moduloContagem: { color: cores.textoSuave, fontSize: tipografia.legenda },
  moduloMiniBarraFundo: { width: 48, height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  moduloMiniBarraPreenchida: { height: 6, borderRadius: raios.sm },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" }
});
