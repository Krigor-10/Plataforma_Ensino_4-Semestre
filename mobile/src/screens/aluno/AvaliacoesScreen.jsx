import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao, obterVisualTipoAvaliacao } from "../../lib/avaliacoes.js";
import { abreviarNomeCurso, formatarTempoRestante, formatScore } from "../../lib/format.js";
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
const ABA_DISPONIVEIS = "disponiveis";
const ABA_CONCLUIDAS = "concluidas";
const FILTRO_TODOS_OS_CURSOS = null;

// StatusTentativaAvaliacao do backend (mesmo enum do DTO, ver
// AvaliacaoAlunoResponseDto.UltimoStatusTentativa) - usado so pra decidir
// quando a linha de nota aparece (item 2 do prompt de ajustes 2). 1
// (EmAndamento) nunca mostra nota - cai no fallback (nenhuma linha).
const STATUS_TENTATIVA_ENVIADA = 2;

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

// Reserva pro nome do curso (docs/redesign-mobile/PROMPT-agente-avaliacoes-
// ajustes-1.md, item 2): avaliacao sem modulo (prova/exercicio final) pode
// chegar com `cursoTitulo` vazio (achado do mesmo prompt, corrigido no
// backend em AvaliacaoService.MapAvaliacaoAluno, mas o app nao deve
// depender so disso) - busca em snapshot.cursos pelo cursoId antes de
// cair no generico "Curso" (nunca "Curso #id").
function resolverTituloCurso(avaliacao, cursoPorId) {
  return avaliacao.cursoTitulo || cursoPorId.get(avaliacao.cursoId)?.titulo || "Curso";
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

  const cursoPorId = useMemo(() => new Map((snapshot.cursos || []).map((curso) => [curso.id, curso])), [snapshot.cursos]);

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

  // Chips: so cursos com pelo menos uma avaliacao formal.
  const cursosComAvaliacao = useMemo(() => {
    const porId = new Map();
    avaliacoesFormaisTodas.forEach((avaliacao) => {
      if (!porId.has(avaliacao.cursoId)) {
        porId.set(avaliacao.cursoId, resolverTituloCurso(avaliacao, cursoPorId));
      }
    });
    return [...porId.entries()].map(([id, titulo]) => ({ id, titulo })).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [avaliacoesFormaisTodas, cursoPorId]);

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
    // Nota que vale = a MELHOR tentativa corrigida (decisao F1 da auditoria
    // de 26/11), ja na escala 0-10 (decisao F0: toda avaliacao vale de 0 a
    // 10, entao nao ha mais conversao pela nota maxima). Sem tentativa
    // corrigida e com a ultima so enviada, mostra "aguardando correcao";
    // EmAndamento ou sem tentativa nao mostram nada.
    const statusUltimaTentativa = Number(avaliacao.ultimoStatusTentativa);
    const notaDisponivel = avaliacao.melhorNota != null;
    const notaAguardandoCorrecao = !notaDisponivel && statusUltimaTentativa === STATUS_TENTATIVA_ENVIADA;
    const notaConvertida = notaDisponivel ? Number(avaliacao.melhorNota) : null;
    const notaAprovada = notaConvertida !== null && notaConvertida >= 7;

    const selo = concluida
      ? { cor: cores.sucesso, fundo: cores.sucessoFundo, icone: "checkmark-circle", rotulo: "Concluída" }
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
      avaliacao.tempoLimiteMinutos > 0 ? `${avaliacao.tempoLimiteMinutos} min` : null
    ].filter(Boolean);

    const rotuloBotaoAcao = emAndamento ? "▶ Continuar" : tentativasRealizadas > 0 ? "Tentar de novo" : "▶ Iniciar avaliação";

    const visualTipo = obterVisualTipoAvaliacao(avaliacao.tipoAvaliacao);

    return (
      <View key={avaliacao.id} style={estilos.cartao}>
        <View style={estilos.cartaoCabecalho}>
          <IconeTipoAvaliacao bloqueada={bloqueada} visual={visualTipo} />
          <View style={estilos.cartaoCabecalhoTextos}>
            <Text style={[estilos.rotuloTipo, { color: visualTipo.corRotulo }]}>{visualTipo.rotulo}</Text>
            <Text numberOfLines={2} style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
            {filtroCursoId === FILTRO_TODOS_OS_CURSOS ? (
              <Text numberOfLines={1} style={estilos.cartaoCurso}>{resolverTituloCurso(avaliacao, cursoPorId)}</Text>
            ) : null}
          </View>
          <View style={[estilos.selo, { backgroundColor: selo.fundo }]}>
            {selo.icone ? <Ionicons color={selo.cor} name={selo.icone} size={12} testID="selo-icone-concluida" /> : null}
            <Text numberOfLines={1} style={[estilos.seloTexto, { color: selo.cor }]}>{selo.rotulo}</Text>
          </View>
        </View>

        <Text style={estilos.cartaoLinha2}>{partesLinha2.join(" · ")}</Text>

        {notaDisponivel ? (
          <Text style={[estilos.notaLinha, { color: notaAprovada ? cores.sucesso : cores.erro }]}>
            {notaAprovada
              ? `✓ Nota ${formatScore(notaConvertida)} · aprovado`
              : `Nota ${formatScore(notaConvertida)} · abaixo de 7,0`}
          </Text>
        ) : notaAguardandoCorrecao ? (
          <Text style={[estilos.notaLinha, estilos.notaAguardandoCorrecao]}>Nota: aguardando correção</Text>
        ) : null}

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
          <Chip ativo={filtroCursoId === FILTRO_TODOS_OS_CURSOS} onPress={() => setFiltroCursoId(FILTRO_TODOS_OS_CURSOS)} rotulo="Todos" />
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

// Icone por tipo, opcao A escolhida pelo usuario (docs/redesign-mobile/
// PROMPT-agente-avaliacoes-ajustes-2-icone.md, item 1): quadrado 40x40 com
// degrade diagonal na cor do tipo (Prova = roxo, Exercicio = azul) e borda
// fina na mesma cor. Bloqueada vira cinza solido (sem bolinha de selo -
// essa e a opcao C, nao escolhida) independente do tipo - o selo de
// situacao (a direita, ver `selo` em renderizarCartao) e quem diz "o que
// esta bloqueado", este icone so diz "o que e" (prova ou exercicio).
function IconeTipoAvaliacao({ bloqueada, visual }) {
  if (bloqueada) {
    return (
      <View style={[estilos.cartaoIcone, estilos.cartaoIconeBloqueada]} testID="icone-tipo-avaliacao">
        <MaterialCommunityIcons color={cores.textoRotulo} name={visual.icone} size={22} />
      </View>
    );
  }

  return (
    <LinearGradient colors={visual.gradiente} style={[estilos.cartaoIcone, { borderColor: visual.corBorda }]} testID="icone-tipo-avaliacao">
      <MaterialCommunityIcons color={visual.corIcone} name={visual.icone} size={22} />
    </LinearGradient>
  );
}

// Compacto e minimalista (docs/redesign-mobile/PROMPT-agente-avaliacoes-
// ajustes-1.md, item 3): nome abreviado no texto visivel (abreviarNomeCurso),
// mas o `rotulo` completo continua no accessibilityLabel pra quem usa
// leitor de tela.
function Chip({ ativo, onPress, rotulo }) {
  const dica = rotulo === "Todos" ? "Mostra avaliações de todos os cursos" : `Mostra só avaliações de ${rotulo.toLowerCase()}`;

  return (
    <TouchableOpacity
      accessibilityHint={dica}
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={onPress}
      style={[estilos.chip, ativo ? estilos.chipAtivo : null]}
    >
      <Text numberOfLines={1} style={[estilos.chipTexto, ativo ? estilos.chipTextoAtivo : null]}>
        {abreviarNomeCurso(rotulo)}
      </Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  topoFiltros: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.lg, gap: espacamentos.sm },
  chipsLinha: { gap: espacamentos.xs },
  // Compacto e minimalista (item 3 do prompt): sem borda quando inativo,
  // roxo translucido (nao o roxo cheio de antes) quando ativo.
  chip: {
    borderRadius: raios.pilula,
    backgroundColor: cores.fundoCartao,
    paddingHorizontal: 10,
    height: 28,
    maxWidth: 160,
    alignItems: "center",
    justifyContent: "center"
  },
  chipAtivo: { backgroundColor: "rgba(123, 47, 247, 0.18)", borderWidth: 1, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.legenda },
  chipTextoAtivo: { color: cores.acento, fontWeight: "700" },
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
  // 40x40/raio 12/borda 1px (item 1 do prompt de ajustes 2) - a cor do
  // degrade e da borda vem de VISUAL_TIPO_AVALIACAO (lib/avaliacoes.js),
  // aplicada inline no IconeTipoAvaliacao.
  cartaoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cartaoIconeBloqueada: { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: "rgba(255, 255, 255, 0.12)" },
  cartaoCabecalhoTextos: { flex: 1, gap: 2 },
  rotuloTipo: { fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  cartaoCurso: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3,
    flexShrink: 1
  },
  seloTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  cartaoLinha2: { color: cores.textoSuave, fontSize: tipografia.legenda },
  // Linha propria da nota (ajustes 1) - cor e texto dependem so da
  // aprovacao (notaAprovada), nao do tone generico de disponibilidade.
  notaLinha: { fontSize: tipografia.rotulo, fontWeight: "700" },
  // Enviada, sem correcao ainda (ajustes 2, item 2) - neutra/ambar, nunca
  // vermelha: a avaliacao ainda nao foi reprovada, so esta esperando.
  notaAguardandoCorrecao: { color: cores.aviso },
  cartaoEmAndamento: { color: cores.informativo, fontSize: tipografia.legenda, fontWeight: "700" },
  cartaoEmAndamentoUrgente: { color: cores.erro },
  cartaoStatusTexto: { color: cores.textoSuave, fontSize: tipografia.legenda },
  botaoPilula: { borderRadius: raios.pilula, alignSelf: "stretch" }
});
