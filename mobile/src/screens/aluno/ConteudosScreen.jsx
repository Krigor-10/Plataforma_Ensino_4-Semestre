import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BannerGradiente from "../../components/BannerGradiente.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { resolverUrlArquivo } from "../../lib/arquivos.js";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatPercent, formatQuestoes, normalizeContentType } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";

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

const ICONE_TIPO_CONTEUDO = {
  1: "document-text-outline",
  2: "document-attach-outline",
  3: "videocam-outline",
  4: "link-outline",
  5: "image-outline"
};

export default function ConteudosScreen({ onRecarregar, onSessionExpired, snapshot, token }) {
  const [cursoAtivoId, setCursoAtivoId] = useState(null);
  const [seletorCursoAberto, setSeletorCursoAberto] = useState(false);
  const [modulosAbertos, setModulosAbertos] = useState(() => new Set());
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [quizSelecionado, setQuizSelecionado] = useState(null);
  const route = useRoute();
  const navigation = useNavigation();

  // Resultado de busca (BuscaScreen.jsx) pode navegar aqui ja com um curso
  // escolhido via route.params — consome o param uma unica vez e limpa com
  // setParams, senao reabrir essa aba manualmente depois sempre voltaria
  // forcado pro mesmo curso da ultima busca.
  useEffect(() => {
    if (route.params?.cursoId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consome um param de navegacao vindo de fora (BuscaScreen.jsx) uma unica vez; nao e estado derivavel de props/state local, so existe no objeto route.
      setCursoAtivoId(route.params.cursoId);
      navigation.setParams({ cursoId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so quer reagir quando um novo cursoId chega via navegacao, nao a cada render.
  }, [route.params?.cursoId]);

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

  const cursoAtivo = grupos.find((curso) => curso.id === cursoAtivoId) || grupos[0] || null;

  function alternarModulo(moduloId) {
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

  function abrirConteudo(conteudo) {
    const url = resolverUrlArquivo(conteudo.arquivoUrl || conteudo.linkUrl, token);
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

  return (
    <View style={estilos.container}>
      <BannerGradiente
        accessibilityLabel={`Curso em estudo: ${cursoAtivo.titulo}. Toque para trocar de curso`}
        icone="school-outline"
        onPress={() => setSeletorCursoAberto(true)}
      >
        <Text style={estilos.seletorRotulo}>Curso em estudo</Text>
        <View style={estilos.seletorLinha}>
          <Text numberOfLines={2} style={estilos.seletorCursoTexto}>{cursoAtivo.titulo}</Text>
          <Ionicons color={cores.texto} name="chevron-down" size={18} />
        </View>
      </BannerGradiente>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <Text style={estilos.progressoCurso}>{formatPercent(cursoAtivo.progresso)} de progresso - {cursoAtivo.modulos.length} módulo(s)</Text>

        {cursoAtivo.proximoConteudo ? (
          <TouchableOpacity onPress={() => alternarModulo(cursoAtivo.proximoConteudo.moduloId)} style={estilos.continuar}>
            <View style={estilos.continuarIcone}>
              <Ionicons color={cores.destaque} name="play-circle-outline" size={20} />
            </View>
            <View style={estilos.continuarTextos}>
              <Text style={estilos.continuarRotulo}>Continue de onde parou</Text>
              <Text style={estilos.continuarTitulo}>{cursoAtivo.proximoConteudo.titulo}</Text>
            </View>
          </TouchableOpacity>
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
                disabled={modulo.bloqueado}
                onPress={() => alternarModulo(modulo.id)}
                style={estilos.moduloCabecalho}
              >
                <View style={estilos.moduloIcone}>
                  <Ionicons
                    color={modulo.bloqueado ? cores.bloqueado : cores.destaque}
                    name={modulo.bloqueado ? "lock-closed-outline" : "layers-outline"}
                    size={18}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  {modulo.bloqueado ? (
                    <Text style={estilos.moduloContagem}>Conclua o módulo anterior para desbloquear</Text>
                  ) : totalConteudos > 0 ? (
                    <>
                      <View style={estilos.barraFundoFina}>
                        <View style={[estilos.barraPreenchidaFina, { width: `${percentualModulo}%` }]} />
                      </View>
                      <Text
                        accessibilityLabel={`${modulo.concluidos} de ${totalConteudos} conteúdos concluídos${moduloConcluido ? ". Módulo concluído" : ""}`}
                        style={estilos.moduloContagem}
                      >
                        {modulo.concluidos} de {totalConteudos} concluídos{moduloConcluido ? " · Concluído" : ""}
                      </Text>
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

      <Modal animationType="fade" onRequestClose={() => setSeletorCursoAberto(false)} transparent visible={seletorCursoAberto}>
        <TouchableOpacity
          accessibilityLabel="Fechar selecao de curso"
          activeOpacity={1}
          onPress={() => setSeletorCursoAberto(false)}
          style={estilos.seletorFundo}
        >
          <TouchableOpacity activeOpacity={1} style={estilos.seletorPainel}>
            <Text style={estilos.seletorPainelTitulo}>Selecionar curso</Text>
            <ScrollView contentContainerStyle={estilos.seletorLista}>
              {grupos.map((curso) => {
                const ativo = curso.id === cursoAtivo.id;
                return (
                  <TouchableOpacity
                    accessibilityLabel={curso.titulo}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    key={curso.id}
                    onPress={() => {
                      setCursoAtivoId(curso.id);
                      setSeletorCursoAberto(false);
                    }}
                    style={[estilos.seletorItem, ativo ? estilos.seletorItemAtivo : null]}
                  >
                    <CapaCurso curso={curso} size={40} />
                    <Text numberOfLines={2} style={[estilos.seletorItemTexto, ativo ? estilos.seletorItemTextoAtivo : null]}>
                      {curso.titulo}
                    </Text>
                    {ativo ? <Ionicons color={cores.destaque} name="checkmark" size={18} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
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
          <View accessibilityLabel="Concluído" accessible>
            <Ionicons color={cores.sucesso} name="checkmark-circle" size={22} />
          </View>
        ) : processando ? (
          <ActivityIndicator color={cores.destaque} size="small" />
        ) : (
          <TouchableOpacity
            accessibilityLabel={`Marcar ${conteudo.titulo} como concluído`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => marcarConcluido(conteudo.id)}
            style={estilos.linhaCheckbox}
          >
            <Ionicons color={cores.textoSuave} name="ellipse-outline" size={22} />
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
        <Ionicons color={cores.textoSuave} name="help-circle-outline" size={18} />
      </View>
      <View style={estilos.linhaTextos}>
        <Text numberOfLines={2} style={estilos.linhaTitulo}>{quiz.titulo}</Text>
        <Text style={estilos.linhaMeta}>Quiz · {formatQuestoes(quiz.totalQuestoes)} · sem nota</Text>
      </View>
      {disponibilidade.podeRealizar ? (
        <Ionicons color={cores.destaque} name="play-circle" size={24} />
      ) : concluidoQuiz ? (
        <View accessibilityLabel="Concluído" accessible>
          <Ionicons color={cores.textoSuave} name="checkmark-circle" size={22} />
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
  seletorRotulo: { color: cores.textoRotulo, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  seletorLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacamentos.sm, marginTop: 4 },
  seletorCursoTexto: { color: cores.texto, fontSize: 18, fontWeight: "700", flex: 1 },
  seletorFundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", paddingHorizontal: espacamentos.xl, paddingTop: 100 },
  seletorPainel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, maxHeight: "70%", overflow: "hidden" },
  seletorPainelTitulo: {
    color: cores.textoSuave,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: espacamentos.lg,
    paddingBottom: espacamentos.sm
  },
  seletorLista: { paddingHorizontal: espacamentos.sm, paddingBottom: espacamentos.sm },
  seletorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacamentos.sm,
    paddingHorizontal: espacamentos.md,
    paddingVertical: espacamentos.md,
    borderRadius: raios.md,
    minHeight: 44
  },
  seletorItemAtivo: { backgroundColor: cores.fundoCartaoAtivo },
  seletorItemTexto: { color: cores.textoSuave, fontSize: 15, fontWeight: "600", flex: 1 },
  seletorItemTextoAtivo: { color: cores.texto },
  corpo: { padding: espacamentos.xl, paddingTop: 0, paddingBottom: 40 },
  progressoCurso: { color: cores.textoSuave, marginBottom: 16 },
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
  continuarRotulo: { color: cores.destaque, fontWeight: "700", fontSize: 12, marginBottom: 4 },
  continuarTitulo: { color: cores.texto, fontWeight: "600" },
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
  moduloTitulo: { color: cores.texto, fontWeight: "700" },
  moduloContagem: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  barraFundoFina: { height: 4, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: espacamentos.sm },
  barraPreenchidaFina: { height: 4, borderRadius: raios.sm, backgroundColor: cores.destaque },
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
  linhaMeta: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 },
  linhaCheckbox: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", marginRight: -11 },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic", paddingHorizontal: 14, paddingVertical: espacamentos.md },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
