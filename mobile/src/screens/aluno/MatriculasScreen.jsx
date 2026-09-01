import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate, formatGrade, normalizeStatus } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";

const COR_STATUS = {
  Pendente: cores.aviso,
  Aprovada: cores.sucesso,
  Rejeitada: cores.erro,
  Cancelada: cores.textoSuave
};

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
  const [mensagem, setMensagem] = useState("");

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
    const turmaAlvo = (turmasPorCursoId.get(curso.id) || [])[0];
    if (!turmaAlvo) {
      return;
    }

    setProcessando(curso.id);
    setMensagem("");

    try {
      await apiRequest("/Matriculas", { method: "POST", body: JSON.stringify({ alunoId: usuario.id, turmaId: turmaAlvo.id }) });
      setMensagem(`Matricula solicitada em ${curso.titulo}. Aguarde a aprovacao da coordenacao.`);
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem(err.message || "Nao foi possivel solicitar a matricula agora.");
    } finally {
      setProcessando(null);
    }
  }

  async function cancelar(matricula) {
    setProcessando(matricula.id);
    setMensagem("");

    try {
      await apiRequest(`/Matriculas/${matricula.id}/cancelar`, { method: "PUT" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem(err.message || "Nao foi possivel cancelar a solicitacao agora.");
    } finally {
      setProcessando(null);
    }
  }

  async function reabrir(matricula) {
    setProcessando(matricula.id);
    setMensagem("");

    try {
      await apiRequest(`/Matriculas/${matricula.id}/reabrir`, { method: "PUT" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem(err.message || "Nao foi possivel reabrir a solicitacao agora.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.abas}>
        <TouchableOpacity onPress={() => setAba("meus-cursos")} style={[estilos.aba, aba === "meus-cursos" ? estilos.abaAtiva : null]}>
          <Text style={[estilos.abaTexto, aba === "meus-cursos" ? estilos.abaTextoAtivo : null]}>Meus cursos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAba("catalogo")} style={[estilos.aba, aba === "catalogo" ? estilos.abaAtiva : null]}>
          <Text style={[estilos.abaTexto, aba === "catalogo" ? estilos.abaTextoAtivo : null]}>Catalogo</Text>
        </TouchableOpacity>
      </View>

      {mensagem ? <Text style={estilos.mensagem}>{mensagem}</Text> : null}

      {aba === "catalogo" ? (
        <TextInput
          onChangeText={setBusca}
          placeholder="Pesquisar cursos"
          placeholderTextColor={cores.textoSuave}
          style={estilos.busca}
          value={busca}
        />
      ) : null}

      <ScrollView contentContainerStyle={estilos.corpo}>
        {aba === "meus-cursos"
          ? cursosMatriculados.length === 0
            ? <Text style={estilos.vazio}>Voce ainda nao esta matriculado em nenhum curso. Explore o catalogo.</Text>
            : cursosMatriculados.map((curso) => {
                const matricula = matriculaPorCursoId.get(curso.id);
                const status = normalizeStatus(matricula.status);
                return (
                  <View key={curso.id} style={estilos.cartao}>
                    <View style={estilos.cartaoTopo}>
                      <Text style={estilos.cartaoTitulo}>{curso.titulo}</Text>
                      <Text style={[estilos.status, { color: COR_STATUS[status] || cores.textoSuave }]}>{status}</Text>
                    </View>
                    <Text style={estilos.cartaoMeta}>{curso.descricao}</Text>
                    <Text style={estilos.cartaoMeta}>Solicitada em {formatDate(matricula.dataSolicitacao)}</Text>
                    {status === "Aprovada" ? <Text style={estilos.cartaoMeta}>Nota final: {formatGrade(matricula.notaFinal)}</Text> : null}

                    {status === "Pendente" ? (
                      <TouchableOpacity disabled={processando === matricula.id} onPress={() => cancelar(matricula)} style={estilos.botaoPerigo}>
                        {processando === matricula.id ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPerigoTexto}>Cancelar solicitacao</Text>}
                      </TouchableOpacity>
                    ) : null}
                    {status === "Rejeitada" ? (
                      <TouchableOpacity disabled={processando === matricula.id} onPress={() => reabrir(matricula)} style={estilos.botaoPrimario}>
                        {processando === matricula.id ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Reabrir solicitacao</Text>}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
          : cursosCatalogo.length === 0
            ? <Text style={estilos.vazio}>Nenhum curso encontrado.</Text>
            : cursosCatalogo.map((curso) => {
                const temTurma = (turmasPorCursoId.get(curso.id) || []).length > 0;
                return (
                  <View key={curso.id} style={estilos.cartao}>
                    <Text style={estilos.cartaoTitulo}>{curso.titulo}</Text>
                    <Text style={estilos.cartaoMeta}>{curso.descricao}</Text>
                    {temTurma ? (
                      <TouchableOpacity disabled={processando === curso.id} onPress={() => solicitar(curso)} style={estilos.botaoPrimario}>
                        {processando === curso.id ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Solicitar matricula</Text>}
                      </TouchableOpacity>
                    ) : (
                      <Text style={estilos.semTurma}>Sem turma disponivel</Text>
                    )}
                  </View>
                );
              })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  abas: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  aba: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: cores.fundoCartao },
  abaAtiva: { backgroundColor: cores.destaque },
  abaTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: 13 },
  abaTextoAtivo: { color: cores.texto },
  mensagem: { color: cores.destaque, paddingHorizontal: 20, paddingTop: 12 },
  busca: { backgroundColor: cores.fundoCartao, borderRadius: 10, marginHorizontal: 20, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, color: cores.texto, borderWidth: 1, borderColor: cores.bordaCartao },
  corpo: { padding: 20, gap: 12 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16 },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15, flex: 1, marginRight: 10 },
  status: { fontWeight: "700", fontSize: 12 },
  cartaoMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 4 },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  botaoPerigo: { backgroundColor: "transparent", borderWidth: 1, borderColor: cores.erro, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  botaoPerigoTexto: { color: cores.erro, fontWeight: "700" },
  semTurma: { color: cores.textoSuave, fontSize: 12, marginTop: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40 }
});
