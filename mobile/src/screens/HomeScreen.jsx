import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { Animated as AnimatedRN, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import CapaCurso from "../components/CapaCurso.jsx";
import ProgressoCircular from "../components/ProgressoCircular.jsx";
import { agruparConteudosPorCurso } from "../lib/conteudos.js";
import { obterDisponibilidadeAvaliacao } from "../lib/avaliacoes.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";

const TouchableOpacityAnimadoRN = AnimatedRN.createAnimatedComponent(TouchableOpacity);

const TIPO_QUIZ = 1;
const MAX_AVALIACOES_DISPONIVEIS = 2;

// Redesign (docs/redesign-mobile/PROMPT-agente-mobile.md, secao 3): grade
// 2x2 com as 4 abas da bottom bar que nao sao "Inicio". So Prova/Exercicio
// em "Avaliacoes disponiveis" abaixo (decisao do usuario 27/10): quiz mora
// na trilha do curso, nunca aparece como avaliacao solta por aqui, mesmo
// criterio ja usado na aba Avaliacoes (AvaliacoesScreen.jsx).
const ATALHOS = [
  { aba: ROUTES.CONTEUDOS, icone: "school-outline", rotulo: "Cursos" },
  { aba: ROUTES.AVALIACOES, icone: "clipboard-outline", rotulo: "Avaliações" },
  { aba: ROUTES.PROGRESSO, icone: "bar-chart-outline", rotulo: "Progresso" },
  { aba: ROUTES.CERTIFICADOS, icone: "ribbon-outline", rotulo: "Certificados" }
];

function obterSaudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function obterRotuloProgresso(percentual) {
  const pct = Math.max(0, Math.min(Number(percentual) || 0, 100));
  if (pct >= 100) return "Concluído";
  if (pct <= 0) return "Não iniciado";
  return `${Math.round(pct)}% concluído`;
}

function obterRotuloTempoLimite(avaliacao) {
  return avaliacao.tempoLimiteMinutos > 0 ? `Tempo limite: ${avaliacao.tempoLimiteMinutos} min` : "Sem tempo limite";
}

function obterRotuloTentativa(avaliacao) {
  const permitidas = avaliacao.tentativasPermitidas || 1;
  const realizadas = avaliacao.tentativasRealizadas || 0;
  return `Tentativa ${Math.min(realizadas + 1, permitidas)} de ${permitidas}`;
}

/* Tela "Inicio" do Aluno — painel informativo (saudacao, curso em andamento
   em destaque, acesso rapido, avaliacoes disponiveis e todos os cursos em
   carrossel). Todo numero mostrado aqui vem do snapshot ja carregado pelo
   AlunoWorkspace.jsx (mesma fonte que Cursos/Avaliacoes/Progresso usam) -
   nenhum indicador ficticio; dado que nao existe (categoria do curso,
   "ultimo acesso", nivel/XP) e omitido, nao inventado. Saudacao e acoes de
   notificacoes/perfil/logout ficam no HeaderGlobal.jsx (persistente em
   todas as abas, nao so aqui). */
export default function HomeScreen({ onAbrirAba, snapshot, usuario }) {
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

  const avaliacoesDisponiveis = useMemo(
    () =>
      (snapshot.avaliacoes || [])
        .filter(
          (avaliacao) => Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ && obterDisponibilidadeAvaliacao(avaliacao).podeRealizar
        )
        .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""))
        .slice(0, MAX_AVALIACOES_DISPONIVEIS),
    [snapshot.avaliacoes]
  );

  function abrirTrilhaDoCurso(cursoId) {
    onAbrirAba?.(ROUTES.CONTEUDOS, { cursoId });
  }

  if (progressosPorCurso.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.saudacao}>
          {obterSaudacao()}, {usuario?.nome?.split(" ")[0] || "aluno"} 👋
        </Text>
        <Text style={estilos.vazio}>
          Você ainda não está matriculado em nenhum curso. Abra o menu e toque em Catálogo para explorar os cursos disponíveis.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <Text style={estilos.saudacao}>
        {obterSaudacao()}, {usuario?.nome?.split(" ")[0] || "aluno"} 👋
      </Text>
      <Text style={estilos.subtitulo}>Bora continuar sua trilha?</Text>

      {proximoCurso ? (
        <View style={estilos.cartaoContinuar}>
          <View style={estilos.continuarTopo}>
            <View style={estilos.continuarTextosTopo}>
              <Text numberOfLines={2} style={estilos.continuarTitulo}>{tituloCursoProximo}</Text>
              {numeroModulo ? (
                <Text numberOfLines={1} style={estilos.continuarModulo}>
                  Módulo {numeroModulo} · {proximoConteudo.moduloTitulo}
                </Text>
              ) : null}
            </View>
            <ProgressoCircular percentual={proximoCurso.percentualConclusao} size={56} />
          </View>

          {proximoConteudo ? (
            <View style={estilos.continuarConteudoLinha}>
              <Ionicons color={cores.textoSuave} name="play-circle-outline" size={15} />
              <Text numberOfLines={1} style={estilos.continuarConteudoTexto}>{proximoConteudo.titulo}</Text>
            </View>
          ) : null}

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
        </View>
      ) : null}

      <Text style={estilos.tituloSecao}>Acesso rápido</Text>
      <View style={estilos.atalhosGrade}>
        {ATALHOS.map((atalho) => (
          <AtalhoBotao
            disabled={!onAbrirAba}
            icone={atalho.icone}
            key={atalho.aba}
            onPress={() => onAbrirAba?.(atalho.aba)}
            rotulo={atalho.rotulo}
          />
        ))}
      </View>

      {avaliacoesDisponiveis.length > 0 ? (
        <>
          <View style={estilos.secaoCabecalho}>
            <Text style={estilos.tituloSecao}>Avaliações disponíveis</Text>
            <TouchableOpacity
              accessibilityHint="Abre a aba Avaliações"
              accessibilityLabel="Ver todas as avaliações"
              accessibilityRole="button"
              disabled={!onAbrirAba}
              onPress={() => onAbrirAba?.(ROUTES.AVALIACOES)}
              style={estilos.verTodas}
            >
              <Text style={estilos.verTodasTexto}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {avaliacoesDisponiveis.map((avaliacao) => (
            <TouchableOpacity
              accessibilityHint="Abre a avaliação na aba Avaliações"
              accessibilityLabel={`Iniciar avaliação ${avaliacao.titulo}`}
              accessibilityRole="button"
              key={avaliacao.id}
              onPress={() => onAbrirAba?.(ROUTES.AVALIACOES, { cursoId: avaliacao.cursoId })}
              style={estilos.cartaoAvaliacao}
            >
              <Text numberOfLines={2} style={estilos.avaliacaoTitulo}>{avaliacao.titulo}</Text>
              <Text numberOfLines={1} style={estilos.avaliacaoCurso}>
                {cursoPorId.get(avaliacao.cursoId)?.titulo || `Curso #${avaliacao.cursoId}`}
              </Text>
              <View style={estilos.avaliacaoRodape}>
                <Text style={estilos.avaliacaoRodapeTexto}>
                  {obterRotuloTempoLimite(avaliacao)} · {obterRotuloTentativa(avaliacao)}
                </Text>
                <View style={estilos.avaliacaoIniciar}>
                  <Text style={estilos.avaliacaoIniciarTexto}>Iniciar</Text>
                  <Ionicons color={cores.destaque} name="chevron-forward" size={14} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      <Text style={estilos.tituloSecao}>Meus cursos</Text>
      <ScrollView contentContainerStyle={estilos.carrosselCursos} horizontal showsHorizontalScrollIndicator={false}>
        {progressosPorCurso.map((progresso) => {
          const curso = cursoPorId.get(progresso.cursoId);
          const percentual = Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100));
          return (
            <TouchableOpacity
              accessibilityHint="Abre a trilha do curso na aba Cursos"
              accessibilityLabel={`Abrir ${curso?.titulo || `curso #${progresso.cursoId}`}`}
              accessibilityRole="button"
              key={progresso.cursoId}
              onPress={() => abrirTrilhaDoCurso(progresso.cursoId)}
              style={estilos.cartaoMeuCurso}
            >
              <CapaCurso curso={curso} size={40} />
              <Text numberOfLines={2} style={estilos.meuCursoTitulo}>{curso?.titulo || `Curso #${progresso.cursoId}`}</Text>
              <View style={estilos.barraFundo}>
                <View style={[estilos.barraPreenchida, { width: `${percentual}%` }]} />
              </View>
              <Text style={estilos.meuCursoMeta}>{obterRotuloProgresso(percentual)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

function AtalhoBotao({ disabled, icone, onPress, rotulo }) {
  const reduzMovimento = useReducedMotion();
  // eslint-disable-next-line react-hooks/refs -- padrao idiomatico useRef(valorInicial).current pra extrair um Animated.Value estavel (mesma instancia em todo render), igual ao ja usado em MenuLateral.jsx.
  const escala = useRef(new AnimatedRN.Value(1)).current;

  return (
    <TouchableOpacityAnimadoRN
      accessibilityHint={`Abre a aba ${rotulo}`}
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!reduzMovimento) AnimatedRN.timing(escala, { duration: 100, toValue: 0.96, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        if (!reduzMovimento) AnimatedRN.timing(escala, { duration: 120, toValue: 1, useNativeDriver: true }).start();
      }}
      style={[estilos.atalho, { transform: [{ scale: escala }] }]}
    >
      <Ionicons color={cores.destaque} name={icone} size={22} />
      <Text style={estilos.atalhoTexto}>{rotulo}</Text>
    </TouchableOpacityAnimadoRN>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: cores.fundo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.xl,
    paddingBottom: 24
  },
  saudacao: { color: cores.texto, fontSize: tipografia.titulo, fontWeight: "700" },
  subtitulo: { color: cores.textoSuave, fontSize: tipografia.corpo, marginTop: 2, marginBottom: espacamentos.lg },
  cartaoContinuar: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    marginBottom: espacamentos.xl,
    gap: espacamentos.md
  },
  continuarTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacamentos.md },
  continuarTextosTopo: { flex: 1 },
  continuarTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  continuarModulo: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  continuarConteudoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  continuarConteudoTexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, flexShrink: 1 },
  botaoContinuar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: cores.destaque,
    borderRadius: raios.md,
    minHeight: 44
  },
  botaoContinuarTexto: { color: cores.texto, fontWeight: "700" },
  tituloSecao: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700", marginBottom: espacamentos.sm },
  atalhosGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: espacamentos.xl
  },
  atalho: {
    width: "48%",
    alignItems: "center",
    gap: 6,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    paddingVertical: espacamentos.md,
    minHeight: 72,
    justifyContent: "center",
    marginBottom: espacamentos.sm
  },
  atalhoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "600", textAlign: "center" },
  secaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  verTodas: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  verTodasTexto: { color: cores.destaque, fontWeight: "600", fontSize: tipografia.rotulo },
  cartaoAvaliacao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    marginBottom: espacamentos.sm
  },
  avaliacaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo },
  avaliacaoCurso: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 2 },
  avaliacaoRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espacamentos.sm,
    paddingTop: espacamentos.sm,
    borderTopWidth: 1,
    borderTopColor: cores.divisoria
  },
  avaliacaoRodapeTexto: { color: cores.textoRotulo, fontSize: tipografia.legenda, flexShrink: 1 },
  avaliacaoIniciar: { flexDirection: "row", alignItems: "center", gap: 2 },
  avaliacaoIniciarTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.rotulo },
  carrosselCursos: { gap: espacamentos.md, paddingBottom: 4 },
  cartaoMeuCurso: {
    width: 160,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md,
    gap: espacamentos.xs
  },
  meuCursoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, minHeight: tipografia.rotulo * 2.4 },
  barraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: 2 },
  barraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  meuCursoMeta: { color: cores.textoSuave, fontSize: tipografia.legenda },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 24 }
});
