import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatarTempoRestante, formatGrade } from "../../lib/format.js";
import { rascunhoAvaliacaoValido } from "../../lib/quizRascunho.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { useAlturaBarraAbas } from "../../lib/useAlturaBarraAbas.js";
import AbasSegmentadas from "../../components/AbasSegmentadas.jsx";
import Botao from "../../components/Botao.jsx";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import QuizModal from "../../components/QuizModal.jsx";
import RevisaoQuizModal from "../../components/RevisaoQuizModal.jsx";
import Toast from "../../components/Toast.jsx";

const TIPO_QUIZ = 1;
const TIPO_EXERCICIO = 3;
const ABA_DISPONIVEIS = "disponiveis";
const ABA_CONCLUIDAS = "concluidas";
const FILTRO_TODOS_OS_CURSOS = null;

// obterDisponibilidadeAvaliacao() ja calcula tone+label pros estados
// Agendada/Encerrada/Sem questoes (nenhum dos tres e "Bloqueada" nem
// "concluida" - ver classificarAvaliacao). Essa cor so vale pra eles.
const TONE_VISUAL = {
  aviso: { cor: cores.aviso, fundo: cores.avisoFundo },
  erro: { cor: cores.erro, fundo: cores.erroFundo }
};

// Classificacao pura (sem "em andamento", que depende do rascunho local
// assincrono - ver emAndamentoInfo no componente) - usada tanto no render
// quanto no useState inicial de abaAtiva (decidir a aba sem esperar efeito,
// ja que o snapshot chega pronto via prop, sem fetch proprio desta tela).
function classificarAvaliacao(avaliacao) {
  const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
  const concluida = !disponibilidade.podeRealizar && disponibilidade.tone === "neutro";
  const bloqueada = !disponibilidade.podeRealizar && disponibilidade.label === "Bloqueada";
  return { disponibilidade, concluida, bloqueada };
}

/* Lista direta, sem passo de selecao de curso (docs/redesign-mobile/
   PROMPT-agente-avaliacoes-lista-direta.md): snapshot.avaliacoes ja traz
   as avaliacoes de TODOS os cursos com cursoId/cursoTitulo, entao abrir a
   aba ja mostra tudo de uma vez - SeletorCurso/CartaoCursoAtivo saem desta
   tela (removidos do projeto: o prompt-agente-progresso-visao-geral.md
   tirou o ultimo uso deles em ProgressoScreen.jsx). Abas "Disponiveis |
   Concluidas"
   (AbasSegmentadas, criado pelo prompt de Certificados e reaproveitado
   aqui) substituem os pills "Todas/Disponiveis/Concluidas" de antes; os
   chips de curso (so cursos com avaliacao formal) filtram as duas abas de
   uma vez. Regras de disponibilidade/bloqueio/tentativas/nota, o modal de
   confirmacao (QuizModal) e a revisao (RevisaoQuizModal, ja usada por
   ConteudosScreen.jsx pro quiz - mesmo endpoint generico por
   avaliacaoId+tentativaId) continuam exatamente como estavam. */
export default function AvaliacoesScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const alturaBarraAbas = useAlturaBarraAbas();
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [avaliacaoParaRevisar, setAvaliacaoParaRevisar] = useState(null);
  const [filtroCursoId, setFiltroCursoId] = useState(FILTRO_TODOS_OS_CURSOS);
  const [mensagemFeedback, setMensagemFeedback] = useState("");
  const route = useRoute();
  const navigation = useNavigation();

  const avaliacoesFormaisTodas = useMemo(
    () => (snapshot.avaliacoes || []).filter((avaliacao) => Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ),
    [snapshot.avaliacoes]
  );

  // Aba inicial "Disponiveis", ou "Concluidas" se nao houver nenhuma
  // avaliacao disponivel/pendente/bloqueada e ja houver concluida (item 4
  // do prompt) - decidido so na primeira renderizacao (useState, nao
  // efeito): snapshot chega pronto via prop, sem fetch proprio desta tela,
  // entao nao ha "carregando" pra esperar. Trocar de aba manualmente depois
  // nunca e desfeito por essa conta (ela so roda uma vez, no mount).
  const [abaAtiva, setAbaAtiva] = useState(() => {
    const haDisponivelOuPendente = avaliacoesFormaisTodas.some((avaliacao) => !classificarAvaliacao(avaliacao).concluida);
    const haConcluida = avaliacoesFormaisTodas.some((avaliacao) => classificarAvaliacao(avaliacao).concluida);
    return !haDisponivelOuPendente && haConcluida ? ABA_CONCLUIDAS : ABA_DISPONIVEIS;
  });

  // Resultado de busca (BuscaScreen.jsx) ou um atalho de curso podem
  // navegar aqui ja com um curso escolhido via route.params - consome o
  // param uma unica vez (marca o chip desse curso) e limpa com setParams,
  // senao reabrir essa aba manualmente depois sempre voltaria forcado pro
  // mesmo curso da ultima vez.
  useEffect(() => {
    if (route.params?.cursoId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consome um param de navegacao vindo de fora (BuscaScreen.jsx) uma unica vez; nao e estado derivavel de props/state local, so existe no objeto route.
      setFiltroCursoId(route.params.cursoId);
      navigation.setParams({ cursoId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so quer reagir quando um novo cursoId chega via navegacao, nao a cada render.
  }, [route.params?.cursoId]);

  // Reseta o filtro de curso e a aba toda vez que a aba Avaliacoes e tocada
  // na barra inferior, mesmo se ja estiver nela - mesmo padrao de
  // ConteudosScreen.jsx (`tabPress`, nao useFocusEffect).
  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      setFiltroCursoId(FILTRO_TODOS_OS_CURSOS);
      setAbaAtiva(ABA_DISPONIVEIS);
    });
  }, [navigation]);

  // Chips: so cursos com pelo menos uma avaliacao formal (item 2) -
  // cursoTitulo ja vem no proprio DTO da avaliacao, sem precisar de
  // snapshot.cursos aqui.
  const cursosComAvaliacao = useMemo(() => {
    const porId = new Map();
    avaliacoesFormaisTodas.forEach((avaliacao) => {
      if (!porId.has(avaliacao.cursoId)) {
        porId.set(avaliacao.cursoId, avaliacao.cursoTitulo || `Curso #${avaliacao.cursoId}`);
      }
    });
    return [...porId.entries()].map(([id, titulo]) => ({ id, titulo })).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [avaliacoesFormaisTodas]);

  const avaliacoesDoFiltro = useMemo(
    () =>
      avaliacoesFormaisTodas
        .filter((avaliacao) => filtroCursoId === FILTRO_TODOS_OS_CURSOS || avaliacao.cursoId === filtroCursoId)
        .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "")),
    [avaliacoesFormaisTodas, filtroCursoId]
  );

  const [emAndamentoInfo, setEmAndamentoInfo] = useState(() => new Map());
  const [versaoVerificacaoRascunho, setVersaoVerificacaoRascunho] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  // "Em andamento" nao vem do backend (nao existe tentativa em aberto la —
  // ver nota em quizRascunho.js); e so um rascunho local ainda valido pra
  // essa avaliacao, com a mesma contagem de tentativas que o servidor
  // conhece agora. Guarda tambem o prazoFinal (quando a avaliacao tem tempo
  // limite) pra poder mostrar o cronometro contando direto no card, sem
  // precisar abrir o quiz. Verificado sobre TODAS as avaliacoes formais
  // (nao so as do filtro de curso atual), pra trocar de chip nao perder o
  // rastro de um rascunho que ficou escondido.
  useEffect(() => {
    let ignorar = false;

    async function verificarRascunhos() {
      const candidatas = avaliacoesFormaisTodas.filter((avaliacao) => obterDisponibilidadeAvaliacao(avaliacao).podeRealizar);
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
  }, [avaliacoesFormaisTodas, versaoVerificacaoRascunho]);

  // So cronometra (tick a cada 1s) enquanto existir pelo menos uma avaliacao
  // em andamento com prazo - evita o interval rodando a toa quando nenhuma
  // avaliacao em andamento tem tempo limite.
  useEffect(() => {
    const temPrazoAtivo = [...emAndamentoInfo.values()].some((info) => info.prazoFinal);
    if (!temPrazoAtivo) {
      return undefined;
    }

    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [emAndamentoInfo]);

  if (avaliacoesFormaisTodas.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.tituloTela}>Avaliações</Text>
        <Text style={estilos.subtituloTela}>Testes práticos e teóricos do seu curso</Text>
        <EstadoVazio icone="clipboard-outline" mensagem="Seus cursos ainda não têm avaliações." />
      </View>
    );
  }

  const disponiveisTopo = [];
  const bloqueadas = [];
  const concluidas = [];
  avaliacoesDoFiltro.forEach((avaliacao) => {
    const { concluida, bloqueada } = classificarAvaliacao(avaliacao);
    if (concluida) {
      concluidas.push(avaliacao);
    } else if (bloqueada) {
      bloqueadas.push(avaliacao);
    } else {
      disponiveisTopo.push(avaliacao);
    }
  });
  // Mais recente pra mais antiga (item 4) - ultimaTentativaId cresce a cada
  // tentativa nova, e o unico sinal de recencia que o DTO ja traz hoje
  // (sem endpoint novo, por instrucao do prompt).
  concluidas.sort((a, b) => (b.ultimaTentativaId || 0) - (a.ultimaTentativaId || 0));

  function abrirAvaliacao(avaliacao) {
    setAvaliacaoSelecionada(avaliacao);
  }

  function renderizarCartao(avaliacao, variante) {
    const { disponibilidade, bloqueada } = classificarAvaliacao(avaliacao);
    const concluida = variante === "concluida";
    const infoEmAndamento = disponibilidade.podeRealizar ? emAndamentoInfo.get(avaliacao.id) : undefined;
    const emAndamento = Boolean(infoEmAndamento);
    const tempoRestanteEmAndamento = infoEmAndamento?.prazoFinal
      ? Math.max(0, Math.round((infoEmAndamento.prazoFinal - agora) / 1000))
      : null;
    const tentativasRealizadas = Number(avaliacao.tentativasRealizadas || 0);
    const tentativasPermitidas = avaliacao.tentativasPermitidas || 1;
    const mostrarNota = tentativasRealizadas > 0 && avaliacao.ultimaNota != null;

    const selo = concluida
      ? { cor: cores.informativo, fundo: cores.informativoFundo, rotulo: "Concluída" }
      : emAndamento
        ? { cor: cores.informativo, fundo: cores.informativoFundo, rotulo: "Em andamento" }
        : bloqueada
          ? { cor: cores.textoRotulo, fundo: cores.fundoCartaoAtivo, rotulo: "Bloqueada" }
          : disponibilidade.podeRealizar
            ? { cor: cores.sucesso, fundo: cores.sucessoFundo, rotulo: "Disponível" }
            : { ...(TONE_VISUAL[disponibilidade.tone] || TONE_VISUAL.aviso), rotulo: disponibilidade.label };

    const partesLinha2 = [
      `${avaliacao.totalQuestoes} questõe${avaliacao.totalQuestoes === 1 ? "" : "s"}`,
      `${tentativasRealizadas}/${tentativasPermitidas} tentativas`,
      mostrarNota ? `Nota ${formatGrade(avaliacao.ultimaNota)}` : "Nota —",
      avaliacao.tempoLimiteMinutos > 0 ? `${avaliacao.tempoLimiteMinutos} min` : null
    ].filter(Boolean);

    const rotuloBotaoAcao = emAndamento ? "▶ Continuar" : tentativasRealizadas > 0 ? "Tentar de novo" : "▶ Iniciar avaliação";

    const iconeTipo = Number(avaliacao.tipoAvaliacao) === TIPO_EXERCICIO ? "create-outline" : "reader-outline";

    return (
      <View key={avaliacao.id} style={estilos.cartao}>
        <View style={estilos.cartaoCabecalho}>
          <View style={estilos.cartaoIcone}>
            <Ionicons color={cores.destaque} name={iconeTipo} size={18} />
          </View>
          <View style={estilos.cartaoCabecalhoTextos}>
            <Text numberOfLines={2} style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
            {filtroCursoId === FILTRO_TODOS_OS_CURSOS ? (
              <Text numberOfLines={1} style={estilos.cartaoCurso}>{avaliacao.cursoTitulo}</Text>
            ) : null}
          </View>
          <View style={[estilos.selo, { backgroundColor: selo.fundo }]}>
            <Text numberOfLines={1} style={[estilos.seloTexto, { color: selo.cor }]}>{selo.rotulo}</Text>
          </View>
        </View>

        <Text style={estilos.cartaoLinha2}>{partesLinha2.join(" · ")}</Text>

        {!concluida && !bloqueada && emAndamento && tempoRestanteEmAndamento !== null ? (
          <Text style={[estilos.cartaoEmAndamento, tempoRestanteEmAndamento <= 60 ? estilos.cartaoEmAndamentoUrgente : null]}>
            {tempoRestanteEmAndamento > 0 ? `Tempo restante: ${formatarTempoRestante(tempoRestanteEmAndamento)}` : "Tempo esgotado"}
          </Text>
        ) : null}

        {bloqueada ? (
          <Text style={estilos.cartaoStatusTexto}>{disponibilidade.mensagem}</Text>
        ) : concluida ? (
          <Botao onPress={() => setAvaliacaoParaRevisar(avaliacao)} style={estilos.botaoPilula} variante="secundario">
            Ver revisão
          </Botao>
        ) : (
          <Botao onPress={() => abrirAvaliacao(avaliacao)} style={estilos.botaoPilula} variante="primario">
            {rotuloBotaoAcao}
          </Botao>
        )}
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.tituloTela}>Avaliações</Text>
      <Text style={estilos.subtituloTela}>Testes práticos e teóricos do seu curso</Text>

      <View style={estilos.topoFiltros}>
        <AbasSegmentadas
          onSelecionar={setAbaAtiva}
          opcoes={[
            { chave: ABA_DISPONIVEIS, rotulo: "Disponíveis", contador: disponiveisTopo.length + bloqueadas.length },
            { chave: ABA_CONCLUIDAS, rotulo: "Concluídas", contador: concluidas.length }
          ]}
          valorSelecionado={abaAtiva}
        />

        <ScrollView contentContainerStyle={estilos.chipsLinha} horizontal showsHorizontalScrollIndicator={false}>
          <Chip ativo={filtroCursoId === FILTRO_TODOS_OS_CURSOS} onPress={() => setFiltroCursoId(FILTRO_TODOS_OS_CURSOS)} rotulo="Todos os cursos" />
          {cursosComAvaliacao.map((curso) => (
            <Chip ativo={filtroCursoId === curso.id} key={curso.id} onPress={() => setFiltroCursoId(curso.id)} rotulo={curso.titulo} />
          ))}
        </ScrollView>
      </View>

      {mensagemFeedback ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagemFeedback} onFechar={() => setMensagemFeedback("")} tipo="informativo" />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={[estilos.corpo, { paddingBottom: alturaBarraAbas }]}>
        {abaAtiva === ABA_DISPONIVEIS ? (
          <>
            {disponiveisTopo.length === 0 ? (
              <EstadoVazio icone="clipboard-outline" mensagem="Nenhuma avaliação disponível agora." />
            ) : (
              disponiveisTopo.map((avaliacao) => renderizarCartao(avaliacao, "acao"))
            )}

            {bloqueadas.length > 0 ? (
              <>
                <Text style={estilos.subtituloGrupo}>Ainda bloqueadas</Text>
                {bloqueadas.map((avaliacao) => renderizarCartao(avaliacao, "bloqueada"))}
              </>
            ) : null}
          </>
        ) : concluidas.length === 0 ? (
          <EstadoVazio icone="checkmark-done-outline" mensagem="Você ainda não concluiu avaliações." />
        ) : (
          concluidas.map((avaliacao) => renderizarCartao(avaliacao, "concluida"))
        )}
      </ScrollView>

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

      <RevisaoQuizModal
        avaliacaoId={avaliacaoParaRevisar?.id}
        onFechar={() => setAvaliacaoParaRevisar(null)}
        onSessionExpired={onSessionExpired}
        tentativaId={avaliacaoParaRevisar?.ultimaTentativaId}
        visivel={Boolean(avaliacaoParaRevisar)}
      />
    </View>
  );
}

function Chip({ ativo, onPress, rotulo }) {
  return (
    <TouchableOpacity
      accessibilityHint={`Mostra ${ativo ? "" : "só "}avaliações de ${rotulo.toLowerCase()}`}
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[estilos.chip, ativo ? estilos.chipAtivo : null]}
    >
      <Text numberOfLines={1} style={[estilos.chipTexto, ativo ? estilos.chipTextoAtivo : null]}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  tituloTela: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo, paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.xl },
  subtituloTela: { color: cores.textoRotulo, fontSize: tipografia.rotulo, paddingHorizontal: espacamentos.xl, marginTop: 2 },
  topoFiltros: { paddingHorizontal: espacamentos.xl, marginTop: espacamentos.md, gap: espacamentos.sm },
  chipsLinha: { gap: espacamentos.sm },
  chip: {
    borderRadius: raios.pilula,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    backgroundColor: cores.fundoCartao,
    paddingHorizontal: espacamentos.md,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  chipAtivo: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.rotulo },
  chipTextoAtivo: { color: "#fff", fontWeight: "700" },
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.sm },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },
  subtituloGrupo: { color: cores.textoRotulo, fontWeight: "700", fontSize: tipografia.rotulo, textTransform: "uppercase", letterSpacing: 0.4, marginTop: espacamentos.sm },
  cartao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.sm
  },
  cartaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: espacamentos.sm },
  cartaoIcone: {
    width: 32,
    height: 32,
    borderRadius: raios.md,
    backgroundColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  cartaoCabecalhoTextos: { flex: 1, gap: 2 },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  cartaoCurso: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  selo: { borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3, flexShrink: 1 },
  seloTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  cartaoLinha2: { color: cores.textoSuave, fontSize: tipografia.legenda },
  cartaoEmAndamento: { color: cores.informativo, fontSize: tipografia.legenda, fontWeight: "700" },
  cartaoEmAndamentoUrgente: { color: cores.erro },
  cartaoStatusTexto: { color: cores.textoSuave, fontSize: tipografia.legenda },
  botaoPilula: { borderRadius: raios.pilula, alignSelf: "stretch" }
});
