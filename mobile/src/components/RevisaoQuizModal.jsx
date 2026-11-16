import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "./Botao.jsx";
import { apiRequest, ApiError } from "../lib/api.js";
import { formatScore } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Revisao (gabarito) de um quiz ja concluido - mobile nunca teve essa tela
   (achado da auditoria mobile, 2026-10-23): reabrir um quiz ja respondido
   so mostrava de novo o dialogo "Antes de comecar", que trava avisando que
   as tentativas acabaram, sem nenhum acesso as respostas antigas. Mesma
   logica/endpoint do Web (RevisaoTentativaAvaliacao.jsx em
   SecoesAluno.jsx): GET /Avaliacoes/{id}/aluno/tentativas/{tentativaId}/
   revisao, so existe atras de uma acao explicita do aluno sobre um quiz ja
   corrigido (ConteudosScreen.jsx chama isto no lugar do QuizModal quando o
   quiz esta concluido), nunca aberta automaticamente. O backend recusa com
   422 se a tentativa ainda nao foi corrigida. */
export default function RevisaoQuizModal({ avaliacaoId, onFechar, onSessionExpired, tentativaId, visivel }) {
  const [revisao, setRevisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visivel || !avaliacaoId || !tentativaId) {
      return undefined;
    }

    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca a revisao toda vez que o modal abre com uma tentativa nova; e o padrao recomendado de fetch-on-open, nao ha estado derivado alternativo aqui (mesmo padrao ja usado em AlunoWorkspace.jsx).
    setCarregando(true);
    setErro("");
    setRevisao(null);

    apiRequest(`/Avaliacoes/${avaliacaoId}/aluno/tentativas/${tentativaId}/revisao`)
      .then((dados) => {
        if (!cancelado) {
          setRevisao(dados);
        }
      })
      .catch((err) => {
        if (cancelado) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }
        setErro(err.message || "Não foi possível carregar a revisão agora.");
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [visivel, avaliacaoId, tentativaId, onSessionExpired]);

  return (
    <Modal animationType="slide" onRequestClose={onFechar} presentationStyle="pageSheet" visible={visivel}>
      <View style={estilos.container}>
        <View style={[estilos.cabecalho, { paddingTop: insets.top + 16 }]}>
          <Text style={estilos.titulo}>Revisão detalhada</Text>
        </View>

        <ScrollView contentContainerStyle={estilos.corpo}>
          {carregando ? (
            <ActivityIndicator color={cores.destaque} style={{ marginTop: 32 }} />
          ) : erro ? (
            <Text style={estilos.erro}>{erro}</Text>
          ) : revisao ? (
            <>
              <View style={estilos.resumo}>
                <Text style={estilos.resumoRotulo}>Nota final</Text>
                <Text style={estilos.resumoValor}>
                  {formatScore(revisao.notaBruta)} / {formatScore(revisao.notaMaxima)}
                </Text>
              </View>

              {revisao.questoes.map((questao, indice) => {
                const alternativaEscolhida = questao.alternativas.find(
                  (alternativa) => alternativa.id === questao.alternativaEscolhidaId
                );
                const alternativaCorreta = questao.alternativas.find((alternativa) => alternativa.ehCorreta);

                return (
                  <View key={questao.questaoId} style={estilos.questao}>
                    <View style={estilos.questaoCabecalho}>
                      <Text style={estilos.questaoNumero}>Questão {indice + 1}</Text>
                      {questao.correta === null ? (
                        <StatusPill cor={cores.textoSuave} icone={null} texto="Aguardando correção" />
                      ) : questao.correta ? (
                        <StatusPill cor={cores.sucesso} icone="checkmark" texto="Acertou" />
                      ) : (
                        <StatusPill cor={cores.erro} icone="close" texto="Errou" />
                      )}
                    </View>

                    <Text style={estilos.enunciado}>{questao.enunciado}</Text>

                    {questao.alternativas.length > 0 ? (
                      <Text style={estilos.respostaResumo}>
                        Sua resposta: <Text style={estilos.respostaResumoForte}>{alternativaEscolhida ? alternativaEscolhida.letra : "—"}</Text>
                        {!questao.correta && alternativaCorreta ? (
                          <Text>
                            {"  ·  "}Resposta correta: <Text style={estilos.respostaResumoForte}>{alternativaCorreta.letra}</Text>
                          </Text>
                        ) : null}
                      </Text>
                    ) : null}

                    {questao.afirmativas.length > 0 ? (
                      <View style={estilos.bloco}>
                        <Text style={estilos.rotulo}>Afirmativas avaliadas</Text>
                        {questao.afirmativas.map((afirmativa) => (
                          <View key={afirmativa.numero} style={estilos.afirmativaItem}>
                            <View style={estilos.itemCabecalhoLinha}>
                              <Text style={estilos.itemTexto}>
                                <Text style={estilos.itemLetra}>{afirmativa.numero}. </Text>
                                {afirmativa.texto}
                              </Text>
                              <MarcaCorretaIncorreta correta={afirmativa.ehCorreta} />
                            </View>
                            {afirmativa.justificativa ? <Text style={estilos.justificativa}>{afirmativa.justificativa}</Text> : null}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {questao.alternativas.length > 0 ? (
                      <View style={estilos.bloco}>
                        <Text style={estilos.rotulo}>Análise das alternativas</Text>
                        {questao.alternativas.map((alternativa) => {
                          const escolhida = alternativa.id === questao.alternativaEscolhidaId;
                          return (
                            <View
                              key={alternativa.id}
                              style={[
                                estilos.alternativaItem,
                                alternativa.ehCorreta ? estilos.alternativaCorreta : null,
                                escolhida && !alternativa.ehCorreta ? estilos.alternativaEscolhidaErrada : null
                              ]}
                            >
                              <View style={estilos.itemCabecalhoLinha}>
                                <Text style={estilos.itemTexto}>
                                  <Text style={estilos.itemLetra}>{alternativa.letra}</Text> {alternativa.texto}
                                </Text>
                                {alternativa.ehCorreta ? <MarcaCorretaIncorreta correta /> : null}
                                {escolhida ? (
                                  <View style={estilos.marcaNeutra}>
                                    <Text style={estilos.marcaNeutraTexto}>Sua resposta</Text>
                                  </View>
                                ) : null}
                              </View>
                              {alternativa.justificativa ? <Text style={estilos.justificativa}>{alternativa.justificativa}</Text> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : questao.respostaTexto ? (
                      <Text style={estilos.respostaTexto}>{questao.respostaTexto}</Text>
                    ) : null}

                    {questao.explicacao ? (
                      <View style={estilos.bloco}>
                        <Text style={estilos.rotulo}>Explicação</Text>
                        <Text style={estilos.textoLongo}>{questao.explicacao}</Text>
                      </View>
                    ) : null}

                    {questao.referenciasBibliograficas ? (
                      <View style={estilos.bloco}>
                        <Text style={estilos.rotulo}>Referências bibliográficas</Text>
                        <Text style={estilos.textoLongo}>{questao.referenciasBibliograficas}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}
        </ScrollView>

        <View style={[estilos.rodape, { paddingBottom: insets.bottom + espacamentos.md }]}>
          <Botao onPress={onFechar} variante="secundario">
            Fechar
          </Botao>
        </View>
      </View>
    </Modal>
  );
}

function StatusPill({ cor, icone, texto }) {
  return (
    <View style={estilos.statusPill}>
      {icone ? <Ionicons color={cor} name={icone} size={13} /> : null}
      <Text style={[estilos.statusPillTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

function MarcaCorretaIncorreta({ correta }) {
  const cor = correta ? cores.sucesso : cores.erro;
  return (
    <View style={estilos.marcaNeutra}>
      <Ionicons color={cor} name={correta ? "checkmark" : "close"} size={11} />
      <Text style={[estilos.marcaNeutraTexto, { color: cor }]}>{correta ? "Correta" : "Incorreta"}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    paddingHorizontal: espacamentos.xl,
    paddingBottom: espacamentos.lg,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  titulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700" },
  corpo: { padding: espacamentos.xl, paddingBottom: 40, gap: espacamentos.lg },
  erro: { color: cores.erro, textAlign: "center", marginTop: 32 },
  resumo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    padding: espacamentos.md,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  resumoRotulo: { color: cores.textoSuave, fontSize: tipografia.corpo },
  resumoValor: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "800" },
  questao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.md
  },
  questaoCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  questaoNumero: { color: cores.destaque, fontSize: tipografia.rotulo, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3,
    borderRadius: raios.pilula,
    backgroundColor: cores.fundoCartaoAtivo
  },
  statusPillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  enunciado: { color: cores.texto, fontSize: tipografia.subtitulo, lineHeight: 22 },
  respostaResumo: { color: cores.textoSuave, fontSize: tipografia.corpo },
  respostaResumoForte: { color: cores.texto, fontWeight: "700" },
  bloco: { gap: espacamentos.sm },
  rotulo: { color: cores.textoRotulo, fontSize: tipografia.legenda, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  afirmativaItem: {
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    borderRadius: raios.md,
    padding: espacamentos.md,
    gap: 4
  },
  alternativaItem: {
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    borderRadius: raios.md,
    padding: espacamentos.md,
    gap: 4
  },
  alternativaCorreta: { borderColor: cores.sucesso, backgroundColor: cores.sucessoFundo },
  alternativaEscolhidaErrada: { borderColor: cores.erro, backgroundColor: cores.erroFundo },
  itemCabecalhoLinha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: espacamentos.sm },
  itemTexto: { color: cores.texto, fontSize: tipografia.corpo, flexShrink: 1 },
  itemLetra: { fontWeight: "800" },
  marcaNeutra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 2,
    borderRadius: raios.pilula,
    backgroundColor: cores.fundoCartaoAtivo
  },
  marcaNeutraTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700" },
  justificativa: { color: cores.textoSuave, fontSize: tipografia.corpo, lineHeight: 18 },
  respostaTexto: { color: cores.texto, fontSize: tipografia.corpo, lineHeight: 20 },
  textoLongo: { color: cores.textoSuave, fontSize: tipografia.corpo, lineHeight: 20 },
  rodape: {
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.md,
    borderTopWidth: 1,
    borderTopColor: cores.bordaCartao
  }
});
