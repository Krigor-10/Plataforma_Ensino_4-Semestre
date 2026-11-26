import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  BackHandler,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import ProgressoCircular from "../../components/ProgressoCircular.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, obterTokenValido, ApiError } from "../../lib/api.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { obterRotuloAcaoPrincipal, obterSituacaoCurso, obterVarianteAcaoPrincipalBotao, temAcessoLiberado } from "../../lib/cursosVitrine.js";
import { abrirArquivoSeguro } from "../../lib/abrirArquivoSeguro";
import { ehArquivoProprio, extrairNomeArquivo, resolverUrlArquivo, resolverUrlArquivoAbsoluta } from "../../lib/arquivos.js";
import { obterDisponibilidadeAvaliacao, TIPO_AVALIACAO_PROVA, VISUAL_TIPO_AVALIACAO } from "../../lib/avaliacoes.js";
import { formatQuestoes, normalizeContentType, normalizeStatus } from "../../lib/format.js";
import { hapticErro, hapticSucesso } from "../../lib/haptics.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";
import { useAlturaBarraAbas } from "../../lib/useAlturaBarraAbas.js";
import ConfirmacaoCompraSheet from "../../components/ConfirmacaoCompraSheet.jsx";
import DetalheCursoSheet from "../../components/DetalheCursoSheet.jsx";
import GradeCursosConteudos from "../../components/GradeCursosConteudos.jsx";
import QuizModal from "../../components/QuizModal.jsx";
import RevisaoQuizModal from "../../components/RevisaoQuizModal.jsx";
import VisualizadorConteudo from "../../components/VisualizadorConteudo.jsx";

// Tentativa ja corrigida (StatusTentativaAvaliacao, mesmo valor do backend
// - ver QuizModal.jsx:corrigida) - so nesse caso a revisao tem o que
// mostrar.
const STATUS_TENTATIVA_CORRIGIDA = 3;

const PAGAMENTO_PENDENTE = 1;
const PAGAMENTO_PAGO = 2;
// Tipos abertos dentro do app (modal) com conclusao automatica - ver
// pendencia_auditoria_conteudos_conclusao_exclusao_visualizacao (item B) na
// memoria do projeto. Texto (1) e Link externo (4) continuam com handoff
// via Linking e conclusao manual, fora do escopo pedido.
const TIPO_PDF = 2;
const TIPO_VIDEO = 3;
const TIPO_IMAGEM = 5;
const TIPOS_COM_VISUALIZADOR_INTEGRADO = new Set([TIPO_PDF, TIPO_VIDEO, TIPO_IMAGEM]);

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

// Conteudos com cara de clicavel (docs/redesign-mobile/PROMPT-agente-
// trilha-curso-compacta.md, item 5): icone verde pra material (os 5 tipos
// acima), roxo pra quiz - reaproveitando VISUAL_TIPO_AVALIACAO (Prova),
// criado pro mesmo fim na aba Avaliacoes.
const VISUAL_MATERIAL_CONTEUDO = {
  gradiente: ["rgba(34, 197, 94, 0.3)", "rgba(34, 197, 94, 0.08)"],
  corBorda: "rgba(74, 222, 128, 0.4)",
  corIcone: "#86efac"
};
const VISUAL_QUIZ_CONTEUDO = VISUAL_TIPO_AVALIACAO[TIPO_AVALIACAO_PROVA];

function obterRotuloAcaoConteudo(tipoConteudo) {
  if (Number(tipoConteudo) === TIPO_IMAGEM) {
    return "Ver";
  }
  if (Number(tipoConteudo) === TIPO_VIDEO) {
    return "Assistir";
  }
  return "Abrir";
}

// "N de M itens", contando conteudos + quiz (vinculado ou solto) - mesma
// lista plana que ja alimenta a renderizacao do modulo aberto, so que aqui
// so conta em vez de desenhar (item 1/4 do prompt: cabecalho do curso e
// cada linha de modulo mostram essa conta coerente com a %).
function contarItensModulo(modulo) {
  const linhas = montarLinhasModulo(modulo);
  let concluidos = 0;

  linhas.forEach((linha) => {
    if (linha.tipo === "conteudo") {
      if (linha.dado.concluido) {
        concluidos += 1;
      }
      return;
    }
    const disponibilidade = obterDisponibilidadeAvaliacao(linha.dado);
    if (!disponibilidade.podeRealizar && disponibilidade.tone === "neutro") {
      concluidos += 1;
    }
  });

  return { concluidos, total: linhas.length };
}

export default function ConteudosScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const alturaBarraAbas = useAlturaBarraAbas();
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [modulosAbertos, setModulosAbertos] = useState(() => new Set());
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [quizSelecionado, setQuizSelecionado] = useState(null);
  const [quizParaRevisar, setQuizParaRevisar] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);
  const [matriculaIdParaComprar, setMatriculaIdParaComprar] = useState(null);
  const [valorPagamentoPendenteParaComprar, setValorPagamentoPendenteParaComprar] = useState(null);
  const [venceEmParaComprar, setVenceEmParaComprar] = useState(null);
  const [conteudoVisualizando, setConteudoVisualizando] = useState(null);
  const [urlVisualizando, setUrlVisualizando] = useState(null);
  const jaTentouNovamenteVideoRef = useRef(false);
  const [itemGradeDetalhe, setItemGradeDetalhe] = useState(null);
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
      setConteudoVisualizando(null);
      setUrlVisualizando(null);
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

  // "N de M modulos" e "N de M itens" do cabecalho compacto (item 1 do
  // prompt) - modulos concluidos usa a mesma conta que cada linha de
  // modulo ja faz (moduloConcluido); itens soma contarItensModulo de cada
  // um (conteudos + quiz, coerente com a %).
  const resumoCurso = useMemo(() => {
    if (!cursoAtivo) {
      return { itensConcluidos: 0, itensTotal: 0, modulosConcluidos: 0, modulosTotal: 0 };
    }

    let modulosConcluidos = 0;
    let itensConcluidos = 0;
    let itensTotal = 0;

    cursoAtivo.modulos.forEach((modulo) => {
      const { concluidos, total } = contarItensModulo(modulo);
      itensConcluidos += concluidos;
      itensTotal += total;
      if (total > 0 && modulo.concluido) {
        modulosConcluidos += 1;
      }
    });

    return { itensConcluidos, itensTotal, modulosConcluidos, modulosTotal: cursoAtivo.modulos.length };
  }, [cursoAtivo]);

  // So avaliacao formal (Prova/Exercicio, tipoAvaliacao !== 1) conta aqui -
  // quiz e atividade formativa e nunca libera nem substitui essa avaliacao
  // (mesma regra de AvaliacaoService.AvaliacaoLiberadaPorProgresso, backend;
  // nada duplicado aqui, so lendo avaliacao.progressoLiberado via
  // obterDisponibilidadeAvaliacao, igual ja faz o LinhaConteudo pro quiz).
  const avaliacaoLiberada = useMemo(() => {
    if (!cursoAtivo) {
      return null;
    }

    return (
      snapshot.avaliacoes.find(
        (avaliacao) =>
          Number(avaliacao.tipoAvaliacao) !== 1 &&
          Number(avaliacao.cursoId) === cursoAtivo.id &&
          obterDisponibilidadeAvaliacao(avaliacao).podeRealizar
      ) || null
    );
  }, [cursoAtivo, snapshot.avaliacoes]);

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

  // Agrupado por matricula (nao "um pagamento por matricula"): depois que
  // uma compra cancelada pode ser refeita (prompt-agente-inscricoes-v3.md,
  // item 3), a MESMA matricula acumula varios Pagamentos ao longo do tempo
  // (Cancelado -> Pendente novo -> Pago, por exemplo) - precisa do pendente
  // e do pago especificos, nao so "o ultimo do array".
  const pagamentosPorMatriculaId = useMemo(() => {
    const mapa = new Map();
    (snapshot.pagamentos || []).forEach((pagamento) => {
      const lista = mapa.get(pagamento.matriculaId) || [];
      lista.push(pagamento);
      mapa.set(pagamento.matriculaId, lista);
    });
    return mapa;
  }, [snapshot.pagamentos]);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const itensGrade = useMemo(
    () =>
      grupos.map((grupo) => {
        const matricula = matriculaPorCursoId.get(grupo.id);
        const pagamentosDaMatricula = matricula ? (pagamentosPorMatriculaId.get(matricula.id) || []) : [];
        const pagamentoPago = pagamentosDaMatricula.find((pagamento) => pagamento.status === PAGAMENTO_PAGO);
        const pagamentoPendente = pagamentosDaMatricula.find((pagamento) => pagamento.status === PAGAMENTO_PENDENTE);
        // "N de M modulos" da vitrine (docs/redesign-mobile/PROMPT-agente-
        // cursos-vitrine.md, item 2) - mesma conta de modulosTotal/
        // modulosConcluidos de resumoCurso (cabecalho da trilha), reaplicada
        // aqui por curso pra nao exigir endpoint novo.
        let modulosConcluidos = 0;
        grupo.modulos.forEach((modulo) => {
          if (contarItensModulo(modulo).total > 0 && modulo.concluido) {
            modulosConcluidos += 1;
          }
        });

        return {
          curso: { id: grupo.id, imagemUrl: grupo.imagemUrl, titulo: grupo.titulo },
          id: grupo.id,
          matriculaId: matricula?.id ?? null,
          // Gratuito (nenhum pagamento nunca existiu) ou com Pagamento Pago
          // confirmado - "so Cancelado" (desistiu/venceu) NAO libera.
          acessoLiberado: pagamentosDaMatricula.length === 0 || Boolean(pagamentoPago),
          certificadoEmitidoEm: matricula?.certificadoEmitidoEm ?? null,
          modulosConcluidos,
          modulosTotal: grupo.modulos.length,
          pagamentoPendente: Boolean(pagamentoPendente),
          pagamentoVenceEm: pagamentoPendente?.venceEm ?? null,
          progresso: grupo.progresso,
          valorPagamento: pagamentoPendente?.valor
        };
      }),
    [grupos, matriculaPorCursoId, pagamentosPorMatriculaId]
  );

  // Abre o mesmo painel de confirmacao do Catalogo (ConfirmacaoCompraSheet,
  // POST /Matriculas/comprar) pra concluir a compra de uma matricula com
  // pagamento pendente — precisa do curso completo (preco/modeloCurso), que
  // itensGrade nao carrega, por isso busca em snapshot.cursos por id.
  // valorPagamento (ja calculado em itensGrade a partir do Pagamento real)
  // vai pro painel como "Total" - achado 9 do plano fluxo-venda-cursos: o
  // curso pode ter ficado mais caro depois que esta matricula foi criada,
  // e quem ja tem pagamento pendente paga o valor congelado, nao o atual.
  function abrirConfirmacaoCompra(item) {
    const curso = cursoPorId.get(item.id);
    if (curso) {
      setCursoParaComprar(curso);
      setMatriculaIdParaComprar(item.matriculaId);
      setValorPagamentoPendenteParaComprar(item.valorPagamento);
      setVenceEmParaComprar(item.pagamentoVenceEm);
    }
  }

  // "Detalhes" da vitrine (CartaoVitrineCurso/GradeCursosConteudos) precisa
  // do curso completo de snapshot.cursos (descricao, modeloCurso) pra
  // alimentar o DetalheCursoSheet - se ele tiver sumido do snapshot com a
  // matricula ainda ativa (raro: curso excluido no backend), antes isso
  // virava um toque sem efeito nenhum, sem nenhum aviso.
  function abrirDetalheCurso(item) {
    if (!cursoPorId.get(item.id)) {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir os detalhes deste curso agora." });
      return;
    }

    setItemGradeDetalhe(item);
  }

  // O aluno desiste da compra (prompt-agente-inscricoes-v3.md, item 11):
  // cancela so o Pagamento Pendente - a matricula continua Aprovada, e o
  // curso volta a mostrar "Comprar" depois do proximo onRecarregar.
  async function desistirDaCompra(item) {
    if (!item.matriculaId) {
      return;
    }

    try {
      await apiRequest(`/Pagamentos/${item.matriculaId}/cancelar`, { method: "POST" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível desistir da compra agora." });
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

  // Quiz ja concluido (tentativas esgotadas) abre a revisao (gabarito) em
  // vez do dialogo "Antes de comecar" de QuizModal.jsx - antes, reabrir um
  // quiz ja respondido so travava num aviso de limite de tentativas, sem
  // nenhum acesso as respostas antigas.
  function abrirQuizOuRevisao(quiz) {
    const disponibilidade = obterDisponibilidadeAvaliacao(quiz);
    const concluido = !disponibilidade.podeRealizar && disponibilidade.tone === "neutro";

    if (concluido && quiz.ultimaTentativaId && Number(quiz.ultimoStatusTentativa) === STATUS_TENTATIVA_CORRIGIDA) {
      setQuizParaRevisar(quiz);
      return;
    }

    setQuizSelecionado(quiz);
  }

  async function marcarConcluido(conteudoId) {
    setConteudoProcessando(conteudoId);
    setMensagem(null);

    try {
      await apiRequest(`/Progressos/conteudos/${conteudoId}/concluir`, { method: "PUT" });
      await onRecarregar();
      setMensagem({ tipo: "sucesso", texto: "Conteúdo concluído." });
      hapticSucesso();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      hapticErro();
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível atualizar o progresso." });
    } finally {
      setConteudoProcessando(null);
    }
  }

  async function abrirConteudo(conteudo) {
    const caminho = conteudo.arquivoUrl || conteudo.linkUrl;
    if (!caminho) {
      return;
    }

    // Busca um token valido na hora de abrir, em vez de usar um token vindo
    // via prop (que pode ter sido emitido ha mais de Jwt:ExpireMinutes e
    // nunca mais atualizado nesse componente) - renova sozinho se estiver
    // vencendo. Ver shared/apiClient.js:obterTokenValido.
    if (TIPOS_COM_VISUALIZADOR_INTEGRADO.has(conteudo.tipoConteudo)) {
      const tokenValido = await obterTokenValido();
      jaTentouNovamenteVideoRef.current = false;
      setConteudoVisualizando(conteudo);
      setUrlVisualizando(resolverUrlArquivo(caminho, tokenValido));
      return;
    }

    // Arquivo proprio fora do visualizador integrado (ex.: anexo de texto):
    // baixa com o token so no header, nunca na URL - ver Fase 4 em
    // mobile_seguranca_sessao_e_certificado. Link externo (tipo Link) nao
    // precisa de token e continua abrindo direto no navegador/app do sistema.
    if (ehArquivoProprio(caminho)) {
      try {
        const tokenValido = await obterTokenValido();
        await abrirArquivoSeguro({
          nomeArquivo: extrairNomeArquivo(caminho, conteudo.titulo),
          token: tokenValido,
          urlAbsoluta: resolverUrlArquivoAbsoluta(caminho)
        });
      } catch {
        setMensagem({ tipo: "erro", texto: "Não foi possível abrir o arquivo." });
      }
      return;
    }

    Linking.openURL(caminho).catch(() => setMensagem({ tipo: "erro", texto: "Não foi possível abrir o arquivo." }));
  }

  // O token na URL do video (?access_token=) dura Jwt:ExpireMinutes (20 min)
  // - com o visualizador aberto por mais tempo, um avanco/retrocesso que
  // peca um pedaco novo do video pode cair com o token ja vencido. Recalcula
  // o link (token mais recente, ja renovado em segundo plano pelo refresh
  // token) e tenta de novo UMA vez so (docs/bugs/PROMPT-agente-video-nao-
  // carrega-producao.md). useVideoPlayer recria o player sozinho quando a
  // URL muda (ver expo-video), retomando a posicao via VisualizadorVideo.
  async function recarregarVideoAposErro() {
    if (jaTentouNovamenteVideoRef.current || !conteudoVisualizando) {
      return;
    }
    jaTentouNovamenteVideoRef.current = true;

    const caminho = conteudoVisualizando.arquivoUrl;
    if (!caminho) {
      return;
    }

    const tokenValido = await obterTokenValido();
    setUrlVisualizando(resolverUrlArquivo(caminho, tokenValido));
  }

  if (grupos.length === 0) {
    return (
      <View style={estilos.container}>
        <EstadoVazio icone="school-outline" mensagem="Quando uma matrícula for aprovada, os cursos e módulos da sua trilha aparecerão aqui." />
      </View>
    );
  }

  if (!cursoAtivo) {
    const situacaoDetalhe = itemGradeDetalhe ? obterSituacaoCurso(itemGradeDetalhe) : null;

    return (
      <View style={estilos.container}>
        {mensagem ? (
          <View style={estilos.mensagemGradeContainer}>
            <Toast mensagem={mensagem.texto} onFechar={() => setMensagem(null)} tipo={mensagem.tipo} />
          </View>
        ) : null}

        <GradeCursosConteudos
          accessibilityLabelPrefix="Ver conteúdos de"
          itens={itensGrade}
          onAbrirDetalhe={abrirDetalheCurso}
          onConcluirCompra={abrirConfirmacaoCompra}
          onDesistir={desistirDaCompra}
          onSelecionar={setCursoSelecionadoId}
        />

        <DetalheCursoSheet
          acaoPrincipal={
            itemGradeDetalhe
              ? {
                  accessibilityHint: temAcessoLiberado(situacaoDetalhe)
                    ? `Abre a trilha do curso ${itemGradeDetalhe.curso.titulo}`
                    : `Abre a confirmação de compra de ${itemGradeDetalhe.curso.titulo}`,
                  accessibilityLabel: `${obterRotuloAcaoPrincipal(situacaoDetalhe)} ${itemGradeDetalhe.curso.titulo}`,
                  onPress: () => {
                    const item = itemGradeDetalhe;
                    setItemGradeDetalhe(null);
                    if (temAcessoLiberado(situacaoDetalhe)) {
                      setCursoSelecionadoId(item.id);
                    } else {
                      abrirConfirmacaoCompra(item);
                    }
                  },
                  rotulo: obterRotuloAcaoPrincipal(situacaoDetalhe),
                  variante: obterVarianteAcaoPrincipalBotao(situacaoDetalhe)
                }
              : null
          }
          curso={itemGradeDetalhe ? cursoPorId.get(itemGradeDetalhe.id) : null}
          onFechar={() => setItemGradeDetalhe(null)}
          visivel={Boolean(itemGradeDetalhe)}
        />

        <ConfirmacaoCompraSheet
          curso={cursoParaComprar}
          matriculaId={matriculaIdParaComprar}
          onCompraConfirmada={onRecarregar}
          onDesistirConfirmado={onRecarregar}
          onFechar={() => {
            setCursoParaComprar(null);
            setMatriculaIdParaComprar(null);
            setValorPagamentoPendenteParaComprar(null);
            setVenceEmParaComprar(null);
          }}
          onIrParaCurso={(cursoId) => {
            setCursoParaComprar(null);
            setMatriculaIdParaComprar(null);
            setValorPagamentoPendenteParaComprar(null);
            setVenceEmParaComprar(null);
            setCursoSelecionadoId(cursoId);
          }}
          onSessionExpired={onSessionExpired}
          valorTotal={valorPagamentoPendenteParaComprar}
          venceEm={venceEmParaComprar}
          visivel={Boolean(cursoParaComprar)}
        />
      </View>
    );
  }

  const percentualCurso = Math.max(0, Math.min(Number(cursoAtivo.progresso) || 0, 100));

  return (
    <View style={estilos.container}>
      <ScrollView contentContainerStyle={[estilos.corpo, { paddingBottom: alturaBarraAbas }]}>
        <View style={estilos.cabecalhoCurso}>
          <TouchableOpacity
            accessibilityHint="Volta para a lista de cursos"
            accessibilityLabel="Voltar para a seleção de cursos"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setCursoSelecionadoId(null)}
            style={estilos.botaoVoltarCompacto}
          >
            <Ionicons color="#c4b5fd" name="chevron-back" size={18} />
          </TouchableOpacity>

          <View style={estilos.cabecalhoCursoTextos}>
            <Text style={estilos.cabecalhoRotuloCurso}>CURSO</Text>
            <Text numberOfLines={1} style={estilos.tituloCursoAtivo}>{cursoAtivo.titulo}</Text>
            <Text numberOfLines={1} style={estilos.cabecalhoContagem}>
              {resumoCurso.modulosConcluidos} de {resumoCurso.modulosTotal} módulos · {resumoCurso.itensConcluidos} de {resumoCurso.itensTotal} itens
            </Text>
          </View>

          <ProgressoCircular cor={percentualCurso >= 100 ? cores.sucesso : cores.destaque} espessura={4} percentual={percentualCurso} size={40} />
        </View>

        {avaliacaoLiberada ? (
          <AvisoAvaliacaoLiberada
            avaliacao={avaliacaoLiberada}
            onIrParaAvaliacao={() => navigation.navigate(ROUTES.AVALIACOES, { cursoId: cursoAtivo.id })}
          />
        ) : null}

        {!avaliacaoLiberada && cursoAtivo.proximoConteudo ? (
          <View style={estilos.linhaDestaque}>
            <View style={estilos.linhaDestaqueIconeRoxo}>
              <Ionicons color={cores.destaque} name="play-circle-outline" size={16} />
            </View>
            <View style={estilos.linhaDestaqueTextos}>
              <Text style={estilos.linhaDestaqueTitulo}>Continue de onde parou</Text>
              <Text numberOfLines={1} style={estilos.linhaDestaqueSubtitulo}>{cursoAtivo.proximoConteudo.titulo}</Text>
            </View>
            <TouchableOpacity
              accessibilityHint="Abre o módulo com o próximo conteúdo pendente"
              accessibilityLabel={`Abrir ${cursoAtivo.proximoConteudo.titulo}`}
              accessibilityRole="button"
              onPress={() => alternarModulo(cursoAtivo.proximoConteudo.moduloId)}
              style={[estilos.linhaDestaquePilula, estilos.linhaDestaquePilulaRoxa]}
            >
              <Text style={estilos.linhaDestaquePilulaTexto}>Abrir</Text>
              <Ionicons color={cores.texto} name="chevron-forward" size={14} />
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={estilos.rotuloSecaoModulos}>MÓDULOS</Text>

        <Toast mensagem={mensagem?.texto} onFechar={() => setMensagem(null)} tipo={mensagem?.tipo} />

        {cursoAtivo.modulos.map((modulo, indiceModulo) => {
          const aberto = !modulo.bloqueado && modulosAbertos.has(modulo.id);
          const totalConteudos = modulo.conteudos.length;
          // Modulo so com quiz (sem nenhum conteudo) tambem tem contagem/
          // barra - contar os quizzes aqui tambem, nao so os conteudos
          // (prompt-agente-progresso-e-trava-ao-concluir.md, Parte B, item 7).
          const totalItensModulo = totalConteudos + modulo.quizzes.length;
          // modulo.concluido/progresso ja vem do backend (ProgressoModuloAluno,
          // ver agruparConteudosPorCurso) e pondera o(s) quiz(zes) do modulo
          // junto com os conteudos - nao so os conteudos.
          const moduloConcluido = totalItensModulo > 0 && modulo.concluido;
          const percentualModulo = totalItensModulo > 0 ? Math.max(0, Math.min(modulo.progresso, 100)) : 0;
          const linhas = montarLinhasModulo(modulo);
          // "N de M concluidos" contando conteudo + quiz, coerente com a %
          // (item 4 do prompt) - mesma conta do resumo do cabecalho.
          const { concluidos: itensConcluidosModulo, total: itensTotalModulo } = contarItensModulo(modulo);

          return (
            <View key={modulo.id} style={estilos.modulo}>
              <TouchableOpacity
                accessibilityHint={modulo.bloqueado ? undefined : aberto ? "Recolhe os itens deste módulo" : "Expande os itens deste módulo"}
                accessibilityLabel={modulo.titulo}
                accessibilityRole="button"
                accessibilityState={{ disabled: modulo.bloqueado, expanded: aberto }}
                disabled={modulo.bloqueado}
                onPress={() => alternarModulo(modulo.id)}
                style={estilos.moduloCabecalho}
              >
                <View
                  style={[
                    estilos.moduloQuadrado,
                    modulo.bloqueado ? estilos.moduloQuadradoBloqueado : moduloConcluido ? estilos.moduloQuadradoConcluido : null
                  ]}
                >
                  {modulo.bloqueado ? (
                    <Ionicons color={cores.bloqueado} name="lock-closed" size={14} testID="icone-modulo-bloqueado" />
                  ) : moduloConcluido ? (
                    <Ionicons color={cores.sucesso} name="checkmark" size={16} testID="icone-modulo-concluido" />
                  ) : (
                    <Text style={estilos.moduloQuadradoTexto}>{String(indiceModulo + 1).padStart(2, "0")}</Text>
                  )}
                </View>

                <View style={estilos.moduloTextos}>
                  <Text numberOfLines={2} style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  {modulo.bloqueado ? (
                    <Text style={estilos.moduloContagem}>Conclua o módulo anterior</Text>
                  ) : itensTotalModulo > 0 ? (
                    <Text
                      accessibilityHint="Quantidade de itens concluídos neste módulo"
                      accessibilityLabel={`${itensConcluidosModulo} de ${itensTotalModulo} concluídos${moduloConcluido ? ". Módulo concluído" : ""}`}
                      style={estilos.moduloContagem}
                    >
                      {itensConcluidosModulo} de {itensTotalModulo} concluídos
                    </Text>
                  ) : null}
                </View>

                {!modulo.bloqueado && totalItensModulo > 0 ? (
                  <View style={estilos.moduloMiniBarraFundo}>
                    <View
                      style={[
                        estilos.moduloMiniBarraPreenchida,
                        { width: `${percentualModulo}%`, backgroundColor: moduloConcluido ? cores.sucesso : cores.destaque }
                      ]}
                    />
                  </View>
                ) : null}

                {!modulo.bloqueado ? (
                  <Ionicons
                    color={cores.textoSuave}
                    name={aberto ? "chevron-up" : "chevron-down"}
                    size={18}
                    testID="icone-chevron-modulo"
                  />
                ) : null}
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
                      onAbrirQuiz={abrirQuizOuRevisao}
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

      <RevisaoQuizModal
        avaliacaoId={quizParaRevisar?.id}
        onFechar={() => setQuizParaRevisar(null)}
        onSessionExpired={onSessionExpired}
        tentativaId={quizParaRevisar?.ultimaTentativaId}
        visivel={Boolean(quizParaRevisar)}
      />

      <VisualizadorConteudo
        conteudo={conteudoVisualizando}
        jaConcluido={Boolean(conteudoVisualizando?.concluido)}
        onConcluir={marcarConcluido}
        onErroVideo={recarregarVideoAposErro}
        onFechar={() => {
          setConteudoVisualizando(null);
          setUrlVisualizando(null);
        }}
        url={urlVisualizando}
        visivel={Boolean(conteudoVisualizando)}
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

// Entrada suave (fade + leve deslocamento) na primeira montagem do card -
// dispara de novo toda vez que o card passa de escondido pra visivel (o pai
// so monta este componente quando ha avaliacao liberada, entao reaproveita o
// ciclo de mount/unmount do React em vez de um estado extra pra "ja animei").
function useEntradaSutil() {
  const reduzMovimento = useReducedMotion();
  const opacidade = useSharedValue(reduzMovimento ? 1 : 0);
  const deslocamento = useSharedValue(reduzMovimento ? 0 : -8);

  useEffect(() => {
    if (reduzMovimento) {
      return;
    }
    opacidade.value = withTiming(1, { duration: 220 });
    deslocamento.value = withTiming(0, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so quer animar uma vez, na montagem deste card.
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacidade.value, transform: [{ translateY: deslocamento.value }] }));
}

// Avaliacao aqui e sempre a prova/exercicio formal (tipoAvaliacao !== 1) -
// quiz nunca aparece neste aviso, ver filtro em avaliacaoLiberada no caller.
// Card unico de ~52px (item 2 do prompt): quando ha avaliacao liberada ela
// toma prioridade sobre "Continue de onde parou" (ver gating no return
// principal), entao esse card concentra sozinho "ha algo pra fazer agora".
function AvisoAvaliacaoLiberada({ avaliacao, onIrParaAvaliacao }) {
  const estiloEntrada = useEntradaSutil();

  return (
    <Animated.View style={estiloEntrada}>
      <TouchableOpacity
        accessibilityHint="Abre a avaliação liberada deste curso"
        accessibilityLabel={`Ir para a avaliação ${avaliacao.titulo}`}
        accessibilityRole="button"
        onPress={onIrParaAvaliacao}
        style={estilos.avisoAvaliacao}
      >
        <View style={estilos.avisoAvaliacaoIcone}>
          <Ionicons color={cores.sucesso} name="trophy" size={16} />
        </View>
        <View style={estilos.avisoAvaliacaoTextos}>
          <Text style={estilos.avisoAvaliacaoTitulo}>Avaliação liberada</Text>
          <Text numberOfLines={1} style={estilos.avisoAvaliacaoTexto}>{avaliacao.titulo}</Text>
        </View>
        <View style={estilos.avisoAvaliacaoPilula}>
          <Text style={estilos.avisoAvaliacaoPilulaTexto}>Iniciar</Text>
          <Ionicons color={cores.texto} name="chevron-forward" size={14} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Linha de lista (Material 3) pra um conteudo ou quiz dentro do modulo —
// substitui os cards pretos dentro do card roxo do modulo por linhas
// separadas por divisor fino, um unico elemento de status/acao a direita.
// A linha inteira abre o conteudo/quiz quando ha algo pra abrir; "Concluir"
// vira um checkbox proprio a direita (nao some quando a linha tambem abre
// arquivo — sao duas acoes reais e distintas, nao da pra fundir em uma so
// sem perder a capacidade de marcar concluido em conteudo sem arquivo).
// Quadrado de icone com gradiente (verde = material, roxo = quiz, cinza =
// bloqueado) + selinho de check sobreposto no canto quando concluido (item 5
// do prompt) - substitui o icone cinza solto + a pilula grande "Concluido".
function QuadradoIconeConteudo({ bloqueado, concluido, estiloCheck, icone, visual }) {
  if (bloqueado) {
    return (
      <View style={[estilos.conteudoQuadrado, estilos.conteudoQuadradoBloqueado]}>
        <Ionicons color={cores.bloqueado} name="lock-closed-outline" size={16} />
      </View>
    );
  }

  return (
    <View style={estilos.conteudoQuadradoWrapper}>
      <LinearGradient colors={visual.gradiente} style={[estilos.conteudoQuadrado, { borderColor: visual.corBorda }]}>
        <Ionicons color={visual.corIcone} name={icone} size={17} />
      </LinearGradient>
      {concluido ? (
        <Animated.View accessibilityElementsHidden style={[estilos.conteudoSelinhoCheck, estiloCheck]} testID="selo-concluido">
          <Ionicons color={cores.texto} name="checkmark" size={10} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function LinhaConteudo({ abrirConteudo, conteudoProcessando, linha, marcarConcluido, mostrarDivisor, onAbrirQuiz }) {
  const estiloLinha = [estilos.linha, linha.recuado ? estilos.linhaRecuada : null, mostrarDivisor ? estilos.linhaDivisor : null];
  const estiloCheck = useAnimacaoConclusao(linha.tipo === "conteudo" && linha.dado.concluido);

  if (linha.tipo === "conteudo") {
    const conteudo = linha.dado;
    const temArquivo = Boolean(conteudo.arquivoUrl || conteudo.linkUrl);
    const processando = conteudoProcessando === conteudo.id;
    const tocavel = temArquivo && !conteudo.bloqueado;
    const comVisualizadorIntegrado = TIPOS_COM_VISUALIZADOR_INTEGRADO.has(conteudo.tipoConteudo);
    const rotuloAcao = obterRotuloAcaoConteudo(conteudo.tipoConteudo);

    const corpo = (
      <>
        <QuadradoIconeConteudo
          bloqueado={conteudo.bloqueado}
          concluido={conteudo.concluido}
          estiloCheck={estiloCheck}
          icone={ICONE_TIPO_CONTEUDO[conteudo.tipoConteudo] || "document-outline"}
          visual={VISUAL_MATERIAL_CONTEUDO}
        />
        <View style={estilos.linhaTextos}>
          <Text numberOfLines={2} style={estilos.linhaTitulo}>{conteudo.titulo}</Text>
          <Text style={estilos.linhaMeta}>
            {normalizeContentType(conteudo.tipoConteudo)}
            {conteudo.concluido ? " · lido" : ""}
          </Text>
        </View>
        {conteudo.bloqueado ? null : conteudo.concluido ? (
          tocavel ? <Text style={estilos.linhaAcaoCinza}>Rever ›</Text> : null
        ) : processando ? (
          <ActivityIndicator color={cores.destaque} size="small" />
        ) : comVisualizadorIntegrado ? (
          <Text style={estilos.linhaAcaoRoxa}>{rotuloAcao} ›</Text>
        ) : (
          <TouchableOpacity
            accessibilityHint="Marca este conteúdo como concluído"
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
        <Pressable
          accessibilityHint="Abre o conteúdo para visualização"
          accessibilityLabel={`Abrir ${conteudo.titulo}, ${normalizeContentType(conteudo.tipoConteudo)}`}
          accessibilityRole="button"
          onPress={() => abrirConteudo(conteudo)}
          style={({ pressed }) => [...estiloLinha, pressed ? estilos.linhaPressionada : null]}
        >
          {corpo}
        </Pressable>
      );
    }

    return <View style={estiloLinha}>{corpo}</View>;
  }

  const quiz = linha.dado;
  const disponibilidade = obterDisponibilidadeAvaliacao(quiz);
  const concluidoQuiz = !disponibilidade.podeRealizar && disponibilidade.tone === "neutro";
  const tocavel = disponibilidade.podeRealizar || concluidoQuiz;
  const temRevisaoDisponivel =
    concluidoQuiz && Boolean(quiz.ultimaTentativaId) && Number(quiz.ultimoStatusTentativa) === STATUS_TENTATIVA_CORRIGIDA;

  const corpoQuiz = (
    <>
      <QuadradoIconeConteudo
        bloqueado={!disponibilidade.podeRealizar && !concluidoQuiz}
        concluido={concluidoQuiz}
        estiloCheck={estiloCheck}
        icone="clipboard-outline"
        visual={VISUAL_QUIZ_CONTEUDO}
      />
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
          style={estilos.botaoResponderPreenchido}
        >
          <Text style={estilos.botaoResponderPreenchidoTexto}>Responder</Text>
        </TouchableOpacity>
      ) : concluidoQuiz ? (
        temRevisaoDisponivel ? <Text style={estilos.linhaAcaoRoxa}>Ver revisão ›</Text> : null
      ) : null}
    </>
  );

  if (tocavel) {
    return (
      <Pressable
        accessibilityHint={temRevisaoDisponivel ? "Mostra a revisão com o gabarito do quiz" : undefined}
        accessibilityLabel={temRevisaoDisponivel ? `Ver revisão do quiz ${quiz.titulo}` : `Abrir quiz ${quiz.titulo}`}
        accessibilityRole="button"
        onPress={() => onAbrirQuiz(quiz)}
        style={({ pressed }) => [...estiloLinha, pressed ? estilos.linhaPressionada : null]}
      >
        {corpoQuiz}
      </Pressable>
    );
  }

  return <View style={estiloLinha}>{corpoQuiz}</View>;
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  // Cabecalho compacto (item 1 do prompt): rola junto com a tela em vez de
  // ocupar uma faixa fixa grande no topo - volta ‹, titulo+contagem e o anel
  // de progresso, tudo em uma unica linha ~56px.
  cabecalhoCurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    marginBottom: espacamentos.md
  },
  botaoVoltarCompacto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  cabecalhoCursoTextos: { flex: 1 },
  cabecalhoRotuloCurso: { color: cores.textoSuave, fontWeight: "700", fontSize: tipografia.legenda, letterSpacing: 0.5 },
  tituloCursoAtivo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, marginTop: 2 },
  cabecalhoContagem: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, paddingBottom: 40 },
  mensagemGradeContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.lg },
  // "Continue de onde parou" compacto (item 3 do prompt): 1 linha ~52px, so
  // aparece quando nao ha avaliacao liberada (gating no return principal).
  linhaDestaque: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.lg,
    paddingHorizontal: espacamentos.md,
    paddingVertical: espacamentos.sm,
    marginBottom: espacamentos.md,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque,
    minHeight: 52
  },
  linhaDestaqueIconeRoxo: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(123, 47, 247, 0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  linhaDestaqueTextos: { flex: 1 },
  linhaDestaqueTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  linhaDestaqueSubtitulo: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 },
  linhaDestaquePilula: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    minHeight: 32
  },
  linhaDestaquePilulaRoxa: { backgroundColor: cores.destaque },
  linhaDestaquePilulaTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.legenda },
  // Aviso "avaliacao liberada" (item 2 do prompt): mesma forma de 1 linha
  // ~52px do card "continuar" acima, em verde-sucesso pra marcar conquista
  // sem repetir a cor da acao padrao. Toma prioridade sobre o "continuar"
  // (gating no return principal) - card inteiro e tocavel.
  avisoAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.sucessoFundo,
    borderRadius: raios.lg,
    paddingHorizontal: espacamentos.md,
    paddingVertical: espacamentos.sm,
    marginBottom: espacamentos.md,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
    minHeight: 52
  },
  avisoAvaliacaoIcone: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  avisoAvaliacaoTextos: { flex: 1 },
  avisoAvaliacaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  avisoAvaliacaoTexto: { color: cores.textoRotulo, fontSize: tipografia.legenda, marginTop: 2 },
  avisoAvaliacaoPilula: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: cores.sucesso,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    minHeight: 32
  },
  avisoAvaliacaoPilulaTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.legenda },
  rotuloSecaoModulos: {
    color: cores.textoSuave,
    fontWeight: "700",
    fontSize: tipografia.legenda,
    letterSpacing: 0.5,
    marginBottom: espacamentos.sm
  },
  modulo: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, marginBottom: 12, overflow: "hidden" },
  // Modulo em 1 linha ~56px (item 4 do prompt): quadrado numerado/✓/cadeado
  // + titulo+contagem + mini-barra + chevron, tudo numa linha so.
  moduloCabecalho: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, padding: 14, minHeight: 56 },
  moduloQuadrado: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(123, 47, 247, 0.4)",
    backgroundColor: "rgba(123, 47, 247, 0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  moduloQuadradoConcluido: { backgroundColor: cores.sucessoFundo, borderColor: cores.sucesso },
  moduloQuadradoBloqueado: { backgroundColor: cores.fundoCartaoAtivo, borderColor: cores.bordaCartao },
  moduloQuadradoTexto: { color: cores.destaque, fontWeight: "700", fontSize: tipografia.legenda },
  moduloTextos: { flex: 1 },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo },
  moduloContagem: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 },
  moduloMiniBarraFundo: { width: 54, height: 5, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  moduloMiniBarraPreenchida: { height: 5, borderRadius: raios.sm },
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
  // Recuo alinhado ao inicio do texto do item pai (quadrado 34 + gap md), nao
  // a borda do card — mesmo recuo pra todo quiz vinculado a um conteudo.
  linhaRecuada: { paddingLeft: 14 + 34 + espacamentos.md },
  linhaPressionada: { backgroundColor: "rgba(123, 47, 247, 0.08)" },
  linhaTextos: { flex: 1 },
  linhaTitulo: { color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  linhaMeta: { color: cores.textoRotulo, fontSize: tipografia.legenda, marginTop: 2 },
  linhaAcaoRoxa: { color: "#a78bfa", fontWeight: "700", fontSize: tipografia.rotulo },
  linhaAcaoCinza: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.rotulo },
  // Quadrado de icone com gradiente (item 5 do prompt) - wrapper precisa de
  // position:relative pra o selinho de check ficar sobreposto no canto.
  conteudoQuadradoWrapper: { width: 34, height: 34, position: "relative" },
  conteudoQuadrado: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  conteudoQuadradoBloqueado: { backgroundColor: cores.fundoCartaoAtivo, borderColor: cores.bordaCartao },
  conteudoSelinhoCheck: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: cores.sucesso,
    borderWidth: 2,
    borderColor: cores.fundoCartao,
    alignItems: "center",
    justifyContent: "center"
  },
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
  botaoResponderPreenchido: {
    backgroundColor: cores.destaque,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.md,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  botaoResponderPreenchidoTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  vazioModulo: { color: cores.textoSuave, fontSize: tipografia.rotulo, fontStyle: "italic", paddingHorizontal: 14, paddingVertical: espacamentos.md }
});
