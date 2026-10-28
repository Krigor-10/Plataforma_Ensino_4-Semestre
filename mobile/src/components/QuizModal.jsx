import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import ModalConfirmarSaida from "./ModalConfirmarSaida.jsx";
import Toast from "./Toast.jsx";
import { apiRequest, ApiError } from "../lib/api.js";
import { criarRespostasIniciais } from "../lib/avaliacoes.js";
import { formatarTempoRestante, formatPercent, formatScore, normalizeEvaluationType, normalizeQuestionType } from "../lib/format.js";
import { rascunhoAvaliacaoValido, removerRascunhoAvaliacao, salvarRascunhoAvaliacao } from "../lib/quizRascunho.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

const TIPO_QUIZ = 1;

// Qualquer erro que chegue aqui sem ser ApiError veio de fora do ciclo
// requisicao/resposta HTTP (fetch falhou antes de ter uma resposta pra
// interpretar) - timeout, sem conexao, DNS indisponivel (UnknownHostException
// no Android quando nao consegue resolver o host da API). Nesses casos
// err.message costuma ser texto tecnico cru ("Network request failed", ou a
// mensagem nativa da excecao) sem nenhum tratamento - nao deve ir direto pro
// Toast que o aluno ve. ApiError (erro HTTP com resposta de verdade) continua
// mostrando a mensagem vinda do backend normalmente.
function ehErroDeRede(err) {
  return !(err instanceof ApiError);
}

/**
 * Modal de "fazer avaliacao/quiz" reutilizado tanto pela lista de
 * Avaliacoes quanto pelo quiz inline dentro de um modulo em Conteudos —
 * mesmo fluxo confirmar -> responder -> resultado do frontend web
 * (useExecucaoAvaliacao em SecoesAluno.jsx), portado pra React Native.
 */
export default function QuizModal({ avaliacao, onConcluido, onFechar, onSessionExpired, visivel }) {
  const [fase, setFase] = useState("confirmar");
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [apoioAberto, setApoioAberto] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(null);
  const [tentativaOffset, setTentativaOffset] = useState(0);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const prazoFinalRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visivel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional do estado interno do modal toda vez que ele reabre (nova avaliacao ou reabertura da mesma); nao ha forma de computar isso como estado derivado porque o modal precisa permitir editar fase/respostas depois.
      setFase("confirmar");
      setQuestoes([]);
      setRespostas({});
      setIndiceAtual(0);
      setApoioAberto(true);
      setErro("");
      setResultado(null);
      setTempoRestante(null);
      setTentativaOffset(0);
      setConfirmandoSaida(false);
      prazoFinalRef.current = null;
    }
  }, [visivel, avaliacao?.id]);

  async function enviar(porTempoEsgotado) {
    if (enviando) {
      return;
    }

    setEnviando(true);
    setErro(porTempoEsgotado ? "Tempo esgotado. Enviando suas respostas automaticamente." : "");

    const payload = {
      respostas: questoes.map((questao) => {
        const resposta = respostas[questao.id];
        return {
          questaoId: questao.id,
          alternativaId: resposta?.alternativaId || null,
          respostaTexto: String(resposta?.respostaTexto || "").trim()
        };
      })
    };

    try {
      const tentativa = await apiRequest(`/Avaliacoes/${avaliacao.id}/aluno/respostas`, { method: "POST", body: JSON.stringify(payload) });
      setResultado(tentativa);
      setFase("resultado");
      removerRascunhoAvaliacao(avaliacao.id);
      onConcluido?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErro(
        ehErroDeRede(err)
          ? "Sem conexão com o servidor. Verifique sua internet e tente novamente — suas respostas continuam salvas neste dispositivo."
          : err.message || "Não foi possível enviar a avaliação agora."
      );
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    if (fase !== "execucao" || prazoFinalRef.current === null) {
      return undefined;
    }

    function recalcular() {
      const restante = Math.max(0, Math.round((prazoFinalRef.current - Date.now()) / 1000));
      setTempoRestante(restante);
      return restante;
    }

    if (recalcular() <= 0) {
      enviar(true);
      return undefined;
    }

    const intervalo = setInterval(() => {
      if (recalcular() <= 0) {
        clearInterval(intervalo);
        enviar(true);
      }
    }, 1000);

    const assinatura = AppState.addEventListener("change", (proximoEstado) => {
      if (proximoEstado === "active" && recalcular() <= 0) {
        enviar(true);
      }
    });

    return () => {
      clearInterval(intervalo);
      assinatura.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enviar/recalcular sao recriados a cada render (nao usam useCallback de proposito), mas o cronometro so deve reiniciar quando a fase mudar, nao a cada resposta selecionada.
  }, [fase]);

  // Persiste o progresso (respostas + questao atual + prazo) a cada mudanca,
  // pra sobreviver a fechar o modal/app sem enviar — nunca marca a avaliacao
  // como concluida nem cria tentativa nenhuma, so evita perder o que o aluno
  // ja tinha respondido. So roda enquanto a tentativa esta realmente em
  // andamento (questoes carregadas, fase de execucao). Mesma logica do
  // rascunho web, ver quizRascunho.js.
  useEffect(() => {
    if (!avaliacao || fase !== "execucao" || !questoes.length) {
      return;
    }

    salvarRascunhoAvaliacao(avaliacao.id, {
      indiceAtual,
      respostas,
      tentativasRealizadasNoMomento: avaliacao.tentativasRealizadas || 0,
      prazoFinal: prazoFinalRef.current,
      salvoEm: Date.now()
    });
  }, [avaliacao, fase, questoes, indiceAtual, respostas]);

  async function iniciar() {
    setFase("carregando");
    setErro("");

    const rascunho = await rascunhoAvaliacaoValido(avaliacao);

    if (rascunho?.prazoFinal) {
      prazoFinalRef.current = rascunho.prazoFinal;
      setTempoRestante(Math.max(0, Math.round((rascunho.prazoFinal - Date.now()) / 1000)));
    } else if (avaliacao.tempoLimiteMinutos > 0) {
      prazoFinalRef.current = Date.now() + avaliacao.tempoLimiteMinutos * 60000;
      setTempoRestante(avaliacao.tempoLimiteMinutos * 60);
    } else {
      prazoFinalRef.current = null;
      setTempoRestante(null);
    }

    try {
      const proximasQuestoes = await apiRequest(`/Avaliacoes/${avaliacao.id}/aluno/questoes`);
      setQuestoes(proximasQuestoes);

      if (rascunho) {
        // Mantem as respostas restauradas, descartando qualquer id de questao
        // que nao exista mais (ex.: professor removeu uma questao depois que
        // o rascunho foi salvo) e garantindo que o indice continua valido —
        // mesma logica do rascunho web, ver quizRascunho.js.
        const idsValidos = new Set(proximasQuestoes.map((questao) => questao.id));
        setRespostas(
          Object.fromEntries(Object.entries(rascunho.respostas || {}).filter(([id]) => idsValidos.has(Number(id))))
        );
        setIndiceAtual(Math.max(0, Math.min(rascunho.indiceAtual || 0, proximasQuestoes.length - 1)));
      } else {
        setRespostas(criarRespostasIniciais(proximasQuestoes));
      }

      setFase("execucao");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErro(
        ehErroDeRede(err)
          ? "Sem conexão com o servidor. Verifique sua internet e tente novamente."
          : err.message || "Não foi possível carregar as questões agora."
      );
      setFase("confirmar");
    }
  }

  function questaoRespondida(questao) {
    const resposta = respostas[questao.id];
    if (Number(questao.tipoQuestao) === 3) {
      return Boolean(String(resposta?.respostaTexto || "").trim());
    }
    return Boolean(resposta?.alternativaId);
  }

  function selecionarAlternativa(questaoId, alternativaId) {
    setRespostas((atual) => ({ ...atual, [questaoId]: { ...(atual[questaoId] || { questaoId }), alternativaId, respostaTexto: "" } }));
  }

  function alterarRespostaTexto(questaoId, respostaTexto) {
    setRespostas((atual) => ({ ...atual, [questaoId]: { ...(atual[questaoId] || { questaoId }), alternativaId: null, respostaTexto } }));
  }

  function enviarManual() {
    const pendente = questoes.find((questao) => !questaoRespondida(questao));
    if (pendente) {
      setErro(`Responda a questão ${pendente.ordem} antes de enviar.`);
      return;
    }
    enviar(false);
  }

  function refazer() {
    setTentativaOffset((atual) => atual + 1);
    setIndiceAtual(0);
    setResultado(null);
    iniciar();
  }

  // Tocar no X (ou o botao fisico de voltar do Android) enquanto a tentativa
  // esta em andamento nao pode sair silenciosamente — pede confirmacao,
  // com a mensagem variando conforme o aluno ja respondeu alguma coisa ou
  // nao. Fora da fase "execucao" (confirmar/carregando/resultado) fecha
  // direto: antes de iniciar nao ha nada a perder, e depois do resultado a
  // tentativa ja foi enviada de verdade, nao ha "saida" a confirmar.
  function tentarFecharExecucao() {
    if (fase !== "execucao") {
      onFechar();
      return;
    }
    setConfirmandoSaida(true);
  }

  const totalRespondidas = questoes.filter(questaoRespondida).length;

  if (!avaliacao) {
    return null;
  }

  const ehQuiz = Number(avaliacao.tipoAvaliacao) === TIPO_QUIZ;
  const questaoAtual = questoes[indiceAtual] || null;
  const ehUltimaQuestao = indiceAtual === questoes.length - 1;
  const corrigida = resultado ? Number(resultado.statusTentativa) === 3 : false;
  const porcentagem = resultado && Number(resultado.notaMaxima) > 0 ? (Number(resultado.notaBruta) / Number(resultado.notaMaxima)) * 100 : 0;
  const tentativasPermitidas = avaliacao.tentativasPermitidas || 1;
  const tentativasRealizadas = avaliacao.tentativasRealizadas || 0;
  const tentativasEsgotadas = tentativasRealizadas >= tentativasPermitidas;
  const tentativaNumeroAtual = Math.min(tentativasRealizadas + 1 + tentativaOffset, tentativasPermitidas);
  const podeRefazer = Boolean(resultado) && tentativaNumeroAtual < tentativasPermitidas;

  // Fase "confirmar" vive num painel que sobe de baixo (bottom sheet) —
  // mesmo conceito de dialogo separado do Web (avaliacaoParaConfirmar vs
  // avaliacaoEmExecucao sao dois modais distintos em SecoesAluno.jsx), so
  // que aqui sobe por baixo em vez de centralizar. Nao cabia no Modal
  // fullscreen de execucao, que precisa ocupar a tela toda pro
  // cronometro/navegacao entre questoes. iniciar() so troca `fase`, entao o
  // painel some e o Modal fullscreen abaixo assume (fase
  // "carregando"->"execucao") sem nenhuma mudanca na logica de
  // carregamento/envio.
  return (
    <>
      <Modal animationType="slide" onRequestClose={onFechar} transparent visible={visivel && fase === "confirmar"}>
        <View style={estilos.sheetOverlay}>
          <TouchableOpacity
            accessibilityElementsHidden
            accessibilityRole="none"
            activeOpacity={1}
            importantForAccessibility="no"
            onPress={onFechar}
            style={StyleSheet.absoluteFill}
          />
          <View style={[estilos.sheet, { paddingBottom: insets.bottom + espacamentos.lg }]}>
            <View style={estilos.sheetAlcaLinha}>
              <View style={estilos.sheetAlca} />
            </View>

            <View style={estilos.sheetCabecalho}>
              <View style={estilos.sheetCabecalhoTextos}>
                <View style={estilos.seloTipo}>
                  <Text style={estilos.seloTipoTexto}>{normalizeEvaluationType(avaliacao.tipoAvaliacao).toUpperCase()}</Text>
                </View>
                <Text numberOfLines={2} style={estilos.sheetTitulo}>{avaliacao.titulo}</Text>
                {avaliacao.moduloTitulo ? <Text numberOfLines={1} style={estilos.sheetModulo}>{avaliacao.moduloTitulo}</Text> : null}
              </View>
              <TouchableOpacity
                accessibilityHint="Fecha o painel sem iniciar a avaliação"
                accessibilityLabel="Fechar"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onFechar}
                style={estilos.sheetBotaoFechar}
              >
                <Ionicons color={cores.textoSuave} name="close" size={22} />
              </TouchableOpacity>
            </View>

            <View style={estilos.grade2x2}>
              {agruparEmLinhasDeDois(blocosResumoAvaliacao(avaliacao, ehQuiz, tentativasRealizadas, tentativasPermitidas)).map((linha, indice) => (
                <View key={indice} style={estilos.grade2x2Linha}>
                  {linha.map((bloco) => (
                    <BlocoResumo key={bloco.key} cor={bloco.cor} corFundo={bloco.corFundo} icone={bloco.icone} rotulo={bloco.rotulo} valor={bloco.valor} />
                  ))}
                  {linha.length === 1 ? <View style={estilos.grade2x2Espaco} /> : null}
                </View>
              ))}
            </View>

            {tentativasEsgotadas ? (
              <View style={estilos.sheetAvisoCartaoEsgotado}>
                <Ionicons color={cores.aviso} name="alert-circle-outline" size={18} />
                <Text style={estilos.sheetAvisoEsgotadoTexto}>Você já utilizou todas as tentativas permitidas para esta avaliação.</Text>
              </View>
            ) : (
              <View style={estilos.sheetAvisoCartao}>
                <Ionicons color={cores.acento} name="information-circle-outline" size={18} />
                <View style={estilos.sheetAvisoTextos}>
                  <Text style={estilos.sheetAvisoTexto}>Suas respostas ficam salvas neste aparelho enquanto você responde.</Text>
                  <Text style={estilos.sheetAvisoTexto}>Ao enviar, você vê o resultado assim que a correção terminar.</Text>
                </View>
              </View>
            )}

            <Toast mensagem={erro} onFechar={() => setErro("")} tipo="erro" />

            <Botao disabled={tentativasEsgotadas} icone="play" onPress={iniciar} style={estilos.sheetBotaoIniciar} variante="primario">
              Iniciar avaliação
            </Botao>
            <Botao onPress={onFechar} variante="fantasma">Agora não</Botao>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => !enviando && tentarFecharExecucao()} presentationStyle="pageSheet" visible={visivel && fase !== "confirmar"}>
      <View style={estilos.container}>
        <View style={[estilos.cabecalho, { paddingTop: insets.top + 16 }]}>
          <Text numberOfLines={1} style={estilos.titulo}>{avaliacao.titulo}</Text>
          <View style={estilos.cabecalhoDireita}>
            {fase === "execucao" && tempoRestante !== null ? (
              <View style={estilos.cronometroLinha}>
                <Ionicons color={tempoRestante <= 60 ? cores.erro : cores.texto} name="time-outline" size={16} />
                <Text style={[estilos.cronometro, tempoRestante <= 60 ? estilos.cronometroUrgente : null]}>
                  {formatarTempoRestante(tempoRestante)}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              accessibilityLabel="Fechar avaliação"
              accessibilityRole="button"
              disabled={enviando}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={tentarFecharExecucao}
              style={estilos.botaoFechar}
            >
              <Ionicons color={cores.erro} name="close" size={22} style={estilos.iconeFechar} />
            </TouchableOpacity>
          </View>
        </View>

        <ModalConfirmarSaida
          acaoCancelar="Continuar avaliação"
          acaoConfirmar="Sair da avaliação"
          iconeCancelar="arrow-back"
          iconeConfirmar="exit-outline"
          onCancelar={() => setConfirmandoSaida(false)}
          onConfirmar={() => {
            setConfirmandoSaida(false);
            onFechar();
          }}
          texto={
            totalRespondidas === 0
              ? "Você ainda não respondeu nenhuma questão. Deseja realmente sair da avaliação?"
              : `Você já respondeu ${totalRespondidas} de ${questoes.length} questões. Suas respostas ficam salvas e você pode continuar depois, mas a avaliação só é enviada quando você tocar em "Enviar avaliação". Deseja realmente sair agora?`
          }
          titulo="Sair da avaliação"
          visivel={confirmandoSaida}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.corpoFlex}>
        <ScrollView contentContainerStyle={estilos.corpo}>
          {fase === "carregando" ? <ActivityIndicator color={cores.destaque} style={{ marginTop: 32 }} /> : null}

          {fase === "execucao" && questaoAtual ? (
            <View>
              <View style={estilos.passos}>
                <Text style={estilos.contador}>Questão {indiceAtual + 1} de {questoes.length}</Text>
              </View>

              <View style={estilos.pillsLinha}>
                {questoes.map((questao, indice) => (
                  <TouchableOpacity
                    accessibilityLabel={`Questão ${indice + 1}${indice === indiceAtual ? ", atual" : ""}${questaoRespondida(questao) ? ", respondida" : ", não respondida"}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: indice === indiceAtual }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    key={questao.id}
                    onPress={() => setIndiceAtual(indice)}
                    style={[
                      estilos.pill,
                      indice === indiceAtual ? estilos.pillAtiva : null,
                      questaoRespondida(questao) ? estilos.pillRespondida : null
                    ]}
                  >
                    <Text style={estilos.pillTexto}>{indice + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Toast mensagem={erro} onFechar={() => setErro("")} tipo="erro" />

              {questaoAtual.contexto ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: apoioAberto }}
                  onPress={() => setApoioAberto((atual) => !atual)}
                  style={estilos.apoioToggle}
                >
                  <Ionicons color={cores.destaque} name={apoioAberto ? "chevron-up" : "chevron-down"} size={16} />
                  <Text style={estilos.apoioToggleTexto}>{apoioAberto ? "Ocultar contexto de apoio" : "Ver contexto de apoio"}</Text>
                </TouchableOpacity>
              ) : null}
              {questaoAtual.contexto && apoioAberto ? <Text style={estilos.apoioTexto}>{questaoAtual.contexto}</Text> : null}

              <Text style={estilos.enunciadoTipo}>{normalizeQuestionType(questaoAtual.tipoQuestao)} - {formatScore(questaoAtual.pontos)} ponto(s)</Text>
              <Text style={estilos.enunciado}>{questaoAtual.enunciado}</Text>

              {Number(questaoAtual.tipoQuestao) === 3 ? (
                <TextInput
                  editable={!enviando}
                  multiline
                  onChangeText={(texto) => alterarRespostaTexto(questaoAtual.id, texto)}
                  placeholder="Digite sua resposta."
                  placeholderTextColor={cores.textoSuave}
                  style={estilos.textoResposta}
                  value={respostas[questaoAtual.id]?.respostaTexto || ""}
                />
              ) : (
                <>
                  {Number(questaoAtual.tipoQuestao) === 4 && questaoAtual.afirmativas?.length > 0 ? (
                    <View style={estilos.afirmativas}>
                      {questaoAtual.afirmativas.map((afirmativa) => (
                        <View key={afirmativa.id} style={estilos.afirmativaItem}>
                          <Text style={estilos.afirmativaTexto}>
                            <Text style={estilos.afirmativaNumero}>{afirmativa.numero}. </Text>
                            {afirmativa.texto}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {questaoAtual.alternativas.map((alternativa) => {
                  const selecionada = respostas[questaoAtual.id]?.alternativaId === alternativa.id;
                  return (
                    <TouchableOpacity
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selecionada }}
                      disabled={enviando}
                      key={alternativa.id}
                      onPress={() => selecionarAlternativa(questaoAtual.id, alternativa.id)}
                      style={[estilos.alternativa, selecionada ? estilos.alternativaSelecionada : null]}
                    >
                      <View style={[estilos.alternativaLetraCirculo, selecionada ? estilos.alternativaLetraCirculoSelecionada : null]}>
                        <Text style={[estilos.alternativaLetra, selecionada ? estilos.alternativaLetraSelecionada : null]}>{alternativa.letra}</Text>
                      </View>
                      <Text style={[estilos.alternativaTexto, selecionada ? estilos.alternativaTextoSelecionado : null]}>{alternativa.texto}</Text>
                    </TouchableOpacity>
                  );
                  })}
                </>
              )}

              <View style={estilos.acoesLinha}>
                {indiceAtual > 0 ? (
                  <Botao disabled={enviando} icone="chevron-back" onPress={() => setIndiceAtual((atual) => atual - 1)} variante="fantasma">
                    Voltar
                  </Botao>
                ) : <View />}

                {ehUltimaQuestao ? (
                  <Botao carregando={enviando} onPress={enviarManual} variante="primario">
                    Enviar avaliação
                  </Botao>
                ) : (
                  <Botao disabled={enviando} onPress={() => setIndiceAtual((atual) => atual + 1)} variante="primario">
                    Próxima questão
                  </Botao>
                )}
              </View>
            </View>
          ) : null}

          {fase === "resultado" && resultado ? (
            <View style={estilos.resultado}>
              <View style={[estilos.resultadoIconeContorno, corrigida ? estilos.resultadoIconeSucesso : estilos.resultadoIconePendente]}>
                <Ionicons
                  color={corrigida ? cores.sucesso : cores.aviso}
                  name={corrigida ? "checkmark-circle-outline" : "document-text-outline"}
                  size={40}
                />
              </View>

              <Text style={estilos.resultadoTitulo}>{corrigida ? "Avaliação corrigida" : "Respostas enviadas"}</Text>
              <Text style={estilos.resultadoDescricao}>
                {ehQuiz
                  ? "Suas respostas foram registradas."
                  : corrigida
                    ? "A correção automática foi concluída e sua nota já está disponível abaixo."
                    : "Suas respostas foram registradas. Questões dissertativas aguardam correção do professor."}
              </Text>

              {!ehQuiz ? (
                <>
                  <Text style={estilos.resultadoPorcentagem}>{formatPercent(porcentagem)}</Text>
                  <View style={estilos.resultadoBarraFundo}>
                    <View
                      style={[
                        estilos.resultadoBarraPreenchida,
                        { width: `${Math.max(0, Math.min(porcentagem, 100))}%` }
                      ]}
                    />
                  </View>
                </>
              ) : null}

              <View style={estilos.resultadoDivisor} />

              <View style={estilos.resumo}>
                {!ehQuiz ? (
                  <ResumoItem cor={cores.destaque} icone="trophy-outline" rotulo="Nota obtida" valor={`${formatScore(resultado.notaBruta)} / ${formatScore(resultado.notaMaxima)}`} />
                ) : null}
                <ResumoItem icone="repeat" rotulo="Tentativas usadas" valor={`${tentativaNumeroAtual} de ${tentativasPermitidas}`} />
                {ehQuiz ? <View style={estilos.resumoEspaco} /> : null}
              </View>

              {podeRefazer ? (
                <Botao onPress={refazer} style={estilos.resultadoBotaoRefazer} variante="primario">
                  Refazer avaliação
                </Botao>
              ) : null}
              <Botao onPress={onFechar} variante={podeRefazer ? "secundario" : "primario"}>
                Fechar
              </Botao>
            </View>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
      </Modal>
    </>
  );
}

// Monta os dados dos blocos do grid "Antes de comecar" (quiz tem 3: sem
// Nota maxima, prova tem 4) separado da renderizacao, pra poder agrupar em
// linhas de 2 antes de desenhar — ver agruparEmLinhasDeDois.
function blocosResumoAvaliacao(avaliacao, ehQuiz, tentativasRealizadas, tentativasPermitidas) {
  return [
    { key: "questoes", icone: "help-circle-outline", rotulo: "Questões", valor: String(avaliacao.totalQuestoes || 0) },
    {
      key: "tempo",
      cor: cores.informativo,
      corFundo: cores.informativoFundo,
      icone: "time-outline",
      rotulo: "Tempo limite",
      valor: avaliacao.tempoLimiteMinutos > 0 ? `${avaliacao.tempoLimiteMinutos} min` : "Sem limite"
    },
    ...(!ehQuiz
      ? [{ key: "nota", cor: cores.destaque, corFundo: cores.bordaCartao, icone: "trophy-outline", rotulo: "Nota máxima", valor: formatScore(avaliacao.notaMaxima) }]
      : []),
    { key: "tentativa", icone: "repeat", rotulo: "Tentativa", valor: `${Math.min(tentativasRealizadas + 1, tentativasPermitidas)} de ${tentativasPermitidas}` }
  ];
}

// Divide uma lista de blocos em linhas de 2 — a largura de cada bloco vem
// do `flex: 1` da linha (ver estilos.blocoResumo/resumoItem), nunca do
// conteudo, senao a 1a e a 2a linha dividem o espaco de jeitos diferentes
// conforme o texto ("Sem limite" vs "10") e as colunas ficam fora de prumo.
// Linha com 1 bloco so (quantidade impar) recebe um espaco vazio do mesmo
// `flex: 1` pra ele nao esticar at[e] a largura toda.
function agruparEmLinhasDeDois(blocos) {
  const linhas = [];
  for (let indice = 0; indice < blocos.length; indice += 2) {
    linhas.push(blocos.slice(indice, indice + 2));
  }
  return linhas;
}

// `cor` e opcional — rotulo neutro (Questoes, Tentativas) mantem o cinza
// padrao; chamadores passam uma cor semantica (tempo=informativo,
// nota=destaque) so quando o dado realmente carrega esse significado, pra
// nao colorir tudo indiscriminadamente.
function ResumoItem({ cor = cores.textoSuave, icone, rotulo, valor }) {
  return (
    <View style={estilos.resumoItem}>
      <View style={estilos.resumoRotuloLinha}>
        {icone ? <Ionicons color={cor} name={icone} size={18} /> : null}
        <Text style={estilos.resumoRotulo}>{rotulo}</Text>
      </View>
      <Text style={estilos.resumoValor}>{valor}</Text>
    </View>
  );
}

// Bloco da grade 2x2 do painel "Antes de começar" — mesmo papel do
// ResumoItem acima (icone + rotulo + valor), mas com o icone num circulo
// tingido em vez de so colorido, pro layout de blocos quadrados do bottom
// sheet (ResumoItem continua servindo as fases execucao/resultado, que nao
// mudam nesta rodada).
function BlocoResumo({ cor = cores.textoSuave, corFundo = cores.divisoria, icone, rotulo, valor }) {
  return (
    <View style={estilos.blocoResumo}>
      <View style={[estilos.blocoResumoIconeCirculo, { backgroundColor: corFundo }]}>
        <Ionicons color={cor} name={icone} size={16} />
      </View>
      <Text style={estilos.blocoResumoRotulo}>{rotulo}</Text>
      <Text style={estilos.blocoResumoValor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  titulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700", flex: 1, marginRight: 12 },
  // Agrupa cronometro (quando a avaliacao esta em execucao) + botao de
  // fechar do lado direito do cabecalho fixo, pra "justify-content: space-
  // between" do cabecalho distribuir so 2 blocos (titulo vs. este grupo),
  // nao 3 soltos.
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: espacamentos.md },
  botaoFechar: { padding: 4 },
  iconeFechar: { opacity: 0.75 },
  corpoFlex: { flex: 1 },
  corpo: { padding: espacamentos.xl, paddingBottom: 40 },
  resumo: { flexDirection: "row", gap: espacamentos.md, marginBottom: espacamentos.xl },
  resumoItem: { flex: 1, backgroundColor: cores.fundoCartao, borderRadius: 10, padding: espacamentos.md },
  resumoEspaco: { flex: 1 },
  resumoRotuloLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.xs, marginBottom: 4 },
  resumoRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  resumoValor: { color: cores.texto, fontWeight: "700" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(123, 47, 247, 0.3)",
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.sm,
    maxHeight: "90%"
  },
  sheetAlcaLinha: { alignItems: "center", paddingVertical: espacamentos.sm },
  sheetAlca: { width: 36, height: 4, borderRadius: raios.pilula, backgroundColor: cores.divisoria },
  sheetCabecalho: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: espacamentos.md, marginBottom: espacamentos.lg },
  sheetCabecalhoTextos: { flex: 1, gap: espacamentos.xs },
  seloTipo: {
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.sm,
    alignSelf: "flex-start",
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  seloTipoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  sheetTitulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "600" },
  sheetModulo: { color: cores.textoSuave, fontSize: tipografia.corpo },
  sheetBotaoFechar: { minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
  grade2x2: { gap: espacamentos.md, marginBottom: espacamentos.lg },
  grade2x2Linha: { flexDirection: "row", gap: espacamentos.md },
  grade2x2Espaco: { flex: 1 },
  blocoResumo: { flex: 1, backgroundColor: cores.fundoCartaoAtivo, borderRadius: 12, padding: espacamentos.md },
  blocoResumoIconeCirculo: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: espacamentos.sm },
  blocoResumoRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginBottom: 2 },
  blocoResumoValor: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "600" },
  sheetAvisoCartao: { flexDirection: "row", gap: espacamentos.sm, backgroundColor: cores.fundoCartaoAtivo, borderRadius: raios.md, padding: espacamentos.md, marginBottom: espacamentos.lg },
  sheetAvisoTextos: { flex: 1, gap: 4 },
  sheetAvisoTexto: { color: cores.textoSuave, fontSize: tipografia.corpo, lineHeight: 18 },
  sheetAvisoCartaoEsgotado: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, backgroundColor: cores.avisoFundo, borderRadius: raios.md, padding: espacamentos.md, marginBottom: espacamentos.lg },
  sheetAvisoEsgotadoTexto: { color: cores.aviso, flex: 1, lineHeight: 20 },
  sheetBotaoIniciar: { minHeight: 48, marginBottom: espacamentos.xs },
  passos: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  contador: { color: cores.textoSuave },
  cronometroLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  cronometro: { color: cores.texto, fontWeight: "700" },
  cronometroUrgente: { color: cores.erro },
  pillsLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: { width: 32, height: 32, borderRadius: 16, backgroundColor: cores.fundoCartao, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cores.bordaCartao },
  pillAtiva: { borderColor: cores.destaque },
  pillRespondida: { backgroundColor: cores.destaque },
  pillTexto: { color: cores.texto, fontWeight: "600", fontSize: tipografia.rotulo },
  apoioToggle: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginBottom: 4 },
  apoioToggleTexto: { color: cores.destaque, fontWeight: "600" },
  apoioTexto: { color: cores.textoSuave, marginBottom: 16, lineHeight: 20 },
  enunciadoTipo: { color: cores.informativo, fontSize: tipografia.rotulo, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  enunciado: { color: cores.texto, fontSize: tipografia.subtitulo, marginBottom: 16, lineHeight: 22 },
  textoResposta: { backgroundColor: cores.fundoCartao, borderRadius: 10, borderWidth: 1, borderColor: cores.bordaCartao, color: cores.texto, padding: 12, minHeight: 100, textAlignVertical: "top", marginBottom: 20 },
  afirmativas: { marginBottom: 16, gap: 8 },
  afirmativaItem: { backgroundColor: cores.fundoCartao, borderRadius: 10, borderWidth: 1, borderColor: cores.bordaCartao, padding: 12 },
  afirmativaNumero: { fontWeight: "800", color: cores.texto },
  afirmativaTexto: { color: cores.textoSuave, lineHeight: 20 },
  alternativa: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: cores.fundoCartao, borderRadius: 10, borderWidth: 1, borderColor: cores.bordaCartao, padding: 14, marginBottom: 10 },
  alternativaSelecionada: { borderColor: cores.destaque, borderWidth: 2, backgroundColor: cores.fundoCartaoAtivo },
  alternativaLetraCirculo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.bordaCartao,
    backgroundColor: cores.fundo,
    alignItems: "center",
    justifyContent: "center"
  },
  alternativaLetraCirculoSelecionada: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  alternativaLetra: { color: cores.textoRotulo, fontWeight: "800", fontSize: tipografia.rotulo },
  alternativaLetraSelecionada: { color: cores.texto },
  alternativaTexto: { color: cores.texto, flex: 1 },
  alternativaTextoSelecionado: { fontWeight: "700" },
  acoesLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 },
  resultado: { paddingTop: espacamentos.sm },
  resultadoIconeContorno: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: espacamentos.lg
  },
  resultadoIconeSucesso: { backgroundColor: cores.sucessoFundo },
  resultadoIconePendente: { backgroundColor: cores.avisoFundo },
  resultadoTitulo: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800", marginBottom: espacamentos.sm, textAlign: "center" },
  resultadoDescricao: { color: cores.textoSuave, textAlign: "center", marginBottom: espacamentos.xl, lineHeight: 20 },
  resultadoPorcentagem: { color: cores.destaque, fontSize: tipografia.numeroGrande, fontWeight: "800", marginBottom: espacamentos.md, textAlign: "center" },
  resultadoBarraFundo: { height: 8, borderRadius: 4, backgroundColor: cores.bordaCartao, overflow: "hidden", marginBottom: espacamentos.xl },
  // Cor fixa (destaque), nao condicionada a corrigida/nota — a barra
  // representa a pontuacao obtida, nao um veredito de aprovado/reprovado
  // (nao ha nota minima de aprovacao em lugar nenhum do sistema).
  resultadoBarraPreenchida: { height: 8, borderRadius: 4, backgroundColor: cores.destaque },
  resultadoDivisor: { height: 1, backgroundColor: cores.bordaCartao, marginBottom: espacamentos.xl },
  resultadoBotaoRefazer: { marginBottom: espacamentos.md }
});
