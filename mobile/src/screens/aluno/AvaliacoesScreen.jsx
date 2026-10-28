import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatarTempoRestante, formatGrade, normalizeEvaluationType } from "../../lib/format.js";
import { rascunhoAvaliacaoValido } from "../../lib/quizRascunho.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import CartaoCursoAtivo from "../../components/CartaoCursoAtivo.jsx";
import QuizModal from "../../components/QuizModal.jsx";
import SeletorCurso from "../../components/SeletorCurso.jsx";
import Toast from "../../components/Toast.jsx";

const TIPO_QUIZ = 1;
// Nota minima de aprovacao do curso (mesmo valor usado pelo backend pra
// liberar certificado, ver CertificadoService.ObterPendenciasAsync) - usada
// so pra decidir a cor do "Resultado: Nota X/Y" abaixo, nunca pra calcular
// aprovacao de verdade (isso e sempre responsabilidade do servidor).
const NOTA_MINIMA_APROVACAO = 7;

const FILTROS = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "disponiveis", rotulo: "Disponíveis" },
  { chave: "concluidas", rotulo: "Concluídas" }
];

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
  const [filtro, setFiltro] = useState("todas");
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

  // Mesmo ajuste de ConteudosScreen.jsx: curso selecionado e estado local,
  // nao rota — sem isso o voltar fisico do Android pulava direto pra fora
  // da aba em vez de voltar pra selecao de curso.
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

  // Resumo discreto (redesign, 3_avaliacoes.png) - conta sobre TODAS as
  // avaliacoes do curso, independente do filtro selecionado abaixo.
  const resumo = { disponiveis: 0, concluidas: 0, somaNotas: 0, quantidadeNotas: 0 };
  avaliacoesDoCurso.forEach((avaliacao) => {
    const disponibilidadeResumo = obterDisponibilidadeAvaliacao(avaliacao);
    if (disponibilidadeResumo.podeRealizar) {
      resumo.disponiveis += 1;
    } else if (disponibilidadeResumo.tone === "neutro") {
      resumo.concluidas += 1;
    }
    if (Number(avaliacao.tentativasRealizadas || 0) > 0 && avaliacao.ultimaNota != null) {
      resumo.somaNotas += Number(avaliacao.ultimaNota);
      resumo.quantidadeNotas += 1;
    }
  });
  const mediaResumo = resumo.quantidadeNotas > 0 ? resumo.somaNotas / resumo.quantidadeNotas : null;

  const avaliacoesFiltradas = avaliacoesDoCurso.filter((avaliacao) => {
    if (filtro === "todas") {
      return true;
    }
    const disponibilidadeFiltro = obterDisponibilidadeAvaliacao(avaliacao);
    if (filtro === "disponiveis") {
      return disponibilidadeFiltro.podeRealizar;
    }
    return !disponibilidadeFiltro.podeRealizar && disponibilidadeFiltro.tone === "neutro";
  });

  return (
    <View style={estilos.container}>
      <Text style={estilos.tituloTela}>Avaliações</Text>
      <Text style={estilos.subtituloTela}>Testes práticos e teóricos do seu curso</Text>

      <CartaoCursoAtivo onTrocar={() => setCursoSelecionadoId(null)} titulo={tituloCursoAtivo} />

      {avaliacoesDoCurso.length > 0 ? (
        <>
          <Text style={estilos.resumoLinha}>
            {resumo.disponiveis} disponíve{resumo.disponiveis === 1 ? "l" : "is"} · {resumo.concluidas} conclu
            {resumo.concluidas === 1 ? "ída" : "ídas"}
            {mediaResumo !== null ? ` · Média ${formatGrade(mediaResumo)}` : ""}
          </Text>

          <View style={estilos.filtroLinha}>
            {FILTROS.map((opcao) => {
              const ativo = filtro === opcao.chave;
              return (
                <TouchableOpacity
                  accessibilityHint={`Mostra ${ativo ? "" : "só "}avaliações: ${opcao.rotulo.toLowerCase()}`}
                  accessibilityLabel={opcao.rotulo}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  key={opcao.chave}
                  onPress={() => setFiltro(opcao.chave)}
                  style={[estilos.filtroItem, ativo ? estilos.filtroItemAtivo : null]}
                >
                  <Text style={[estilos.filtroItemTexto, ativo ? estilos.filtroItemTextoAtivo : null]}>{opcao.rotulo}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {mensagemFeedback ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagemFeedback} onFechar={() => setMensagemFeedback("")} tipo="informativo" />
        </View>
      ) : null}

      {avaliacoesDoCurso.length === 0 ? (
        <Text style={estilos.vazio}>Este curso ainda não possui avaliações disponíveis.</Text>
      ) : avaliacoesFiltradas.length === 0 ? (
        <Text style={estilos.vazio}>Nenhuma avaliação neste filtro.</Text>
      ) : (
        <ScrollView contentContainerStyle={estilos.corpo}>
          {avaliacoesFiltradas.map((avaliacao) => {
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
            // NotaMaxima varia por avaliacao (o professor configura, default
            // 10 - ver Models/Avaliacao.cs) - comparar ultimaNota direto
            // contra NOTA_MINIMA_APROVACAO (escala 0-10) só faria sentido se
            // notaMaxima fosse sempre 10. Normaliza pra proporcao (ex.: 5,0
            // de 5,0 = 100% = aprovado, nao "5 < 7 = reprovado").
            const notaAprovada =
              mostrarNota &&
              Number(avaliacao.notaMaxima) > 0 &&
              (Number(avaliacao.ultimaNota) / Number(avaliacao.notaMaxima)) * 10 >= NOTA_MINIMA_APROVACAO;
            const mostrarStatusPendente = !disponibilidade.podeRealizar && !concluida && !emAndamento;
            const statusVisual = TONE_VISUAL[disponibilidade.tone] || TONE_VISUAL.aviso;
            const tentativasPermitidas = avaliacao.tentativasPermitidas || 1;
            const tentativaAtual = Math.min(Number(avaliacao.tentativasRealizadas || 0) + 1, tentativasPermitidas);

            const statusPill = concluida
              ? { cor: cores.sucesso, corFundo: cores.sucessoFundo, rotulo: "✓ Concluída" }
              : emAndamento
                ? { cor: cores.informativo, corFundo: cores.informativoFundo, rotulo: "Em andamento" }
                : disponibilidade.podeRealizar
                  ? { cor: cores.destaque, corFundo: cores.bordaCartao, rotulo: "Disponível" }
                  : { cor: statusVisual.cor, corFundo: statusVisual.cor === cores.erro ? cores.erroFundo : cores.avisoFundo, rotulo: disponibilidade.label };

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
                <View style={estilos.cartaoCabecalho}>
                  <View style={estilos.seloTipo}>
                    <Text style={estilos.seloTipoTexto}>{normalizeEvaluationType(avaliacao.tipoAvaliacao).toUpperCase()}</Text>
                  </View>
                  <View style={[estilos.statusPill, { backgroundColor: statusPill.corFundo }]}>
                    <Text numberOfLines={1} style={[estilos.statusPillTexto, { color: statusPill.cor }]}>{statusPill.rotulo}</Text>
                  </View>
                </View>

                <Text numberOfLines={2} style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
                {contexto ? <Text numberOfLines={1} style={estilos.cartaoContexto}>{contexto}</Text> : null}

                {concluida ? (
                  mostrarNota ? (
                    <View style={estilos.resultadoLinha}>
                      <Text style={estilos.resultadoRotulo}>Resultado:</Text>
                      <View style={[estilos.notaPill, { backgroundColor: notaAprovada ? cores.sucessoFundo : cores.fundoCartaoAtivo }]}>
                        <Text style={[estilos.notaPillTexto, { color: notaAprovada ? cores.sucesso : cores.textoSuave }]}>
                          Nota {formatGrade(avaliacao.ultimaNota)} / {formatGrade(avaliacao.notaMaxima)}
                        </Text>
                      </View>
                    </View>
                  ) : null
                ) : (
                  <>
                    <View style={estilos.divisor} />
                    <View style={estilos.rodape}>
                      <Text numberOfLines={1} style={estilos.rodapeTexto}>
                        {avaliacao.tempoLimiteMinutos > 0 ? `Tempo limite: ${avaliacao.tempoLimiteMinutos} min` : "Sem tempo limite"}
                        {" · "}Tentativa {tentativaAtual} de {tentativasPermitidas}
                      </Text>
                    </View>

                    {disponibilidade.podeRealizar ? (
                      <View accessibilityElementsHidden importantForAccessibility="no" style={estilos.botaoAcao}>
                        <Text style={estilos.botaoAcaoTexto}>{emAndamento ? "Continuar" : "Iniciar"}</Text>
                        <Ionicons color={cores.texto} name="arrow-forward" size={16} />
                      </View>
                    ) : mostrarStatusPendente ? (
                      <Text style={estilos.cartaoStatusTexto}>{disponibilidade.mensagem}</Text>
                    ) : null}

                    {/* "Em andamento" ja aparece na pilula de status acima -
                        essa linha so aparece quando ha algo NOVO pra mostrar
                        (cronometro real), senao duplicava a mesma info a toa. */}
                    {emAndamento && tempoRestanteEmAndamento !== null ? (
                      <Text
                        style={[estilos.cartaoEmAndamento, tempoRestanteEmAndamento <= 60 ? estilos.cartaoEmAndamentoUrgente : null]}
                      >
                        {tempoRestanteEmAndamento > 0
                          ? `Tempo restante: ${formatarTempoRestante(tempoRestanteEmAndamento)}`
                          : "Tempo esgotado"}
                      </Text>
                    ) : null}
                  </>
                )}
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
  tituloTela: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo, paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.xl },
  subtituloTela: { color: cores.textoRotulo, fontSize: tipografia.rotulo, paddingHorizontal: espacamentos.xl, marginTop: 2 },
  // Resumo discreto (redesign) - de proposito sem cor/icone/cartao, uma
  // linha fina de texto so pra contexto rapido, nao um indicador chamativo.
  resumoLinha: {
    color: cores.textoSuave,
    fontSize: tipografia.rotulo,
    paddingHorizontal: espacamentos.xl,
    marginTop: espacamentos.md
  },
  filtroLinha: {
    flexDirection: "row",
    gap: espacamentos.xs,
    paddingHorizontal: espacamentos.xl,
    marginTop: espacamentos.sm
  },
  filtroItem: {
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.md,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  filtroItemAtivo: { backgroundColor: cores.destaque },
  filtroItemTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.rotulo },
  filtroItemTextoAtivo: { color: cores.texto, fontWeight: "700" },
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.sm },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },
  cartao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg
  },
  cartaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacamentos.sm },
  seloTipo: {
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  seloTipoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  statusPill: { borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3, flexShrink: 1, marginLeft: espacamentos.sm },
  statusPillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, marginTop: espacamentos.sm },
  cartaoContexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 2 },
  divisor: { height: 1, backgroundColor: cores.divisoria, marginTop: espacamentos.md, marginBottom: espacamentos.sm },
  rodape: { flexDirection: "row" },
  rodapeTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, flexShrink: 1 },
  botaoAcao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: cores.destaque,
    borderRadius: raios.sm,
    minHeight: 44,
    marginTop: espacamentos.md
  },
  botaoAcaoTexto: { color: cores.texto, fontWeight: "700" },
  resultadoLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, marginTop: espacamentos.md },
  resultadoRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  notaPill: { borderRadius: raios.sm, paddingHorizontal: espacamentos.sm, paddingVertical: 4 },
  notaPillTexto: { fontSize: tipografia.rotulo, fontWeight: "700" },
  cartaoEmAndamento: { color: cores.informativo, fontSize: tipografia.legenda, marginTop: espacamentos.sm, fontWeight: "700" },
  cartaoEmAndamentoUrgente: { color: cores.erro },
  cartaoStatusTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: espacamentos.md },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
