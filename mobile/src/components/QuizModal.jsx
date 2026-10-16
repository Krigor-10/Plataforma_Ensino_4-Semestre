import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import Toast from "./Toast.jsx";
import { apiRequest, ApiError } from "../lib/api.js";
import { criarRespostasIniciais } from "../lib/avaliacoes.js";
import { formatarTempoRestante, formatPercent, formatScore, normalizeQuestionType } from "../lib/format.js";
import { rascunhoAvaliacaoValido, removerRascunhoAvaliacao, salvarRascunhoAvaliacao } from "../lib/quizRascunho.js";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

const TIPO_QUIZ = 1;

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
      setErro(err.message || "Nao foi possivel enviar a avaliacao agora.");
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
      setErro(err.message || "Nao foi possivel carregar as questoes agora.");
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
      setErro(`Responda a questao ${pendente.ordem} antes de enviar.`);
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

  if (!avaliacao) {
    return null;
  }

  const questaoAtual = questoes[indiceAtual] || null;
  const ehUltimaQuestao = indiceAtual === questoes.length - 1;
  const corrigida = resultado ? Number(resultado.statusTentativa) === 3 : false;
  const porcentagem = resultado && Number(resultado.notaMaxima) > 0 ? (Number(resultado.notaBruta) / Number(resultado.notaMaxima)) * 100 : 0;
  const tentativasPermitidas = avaliacao.tentativasPermitidas || 1;
  const tentativasRealizadas = avaliacao.tentativasRealizadas || 0;
  const tentativasEsgotadas = tentativasRealizadas >= tentativasPermitidas;
  const tentativaNumeroAtual = Math.min(tentativasRealizadas + 1 + tentativaOffset, tentativasPermitidas);
  const podeRefazer = Boolean(resultado) && tentativaNumeroAtual < tentativasPermitidas;

  return (
    <Modal animationType="slide" onRequestClose={() => !enviando && onFechar()} presentationStyle="pageSheet" visible={visivel}>
      <View style={estilos.container}>
        <View style={[estilos.cabecalho, { paddingTop: insets.top + 16 }]}>
          <Text numberOfLines={1} style={estilos.titulo}>{avaliacao.titulo}</Text>
          <TouchableOpacity
            accessibilityLabel="Fechar avaliacao"
            accessibilityRole="button"
            disabled={enviando}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={onFechar}
            style={estilos.botaoFechar}
          >
            <Ionicons color={cores.erro} name="close" size={22} style={estilos.iconeFechar} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.corpoFlex}>
        <ScrollView contentContainerStyle={estilos.corpo}>
          {fase === "confirmar" ? (
            <View>
              <Text style={estilos.secaoTitulo}>Antes de comecar</Text>
              <View style={estilos.resumo}>
                <ResumoItem icone="help-circle-outline" rotulo="Questoes" valor={String(avaliacao.totalQuestoes || 0)} />
                <ResumoItem icone="time-outline" rotulo="Tempo limite" valor={avaliacao.tempoLimiteMinutos > 0 ? `${avaliacao.tempoLimiteMinutos} min` : "Sem limite"} />
                {Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ ? (
                  <ResumoItem icone="trophy-outline" rotulo="Nota maxima" valor={formatScore(avaliacao.notaMaxima)} />
                ) : null}
                <ResumoItem icone="repeat" rotulo="Tentativas" valor={`${Math.min(tentativasRealizadas + 1, tentativasPermitidas)} de ${tentativasPermitidas}`} />
              </View>
              <Toast mensagem={erro} onFechar={() => setErro("")} tipo="erro" />
              {tentativasEsgotadas ? (
                <Text style={estilos.tentativasEsgotadasTexto}>Voce ja utilizou todas as tentativas permitidas para esta avaliacao.</Text>
              ) : (
                <Botao onPress={iniciar} variante="primario">Iniciar</Botao>
              )}
            </View>
          ) : null}

          {fase === "carregando" ? <ActivityIndicator color={cores.destaque} style={{ marginTop: 32 }} /> : null}

          {fase === "execucao" && questaoAtual ? (
            <View>
              <View style={estilos.passos}>
                <Text style={estilos.contador}>Questao {indiceAtual + 1} de {questoes.length}</Text>
                {tempoRestante !== null ? (
                  <View style={estilos.cronometroLinha}>
                    <Ionicons color={tempoRestante <= 60 ? cores.erro : cores.texto} name="time-outline" size={16} />
                    <Text style={[estilos.cronometro, tempoRestante <= 60 ? estilos.cronometroUrgente : null]}>
                      {formatarTempoRestante(tempoRestante)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={estilos.pillsLinha}>
                {questoes.map((questao, indice) => (
                  <TouchableOpacity
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
                <TouchableOpacity onPress={() => setApoioAberto((atual) => !atual)} style={estilos.apoioToggle}>
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
                      <Text style={estilos.alternativaLetra}>{alternativa.letra}</Text>
                      <Text style={[estilos.alternativaTexto, selecionada ? estilos.alternativaTextoSelecionado : null]}>{alternativa.texto}</Text>
                      {selecionada ? (
                        <Ionicons color={cores.sucesso} name="checkmark-circle" size={20} />
                      ) : (
                        <View style={estilos.alternativaCheckEspaco} />
                      )}
                    </TouchableOpacity>
                  );
                  })}
                </>
              )}

              <View style={estilos.acoesLinha}>
                {indiceAtual > 0 ? (
                  <Botao disabled={enviando} onPress={() => setIndiceAtual((atual) => atual - 1)} variante="fantasma">
                    Voltar
                  </Botao>
                ) : <View />}

                {ehUltimaQuestao ? (
                  <Botao carregando={enviando} onPress={enviarManual} variante="primario">
                    Enviar avaliacao
                  </Botao>
                ) : (
                  <Botao disabled={enviando} onPress={() => setIndiceAtual((atual) => atual + 1)} variante="primario">
                    Proxima questao
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

              <Text style={estilos.resultadoTitulo}>{corrigida ? "Avaliacao corrigida" : "Respostas enviadas"}</Text>
              <Text style={estilos.resultadoDescricao}>
                {corrigida
                  ? "A correcao automatica foi concluida e sua nota ja esta disponivel abaixo."
                  : "Suas respostas foram registradas. Questoes dissertativas aguardam correcao do professor."}
              </Text>
              <Text style={estilos.resultadoPorcentagem}>{formatPercent(porcentagem)}</Text>
              <View style={estilos.resultadoBarraFundo}>
                <View
                  style={[
                    estilos.resultadoBarraPreenchida,
                    { width: `${Math.max(0, Math.min(porcentagem, 100))}%`, backgroundColor: corrigida ? cores.sucesso : cores.aviso }
                  ]}
                />
              </View>

              <View style={estilos.resultadoDivisor} />

              <View style={estilos.resumo}>
                <ResumoItem icone="trophy-outline" rotulo="Nota obtida" valor={`${formatScore(resultado.notaBruta)} / ${formatScore(resultado.notaMaxima)}`} />
                <ResumoItem icone="repeat" rotulo="Tentativas usadas" valor={`${tentativaNumeroAtual} de ${tentativasPermitidas}`} />
              </View>

              {podeRefazer ? (
                <Botao onPress={refazer} style={estilos.resultadoBotaoRefazer} variante="primario">
                  Refazer avaliacao
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
  );
}

function ResumoItem({ icone, rotulo, valor }) {
  return (
    <View style={estilos.resumoItem}>
      <View style={estilos.resumoRotuloLinha}>
        {icone ? <Ionicons color={cores.textoSuave} name={icone} size={18} /> : null}
        <Text style={estilos.resumoRotulo}>{rotulo}</Text>
      </View>
      <Text style={estilos.resumoValor}>{valor}</Text>
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
  botaoFechar: { padding: 4 },
  iconeFechar: { opacity: 0.75 },
  corpoFlex: { flex: 1 },
  corpo: { padding: espacamentos.xl, paddingBottom: 40 },
  secaoTitulo: { color: cores.texto, fontSize: tipografia.titulo, fontWeight: "700", marginBottom: 16 },
  resumo: { flexDirection: "row", flexWrap: "wrap", gap: espacamentos.md, marginBottom: espacamentos.xl },
  resumoItem: { backgroundColor: cores.fundoCartao, borderRadius: 10, padding: espacamentos.md, minWidth: "45%", flexGrow: 1 },
  resumoRotuloLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.xs, marginBottom: 4 },
  resumoRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  resumoValor: { color: cores.texto, fontWeight: "700" },
  tentativasEsgotadasTexto: { color: cores.erro, textAlign: "center", lineHeight: 20 },
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
  apoioToggle: { marginBottom: 8 },
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
  alternativaLetra: { color: cores.textoRotulo, fontWeight: "800", width: 20 },
  alternativaTexto: { color: cores.texto, flex: 1 },
  alternativaTextoSelecionado: { fontWeight: "700" },
  alternativaCheckEspaco: { width: 20 },
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
  resultadoBarraPreenchida: { height: 8, borderRadius: 4 },
  resultadoDivisor: { height: 1, backgroundColor: cores.bordaCartao, marginBottom: espacamentos.xl },
  resultadoBotaoRefazer: { marginBottom: espacamentos.md }
});
