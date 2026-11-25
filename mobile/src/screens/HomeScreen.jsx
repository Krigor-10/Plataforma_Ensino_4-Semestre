import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef } from "react";
import { Animated as AnimatedRN, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Polygon, Rect } from "react-native-svg";
import { useReducedMotion } from "react-native-reanimated";
import BotaoContornoSeta from "../components/BotaoContornoSeta.jsx";
import CapaCurso from "../components/CapaCurso.jsx";
import { agruparConteudosPorCurso } from "../lib/conteudos.js";
import { obterDisponibilidadeAvaliacao, TIPO_AVALIACAO_PROVA, VISUAL_TIPO_AVALIACAO } from "../lib/avaliacoes.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";
import { useAlturaBarraAbas } from "../lib/useAlturaBarraAbas.js";

const TouchableOpacityAnimadoRN = AnimatedRN.createAnimatedComponent(TouchableOpacity);

const TIPO_QUIZ = 1;
// Mesmo visual roxo (icone+cor) ja usado pra Prova na aba Avaliacoes -
// reaproveitado aqui pro quadrado do banner "Avaliacoes pendentes" (docs/
// redesign-mobile/PROMPT-agente-inicio-referencia.md, item 3).
const VISUAL_BANNER_AVALIACOES = VISUAL_TIPO_AVALIACAO[TIPO_AVALIACAO_PROVA];

function obterSituacaoMeuCurso(percentual) {
  if (percentual >= 100) {
    return { cor: cores.sucesso, icone: "checkmark-circle", rotulo: "Concluído" };
  }
  if (percentual <= 0) {
    return { cor: cores.textoRotulo, icone: "time-outline", rotulo: "Não iniciado" };
  }
  // Roxo com play (item "Ajustes aprovados" do prompt): na referencia "Em
  // andamento" vinha verde com check, que confundia com Concluido.
  return { cor: cores.destaque, icone: "play-circle", rotulo: "Em andamento" };
}

// Capelo ao lado da saudacao (item 1 do prompt) - arte final (PNG) ainda
// nao existe no repositorio (assets/ilustracoes/), entao fica este SVG
// simples (react-native-svg, ja instalado) como lugar reservado: um capelo
// estilizado (losango + faixa + borla) sobre um brilho circular roxo.
// Troque por `assets/ilustracoes/capelo.png` (PNG transparente, ~96x80)
// quando a arte definitiva chegar - a prop/estilo aqui nao muda.
function IlustracaoCapelo() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={estilos.ilustracaoCapeloContainer}>
      <View style={estilos.ilustracaoBrilho} />
      <Svg height={80} viewBox="0 0 96 80" width={96}>
        <Polygon fill="#7b2ff7" points="48,18 88,34 48,50 8,34" />
        <Polygon fill="#9d67ff" opacity={0.55} points="48,18 88,34 48,34 8,34" />
        <Rect fill="#5b1fb8" height={14} rx={3} width={28} x={34} y={40} />
        <Line stroke="#c4b5fd" strokeWidth={2} x1={70} x2={70} y1={34} y2={54} />
        <Circle cx={70} cy={58} fill="#c4b5fd" r={4} />
      </Svg>
    </View>
  );
}

/* Tela "Inicio" do Aluno, no estilo da referencia aprovada (docs/redesign-
   mobile/PROMPT-agente-inicio-referencia.md, inicio-referencia.png) - saiu
   o "Acesso rapido" (os 4 atalhos repetem a barra de navegacao) e a lista
   de avaliacoes virou um banner compacto. Todo numero mostrado aqui vem do
   snapshot ja carregado pelo AlunoWorkspace.jsx (mesma fonte que Cursos/
   Avaliacoes/Progresso usam) - nenhum indicador ficticio; dado que nao
   existe (categoria do curso, "ultimo acesso", nivel/XP) e omitido, nao
   inventado. Saudacao e acoes de notificacoes/perfil/logout ficam no
   HeaderGlobal.jsx (persistente em todas as abas, nao so aqui). */
export default function HomeScreen({ onAbrirAba, onAbrirXp, snapshot, usuario, xp }) {
  const alturaBarraAbas = useAlturaBarraAbas();
  const reduzMovimentoContinuar = useReducedMotion();
  // eslint-disable-next-line react-hooks/refs -- padrao idiomatico useRef(valorInicial).current pra extrair um Animated.Value estavel (mesma instancia em todo render), igual ao ja usado em MenuLateral.jsx.
  const escalaContinuar = useRef(new AnimatedRN.Value(1)).current;

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

  // Mesmo agrupamento que ConteudosScreen/ProgressoScreen usam - precisamos
  // dele aqui so pra achar o proximo conteudo (material+modulo) do curso em
  // andamento, pro card "Continuar estudando".
  const grupoPorCursoId = useMemo(() => {
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

  const cursosEmAndamento = useMemo(
    () => progressosPorCurso.filter((progresso) => Number(progresso.percentualConclusao || 0) < 100),
    [progressosPorCurso]
  );

  const proximoCurso = cursosEmAndamento[0] || null;
  const cursoProximo = proximoCurso ? cursoPorId.get(proximoCurso.cursoId) : null;
  const tituloCursoProximo = cursoProximo?.titulo || (proximoCurso ? `Curso #${proximoCurso.cursoId}` : "");
  const grupoProximo = proximoCurso ? grupoPorCursoId.get(proximoCurso.cursoId) : null;
  const proximoConteudo = grupoProximo?.proximoConteudo || null;
  const numeroModulo = proximoConteudo
    ? grupoProximo.modulos.findIndex((modulo) => modulo.id === proximoConteudo.moduloId) + 1
    : null;
  const percentualProximoCurso = Math.max(0, Math.min(Number(proximoCurso?.percentualConclusao) || 0, 100));

  // Todas as disponiveis (item 3 do prompt - sem o limite de antes): o
  // banner so mostra o total, nao os cartoes individuais.
  const avaliacoesDisponiveis = useMemo(
    () =>
      (snapshot.avaliacoes || []).filter(
        (avaliacao) => Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ && obterDisponibilidadeAvaliacao(avaliacao).podeRealizar
      ),
    [snapshot.avaliacoes]
  );

  function abrirTrilhaDoCurso(cursoId) {
    onAbrirAba?.(ROUTES.CONTEUDOS, { cursoId });
  }

  const primeiroNome = usuario?.nome?.split(" ")[0] || "aluno";

  return (
    <ScrollView contentContainerStyle={[estilos.container, { paddingBottom: alturaBarraAbas }]}>
      <View style={estilos.saudacaoLinha}>
        <View style={estilos.saudacaoTextos}>
          <Text style={estilos.saudacao}>Olá, {primeiroNome}! 👋</Text>
          <Text style={estilos.subtitulo}>Vamos continuar aprendendo?</Text>
          {xp ? (
            <TouchableOpacity
              accessibilityHint="Mostra como ganhar XP e quanto falta para o próximo nível"
              accessibilityLabel={`Nível ${xp.nivel}: ${xp.xpNoNivel} de ${xp.xpPorNivel} XP`}
              accessibilityRole="button"
              onPress={onAbrirXp}
              style={estilos.linhaXp}
            >
              <Ionicons color={cores.destaque} name="flash" size={13} />
              <Text style={estilos.linhaXpNivel}>Nível {xp.nivel}</Text>
              <View style={estilos.linhaXpBarraFundo}>
                <LinearGradient
                  colors={["#7b2ff7", "#a78bfa"]}
                  style={[estilos.linhaXpBarraPreenchida, { width: `${xp.percentualNivel}%` }]}
                />
              </View>
              <Text style={estilos.linhaXpContagem}>{xp.xpNoNivel}/{xp.xpPorNivel} XP</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <IlustracaoCapelo />
      </View>

      {progressosPorCurso.length === 0 ? (
        <BannerExplorarCatalogo onPress={() => onAbrirAba?.(ROUTES.CATALOGO)} />
      ) : (
        <>
          {proximoCurso ? (
            <View style={estilos.cartaoContinuarBorda}>
              <LinearGradient colors={["#231a3d", cores.fundoCartao]} style={estilos.cartaoContinuar}>
                <View style={estilos.continuarTopo}>
                  <CapaCurso curso={cursoProximo} estilo={estilos.continuarCapa} />
                  <View style={estilos.continuarTextosTopo}>
                    <View style={estilos.continuarPilula}>
                      <Text style={estilos.continuarPilulaTexto}>CONTINUE ESTUDANDO</Text>
                    </View>
                    <Text numberOfLines={2} style={estilos.continuarTitulo}>{tituloCursoProximo}</Text>
                    {numeroModulo ? (
                      <Text numberOfLines={1} style={estilos.continuarModulo}>
                        Módulo {numeroModulo} · {proximoConteudo.moduloTitulo}
                      </Text>
                    ) : null}
                    <View style={estilos.continuarProgressoLinha}>
                      <View style={estilos.continuarBarraFundo}>
                        <View style={[estilos.continuarBarraPreenchida, { width: `${percentualProximoCurso}%` }]} />
                      </View>
                      <Text style={estilos.continuarProgressoTexto}>{Math.round(percentualProximoCurso)}% concluído</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacityAnimadoRN
                  accessibilityHint="Abre a trilha do curso na aba Cursos"
                  accessibilityLabel="Continuar aula"
                  accessibilityRole="button"
                  onPress={() => abrirTrilhaDoCurso(proximoCurso.cursoId)}
                  onPressIn={() => {
                    if (!reduzMovimentoContinuar) AnimatedRN.timing(escalaContinuar, { duration: 100, toValue: 0.97, useNativeDriver: true }).start();
                  }}
                  onPressOut={() => {
                    if (!reduzMovimentoContinuar) AnimatedRN.timing(escalaContinuar, { duration: 120, toValue: 1, useNativeDriver: true }).start();
                  }}
                  style={[estilos.botaoContinuar, { transform: [{ scale: escalaContinuar }] }]}
                >
                  <Ionicons color={cores.texto} name="play" size={16} />
                  <Text style={estilos.botaoContinuarTexto}>Continuar aula</Text>
                </TouchableOpacityAnimadoRN>
              </LinearGradient>
            </View>
          ) : null}

          {avaliacoesDisponiveis.length > 0 ? (
            <TouchableOpacity
              accessibilityHint="Abre a aba Avaliações"
              accessibilityLabel="Avaliações pendentes"
              accessibilityRole="button"
              onPress={() => onAbrirAba?.(ROUTES.AVALIACOES)}
              style={estilos.bannerAvaliacoes}
            >
              <View style={[estilos.bannerAvaliacoesIcone, { borderColor: VISUAL_BANNER_AVALIACOES.corBorda }]}>
                <MaterialCommunityIcons color={VISUAL_BANNER_AVALIACOES.corIcone} name="clipboard-check-outline" size={24} />
              </View>
              <View style={estilos.bannerAvaliacoesTextos}>
                <Text style={estilos.bannerAvaliacoesTitulo}>Avaliações pendentes</Text>
                <Text numberOfLines={1} style={estilos.bannerAvaliacoesDescricao}>
                  Você tem {avaliacoesDisponiveis.length} avaliaç{avaliacoesDisponiveis.length === 1 ? "ão disponível" : "ões disponíveis"}
                </Text>
              </View>
              <BotaoContornoSeta
                accessibilityHint="Abre a aba Avaliações"
                accessibilityLabel="Ver avaliações pendentes"
                onPress={() => onAbrirAba?.(ROUTES.AVALIACOES)}
                rotulo="Ver"
              />
            </TouchableOpacity>
          ) : null}

          <View style={estilos.secaoCabecalho}>
            <Text style={estilos.tituloSecao}>Meus cursos</Text>
            <TouchableOpacity
              accessibilityHint="Abre a aba Cursos"
              accessibilityLabel="Ver todos os cursos"
              accessibilityRole="button"
              onPress={() => onAbrirAba?.(ROUTES.CONTEUDOS)}
              style={estilos.verTodas}
            >
              <Text style={estilos.verTodasTexto}>Ver todos</Text>
              <Ionicons color={cores.destaque} name="arrow-forward" size={13} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.carrosselCursos} horizontal showsHorizontalScrollIndicator={false}>
            {progressosPorCurso.map((progresso) => {
              const curso = cursoPorId.get(progresso.cursoId);
              const percentual = Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100));
              const situacao = obterSituacaoMeuCurso(percentual);

              return (
                <TouchableOpacity
                  accessibilityHint="Abre a trilha do curso na aba Cursos"
                  accessibilityLabel={`Abrir ${curso?.titulo || `curso #${progresso.cursoId}`}`}
                  accessibilityRole="button"
                  key={progresso.cursoId}
                  onPress={() => abrirTrilhaDoCurso(progresso.cursoId)}
                  style={estilos.cartaoMeuCurso}
                >
                  <View style={estilos.meuCursoCapaContainer}>
                    <CapaCurso altura={84} curso={curso} estilo={estilos.meuCursoCapa} largura={150} />
                    <View style={estilos.meuCursoPercentualPilula}>
                      <Text style={estilos.meuCursoPercentualTexto}>{Math.round(percentual)}%</Text>
                    </View>
                  </View>
                  <View style={estilos.barraFundo}>
                    <View
                      style={[
                        estilos.barraPreenchida,
                        { width: `${percentual}%`, backgroundColor: percentual >= 100 ? cores.sucesso : cores.destaque }
                      ]}
                    />
                  </View>
                  <View style={estilos.meuCursoTextos}>
                    <Text numberOfLines={2} style={estilos.meuCursoTitulo}>{curso?.titulo || `Curso #${progresso.cursoId}`}</Text>
                    <View style={estilos.meuCursoSituacaoLinha}>
                      <Ionicons color={situacao.cor} name={situacao.icone} size={13} />
                      <Text style={[estilos.meuCursoSituacaoTexto, { color: situacao.cor }]}>{situacao.rotulo}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <BannerExplorarCatalogo onPress={() => onAbrirAba?.(ROUTES.CATALOGO)} />
        </>
      )}
    </ScrollView>
  );
}

// Novo, no fim da tela (item 6 do prompt) - aparece sempre, inclusive no
// estado vazio (sem nenhuma matricula), no lugar da mensagem antiga.
function BannerExplorarCatalogo({ onPress }) {
  return (
    <LinearGradient colors={["#3b1f78", "#24164a"]} style={estilos.bannerCatalogo}>
      <Ionicons
        accessibilityElementsHidden
        color={cores.acento}
        importantForAccessibility="no"
        name="rocket-outline"
        size={34}
      />
      <View style={estilos.bannerCatalogoTextos}>
        <Text style={estilos.bannerCatalogoTitulo}>Explorar catálogo</Text>
        <Text style={estilos.bannerCatalogoDescricao}>Descubra novos cursos para turbinar seus conhecimentos.</Text>
      </View>
      <BotaoContornoSeta
        accessibilityHint="Abre o catálogo de cursos disponíveis"
        accessibilityLabel="Ver cursos"
        onPress={onPress}
        rotulo="Ver cursos"
      />
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: cores.fundo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.xl,
    gap: espacamentos.lg
  },
  saudacaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacamentos.md },
  saudacaoTextos: { flex: 1 },
  saudacao: { color: cores.texto, fontSize: tipografia.titulo, fontWeight: "800" },
  subtitulo: { color: cores.textoSuave, fontSize: tipografia.corpo, marginTop: 2 },
  // Linha fina de XP (docs/gamificacao/PROMPT-agente-barra-xp-mobile.md,
  // item 2) - so aparece com `xp` (aluno com matricula liberada); mesmo
  // calculo do chip das outras abas (ScreenIndicator.jsx), um so por
  // AlunoWorkspace.jsx.
  linhaXp: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: espacamentos.sm, minHeight: 18 },
  linhaXpNivel: { color: cores.texto, fontSize: 12, fontWeight: "800" },
  linhaXpBarraFundo: { flex: 1, height: 6, borderRadius: 6, backgroundColor: "rgba(255, 255, 255, 0.1)", overflow: "hidden" },
  linhaXpBarraPreenchida: { height: 6, borderRadius: 6 },
  linhaXpContagem: { color: cores.textoSuave, fontSize: 10.5, flexShrink: 0 },
  ilustracaoCapeloContainer: { width: 96, height: 80, alignItems: "center", justifyContent: "center" },
  ilustracaoBrilho: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(123, 47, 247, 0.18)" },

  cartaoContinuarBorda: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(123, 47, 247, 0.55)",
    overflow: "hidden"
  },
  cartaoContinuar: { padding: espacamentos.lg, gap: espacamentos.md },
  continuarTopo: { flexDirection: "row", gap: espacamentos.md },
  continuarCapa: { borderRadius: 12 },
  continuarTextosTopo: { flex: 1, gap: 4 },
  continuarPilula: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(123, 47, 247, 0.22)",
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  continuarPilulaTexto: { color: "#c4b5fd", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  continuarTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  continuarModulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  continuarProgressoLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, marginTop: 2 },
  continuarBarraFundo: { flex: 1, height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  continuarBarraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  continuarProgressoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, flexShrink: 0 },
  botaoContinuar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: cores.destaque,
    borderRadius: 12,
    minHeight: 48
  },
  botaoContinuarTexto: { color: cores.texto, fontWeight: "700" },

  bannerAvaliacoes: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md
  },
  bannerAvaliacoesIcone: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(123, 47, 247, 0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  bannerAvaliacoesTextos: { flex: 1, gap: 2 },
  bannerAvaliacoesTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo },
  bannerAvaliacoesDescricao: { color: cores.textoSuave, fontSize: tipografia.rotulo },

  secaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tituloSecao: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700" },
  verTodas: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  verTodasTexto: {
    color: cores.destaque,
    fontWeight: "600",
    fontSize: tipografia.rotulo,
    lineHeight: 13,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : null)
  },

  carrosselCursos: { gap: espacamentos.md, paddingBottom: 4 },
  cartaoMeuCurso: {
    width: 150,
    backgroundColor: cores.fundoCartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    overflow: "hidden"
  },
  meuCursoCapaContainer: { width: "100%", height: 84 },
  meuCursoCapa: { borderRadius: 0 },
  meuCursoPercentualPilula: {
    position: "absolute",
    right: espacamentos.xs,
    bottom: espacamentos.xs,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: raios.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  meuCursoPercentualTexto: { color: "#fff", fontSize: 11, fontWeight: "800" },
  barraFundo: { height: 4, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  barraPreenchida: { height: 4 },
  meuCursoTextos: { padding: espacamentos.sm, gap: 4 },
  meuCursoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, minHeight: tipografia.rotulo * 2.4 },
  meuCursoSituacaoLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  meuCursoSituacaoTexto: { fontSize: tipografia.legenda, fontWeight: "600" },

  bannerCatalogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(157, 103, 255, 0.4)",
    padding: espacamentos.lg
  },
  bannerCatalogoTextos: { flex: 1, gap: 2 },
  bannerCatalogoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo },
  bannerCatalogoDescricao: { color: cores.textoSuave, fontSize: tipografia.rotulo, lineHeight: 17 }
});
