import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { apiRequest, ApiError } from "../lib/api.js";
import { criarRespostasIniciais } from "../lib/avaliacoes.js";
import { formatarTempoRestante, formatPercent, formatScore, normalizeQuestionType } from "../lib/format.js";
import { cores } from "../lib/theme.js";

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

  useEffect(() => {
    if (visivel) {
      setFase("confirmar");
      setQuestoes([]);
      setRespostas({});
      setIndiceAtual(0);
      setApoioAberto(true);
      setErro("");
      setResultado(null);
      setTempoRestante(null);
    }
  }, [visivel, avaliacao?.id]);

  useEffect(() => {
    if (fase !== "execucao" || tempoRestante === null) {
      return undefined;
    }

    if (tempoRestante <= 0) {
      enviar(true);
      return undefined;
    }

    const temporizador = setTimeout(() => setTempoRestante((atual) => (atual === null ? null : atual - 1)), 1000);
    return () => clearTimeout(temporizador);
  }, [fase, tempoRestante]);

  async function iniciar() {
    setFase("carregando");
    setErro("");
    setTempoRestante(avaliacao.tempoLimiteMinutos > 0 ? avaliacao.tempoLimiteMinutos * 60 : null);

    try {
      const proximasQuestoes = await apiRequest(`/Avaliacoes/${avaliacao.id}/aluno/questoes`);
      setQuestoes(proximasQuestoes);
      setRespostas(criarRespostasIniciais(proximasQuestoes));
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

  if (!avaliacao) {
    return null;
  }

  const questaoAtual = questoes[indiceAtual] || null;
  const ehUltimaQuestao = indiceAtual === questoes.length - 1;
  const corrigida = resultado ? Number(resultado.statusTentativa) === 3 : false;
  const porcentagem = resultado && Number(resultado.notaMaxima) > 0 ? (Number(resultado.notaBruta) / Number(resultado.notaMaxima)) * 100 : 0;

  return (
    <Modal animationType="slide" onRequestClose={() => !enviando && onFechar()} presentationStyle="pageSheet" visible={visivel}>
      <View style={estilos.container}>
        <View style={estilos.cabecalho}>
          <Text numberOfLines={1} style={estilos.titulo}>{avaliacao.titulo}</Text>
          <TouchableOpacity disabled={enviando} onPress={onFechar}>
            <Text style={estilos.fechar}>Fechar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={estilos.corpo}>
          {fase === "confirmar" ? (
            <View>
              <Text style={estilos.secaoTitulo}>Antes de comecar</Text>
              <View style={estilos.resumo}>
                <ResumoItem rotulo="Questoes" valor={String(avaliacao.totalQuestoes || 0)} />
                <ResumoItem rotulo="Tempo limite" valor={avaliacao.tempoLimiteMinutos > 0 ? `${avaliacao.tempoLimiteMinutos} min` : "Sem limite"} />
                <ResumoItem rotulo="Nota maxima" valor={formatScore(avaliacao.notaMaxima)} />
                <ResumoItem rotulo="Tentativas" valor={`${(avaliacao.tentativasRealizadas || 0) + 1} de ${avaliacao.tentativasPermitidas || 1}`} />
              </View>
              {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
              <TouchableOpacity onPress={iniciar} style={estilos.botaoPrimario}>
                <Text style={estilos.botaoPrimarioTexto}>Iniciar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {fase === "carregando" ? <ActivityIndicator color={cores.destaque} style={{ marginTop: 32 }} /> : null}

          {fase === "execucao" && questaoAtual ? (
            <View>
              <View style={estilos.passos}>
                <Text style={estilos.contador}>Questao {indiceAtual + 1} de {questoes.length}</Text>
                {tempoRestante !== null ? (
                  <Text style={[estilos.cronometro, tempoRestante <= 60 ? estilos.cronometroUrgente : null]}>
                    {formatarTempoRestante(tempoRestante)}
                  </Text>
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

              {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

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
                questaoAtual.alternativas.map((alternativa) => {
                  const selecionada = respostas[questaoAtual.id]?.alternativaId === alternativa.id;
                  return (
                    <TouchableOpacity
                      disabled={enviando}
                      key={alternativa.id}
                      onPress={() => selecionarAlternativa(questaoAtual.id, alternativa.id)}
                      style={[estilos.alternativa, selecionada ? estilos.alternativaSelecionada : null]}
                    >
                      <Text style={estilos.alternativaLetra}>{alternativa.letra}</Text>
                      <Text style={estilos.alternativaTexto}>{alternativa.texto}</Text>
                    </TouchableOpacity>
                  );
                })
              )}

              <View style={estilos.acoesLinha}>
                {indiceAtual > 0 ? (
                  <TouchableOpacity disabled={enviando} onPress={() => setIndiceAtual((atual) => atual - 1)} style={estilos.botaoFantasma}>
                    <Text style={estilos.botaoFantasmaTexto}>Voltar</Text>
                  </TouchableOpacity>
                ) : <View />}

                {ehUltimaQuestao ? (
                  <TouchableOpacity disabled={enviando} onPress={enviarManual} style={estilos.botaoPrimario}>
                    {enviando ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Enviar avaliacao</Text>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity disabled={enviando} onPress={() => setIndiceAtual((atual) => atual + 1)} style={estilos.botaoPrimario}>
                    <Text style={estilos.botaoPrimarioTexto}>Proxima questao</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}

          {fase === "resultado" && resultado ? (
            <View style={estilos.resultado}>
              <Text style={estilos.resultadoTitulo}>{corrigida ? "Avaliacao corrigida" : "Respostas enviadas"}</Text>
              <Text style={estilos.resultadoDescricao}>
                {corrigida
                  ? "A correcao automatica foi concluida e sua nota ja esta disponivel abaixo."
                  : "Suas respostas foram registradas. Questoes dissertativas aguardam correcao do professor."}
              </Text>
              <Text style={estilos.resultadoPorcentagem}>{formatPercent(porcentagem)}</Text>
              <ResumoItem rotulo="Nota obtida" valor={`${formatScore(resultado.notaBruta)} / ${formatScore(resultado.notaMaxima)}`} />
              <ResumoItem rotulo="Tentativas usadas" valor={`${(avaliacao.tentativasRealizadas || 0) + 1} de ${avaliacao.tentativasPermitidas || 1}`} />
              <TouchableOpacity onPress={onFechar} style={estilos.botaoPrimario}>
                <Text style={estilos.botaoPrimarioTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ResumoItem({ rotulo, valor }) {
  return (
    <View style={estilos.resumoItem}>
      <Text style={estilos.resumoRotulo}>{rotulo}</Text>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: "700", flex: 1, marginRight: 12 },
  fechar: { color: cores.erro, fontWeight: "600" },
  corpo: { padding: 20, paddingBottom: 40 },
  secaoTitulo: { color: cores.texto, fontSize: 18, fontWeight: "700", marginBottom: 16 },
  resumo: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  resumoItem: { backgroundColor: cores.fundoCartao, borderRadius: 10, padding: 12, minWidth: "45%", marginBottom: 8 },
  resumoRotulo: { color: cores.textoSuave, fontSize: 12, marginBottom: 4 },
  resumoValor: { color: cores.texto, fontWeight: "700" },
  erro: { color: cores.erro, marginBottom: 12 },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  botaoFantasma: { paddingVertical: 14, paddingHorizontal: 12 },
  botaoFantasmaTexto: { color: cores.textoSuave, fontWeight: "600" },
  passos: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  contador: { color: cores.textoSuave },
  cronometro: { color: cores.texto, fontWeight: "700" },
  cronometroUrgente: { color: cores.erro },
  pillsLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: { width: 32, height: 32, borderRadius: 16, backgroundColor: cores.fundoCartao, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cores.bordaCartao },
  pillAtiva: { borderColor: cores.destaque },
  pillRespondida: { backgroundColor: cores.destaque },
  pillTexto: { color: cores.texto, fontWeight: "600", fontSize: 12 },
  apoioToggle: { marginBottom: 8 },
  apoioToggleTexto: { color: cores.destaque, fontWeight: "600" },
  apoioTexto: { color: cores.textoSuave, marginBottom: 16, lineHeight: 20 },
  enunciadoTipo: { color: cores.destaque, fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  enunciado: { color: cores.texto, fontSize: 16, marginBottom: 16, lineHeight: 22 },
  textoResposta: { backgroundColor: cores.fundoCartao, borderRadius: 10, borderWidth: 1, borderColor: cores.bordaCartao, color: cores.texto, padding: 12, minHeight: 100, textAlignVertical: "top", marginBottom: 20 },
  alternativa: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: cores.fundoCartao, borderRadius: 10, borderWidth: 1, borderColor: cores.bordaCartao, padding: 14, marginBottom: 10 },
  alternativaSelecionada: { borderColor: cores.destaque, backgroundColor: cores.fundoCartaoAtivo },
  alternativaLetra: { color: cores.destaque, fontWeight: "800", width: 20 },
  alternativaTexto: { color: cores.texto, flex: 1 },
  acoesLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 },
  resultado: { alignItems: "center", paddingTop: 20 },
  resultadoTitulo: { color: cores.texto, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  resultadoDescricao: { color: cores.textoSuave, textAlign: "center", marginBottom: 20 },
  resultadoPorcentagem: { color: cores.destaque, fontSize: 32, fontWeight: "800", marginBottom: 20 }
});
