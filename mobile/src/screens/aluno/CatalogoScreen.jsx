import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import ConfirmacaoCompraSheet from "../../components/ConfirmacaoCompraSheet.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatMoney } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";

const MODELO_ACOMPANHADO = 3;

/* Catalogo de descoberta — extraido da antiga aba "Catalogo" de
   MatriculasScreen.jsx (hoje CursosScreen.jsx) por pedido do usuario: so
   acessivel pela sidebar, nao e mais aba da Bottom Nav nem parte de
   CURSOS. So lista cursos em que o aluno AINDA NAO tem nenhuma matricula
   (ver cursosDisponiveis abaixo) — "pendente"/matricula ativa nunca
   aparecem aqui, so em CURSOS.

   Turma deixou de ser exigida pra comprar (pendencia_compra_cursos): o
   aluno "compra" cursos pagos (abre ConfirmacaoCompraSheet, que chama
   POST /Matriculas/comprar) e "comeca gratis" os gratuitos (POST
   /Matriculas direto, sem confirmacao). Acompanhado ja encerrado nao
   aparece pra quem ainda nao tem o curso. */
export default function CatalogoScreen({ onRecarregar, onSessionExpired, snapshot, usuario }) {
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);
  const navigation = useNavigation();

  const cursoIdsMatriculados = useMemo(() => new Set(snapshot.matriculas.map((matricula) => matricula.cursoId)), [snapshot.matriculas]);

  const cursosDisponiveis = useMemo(
    () =>
      snapshot.cursos
        .filter((curso) => !cursoIdsMatriculados.has(curso.id))
        .filter((curso) => !(Number(curso.modeloCurso) === MODELO_ACOMPANHADO && curso.encerradoEm))
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [snapshot.cursos, cursoIdsMatriculados, busca]
  );

  async function comecarGratis(curso) {
    setProcessando(curso.id);
    setMensagem(null);

    try {
      await apiRequest("/Matriculas", { method: "POST", body: JSON.stringify({ alunoId: usuario.id, cursoId: curso.id }) });
      setMensagem({ tipo: "sucesso", texto: `Você começou ${curso.titulo}. Seu acesso já está liberado em Cursos.` });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Não foi possível começar o curso agora." });
    } finally {
      setProcessando(null);
    }
  }

  function irParaCurso(cursoId) {
    setCursoParaComprar(null);
    navigation.navigate(ROUTES.ALUNO_TABS, { params: { cursoId }, screen: ROUTES.CONTEUDOS });
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
            onComecarGratis={() => comecarGratis(curso)}
            onComprar={() => setCursoParaComprar(curso)}
            processando={processando === curso.id}
          />
        )}
      />

      <ConfirmacaoCompraSheet
        curso={cursoParaComprar}
        onCompraConfirmada={onRecarregar}
        onFechar={() => setCursoParaComprar(null)}
        onIrParaCurso={irParaCurso}
        onSessionExpired={onSessionExpired}
        visivel={Boolean(cursoParaComprar)}
      />
    </View>
  );
}

function ItemCursoCatalogo({ curso, onComecarGratis, onComprar, processando }) {
  const gratuito = !(Number(curso.preco) > 0);
  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

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
        {ehAcompanhado ? (
          <View style={estilos.seloAcompanhamento}>
            <Text style={estilos.seloAcompanhamentoTexto}>Com acompanhamento</Text>
          </View>
        ) : null}
        <Botao
          carregando={processando}
          icone={gratuito ? undefined : "card"}
          onPress={gratuito ? onComecarGratis : onComprar}
          style={estilos.botaoAcaoCartao}
          variante="primario"
        >
          {gratuito ? "Começar grátis" : `Comprar · ${formatMoney(curso.preco)}`}
        </Botao>
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
  seloAcompanhamento: {
    alignSelf: "flex-start",
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3,
    marginTop: espacamentos.sm
  },
  seloAcompanhamentoTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700" },
  botaoAcaoCartao: { marginTop: 12 },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40 }
});
