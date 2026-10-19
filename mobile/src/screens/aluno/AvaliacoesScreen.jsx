import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatarTempoRestante, formatScore } from "../../lib/format.js";
import { rascunhoAvaliacaoValido } from "../../lib/quizRascunho.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";
import SeletorCurso from "../../components/SeletorCurso.jsx";
import Toast from "../../components/Toast.jsx";

const TIPO_QUIZ = 1;

// obterDisponibilidadeAvaliacao() ja calcula tone+label pros estados
// Agendada/Encerrada/Sem questoes, mas o card so usava isso no
// accessibilityLabel — ninguem enxergava o estado, so quem usa leitor de
// tela. Esse mapa da uma cor+icone visivel pra cada tone, no mesmo padrao
// chave->{cor,icone} de statusVisual.js (matricula). Tone "neutro"
// (tentativas esgotadas) e tratado a parte, ver variavel `concluida` abaixo.
const TONE_VISUAL = {
  aviso: { cor: cores.aviso, icone: "time-outline" },
  erro: { cor: cores.erro, icone: "lock-closed-outline" }
};

/* Avaliacoes agora segue o mesmo contexto Curso->conteudo ja usado em
   Conteudos/Progresso: primeiro o aluno escolhe o curso (mesmo cartao
   CapaCurso+titulo da Home), so depois ve as avaliacoes daquele curso —
   evita misturar avaliacoes de cursos diferentes na mesma lista. Estado
   local (cursoSelecionadoId), sem Navigator novo: AlunoWorkspace.jsx ja
   troca de tela por state, entao uma tela de selecao dedicada seria uma
   segunda implementacao desnecessaria pro mesmo padrao.

   Cards de avaliacao continuam compactos: so identificam a avaliacao
   (titulo + modulo) e o estado (Play se disponivel, check verde — cores.sucesso
   — se concluida; card inteiro e clicavel, nao so o icone). Detalhes (tempo,
   questoes, nota, tentativas) ficam pro Modal de confirmacao, o QuizModal.jsx
   ja existente (fase "confirmar"), reaproveitado
   sem alteracao. */
export default function AvaliacoesScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [mensagemFeedback, setMensagemFeedback] = useState("");
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

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const cursosMatriculados = useMemo(
    () =>
      [...(snapshot.progressos.cursos || [])].sort((a, b) => {
        const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
        const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
        return tituloA.localeCompare(tituloB);
      }),
    [cursoPorId, snapshot.progressos.cursos]
  );

  // So avaliacoes formais (Prova/Exercicio) aparecem aqui — quiz (tipoAvaliacao
  // === TIPO_QUIZ) e conteudo de modulo, mora exclusivamente em Conteudos
  // (ver agruparConteudosPorCurso em lib/conteudos.js, que ja faz o filtro
  // inverso pra aquela tela). Mesmo campo tipoAvaliacao, mesmo snapshot — so
  // o criterio de inclusao difere entre as duas telas, sem chamada nova.
  const avaliacoesDoCurso = useMemo(
    () =>
      (snapshot.avaliacoes || [])
        .filter((avaliacao) => avaliacao.cursoId === cursoSelecionadoId && Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ)
        .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "")),
    [snapshot.avaliacoes, cursoSelecionadoId]
  );

  const [emAndamentoInfo, setEmAndamentoInfo] = useState(() => new Map());
  const [versaoVerificacaoRascunho, setVersaoVerificacaoRascunho] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  // "Em andamento" nao vem do backend (nao existe tentativa em aberto la —
  // ver nota em quizRascunho.js); e so um rascunho local ainda valido pra
  // essa avaliacao, com a mesma contagem de tentativas que o servidor
  // conhece agora. Guarda tambem o prazoFinal (quando a avaliacao tem tempo
  // limite) pra poder mostrar o cronometro contando direto no card, sem
  // precisar abrir o quiz. Reavaliado quando a lista muda ou quando o
  // QuizModal fecha (versaoVerificacaoRascunho), ja que fechar sem enviar e
  // justamente o que pode ter criado/atualizado um rascunho.
  useEffect(() => {
    let ignorar = false;

    async function verificarRascunhos() {
      const candidatas = avaliacoesDoCurso.filter((avaliacao) => obterDisponibilidadeAvaliacao(avaliacao).podeRealizar);
      const resultados = await Promise.all(
        candidatas.map(async (avaliacao) => [avaliacao.id, await rascunhoAvaliacaoValido(avaliacao)])
      );

      if (!ignorar) {
        const proximoMapa = new Map();
        resultados.forEach(([id, rascunho]) => {
          if (rascunho) {
            proximoMapa.set(id, { prazoFinal: rascunho.prazoFinal || null });
          }
        });
        setEmAndamentoInfo(proximoMapa);
      }
    }

    verificarRascunhos();

    return () => {
      ignorar = true;
    };
  }, [avaliacoesDoCurso, versaoVerificacaoRascunho]);

  // So cronometra (tick a cada 1s) enquanto existir pelo menos uma avaliacao
  // em andamento com prazo — evita o interval rodando a toa quando nenhuma
  // avaliacao em andamento tem tempo limite.
  useEffect(() => {
    const temPrazoAtivo = [...emAndamentoInfo.values()].some((info) => info.prazoFinal);
    if (!temPrazoAtivo) {
      return undefined;
    }

    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [emAndamentoInfo]);

  if (cursosMatriculados.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Você ainda não possui cursos com avaliações disponíveis.</Text>
      </View>
    );
  }

  if (!cursoSelecionadoId) {
    return (
      <View style={estilos.container}>
        <SeletorCurso
          accessibilityLabelPrefix="Ver avaliações de"
          itens={cursosMatriculados.map((progresso) => ({ curso: cursoPorId.get(progresso.cursoId), id: progresso.cursoId }))}
          onSelecionar={setCursoSelecionadoId}
        />
      </View>
    );
  }

  const cursoAtivo = cursoPorId.get(cursoSelecionadoId);
  const tituloCursoAtivo = cursoAtivo?.titulo || `Curso #${cursoSelecionadoId}`;

  return (
    <View style={estilos.container}>
      <TouchableOpacity
        accessibilityLabel="Voltar para a seleção de cursos"
        onPress={() => setCursoSelecionadoId(null)}
        style={estilos.voltar}
      >
        <Ionicons color={cores.destaque} name="chevron-back" size={18} />
        <Text style={estilos.voltarTexto}>Trocar de curso</Text>
      </TouchableOpacity>

      <Text numberOfLines={1} style={estilos.tituloCursoAtivo}>{tituloCursoAtivo}</Text>

      {mensagemFeedback ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagemFeedback} onFechar={() => setMensagemFeedback("")} tipo="informativo" />
        </View>
      ) : null}

      {avaliacoesDoCurso.length === 0 ? (
        <Text style={estilos.vazio}>Este curso ainda não possui avaliações disponíveis.</Text>
      ) : (
        <ScrollView contentContainerStyle={estilos.corpo}>
          {avaliacoesDoCurso.map((avaliacao) => {
            const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
            const concluida = !disponibilidade.podeRealizar && disponibilidade.tone === "neutro";
            const infoEmAndamento = disponibilidade.podeRealizar ? emAndamentoInfo.get(avaliacao.id) : undefined;
            const emAndamento = Boolean(infoEmAndamento);
            const tempoRestanteEmAndamento = infoEmAndamento?.prazoFinal
              ? Math.max(0, Math.round((infoEmAndamento.prazoFinal - agora) / 1000))
              : null;
            const contexto = avaliacao.moduloTitulo;
            const temTentativa = Number(avaliacao.tentativasRealizadas || 0) > 0;
            const mostrarNota = temTentativa && avaliacao.ultimaNota != null;
            const mostrarStatusPendente = !disponibilidade.podeRealizar && !concluida && !emAndamento;
            const statusVisual = TONE_VISUAL[disponibilidade.tone] || TONE_VISUAL.aviso;
            // Card inteiro e clicavel pros dois estados com acao real: abre o
            // quiz se disponivel, ou avisa que ja foi concluida (sem reabrir
            // o fluxo nem criar tentativa nova). Estados Agendada/Encerrada/
            // Sem questoes continuam so informativos (ja mostram o motivo via
            // cartaoStatusLinha abaixo) — nao viram botao pra nao sugerir uma
            // acao que nao existe.
            const interativo = disponibilidade.podeRealizar || concluida;
            const rotuloAcessibilidade = disponibilidade.podeRealizar
              ? `Iniciar avaliação ${avaliacao.titulo}`
              : concluida
                ? `${avaliacao.titulo}. Avaliação concluída.`
                : `${avaliacao.titulo}. ${contexto}. ${disponibilidade.mensagem}`;
            const dicaAcessibilidade = disponibilidade.podeRealizar
              ? "Abre a avaliação para responder"
              : concluida
                ? "Mostra que esta avaliação já foi concluída"
                : undefined;

            return (
              <TouchableOpacity
                accessibilityHint={dicaAcessibilidade}
                accessibilityLabel={rotuloAcessibilidade}
                accessibilityRole={interativo ? "button" : undefined}
                activeOpacity={interativo ? 0.75 : 1}
                disabled={!interativo}
                key={avaliacao.id}
                onPress={() => {
                  if (disponibilidade.podeRealizar) {
                    setAvaliacaoSelecionada(avaliacao);
                  } else if (concluida) {
                    setMensagemFeedback("Esta avaliação já foi concluída.");
                  }
                }}
                style={estilos.cartao}
              >
                <View style={estilos.cartaoTopo}>
                  <View style={estilos.cartaoIcone}>
                    <Ionicons color={cores.destaque} name="clipboard-outline" size={20} />
                  </View>

                  <View style={estilos.cartaoTextos}>
                    <View style={estilos.cartaoTituloLinha}>
                      <Text style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
                      {mostrarNota ? (
                        <View style={estilos.badgeNota}>
                          <Text style={estilos.badgeNotaTexto}>
                            {formatScore(avaliacao.ultimaNota)}/{formatScore(avaliacao.notaMaxima)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {contexto ? <Text style={estilos.cartaoContexto}>{contexto}</Text> : null}
                    {emAndamento ? (
                      <Text
                        style={[
                          estilos.cartaoEmAndamento,
                          tempoRestanteEmAndamento !== null && tempoRestanteEmAndamento <= 60 ? estilos.cartaoEmAndamentoUrgente : null
                        ]}
                      >
                        {tempoRestanteEmAndamento === null
                          ? "Em andamento"
                          : tempoRestanteEmAndamento > 0
                            ? `Em andamento · ${formatarTempoRestante(tempoRestanteEmAndamento)}`
                            : "Tempo esgotado"}
                      </Text>
                    ) : null}
                    {mostrarStatusPendente ? (
                      <View style={estilos.cartaoStatusLinha}>
                        <Ionicons color={statusVisual.cor} name={statusVisual.icone} size={13} />
                        <Text style={[estilos.cartaoStatusTexto, { color: statusVisual.cor }]}>{disponibilidade.label}</Text>
                      </View>
                    ) : null}
                  </View>

                  {disponibilidade.podeRealizar ? (
                    <View accessibilityElementsHidden importantForAccessibility="no" style={estilos.botaoPlay}>
                      <Ionicons color={cores.destaque} name="play-circle" size={30} />
                    </View>
                  ) : concluida ? (
                    <View accessibilityElementsHidden importantForAccessibility="no" style={estilos.iconeEstado}>
                      <Ionicons color={cores.sucesso} name="checkmark-circle" size={22} />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <QuizModal
        avaliacao={avaliacaoSelecionada}
        onConcluido={onRecarregar}
        onFechar={() => {
          setAvaliacaoSelecionada(null);
          setVersaoVerificacaoRascunho((atual) => atual + 1);
        }}
        onSessionExpired={onSessionExpired}
        visivel={Boolean(avaliacaoSelecionada)}
      />
    </View>
  );
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
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.sm },
  // paddingBottom aqui (nao mais paddingTop dividido no `corpo` abaixo) e o
  // UNICO dono do espaco entre o titulo e o primeiro card — mesmo padrao
  // estrutural do cabecalhoCurso de ConteudosScreen.jsx (paddingBottom: lg +
  // corpo com paddingTop: 0), reaproveitado aqui por pedido explicito pra
  // nao deixar duas origens de espacamento (titulo + ScrollView) cada uma
  // contribuindo uma fatia do mesmo respiro visual.
  tituloCursoAtivo: {
    color: cores.texto,
    fontWeight: "700",
    fontSize: tipografia.titulo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.sm,
    paddingBottom: espacamentos.lg
  },
  corpo: { padding: espacamentos.xl, paddingTop: 0, gap: espacamentos.md },
  // borderLeftWidth/borderLeftColor seguem o mesmo padrao do card "Continue
  // de onde parou" em ConteudosScreen.jsx (.continuar) — faixa roxa de
  // identidade visual, mesma cor/espessura, sem afetar o raio dos cantos
  // (RN aplica borderRadius por cima do borderLeftWidth automaticamente)
  // nem a area de toque (TouchableOpacity continua cobrindo o card inteiro).
  cartao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    padding: espacamentos.lg,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque
  },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacamentos.sm },
  cartaoIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  cartaoTextos: { flex: 1 },
  cartaoTituloLinha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: espacamentos.xs },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, flexShrink: 1 },
  badgeNota: { backgroundColor: cores.fundoCartaoAtivo, borderRadius: 999, paddingHorizontal: espacamentos.sm, paddingVertical: 2 },
  badgeNotaTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.legenda },
  cartaoContexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 2 },
  cartaoEmAndamento: { color: cores.informativo, fontSize: tipografia.legenda, marginTop: 4, fontWeight: "700" },
  cartaoEmAndamentoUrgente: { color: cores.erro },
  cartaoStatusLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cartaoStatusTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  botaoPlay: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  iconeEstado: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
