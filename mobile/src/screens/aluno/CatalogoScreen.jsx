import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatMoney } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";

/* Catalogo de descoberta — extraido da antiga aba "Catalogo" de
   MatriculasScreen.jsx (hoje CursosScreen.jsx) por pedido do usuario: so
   acessivel pela sidebar, nao e mais aba da Bottom Nav nem parte de
   CURSOS. So lista cursos em que o aluno AINDA NAO tem nenhuma matricula
   (ver cursosDisponiveis abaixo) — "pendente"/matricula ativa nunca
   aparecem aqui, so em CURSOS. Preco/gratuidade adicionado ao card (nao
   existia antes, pedido explicito). */
export default function CatalogoScreen({ onRecarregar, onSessionExpired, snapshot, usuario }) {
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  const cursoIdsMatriculados = useMemo(() => new Set(snapshot.matriculas.map((matricula) => matricula.cursoId)), [snapshot.matriculas]);

  const turmasPorCursoId = useMemo(() => {
    const mapa = new Map();
    snapshot.turmas.forEach((turma) => {
      const lista = mapa.get(turma.cursoId) || [];
      lista.push(turma);
      mapa.set(turma.cursoId, lista);
    });
    return mapa;
  }, [snapshot.turmas]);

  const cursosDisponiveis = useMemo(
    () =>
      snapshot.cursos
        .filter((curso) => !cursoIdsMatriculados.has(curso.id))
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [snapshot.cursos, cursoIdsMatriculados, busca]
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
          ? `Matrícula em ${curso.titulo} aprovada — confirme o pagamento pendente em Cursos para liberar o acesso.`
          : `Matrícula em ${curso.titulo} aprovada. Seu acesso já está liberado em Cursos.`
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

  return (
    <View style={estilos.container}>
      {mensagem ? (
        <View style={estilos.mensagemContainer}>
          <Toast mensagem={mensagem.texto} onFechar={() => setMensagem(null)} tipo={mensagem.tipo} />
        </View>
      ) : null}

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

      <FlatList
        ListEmptyComponent={<Text style={estilos.vazio}>Nenhum curso encontrado.</Text>}
        contentContainerStyle={estilos.corpo}
        data={cursosDisponiveis}
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
    </View>
  );
}

function ItemCursoCatalogo({ curso, onSolicitar, processando, temTurma }) {
  const gratuito = !(Number(curso.preco) > 0);

  return (
    <View style={estilos.cartaoLinha}>
      <CapaCurso curso={curso} size={56} />
      <View style={estilos.cartao}>
        <View style={estilos.cartaoTopo}>
          <Text numberOfLines={2} style={estilos.cartaoTitulo}>{curso.titulo}</Text>
          <Text style={[estilos.precoTexto, gratuito ? { color: cores.sucesso } : null]}>
            {gratuito ? "Gratuito" : formatMoney(curso.preco)}
          </Text>
        </View>
        {curso.descricao ? <Text numberOfLines={2} style={estilos.cartaoMeta}>{curso.descricao}</Text> : null}
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

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.md },
  buscaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    marginHorizontal: espacamentos.xl,
    marginTop: espacamentos.lg,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  buscaEntrada: { flex: 1, color: cores.texto, paddingVertical: 10, fontSize: tipografia.corpo },
  corpo: { padding: espacamentos.xl, gap: espacamentos.md },
  cartaoLinha: { flexDirection: "row", alignItems: "flex-start", gap: espacamentos.md, backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.lg, minHeight: 48 },
  cartao: { flex: 1 },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: espacamentos.sm },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, flex: 1 },
  precoTexto: { color: cores.textoRotulo, fontWeight: "700", fontSize: tipografia.rotulo },
  cartaoMeta: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  disponibilidadeLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: espacamentos.sm },
  disponibilidadeTexto: { fontSize: tipografia.rotulo, fontWeight: "600" },
  botaoAcaoCartao: { marginTop: 12 },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40 }
});
