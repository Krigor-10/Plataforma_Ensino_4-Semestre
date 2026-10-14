import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate, formatGrade, formatMoney, normalizeStatus } from "../../lib/format.js";
import { corDoStatusMatricula, iconeDoStatusMatricula } from "../../lib/statusVisual.js";
import { cores, espacamentos, raios, sombra, tipografia } from "../../lib/theme.js";

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

export default function MatriculasScreen({ onRecarregar, onSessionExpired, snapshot, usuario }) {
  const [aba, setAba] = useState("meus-cursos");
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [cancelamentoPendente, setCancelamentoPendente] = useState(null);

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

  const cursosMatriculados = useMemo(
    () => snapshot.cursos.filter((curso) => matriculaPorCursoId.has(curso.id)),
    [snapshot.cursos, matriculaPorCursoId]
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
          ? `Matricula em ${curso.titulo} aprovada — confirme o pagamento pendente para liberar o acesso.`
          : `Matricula em ${curso.titulo} aprovada. Seu acesso ja esta liberado.`
      });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Nao foi possivel solicitar a matricula agora." });
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
      setMensagem({ tipo: "erro", texto: err.message || "Nao foi possivel cancelar a solicitacao agora." });
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
      setMensagem({ tipo: "erro", texto: err.message || "Nao foi possivel confirmar o pagamento agora." });
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
      setMensagem({ tipo: "erro", texto: err.message || "Nao foi possivel reabrir a solicitacao agora." });
    } finally {
      setProcessando(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.container}>
      <View style={estilos.abas}>
        <TouchableOpacity onPress={() => setAba("meus-cursos")} style={[estilos.aba, aba === "meus-cursos" ? estilos.abaAtiva : null]}>
          <Text style={[estilos.abaTexto, aba === "meus-cursos" ? estilos.abaTextoAtivo : null]}>Meus cursos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAba("catalogo")} style={[estilos.aba, aba === "catalogo" ? estilos.abaAtiva : null]}>
          <Text style={[estilos.abaTexto, aba === "catalogo" ? estilos.abaTextoAtivo : null]}>Catalogo</Text>
        </TouchableOpacity>
      </View>

      {mensagem ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagem.texto} onFechar={() => setMensagem(null)} tipo={mensagem.tipo} />
        </View>
      ) : null}

      {aba === "catalogo" ? (
        <TextInput
          onChangeText={setBusca}
          placeholder="Pesquisar cursos"
          placeholderTextColor={cores.textoSuave}
          style={estilos.busca}
          value={busca}
        />
      ) : null}

      {aba === "meus-cursos" ? (
        <FlatList
          ListEmptyComponent={<Text style={estilos.vazio}>Voce ainda nao esta matriculado em nenhum curso. Explore o catalogo.</Text>}
          contentContainerStyle={estilos.corpo}
          data={cursosMatriculados}
          keyExtractor={(curso) => String(curso.id)}
          renderItem={({ item: curso }) => {
            const matricula = matriculaPorCursoId.get(curso.id);
            const pagamento = pagamentoPorMatriculaId.get(matricula.id);
            return (
              <ItemCursoMatriculado
                curso={curso}
                matricula={matricula}
                onCancelar={() => setCancelamentoPendente({ matricula, tituloCurso: curso.titulo })}
                onConfirmarPagamento={() => confirmarPagamento(matricula)}
                onReabrir={() => reabrir(matricula)}
                pagamento={pagamento}
                processando={processando === matricula.id}
              />
            );
          }}
        />
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
            <Text style={estilos.confirmacaoTitulo}>Cancelar solicitacao</Text>
            <Text style={estilos.confirmacaoTexto}>
              Deseja realmente cancelar a solicitacao de matricula em {cancelamentoPendente?.tituloCurso}? Voce pode reabri-la depois, se mudar de ideia.
            </Text>
            <View style={estilos.confirmacaoAcoes}>
              <Botao icone="close" onPress={() => setCancelamentoPendente(null)} style={estilos.botaoDialogo} variante="perigo">
                Voltar
              </Botao>
              <Botao icone="checkmark" onPress={confirmarCancelamento} style={estilos.botaoDialogo} variante="sucesso">
                Cancelar solicitacao
              </Botao>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ItemCursoMatriculado({ curso, matricula, onCancelar, onConfirmarPagamento, onReabrir, pagamento, processando }) {
  const status = normalizeStatus(matricula.status);
  const temPagamentoPendente = status === "Aprovada" && pagamento?.status === PAGAMENTO_PENDENTE;

  return (
    <View style={estilos.cartaoLinha}>
      <CapaCurso curso={curso} size={56} />
      <View style={estilos.cartao}>
        <View style={estilos.cartaoTopo}>
          <Text style={estilos.cartaoTitulo}>{curso.titulo}</Text>
          <View style={estilos.statusLinha}>
            <Ionicons color={corDoStatusMatricula(status)} name={iconeDoStatusMatricula(status)} size={13} />
            <Text style={[estilos.status, { color: corDoStatusMatricula(status) }]}>{status}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={estilos.cartaoMeta}>{curso.descricao}</Text>
        <Text style={estilos.cartaoMeta}>Solicitada em {formatDate(matricula.dataSolicitacao)}</Text>
        {status === "Aprovada" ? <Text style={estilos.cartaoMeta}>Nota final: {formatGrade(matricula.notaFinal)}</Text> : null}

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
            Cancelar solicitacao
          </Botao>
        ) : null}
        {status === "Rejeitada" ? (
          <Botao carregando={processando} onPress={onReabrir} style={estilos.botaoAcaoCartao} variante="primario">
            Reabrir solicitacao
          </Botao>
        ) : null}
      </View>
    </View>
  );
}

function ItemCursoCatalogo({ curso, onSolicitar, processando, temTurma }) {
  return (
    <View style={estilos.cartaoLinha}>
      <CapaCurso curso={curso} size={56} />
      <View style={estilos.cartao}>
        <Text style={estilos.cartaoTitulo}>{curso.titulo}</Text>
        <Text numberOfLines={2} style={estilos.cartaoMeta}>{curso.descricao}</Text>
        {temTurma ? (
          <Botao carregando={processando} onPress={onSolicitar} style={estilos.botaoAcaoCartao} variante="primario">
            Solicitar matricula
          </Botao>
        ) : (
          <Text style={estilos.semTurma}>Sem turma disponivel</Text>
        )}
      </View>
    </View>
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
  busca: { backgroundColor: cores.fundoCartao, borderRadius: raios.md, marginHorizontal: 20, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, color: cores.texto, borderWidth: 1, borderColor: cores.bordaCartao },
  corpo: { padding: espacamentos.xl, gap: espacamentos.md },
  cartaoLinha: { flexDirection: "row", alignItems: "flex-start", gap: espacamentos.md, backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.lg },
  cartao: { flex: 1 },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15, flex: 1, marginRight: 10 },
  statusLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  status: { fontWeight: "700", fontSize: tipografia.rotulo },
  cartaoMeta: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  pagamentoLinha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 },
  pagamentoPendente: { color: cores.aviso, fontWeight: "700", fontSize: tipografia.rotulo, flexShrink: 1 },
  botaoAcaoCartao: { marginTop: 12 },
  botaoPagamento: { paddingHorizontal: 14 },
  semTurma: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40 },
  confirmacaoFundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", alignItems: "center", justifyContent: "center", padding: espacamentos.xl },
  confirmacaoPainel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.xl, width: "100%", maxWidth: 340, gap: espacamentos.sm, ...sombra.cartao },
  confirmacaoTitulo: { color: cores.texto, fontSize: tipografia.subtitulo, fontWeight: "700" },
  confirmacaoTexto: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  confirmacaoAcoes: { flexDirection: "row", gap: espacamentos.sm, marginTop: espacamentos.sm },
  botaoDialogo: { flex: 1 }
});
