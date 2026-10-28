import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  BackHandler,
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, obterTokenValido, ApiError } from "../../lib/api.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { resolverUrlArquivo } from "../../lib/arquivos.js";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatQuestoes, normalizeContentType, normalizeStatus } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";
import ConfirmacaoCompraSheet from "../../components/ConfirmacaoCompraSheet.jsx";
import GradeCursosConteudos from "../../components/GradeCursosConteudos.jsx";
import QuizModal from "../../components/QuizModal.jsx";

const PAGAMENTO_PENDENTE = 1;

// Monta uma lista plana de linhas (conteudo + quiz vinculado + quiz solto do
// modulo) na ordem de exibicao, pra renderizar o modulo como uma lista unica
// (Material 3), nao cards aninhados. `recuado` marca quiz vinculado a um
// conteudo especifico, pra indentar alinhado ao titulo do pai.
function montarLinhasModulo(modulo) {
  const linhas = [];
  modulo.conteudos.forEach((conteudo) => {
    linhas.push({ chave: `conteudo-${conteudo.id}`, dado: conteudo, recuado: false, tipo: "conteudo" });
    (conteudo.quizzes || []).forEach((quiz) => {
      linhas.push({ chave: `quiz-${quiz.id}`, dado: quiz, recuado: true, tipo: "quiz" });
    });
  });
  modulo.quizzes.forEach((quiz) => {
    linhas.push({ chave: `quiz-${quiz.id}`, dado: quiz, recuado: false, tipo: "quiz" });
  });
  return linhas;
}

// Habilita LayoutAnimation no Android legado (arquitetura nova/Fabric ja
// suporta sem essa flag, mas o guard e inofensivo caso o app rode sob a
// arquitetura antiga em algum device).
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICONE_TIPO_CONTEUDO = {
  1: "document-text-outline",
  2: "document-attach-outline",
  3: "play-circle-outline",
  4: "link-outline",
  5: "image-outline"
};

export default function ConteudosScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [modulosAbertos, setModulosAbertos] = useState(() => new Set());
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [quizSelecionado, setQuizSelecionado] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);
  const route = useRoute();
  const navigation = useNavigation();

  // Resultado de busca (BuscaScreen.jsx) pode navegar aqui ja com um curso
  // escolhido via route.params — consome o param uma unica vez e limpa com
  // setParams, senao reabrir essa aba manualmente depois sempre voltaria
  // forcado pro mesmo curso da ultima busca.
  useEffect(() => {
    if (route.params?.cursoId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consome um param de navegacao vindo de fora (BuscaScreen.jsx) uma unica vez; nao e estado derivavel de props/state local, so existe no objeto route.
      setCursoSelecionadoId(route.params.cursoId);
      navigation.setParams({ cursoId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so quer reagir quando um novo cursoId chega via navegacao, nao a cada render.
  }, [route.params?.cursoId]);

  // Selecao de curso e estado local (nao e uma rota do Navigator), entao o
  // botao fisico/gesto de voltar do Android nao sabe por padrao que devia
  // interceptar aqui — sem isso, voltar com um curso aberto pulava direto
  // pra fora da aba (pra Inicio) em vez de voltar pra selecao de curso,
  // diferente do botao "Voltar" da propria tela. Mesmo padrao ja usado em
  // MenuLateral.jsx. So registra o listener enquanto ha curso selecionado.
  useEffect(() => {
    if (!cursoSelecionadoId) {
      return undefined;
    }

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      setCursoSelecionadoId(null);
      return true;
    });

    return () => assinatura.remove();
  }, [cursoSelecionadoId]);

  // Reseta a navegacao interna (curso selecionado + modulos abertos) toda
  // vez que a aba CONTEUDOS e tocada na barra inferior, mesmo se ja estiver
  // nela - sem isso, trocar de aba e voltar mantinha o curso/modulo aberto
  // da visita anterior em vez de mostrar a grade de novo. `tabPress` (nao
  // useFocusEffect): so dispara quando o ITEM da bottom bar e tocado, nunca
  // ao reganhar foco por outro motivo (ex.: voltar de Perfil/Catalogo/
  // Notificacoes, que tambem fica por cima do Tab.Navigator e devolveria
  // foco sem o usuario ter tocado na aba de novo) - ver
  // pendencia_mobile_conteudos_reset_navegacao_grade na memoria do projeto.
  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      setCursoSelecionadoId(null);
      setModulosAbertos(new Set());
      setCursoParaComprar(null);
    });
  }, [navigation]);

  const grupos = useMemo(
    () =>
      agruparConteudosPorCurso({
        avaliacoes: snapshot.avaliacoes,
        conteudos: snapshot.conteudos,
        cursos: snapshot.cursos,
        matriculas: snapshot.matriculas,
        modulos: snapshot.modulos,
        progressos: snapshot.progressos
      }),
    [snapshot]
  );

  const cursoAtivo = grupos.find((curso) => curso.id === cursoSelecionadoId) || null;

  // Matricula aprovada + pagamento ainda nao confirmado - mesmo criterio que
  // antes vivia em CursosScreen.jsx (removida nesta rodada do redesign, ver
  // GradeCursosConteudos.jsx), reaproveitado aqui pra colocar a pilula
  // "Pagamento pendente" + o botao "Confirmar" direto na grade de cursos.
  const matriculaPorCursoId = useMemo(
    () =>
      new Map(
        snapshot.matriculas
          .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
          .map((matricula) => [matricula.cursoId, matricula])
      ),
    [snapshot.matriculas]
  );

  const pagamentoPorMatriculaId = useMemo(
    () => new Map((snapshot.pagamentos || []).map((pagamento) => [pagamento.matriculaId, pagamento])),
    [snapshot.pagamentos]
  );

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const itensGrade = useMemo(
    () =>
      grupos.map((grupo) => {
        const matricula = matriculaPorCursoId.get(grupo.id);
        const pagamento = matricula ? pagamentoPorMatriculaId.get(matricula.id) : null;
        return {
          curso: { imagemUrl: grupo.imagemUrl, titulo: grupo.titulo },
          id: grupo.id,
          matriculaId: matricula?.id ?? null,
          pagamentoPendente: Boolean(pagamento && pagamento.status === PAGAMENTO_PENDENTE),
          progresso: grupo.progresso,
          valorPagamento: pagamento?.valor
        };
      }),
    [grupos, matriculaPorCursoId, pagamentoPorMatriculaId]
  );

  // Abre o mesmo painel de confirmacao do Catalogo (ConfirmacaoCompraSheet,
  // POST /Matriculas/comprar) pra concluir a compra de uma matricula com
  // pagamento pendente — precisa do curso completo (preco/modeloCurso), que
  // itensGrade nao carrega, por isso busca em snapshot.cursos por id.
  function abrirConfirmacaoCompra(item) {
    const curso = cursoPorId.get(item.id);
    if (curso) {
      setCursoParaComprar(curso);
    }
  }

  function alternarModulo(moduloId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setModulosAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(moduloId)) {
        proximo.delete(moduloId);
      } else {
        proximo.add(moduloId);
      }
      return proximo;
    });
  }

  async function marcarConcluido(conteudoId) {
    setConteudoProcessando(conteudoId);
    setMensagem(null);

    try {
      await apiRequest(`/Progressos/conteudos/${conteudoId}/concluir`, { method: "PUT" });
      await onRecarregar();
      setMensagem({ tipo: "sucesso", texto: "Conteúdo concluído." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível atualizar o progresso." });
    } finally {
      setConteudoProcessando(null);
    }
  }

  async function abrirConteudo(conteudo) {
    // Busca um token valido na hora de abrir, em vez de usar um token vindo
    // via prop (que pode ter sido emitido ha mais de Jwt:ExpireMinutes e
    // nunca mais atualizado nesse componente) - renova sozinho se estiver
    // vencendo. Ver shared/apiClient.js:obterTokenValido.
    const tokenValido = await obterTokenValido();
    const url = resolverUrlArquivo(conteudo.arquivoUrl || conteudo.linkUrl, tokenValido);
    if (url) {
      Linking.openURL(url).catch(() => setMensagem({ tipo: "erro", texto: "Não foi possível abrir o arquivo." }));
    }
  }

  if (grupos.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Quando uma matrícula for aprovada, os cursos e módulos da sua trilha aparecerão aqui.</Text>
      </View>
    );
  }

  if (!cursoAtivo) {
    return (
      <View style={estilos.container}>
        <View style={estilos.cabecalhoGrade}>
          <View style={estilos.cabecalhoGradeTextos}>
            <Text style={estilos.tituloGrade}>Cursos</Text>
            <Text style={estilos.subtituloGrade}>Escolha um curso para continuar sua trilha</Text>
          </View>
          <TouchableOpacity
            accessibilityHint="Abre o catálogo de cursos disponíveis"
            accessibilityLabel="Ver catálogo"
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROUTES.CATALOGO)}
            style={estilos.botaoCatalogo}
          >
            <Ionicons color={cores.destaque} name="compass-outline" size={16} />
            <Text style={estilos.botaoCatalogoTexto}>Ver catálogo</Text>
          </TouchableOpacity>
        </View>

        {mensagem ? (
          <View style={estilos.mensagemGradeContainer}>
            <Toast mensagem={mensagem.texto} onFechar={() => setMensagem(null)} tipo={mensagem.tipo} />
          </View>
        ) : null}

        <GradeCursosConteudos
          accessibilityLabelPrefix="Ver conteúdos de"
          itens={itensGrade}
          onConcluirCompra={abrirConfirmacaoCompra}
          onSelecionar={setCursoSelecionadoId}
        />

        <ConfirmacaoCompraSheet
          curso={cursoParaComprar}
          onCompraConfirmada={onRecarregar}
          onFechar={() => setCursoParaComprar(null)}
          onIrParaCurso={(cursoId) => {
            setCursoParaComprar(null);
            setCursoSelecionadoId(cursoId);
          }}
          onSessionExpired={onSessionExpired}
          visivel={Boolean(cursoParaComprar)}
        />
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <TouchableOpacity
        accessibilityLabel="Voltar para a seleção de cursos"
        onPress={() => setCursoSelecionadoId(null)}
        style={estilos.voltar}
      >
        <Ionicons color={cores.destaque} name="chevron-back" size={18} />
        <Text style={estilos.voltarTexto}>Voltar</Text>
      </TouchableOpacity>

      <View style={estilos.cabecalhoCurso}>
        <CapaCurso curso={cursoAtivo} size={48} />
        <View style={estilos.cabecalhoCursoTextos}>
          <Text numberOfLines={2} style={estilos.tituloCursoAtivo}>{cursoAtivo.titulo}</Text>
          <Text style={estilos.subtituloCurso}>Progresso na trilha</Text>
          <View style={estilos.cabecalhoBarraFundo}>
            <View style={[estilos.cabecalhoBarraPreenchida, { width: `${Math.max(0, Math.min(cursoAtivo.progresso, 100))}%` }]} />
          </View>
        </View>
        <Text style={estilos.cabecalhoPercentual}>{Math.round(Math.max(0, Math.min(cursoAtivo.progresso, 100)))}%</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.corpo}>
        {cursoAtivo.proximoConteudo ? (
          <View style={estilos.continuar}>
            <View style={estilos.continuarIcone}>
              <Ionicons color={cores.destaque} name="play-circle-outline" size={20} />
            </View>
            <View style={estilos.continuarTextos}>
              <Text style={estilos.continuarRotulo}>Continue de onde parou</Text>
              <Text numberOfLines={1} style={estilos.continuarTitulo}>{cursoAtivo.proximoConteudo.titulo}</Text>
            </View>
            <TouchableOpacity
              accessibilityHint="Abre o módulo com o próximo conteúdo pendente"
              accessibilityLabel={`Abrir ${cursoAtivo.proximoConteudo.titulo}`}
              accessibilityRole="button"
              onPress={() => alternarModulo(cursoAtivo.proximoConteudo.moduloId)}
              style={estilos.continuarBotao}
            >
              <Text style={estilos.continuarBotaoTexto}>Abrir</Text>
              <Ionicons color={cores.texto} name="arrow-forward" size={14} />
            </TouchableOpacity>
          </View>
        ) : null}

        <Toast mensagem={mensagem?.texto} onFechar={() => setMensagem(null)} tipo={mensagem?.tipo} />

        {cursoAtivo.modulos.map((modulo) => {
          const aberto = !modulo.bloqueado && modulosAbertos.has(modulo.id);
          const totalConteudos = modulo.conteudos.length;
          const moduloConcluido = totalConteudos > 0 && modulo.concluidos === totalConteudos;
          const percentualModulo = totalConteudos > 0 ? (modulo.concluidos / totalConteudos) * 100 : 0;
          const linhas = montarLinhasModulo(modulo);

          return (
            <View key={modulo.id} style={estilos.modulo}>
              <TouchableOpacity
                accessibilityLabel={modulo.titulo}
                accessibilityRole="button"
                accessibilityState={{ disabled: modulo.bloqueado, expanded: aberto }}
                disabled={modulo.bloqueado}
                onPress={() => alternarModulo(modulo.id)}
                style={estilos.moduloCabecalho}
              >
                {modulo.bloqueado ? (
                  <View style={estilos.moduloIcone}>
                    <Ionicons color={cores.bloqueado} name="lock-closed-outline" size={18} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  {!modulo.bloqueado ? (
                    <View
                      style={[
                        estilos.moduloPill,
                        { backgroundColor: moduloConcluido ? cores.sucessoFundo : cores.informativoFundo }
                      ]}
                    >
                      <Text style={[estilos.moduloPillTexto, { color: moduloConcluido ? cores.sucesso : cores.informativo }]}>
                        {moduloConcluido ? "✓ Concluído" : "Em andamento"}
                      </Text>
                    </View>
                  ) : null}
                  <Text numberOfLines={2} style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  {modulo.bloqueado ? (
                    <Text style={estilos.moduloContagem}>Conclua o módulo anterior para desbloquear</Text>
                  ) : totalConteudos > 0 ? (
                    <>
                      <View style={estilos.moduloProgressoLinha}>
                        <Text style={estilos.moduloProgressoRotulo}>Progresso da trilha</Text>
                        <Text style={estilos.moduloProgressoValor}>{Math.round(percentualModulo)}%</Text>
                      </View>
                      <View
                        accessibilityHint="Representação visual do progresso do módulo em barra"
                        accessibilityLabel={`${modulo.concluidos} de ${totalConteudos} conteúdos concluídos${moduloConcluido ? ". Módulo concluído" : ""}`}
                        accessible
                        style={estilos.barraFundoFina}
                      >
                        <View style={[estilos.barraPreenchidaFina, { width: `${percentualModulo}%` }]} />
                      </View>
                    </>
                  ) : null}
                </View>
                <Ionicons
                  color={cores.textoSuave}
                  name={modulo.bloqueado ? "lock-closed" : aberto ? "chevron-up" : "chevron-down"}
                  size={18}
                />
              </TouchableOpacity>

              {aberto ? (
                <View style={estilos.itensLista}>
                  {linhas.map((linha, indice) => (
                    <LinhaConteudo
                      abrirConteudo={abrirConteudo}
                      conteudoProcessando={conteudoProcessando}
                      key={linha.chave}
                      linha={linha}
                      marcarConcluido={marcarConcluido}
                      mostrarDivisor={indice > 0 && !linha.recuado}
                      onAbrirQuiz={setQuizSelecionado}
                    />
                  ))}

                  {linhas.length === 0 ? <Text style={estilos.vazioModulo}>Nenhum material publicado neste módulo ainda.</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <QuizModal
        avaliacao={quizSelecionado}
        onConcluido={onRecarregar}
        onFechar={() => setQuizSelecionado(null)}
        onSessionExpired={onSessionExpired}
        visivel={Boolean(quizSelecionado)}
      />
    </View>
  );
}

// Pulso curto de escala no icone de check, so na transicao real
// false->true (nunca ao reabrir um modulo ja concluido antes) — usa um ref
// pra lembrar o valor anterior, unica forma segura de detectar "acabou de
// confirmar" dentro de um componente de lista remontado a cada render do pai.
function useAnimacaoConclusao(concluido) {
  const reduzMovimento = useReducedMotion();
  const escala = useSharedValue(1);
  const anterior = useRef(concluido);

  useEffect(() => {
    if (concluido && !anterior.current && !reduzMovimento) {
      escala.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 150 }));
    }
    anterior.current = concluido;
  }, [concluido, escala, reduzMovimento]);

  return useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
}

// Linha de lista (Material 3) pra um conteudo ou quiz dentro do modulo —
// substitui os cards pretos dentro do card roxo do modulo por linhas
// separadas por divisor fino, um unico elemento de status/acao a direita.
// A linha inteira abre o conteudo/quiz quando ha algo pra abrir; "Concluir"
// vira um checkbox proprio a direita (nao some quando a linha tambem abre
// arquivo — sao duas acoes reais e distintas, nao da pra fundir em uma so
// sem perder a capacidade de marcar concluido em conteudo sem arquivo).
function LinhaConteudo({ abrirConteudo, conteudoProcessando, linha, marcarConcluido, mostrarDivisor, onAbrirQuiz }) {
  const estiloLinha = [estilos.linha, linha.recuado ? estilos.linhaRecuada : null, mostrarDivisor ? estilos.linhaDivisor : null];
  const estiloCheck = useAnimacaoConclusao(linha.tipo === "conteudo" && linha.dado.concluido);

  if (linha.tipo === "conteudo") {
    const conteudo = linha.dado;
    const temArquivo = Boolean(conteudo.arquivoUrl || conteudo.linkUrl);
    const processando = conteudoProcessando === conteudo.id;
    const tocavel = temArquivo && !conteudo.bloqueado;

    const corpo = (
      <>
        <View style={estilos.linhaIcone}>
          <Ionicons color={cores.textoSuave} name={ICONE_TIPO_CONTEUDO[conteudo.tipoConteudo] || "document-outline"} size={18} />
        </View>
        <View style={estilos.linhaTextos}>
          <Text numberOfLines={2} style={estilos.linhaTitulo}>{conteudo.titulo}</Text>
          <Text style={estilos.linhaMeta}>{normalizeContentType(conteudo.tipoConteudo)}</Text>
        </View>
        {conteudo.bloqueado ? (
          <Ionicons color={cores.bloqueado} name="lock-closed-outline" size={20} />
        ) : conteudo.concluido ? (
          <Animated.View accessibilityHint="Indica que este conteúdo já foi concluído" accessibilityLabel="Concluído" accessible style={[estilos.statusPill, estilos.statusPillSucesso, estiloCheck]}>
            <Ionicons color={cores.sucesso} name="checkmark-circle" size={14} />
            <Text style={[estilos.statusPillTexto, { color: cores.sucesso }]}>Concluído</Text>
          </Animated.View>
        ) : processando ? (
          <ActivityIndicator color={cores.destaque} size="small" />
        ) : (
          <TouchableOpacity
            accessibilityLabel={`Marcar ${conteudo.titulo} como concluído`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => marcarConcluido(conteudo.id)}
            style={estilos.botaoContorno}
          >
            <Text style={estilos.botaoContornoTexto}>Concluir</Text>
          </TouchableOpacity>
        )}
      </>
    );

    if (tocavel) {
      return (
        <TouchableOpacity
          accessibilityLabel={`Abrir ${conteudo.titulo}, ${normalizeContentType(conteudo.tipoConteudo)}`}
          accessibilityRole="button"
          onPress={() => abrirConteudo(conteudo)}
          style={estiloLinha}
        >
          {corpo}
        </TouchableOpacity>
      );
    }

    return <View style={estiloLinha}>{corpo}</View>;
  }

  const quiz = linha.dado;
  const disponibilidade = obterDisponibilidadeAvaliacao(quiz);
  const concluidoQuiz = !disponibilidade.podeRealizar && disponibilidade.tone === "neutro";
  const tocavel = disponibilidade.podeRealizar || concluidoQuiz;

  const corpoQuiz = (
    <>
      <View style={estilos.linhaIcone}>
        <Ionicons color={cores.textoSuave} name="clipboard-outline" size={18} />
      </View>
      <View style={estilos.linhaTextos}>
        <Text numberOfLines={2} style={estilos.linhaTitulo}>{quiz.titulo}</Text>
        <Text style={estilos.linhaMeta}>Quiz · {formatQuestoes(quiz.totalQuestoes)} · sem nota</Text>
      </View>
      {disponibilidade.podeRealizar ? (
        <TouchableOpacity
          accessibilityHint="Abre o quiz para responder"
          accessibilityLabel={`Responder quiz ${quiz.titulo}`}
          accessibilityRole="button"
          onPress={() => onAbrirQuiz(quiz)}
          style={estilos.botaoContorno}
        >
          <Text style={estilos.botaoContornoTexto}>Responder</Text>
        </TouchableOpacity>
      ) : concluidoQuiz ? (
        <View accessibilityHint="Indica que este quiz já foi concluído" accessibilityLabel="Concluído" accessible style={[estilos.statusPill, estilos.statusPillSucesso]}>
          <Ionicons color={cores.sucesso} name="checkmark-circle" size={14} />
          <Text style={[estilos.statusPillTexto, { color: cores.sucesso }]}>Concluído</Text>
        </View>
      ) : (
        <Ionicons color={cores.bloqueado} name="lock-closed-outline" size={20} />
      )}
    </>
  );

  if (tocavel) {
    return (
      <TouchableOpacity
        accessibilityLabel={`Abrir quiz ${quiz.titulo}`}
        accessibilityRole="button"
        onPress={() => onAbrirQuiz(quiz)}
        style={estiloLinha}
      >
        {corpoQuiz}
      </TouchableOpacity>
    );
  }

  return <View style={estiloLinha}>{corpoQuiz}</View>;
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  voltar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.lg,
    marginLeft: -6
  },
  voltarTexto: { color: cores.destaque, fontWeight: "600" },
  cabecalhoCurso: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espacamentos.md,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.md,
    paddingBottom: espacamentos.xl
  },
  cabecalhoCursoTextos: { flex: 1, minWidth: 160 },
  tituloCursoAtivo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo },
  subtituloCurso: { color: cores.textoRotulo, fontSize: tipografia.rotulo, marginTop: 4, marginBottom: 6 },
  cabecalhoBarraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  cabecalhoBarraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  cabecalhoPercentual: { color: cores.texto, fontWeight: "800", fontSize: tipografia.subtitulo },
  corpo: { padding: espacamentos.xl, paddingTop: 0, paddingBottom: 40 },
  // Cabecalho da grade de selecao de curso (redesign, 2a_cursos_grade.png).
  cabecalhoGrade: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: espacamentos.md,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.xl,
    paddingBottom: espacamentos.md
  },
  cabecalhoGradeTextos: { flex: 1 },
  tituloGrade: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo },
  subtituloGrade: { color: cores.textoRotulo, fontSize: tipografia.rotulo, marginTop: 4 },
  botaoCatalogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.md,
    minHeight: 36
  },
  botaoCatalogoTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.rotulo },
  mensagemGradeContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.sm },
  continuar: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.lg,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque
  },
  continuarIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  continuarTextos: { flex: 1 },
  continuarRotulo: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.rotulo, marginBottom: 4 },
  continuarTitulo: { color: cores.texto, fontWeight: "600" },
  continuarBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: cores.destaque,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.md,
    minHeight: 36
  },
  continuarBotaoTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  modulo: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, marginBottom: 12, overflow: "hidden" },
  moduloCabecalho: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, padding: 14 },
  moduloIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  moduloPill: { alignSelf: "flex-start", borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3, marginBottom: 6 },
  moduloPillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  moduloContagem: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  moduloProgressoLinha: { flexDirection: "row", justifyContent: "space-between", marginTop: espacamentos.sm },
  moduloProgressoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  moduloProgressoValor: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700" },
  barraFundoFina: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: espacamentos.xs },
  barraPreenchidaFina: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  itensLista: { paddingBottom: espacamentos.xs },
  // Linha de lista unica (Material 3): sem fundo/borda proprios, separadas
  // por divisor fino. Altura minima 56dp (1 linha) crescendo naturalmente
  // ate ~72dp com titulo de 2 linhas. Padding horizontal igual ao do
  // cabecalho do modulo (14) pra alinhar visualmente.
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: espacamentos.md
  },
  linhaDivisor: { borderTopWidth: 1, borderTopColor: cores.bordaCartao },
  // Recuo alinhado ao inicio do texto do item pai (icone 36 + gap md), nao a
  // borda do card — mesmo recuo pra todo quiz vinculado a um conteudo.
  linhaRecuada: { paddingLeft: 14 + 36 + espacamentos.md },
  linhaIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: cores.fundoCartaoAtivo, alignItems: "center", justifyContent: "center" },
  linhaTextos: { flex: 1 },
  linhaTitulo: { color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  linhaMeta: { color: cores.textoRotulo, fontSize: tipografia.legenda, marginTop: 2 },
  botaoContorno: {
    borderWidth: 1,
    borderColor: cores.destaque,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.md,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  botaoContornoTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.rotulo },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4
  },
  statusPillSucesso: { backgroundColor: cores.sucessoFundo },
  statusPillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  vazioModulo: { color: cores.textoSuave, fontSize: tipografia.rotulo, fontStyle: "italic", paddingHorizontal: 14, paddingVertical: espacamentos.md },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
