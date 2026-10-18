import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Botao from "../../components/Botao.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate, formatGrade, formatMoney, normalizeStatus } from "../../lib/format.js";
import { corDoStatusMatricula, iconeDoStatusMatricula } from "../../lib/statusVisual.js";
import { cores, espacamentos, raios, sombra, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";

const PAGAMENTO_PENDENTE = 1;

function agruparPorCursoMaisRelevante(matriculas) {
  const prioridade = { Aprovada: 3, Pendente: 2, Rejeitada: 1, Cancelada: 1 };
  const mapa = new Map();
  matriculas.forEach((matricula) => {
    const status = normalizeStatus(matricula.status);
    const atual = mapa.get(matricula.cursoId);
    if (!atual || (prioridade[status] || 0) > (prioridade[normalizeStatus(atual.status)] || 0)) {
      mapa.set(matricula.cursoId, matricula);
    }
  });
  return mapa;
}

export default function MatriculasScreen({ navigation, onRecarregar, onSessionExpired, snapshot, usuario }) {
  const [aba, setAba] = useState("meus-cursos");
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [cancelamentoPendente, setCancelamentoPendente] = useState(null);
  const [canceladasAbertas, setCanceladasAbertas] = useState(false);
  const [detalheSelecionado, setDetalheSelecionado] = useState(null);

  const turmasPorCursoId = useMemo(() => {
    const mapa = new Map();
    snapshot.turmas.forEach((turma) => {
      const lista = mapa.get(turma.cursoId) || [];
      lista.push(turma);
      mapa.set(turma.cursoId, lista);
    });
    return mapa;
  }, [snapshot.turmas]);

  const matriculaPorCursoId = useMemo(() => agruparPorCursoMaisRelevante(snapshot.matriculas), [snapshot.matriculas]);

  const pagamentoPorMatriculaId = useMemo(
    () => new Map((snapshot.pagamentos || []).map((pagamento) => [pagamento.matriculaId, pagamento])),
    [snapshot.pagamentos]
  );

  const progressoCursoPorMatricula = useMemo(
    () => new Map((snapshot.progressos.cursos || []).map((progresso) => [progresso.matriculaId, progresso])),
    [snapshot.progressos.cursos]
  );

  const cursosMatriculados = useMemo(
    () => snapshot.cursos.filter((curso) => matriculaPorCursoId.has(curso.id)),
    [snapshot.cursos, matriculaPorCursoId]
  );

  // Cancelada/Rejeitada vao pra secao recolhivel no fim da lista (section 1
  // do pedido do usuario) — Pendente fica junto dos ativos, so Aprovada tem
  // navegacao/progresso.
  const cursosAtivos = useMemo(
    () =>
      cursosMatriculados.filter((curso) => {
        const status = normalizeStatus(matriculaPorCursoId.get(curso.id)?.status);
        return status === "Aprovada" || status === "Pendente";
      }),
    [cursosMatriculados, matriculaPorCursoId]
  );

  const cursosExcepcionais = useMemo(
    () =>
      cursosMatriculados.filter((curso) => {
        const status = normalizeStatus(matriculaPorCursoId.get(curso.id)?.status);
        return status === "Cancelada" || status === "Rejeitada";
      }),
    [cursosMatriculados, matriculaPorCursoId]
  );

  const cursosCatalogo = useMemo(
    () =>
      snapshot.cursos
        .filter((curso) => !matriculaPorCursoId.has(curso.id))
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [snapshot.cursos, matriculaPorCursoId, busca]
  );

  async function solicitar(curso) {
    const temTurma = (turmasPorCursoId.get(curso.id) || []).length > 0;
    if (!temTurma) {
      return;
    }

    setProcessando(curso.id);
    setMensagem(null);

    try {
      await apiRequest("/Matriculas", { method: "POST", body: JSON.stringify({ alunoId: usuario.id, cursoId: curso.id }) });

      const cursoEhPago = Number(curso.preco) > 0;
      setMensagem({
        tipo: "sucesso",
        texto: cursoEhPago
          ? `Matrícula em ${curso.titulo} aprovada — confirme o pagamento pendente para liberar o acesso.`
          : `Matrícula em ${curso.titulo} aprovada. Seu acesso já está liberado.`
      });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível solicitar a matrícula agora." });
    } finally {
      setProcessando(null);
    }
  }

  function confirmarCancelamento() {
    const matricula = cancelamentoPendente?.matricula;
    setCancelamentoPendente(null);
    if (matricula) {
      cancelar(matricula);
    }
  }

  async function cancelar(matricula) {
    setProcessando(matricula.id);
    setMensagem(null);

    try {
      await apiRequest(`/Matriculas/${matricula.id}/cancelar`, { method: "PUT" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível cancelar a solicitação agora." });
    } finally {
      setProcessando(null);
    }
  }

  async function confirmarPagamento(matricula) {
    setProcessando(matricula.id);
    setMensagem(null);

    try {
      await apiRequest(`/Pagamentos/${matricula.id}/confirmar`, { method: "POST" });
      setMensagem({ tipo: "sucesso", texto: "Pagamento confirmado." });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível confirmar o pagamento agora." });
    } finally {
      setProcessando(null);
    }
  }

  async function reabrir(matricula) {
    setProcessando(matricula.id);
    setMensagem(null);

    try {
      await apiRequest(`/Matriculas/${matricula.id}/reabrir`, { method: "PUT" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível reabrir a solicitação agora." });
    } finally {
      setProcessando(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.container}>
      <View style={estilos.abas}>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === "meus-cursos" }}
          onPress={() => setAba("meus-cursos")}
          style={[estilos.aba, aba === "meus-cursos" ? estilos.abaAtiva : null]}
        >
          <Text style={[estilos.abaTexto, aba === "meus-cursos" ? estilos.abaTextoAtivo : null]}>Meus cursos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === "catalogo" }}
          onPress={() => setAba("catalogo")}
          style={[estilos.aba, aba === "catalogo" ? estilos.abaAtiva : null]}
        >
          <Text style={[estilos.abaTexto, aba === "catalogo" ? estilos.abaTextoAtivo : null]}>Catálogo</Text>
        </TouchableOpacity>
      </View>

      {mensagem ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagem.texto} onFechar={() => setMensagem(null)} tipo={mensagem.tipo} />
        </View>
      ) : null}

      {aba === "catalogo" ? (
        <View style={estilos.buscaLinha}>
          <Ionicons color={cores.textoSuave} name="search" size={18} />
          <TextInput
            accessibilityLabel="Pesquisar cursos"
            onChangeText={setBusca}
            placeholder="Pesquisar cursos"
            placeholderTextColor={cores.textoSuave}
            style={estilos.buscaEntrada}
            value={busca}
          />
        </View>
      ) : null}

      {aba === "meus-cursos" ? (
        cursosMatriculados.length === 0 ? (
          <Text style={estilos.vazio}>Você ainda não está matriculado em nenhum curso. Explore o catálogo.</Text>
        ) : (
          <ScrollView contentContainerStyle={estilos.corpo}>
            {cursosAtivos.map((curso) => {
              const matricula = matriculaPorCursoId.get(curso.id);
              const pagamento = pagamentoPorMatriculaId.get(matricula.id);
              const progresso = progressoCursoPorMatricula.get(matricula.id);
              return (
                <ItemCursoMatriculado
                  curso={curso}
                  key={curso.id}
                  matricula={matricula}
                  onAbrirDetalhes={() => setDetalheSelecionado({ curso, matricula, pagamento, progresso })}
                  onCancelar={() => setCancelamentoPendente({ matricula, tituloCurso: curso.titulo })}
                  onConfirmarPagamento={() => confirmarPagamento(matricula)}
                  pagamento={pagamento}
                  processando={processando === matricula.id}
                  progresso={progresso}
                />
              );
            })}

            {cursosExcepcionais.length > 0 ? (
              <View style={estilos.secaoExcepcionais}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setCanceladasAbertas((atual) => !atual)}
                  style={estilos.secaoExcepcionaisCabecalho}
                >
                  <Text style={estilos.secaoExcepcionaisTitulo}>
                    Canceladas/recusadas ({cursosExcepcionais.length})
                  </Text>
                  <Ionicons color={cores.textoSuave} name={canceladasAbertas ? "chevron-up" : "chevron-down"} size={18} />
                </TouchableOpacity>
                {canceladasAbertas
                  ? cursosExcepcionais.map((curso) => {
                      const matricula = matriculaPorCursoId.get(curso.id);
                      return (
                        <ItemCursoMatriculado
                          curso={curso}
                          key={curso.id}
                          matricula={matricula}
                          onAbrirDetalhes={() => setDetalheSelecionado({ curso, matricula, pagamento: null, progresso: null })}
                          onReabrir={() => reabrir(matricula)}
                          processando={processando === matricula.id}
                        />
                      );
                    })
                  : null}
              </View>
            ) : null}
          </ScrollView>
        )
      ) : (
        <FlatList
          ListEmptyComponent={<Text style={estilos.vazio}>Nenhum curso encontrado.</Text>}
          contentContainerStyle={estilos.corpo}
          data={cursosCatalogo}
          keyExtractor={(curso) => String(curso.id)}
          renderItem={({ item: curso }) => (
            <ItemCursoCatalogo
              curso={curso}
              onSolicitar={() => solicitar(curso)}
              processando={processando === curso.id}
              temTurma={(turmasPorCursoId.get(curso.id) || []).length > 0}
            />
          )}
        />
      )}

      <Modal animationType="fade" onRequestClose={() => setCancelamentoPendente(null)} transparent visible={Boolean(cancelamentoPendente)}>
        <View style={estilos.confirmacaoFundo}>
          <View style={estilos.confirmacaoPainel}>
            <Text style={estilos.confirmacaoTitulo}>Cancelar solicitação</Text>
            <Text style={estilos.confirmacaoTexto}>
              Deseja realmente cancelar a solicitação de matrícula em {cancelamentoPendente?.tituloCurso}? Você pode reabri-la depois, se mudar de ideia.
            </Text>
            <View style={estilos.confirmacaoAcoes}>
              <Botao icone="close" onPress={() => setCancelamentoPendente(null)} style={estilos.botaoDialogo} variante="perigo">
                Voltar
              </Botao>
              <Botao icone="checkmark" onPress={confirmarCancelamento} style={estilos.botaoDialogo} variante="sucesso">
                Cancelar solicitação
              </Botao>
            </View>
          </View>
        </View>
      </Modal>

      <ModalDetalhesMatricula
        detalhe={detalheSelecionado}
        navigation={navigation}
        onCancelar={() => {
          if (detalheSelecionado) {
            const { curso, matricula } = detalheSelecionado;
            setDetalheSelecionado(null);
            setCancelamentoPendente({ matricula, tituloCurso: curso.titulo });
          }
        }}
        onConfirmarPagamento={() => detalheSelecionado && confirmarPagamento(detalheSelecionado.matricula)}
        onFechar={() => setDetalheSelecionado(null)}
        onReabrir={() => {
          if (detalheSelecionado) {
            reabrir(detalheSelecionado.matricula);
            setDetalheSelecionado(null);
          }
        }}
        processando={processando === detalheSelecionado?.matricula?.id}
      />
    </KeyboardAvoidingView>
  );
}

// Card enxuto: sem descricao (ja fica no Catalogo) e sem "Solicitada em" pra
// matricula aprovada (a data de pedido nao e informacao relevante ali). O
// selo de status so aparece pra estados excepcionais — "estar em Meus
// cursos com progresso" ja comunica "Aprovada" sem precisar de selo. O card
// inteiro abre o modal de detalhes (onAbrirDetalhes) — nao navega mais
// direto pra Conteudos, ver ModalDetalhesMatricula mais abaixo.
function ItemCursoMatriculado({ curso, matricula, onAbrirDetalhes, onCancelar, onConfirmarPagamento, onReabrir, pagamento, processando, progresso }) {
  const status = normalizeStatus(matricula.status);
  const aprovada = status === "Aprovada";
  const excepcional = status === "Cancelada" || status === "Rejeitada";
  const temPagamentoPendente = aprovada && pagamento?.status === PAGAMENTO_PENDENTE;
  // Aprovada sem registro de progresso = aluno ainda nao concluiu nada (o
  // registro so e criado na 1a acao do aluno, GET nunca fabrica um —
  // confirmado em ProgressoAlunoService.ObterSnapshotAsync) — 0% real, nao
  // "dado ausente". Pendente/Cancelada/Rejeitada nunca mostram a barra.
  const percentual = aprovada ? Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100)) : null;
  const temNota = Number(matricula.notaFinal) > 0;

  const conteudo = (
    <>
      <View style={estilos.cartaoTopo}>
        <Text numberOfLines={2} style={estilos.cartaoTitulo}>{curso.titulo}</Text>
        {!aprovada ? (
          <View style={estilos.statusLinha}>
            <Ionicons color={corDoStatusMatricula(status)} name={iconeDoStatusMatricula(status)} size={13} />
            <Text style={[estilos.status, { color: corDoStatusMatricula(status) }]}>{status}</Text>
          </View>
        ) : null}
      </View>

      {aprovada ? (
        <>
          <View style={estilos.barraFundoFina}>
            <View style={[estilos.barraPreenchidaFina, { width: `${percentual}%` }]} />
          </View>
          <Text style={estilos.cartaoMeta}>
            {percentual >= 100 ? "Concluído" : percentual <= 0 ? "Não iniciado" : `${Math.round(percentual)}% concluído`}
          </Text>
        </>
      ) : null}

      {status === "Pendente" ? (
        <Text style={estilos.cartaoMeta}>Aguardando aprovação · desde {formatDate(matricula.dataSolicitacao)}</Text>
      ) : null}

      {temNota ? <Text style={estilos.cartaoMeta}>Nota final {formatGrade(matricula.notaFinal)}</Text> : null}

      {temPagamentoPendente ? (
        <View style={estilos.pagamentoLinha}>
          <Text style={estilos.pagamentoPendente}>Pendente (simulado): {formatMoney(pagamento.valor)}</Text>
          <Botao carregando={processando} onPress={onConfirmarPagamento} style={estilos.botaoPagamento} variante="sucesso">
            Confirmar
          </Botao>
        </View>
      ) : null}

      {status === "Pendente" ? (
        <Botao carregando={processando} onPress={onCancelar} style={estilos.botaoAcaoCartao} variante="perigo">
          Cancelar solicitação
        </Botao>
      ) : null}
      {status === "Rejeitada" ? (
        <Botao carregando={processando} onPress={onReabrir} style={estilos.botaoAcaoCartao} variante="primario">
          Reabrir solicitação
        </Botao>
      ) : null}
    </>
  );

  return (
    <TouchableOpacity
      accessibilityLabel={`Ver detalhes da matrícula em ${curso.titulo}`}
      accessibilityRole="button"
      onPress={onAbrirDetalhes}
      style={[estilos.cartaoLinha, excepcional ? estilos.cartaoLinhaExcepcional : null]}
    >
      <CapaCurso curso={curso} size={56} />
      <View style={estilos.cartao}>{conteudo}</View>
      <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} style={estilos.cartaoChevron} />
    </TouchableOpacity>
  );
}

// Disponibilidade sempre visivel (icone+texto, nao so o botao de acao) —
// catalogo so lista cursos em que o aluno ainda nao tem nenhuma matricula
// (ver cursosCatalogo acima, filtra por matriculaPorCursoId), entao "pendente"
// e "matricula ativa" nunca ocorrem aqui, so existem em "Meus cursos".
function ItemCursoCatalogo({ curso, onSolicitar, processando, temTurma }) {
  return (
    <View style={estilos.cartaoLinha}>
      <CapaCurso curso={curso} size={56} />
      <View style={estilos.cartao}>
        <Text style={estilos.cartaoTitulo}>{curso.titulo}</Text>
        <Text numberOfLines={2} style={estilos.cartaoMeta}>{curso.descricao}</Text>
        <View style={estilos.disponibilidadeLinha}>
          <Ionicons
            color={temTurma ? cores.sucesso : cores.textoSuave}
            name={temTurma ? "checkmark-circle-outline" : "close-circle-outline"}
            size={14}
          />
          <Text style={[estilos.disponibilidadeTexto, { color: temTurma ? cores.sucesso : cores.textoSuave }]}>
            {temTurma ? "Matrículas abertas" : "Sem turma disponível"}
          </Text>
        </View>
        {temTurma ? (
          <Botao carregando={processando} onPress={onSolicitar} style={estilos.botaoAcaoCartao} variante="primario">
            Solicitar matrícula
          </Botao>
        ) : null}
      </View>
    </View>
  );
}

// Modal de detalhes — abre ao tocar num card de "Meus cursos" em vez de
// navegar direto pra Conteudos (o aluno so vai pra Conteudos de proposito,
// pelo botao "Acessar conteudos" abaixo, so quando Aprovada). pageSheet e o
// mesmo padrao ja usado em QuizModal/CertificadosScreen (ocupa quase a tela
// toda, ganha onRequestClose do botao fisico de voltar do Android de graca).
function ModalDetalhesMatricula({ detalhe, navigation, onCancelar, onConfirmarPagamento, onFechar, onReabrir, processando }) {
  const insets = useSafeAreaInsets();

  if (!detalhe) {
    return null;
  }

  const { curso, matricula, pagamento, progresso } = detalhe;
  const status = normalizeStatus(matricula.status);
  const aprovada = status === "Aprovada";
  const temPagamentoPendente = aprovada && pagamento?.status === PAGAMENTO_PENDENTE;
  const percentual = aprovada ? Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100)) : null;
  const temNota = Number(matricula.notaFinal) > 0;
  const temModulos = aprovada && Number(progresso?.totalModulos) > 0;

  return (
    <Modal animationType="slide" onRequestClose={onFechar} presentationStyle="pageSheet" visible={Boolean(detalhe)}>
      <View style={estilos.detalheContainer}>
        <View style={[estilos.detalheCabecalho, { paddingTop: insets.top + 16 }]}>
          <CapaCurso curso={curso} size={48} />
          <Text numberOfLines={2} style={estilos.detalheTitulo}>{curso.titulo}</Text>
          <TouchableOpacity
            accessibilityLabel="Fechar detalhes da matrícula"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={onFechar}
            style={estilos.detalheBotaoFechar}
          >
            <Ionicons color={cores.erro} name="close" size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={estilos.detalheCorpo}>
          <Text style={estilos.detalheSecaoTitulo}>Situação da matrícula</Text>
          <View style={estilos.detalheStatusLinha}>
            <Ionicons color={corDoStatusMatricula(status)} name={iconeDoStatusMatricula(status)} size={16} />
            <Text style={[estilos.detalheStatusTexto, { color: corDoStatusMatricula(status) }]}>{status}</Text>
          </View>
          <Text style={estilos.detalheMeta}>Solicitada em {formatDate(matricula.dataSolicitacao)}</Text>
          {temNota ? <Text style={estilos.detalheMeta}>Nota final {formatGrade(matricula.notaFinal)}</Text> : null}

          {aprovada ? (
            <View style={estilos.detalheProgressoBloco}>
              <View style={estilos.barraFundoFina}>
                <View style={[estilos.barraPreenchidaFina, { width: `${percentual}%` }]} />
              </View>
              <Text style={estilos.detalheMeta}>
                {percentual >= 100 ? "Concluído" : percentual <= 0 ? "Não iniciado" : `${Math.round(percentual)}% concluído`}
                {temModulos ? ` · ${progresso.modulosConcluidos || 0}/${progresso.totalModulos} módulo(s)` : ""}
              </Text>
            </View>
          ) : null}

          {temPagamentoPendente ? (
            <View style={estilos.pagamentoLinha}>
              <Text style={estilos.pagamentoPendente}>Pendente (simulado): {formatMoney(pagamento.valor)}</Text>
              <Botao carregando={processando} onPress={onConfirmarPagamento} style={estilos.botaoPagamento} variante="sucesso">
                Confirmar
              </Botao>
            </View>
          ) : null}

          {curso.descricao ? (
            <>
              <Text style={estilos.detalheSecaoTitulo}>Sobre o curso</Text>
              <Text style={estilos.detalheDescricao}>{curso.descricao}</Text>
            </>
          ) : null}

          {status === "Pendente" ? (
            <Botao carregando={processando} onPress={onCancelar} style={estilos.botaoAcaoCartao} variante="perigo">
              Cancelar solicitação
            </Botao>
          ) : null}
          {status === "Rejeitada" ? (
            <Botao carregando={processando} onPress={onReabrir} style={estilos.botaoAcaoCartao} variante="primario">
              Reabrir solicitação
            </Botao>
          ) : null}
        </ScrollView>

        {aprovada ? (
          <View style={estilos.detalheAcoes}>
            <Botao
              icone="book-outline"
              onPress={() => {
                onFechar();
                navigation.navigate(ROUTES.CONTEUDOS, { cursoId: curso.id });
              }}
              variante="primario"
            >
              Acessar conteúdos
            </Botao>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  abas: { flexDirection: "row", paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.lg, gap: espacamentos.sm },
  aba: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: cores.fundoCartao },
  abaAtiva: { backgroundColor: cores.destaque },
  abaTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.corpo },
  abaTextoAtivo: { color: cores.texto },
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.md },
  buscaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  buscaEntrada: { flex: 1, color: cores.texto, paddingVertical: 10, fontSize: tipografia.corpo },
  corpo: { padding: espacamentos.xl, gap: espacamentos.md },
  cartaoLinha: { flexDirection: "row", alignItems: "flex-start", gap: espacamentos.md, backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.lg, minHeight: 48 },
  cartaoChevron: { alignSelf: "center" },
  cartaoLinhaExcepcional: { opacity: 0.7 },
  cartao: { flex: 1 },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15, flex: 1, marginRight: 10 },
  statusLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  status: { fontWeight: "700", fontSize: tipografia.rotulo },
  cartaoMeta: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  barraFundoFina: { height: 5, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: espacamentos.sm },
  barraPreenchidaFina: { height: 5, borderRadius: raios.sm, backgroundColor: cores.destaque },
  secaoExcepcionais: { marginTop: espacamentos.sm, gap: espacamentos.md },
  secaoExcepcionaisCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, paddingHorizontal: espacamentos.xs },
  secaoExcepcionaisTitulo: { color: cores.textoSuave, fontWeight: "700", fontSize: tipografia.rotulo, textTransform: "uppercase", letterSpacing: 0.5 },
  disponibilidadeLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: espacamentos.sm },
  disponibilidadeTexto: { fontSize: tipografia.rotulo, fontWeight: "600" },
  pagamentoLinha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 },
  pagamentoPendente: { color: cores.aviso, fontWeight: "700", fontSize: tipografia.rotulo, flexShrink: 1 },
  botaoAcaoCartao: { marginTop: 12 },
  botaoPagamento: { paddingHorizontal: 14 },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40 },
  confirmacaoFundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", alignItems: "center", justifyContent: "center", padding: espacamentos.xl },
  confirmacaoPainel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.xl, width: "100%", maxWidth: 340, gap: espacamentos.sm, ...sombra.cartao },
  confirmacaoTitulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700" },
  confirmacaoTexto: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  confirmacaoAcoes: { flexDirection: "row", gap: espacamentos.sm, marginTop: espacamentos.sm },
  botaoDialogo: { flex: 1 },
  detalheContainer: { flex: 1, backgroundColor: cores.fundo },
  detalheCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  detalheTitulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700", flex: 1 },
  detalheBotaoFechar: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  detalheCorpo: { padding: espacamentos.xl, paddingBottom: 40, gap: 4 },
  detalheSecaoTitulo: {
    color: cores.textoSuave,
    fontSize: tipografia.legenda,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: espacamentos.lg,
    marginBottom: espacamentos.xs
  },
  detalheStatusLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  detalheStatusTexto: { fontWeight: "700", fontSize: tipografia.corpo },
  detalheMeta: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  detalheProgressoBloco: { marginTop: espacamentos.sm },
  detalheDescricao: { color: cores.textoRotulo, fontSize: tipografia.corpo, lineHeight: 20 },
  detalheAcoes: { padding: espacamentos.xl, paddingTop: espacamentos.sm, borderTopWidth: 1, borderTopColor: cores.bordaCartao }
});
