import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import CapaCurso from "../components/CapaCurso.jsx";
import { obterDisponibilidadeAvaliacao } from "../lib/avaliacoes.js";
import { formatPercent } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";
import { ROUTES } from "../lib/routes.js";
import { DURACAO_TRANSICAO } from "../lib/transitions.js";

const TouchableOpacityAnimado = Animated.createAnimatedComponent(TouchableOpacity);

const ATALHOS = [
  { aba: ROUTES.CONTEUDOS, icone: "book-outline", rotulo: "Conteúdos" },
  { aba: ROUTES.AVALIACOES, icone: "clipboard-outline", rotulo: "Avaliações" },
  { aba: ROUTES.PROGRESSO, icone: "bar-chart-outline", rotulo: "Progresso" }
];

function obterSaudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/* Tela "Inicio" do Aluno — painel informativo (saudacao + resumo geral +
   atalhos), nao mais a listagem principal de cursos (isso agora e papel de
   CONTEUDOS, que ganhou sua propria etapa de selecao de curso). Todo numero
   mostrado aqui vem do snapshot ja carregado pelo AlunoWorkspace.jsx (mesma
   fonte que Conteudos/Avaliacoes/Progresso usam) - nenhum indicador
   fictício. Saudacao e acoes de notificacoes/perfil/logout ficam no
   HeaderGlobal.jsx (persistente em todas as abas, nao so aqui). */
export default function HomeScreen({ onAbrirAba, snapshot, usuario }) {
  const reduzMovimentoContinuar = useReducedMotion();
  const escalaContinuar = useSharedValue(1);
  const estiloAnimadoContinuar = useAnimatedStyle(() => ({ transform: [{ scale: escalaContinuar.value }] }));
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

  const cursosEmAndamento = useMemo(
    () => progressosPorCurso.filter((progresso) => Number(progresso.percentualConclusao || 0) < 100),
    [progressosPorCurso]
  );

  const progressoGeral = useMemo(() => {
    if (progressosPorCurso.length === 0) return 0;
    const soma = progressosPorCurso.reduce((total, progresso) => total + (Number(progresso.percentualConclusao) || 0), 0);
    return soma / progressosPorCurso.length;
  }, [progressosPorCurso]);

  const avaliacoesDisponiveis = useMemo(
    () => (snapshot.avaliacoes || []).filter((avaliacao) => obterDisponibilidadeAvaliacao(avaliacao).podeRealizar).length,
    [snapshot.avaliacoes]
  );

  const proximoCurso = cursosEmAndamento[0] || null;
  const cursoProximo = proximoCurso ? cursoPorId.get(proximoCurso.cursoId) : null;
  const tituloCursoProximo = cursoProximo?.titulo || (proximoCurso ? `Curso #${proximoCurso.cursoId}` : "");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.saudacao}>
        {obterSaudacao()}, {usuario?.nome?.split(" ")[0] || "aluno"}
      </Text>

      {progressosPorCurso.length === 0 ? (
        <Text style={styles.vazio}>
          Você ainda não está matriculado em nenhum curso. Vá em Matrículas para explorar o catálogo.
        </Text>
      ) : (
        <>
          <View style={styles.resumoLinha}>
            <Resumo atraso={0} rotulo="Progresso geral" valor={formatPercent(progressoGeral)} />
            <Resumo atraso={60} rotulo="Em andamento" valor={String(cursosEmAndamento.length)} />
            <Resumo atraso={120} rotulo="Avaliações disponíveis" valor={String(avaliacoesDisponiveis)} />
          </View>

          {proximoCurso ? (
            <TouchableOpacityAnimado
              accessibilityLabel={`Continuar estudando ${tituloCursoProximo}, ${formatPercent(proximoCurso.percentualConclusao)} concluído`}
              accessibilityRole="button"
              disabled={!onAbrirAba}
              onPress={() => onAbrirAba?.(ROUTES.CONTEUDOS, { cursoId: proximoCurso.cursoId })}
              onPressIn={() => {
                if (!reduzMovimentoContinuar) escalaContinuar.value = withTiming(0.96, { duration: 100 });
              }}
              onPressOut={() => {
                if (!reduzMovimentoContinuar) escalaContinuar.value = withTiming(1, { duration: 120 });
              }}
              style={[styles.cartaoContinuar, estiloAnimadoContinuar]}
            >
              <CapaCurso curso={cursoProximo} size={52} />
              <View style={styles.cartaoContinuarConteudo}>
                <Text style={styles.cartaoContinuarRotulo}>Continuar estudando</Text>
                <Text numberOfLines={1} style={styles.cartaoContinuarTitulo}>{tituloCursoProximo}</Text>
                <View style={styles.barraFundo}>
                  <View style={[styles.barraPreenchida, { width: `${Math.max(0, Math.min(Number(proximoCurso.percentualConclusao) || 0, 100))}%` }]} />
                </View>
              </View>
              <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
            </TouchableOpacityAnimado>
          ) : null}
        </>
      )}

      <Text style={styles.tituloAtalhos}>Acesso rápido</Text>
      <View style={styles.atalhosLinha}>
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
    </ScrollView>
  );
}

// Entrada escalonada dos 3 indicadores ao abrir a tela (atraso em ms por
// indice) — so destaca a chegada deles, nenhum valor real e alterado.
function Resumo({ atraso = 0, rotulo, valor }) {
  const reduzMovimento = useReducedMotion();
  const progresso = useSharedValue(reduzMovimento ? 1 : 0);

  useEffect(() => {
    if (reduzMovimento) {
      progresso.value = 1;
      return;
    }
    progresso.value = withDelay(atraso, withTiming(1, { duration: DURACAO_TRANSICAO }));
  }, [atraso, progresso, reduzMovimento]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: progresso.value,
    transform: [{ translateY: (1 - progresso.value) * 10 }]
  }));

  return (
    <Animated.View style={[styles.resumoItem, estiloAnimado]}>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </Animated.View>
  );
}

// Feedback de toque alem da opacidade padrao do TouchableOpacity: leve
// "afundada" de escala enquanto pressionado, volta ao normal ao soltar.
function AtalhoBotao({ disabled, icone, onPress, rotulo }) {
  const reduzMovimento = useReducedMotion();
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <TouchableOpacityAnimado
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!reduzMovimento) escala.value = withTiming(0.96, { duration: 100 });
      }}
      onPressOut={() => {
        if (!reduzMovimento) escala.value = withTiming(1, { duration: 120 });
      }}
      style={[styles.atalho, estiloAnimado]}
    >
      <Ionicons color={cores.destaque} name={icone} size={22} />
      <Text style={styles.atalhoTexto}>{rotulo}</Text>
    </TouchableOpacityAnimado>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: cores.fundo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.xl,
    paddingBottom: 24
  },
  saudacao: {
    color: cores.texto,
    fontSize: tipografia.titulo,
    fontWeight: "700",
    marginBottom: espacamentos.lg
  },
  resumoLinha: {
    flexDirection: "row",
    gap: espacamentos.sm,
    marginBottom: espacamentos.md
  },
  resumoItem: {
    flex: 1,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    paddingVertical: espacamentos.md,
    paddingHorizontal: espacamentos.sm,
    alignItems: "center"
  },
  resumoValor: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  resumoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda, textAlign: "center", marginTop: 4 },
  cartaoContinuar: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    padding: 14,
    marginBottom: espacamentos.lg,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque
  },
  cartaoContinuarConteudo: { flex: 1 },
  cartaoContinuarRotulo: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.legenda, marginBottom: 2 },
  cartaoContinuarTitulo: { color: cores.texto, fontWeight: "600", marginBottom: 8 },
  barraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  barraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  tituloAtalhos: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700", marginBottom: espacamentos.sm },
  atalhosLinha: { flexDirection: "row", gap: espacamentos.sm },
  atalho: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    paddingVertical: espacamentos.md,
    minHeight: 72,
    justifyContent: "center"
  },
  atalhoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "600", textAlign: "center" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 24 }
});
