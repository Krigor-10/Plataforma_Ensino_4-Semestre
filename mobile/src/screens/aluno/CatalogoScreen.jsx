import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import CapaCurso from "../../components/CapaCurso.jsx";
import ConfirmacaoCompraSheet from "../../components/ConfirmacaoCompraSheet.jsx";
import DetalheCursoSheet from "../../components/DetalheCursoSheet.jsx";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatMoney } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";
import { isCursoVisivelNoCatalogoPublico } from "../../../../shared/catalogoVisibilidade.js";

const MODELO_ACOMPANHADO = 3;

// Filtros de chip (docs/redesign-mobile/PROMPT-agente-catalogo-vitrine.md,
// item 1) - "Todos" sempre primeiro, cada um com o criterio pra decidir
// quais cursos ele mostra E se ele aparece (chip sem nenhum curso some).
const FILTROS_CHIP = [
  { id: "todos", rotulo: "Todos", corresponde: () => true },
  { id: "gratis", rotulo: "Grátis", corresponde: (curso) => !(Number(curso.preco) > 0) },
  { id: "pagos", rotulo: "Pagos", corresponde: (curso) => Number(curso.preco) > 0 },
  { id: "acompanhado", rotulo: "Com acompanhamento", corresponde: (curso) => Number(curso.modeloCurso) === MODELO_ACOMPANHADO }
];

function formatarContagemCursos(total) {
  return `${total} curso${total === 1 ? "" : "s"} disponív${total === 1 ? "el" : "eis"}`;
}

/* Catalogo de descoberta — extraido da antiga aba "Catalogo" de
   MatriculasScreen.jsx (hoje CursosScreen.jsx) por pedido do usuario: so
   acessivel pela sidebar, nao e mais aba da Bottom Nav nem parte de
   CURSOS. So lista cursos em que o aluno AINDA NAO tem nenhuma matricula
   (ver cursosVisiveis abaixo) — "pendente"/matricula ativa nunca
   aparecem aqui, so em CURSOS.

   Turma deixou de ser exigida pra comprar (pendencia_compra_cursos): o
   aluno "compra" cursos pagos (abre ConfirmacaoCompraSheet, que chama
   POST /Matriculas/comprar) e "comeca gratis" os gratuitos (POST
   /Matriculas direto, sem confirmacao). isCursoVisivelNoCatalogoPublico
   (shared/, Round 7 do plano fluxo-venda-cursos) cobre Acompanhado/Gratuito
   encerrados e PagoPacote fora da venda — antes so Acompanhado encerrado
   era filtrado aqui, por conta propria.

   Vitrine (PROMPT-agente-catalogo-vitrine.md, opcao A escolhida pelo
   usuario): capa grande, preco so na etiqueta da capa (sem repetir no
   botao), chips de filtro (Todos/Gratis/Pagos/Com acompanhamento) somados
   a busca, e um painel de detalhes (DetalheCursoSheet) pra descricao
   completa antes de decidir comprar/comecar. */
export default function CatalogoScreen({ onRecarregar, onSessionExpired, snapshot, usuario }) {
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);
  const [cursoDetalhe, setCursoDetalhe] = useState(null);
  const navigation = useNavigation();

  const cursoIdsMatriculados = useMemo(() => new Set(snapshot.matriculas.map((matricula) => matricula.cursoId)), [snapshot.matriculas]);

  const cursosVisiveis = useMemo(
    () =>
      snapshot.cursos
        .filter((curso) => !cursoIdsMatriculados.has(curso.id))
        .filter(isCursoVisivelNoCatalogoPublico)
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [snapshot.cursos, cursoIdsMatriculados, busca]
  );

  const chipsComCursos = useMemo(
    () => FILTROS_CHIP.filter((filtro) => cursosVisiveis.some(filtro.corresponde)),
    [cursosVisiveis]
  );

  const filtroAplicado = chipsComCursos.find((filtro) => filtro.id === filtroAtivo) || chipsComCursos[0] || FILTROS_CHIP[0];

  const cursosDisponiveis = useMemo(
    () => cursosVisiveis.filter(filtroAplicado.corresponde),
    [cursosVisiveis, filtroAplicado]
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

      <View style={estilos.topoFiltros}>
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

        <ScrollView contentContainerStyle={estilos.chipsLinha} horizontal showsHorizontalScrollIndicator={false}>
          {chipsComCursos.map((filtro) => (
            <ChipFiltro
              ativo={filtro.id === filtroAplicado.id}
              key={filtro.id}
              onPress={() => setFiltroAtivo(filtro.id)}
              rotulo={filtro.rotulo}
            />
          ))}
        </ScrollView>

        <Text style={estilos.contagemTexto}>{formatarContagemCursos(cursosDisponiveis.length)}</Text>
      </View>

      <FlatList
        ListEmptyComponent={<EstadoVazio icone="search-outline" mensagem="Nenhum curso encontrado." />}
        contentContainerStyle={estilos.corpo}
        data={cursosDisponiveis}
        keyExtractor={(curso) => String(curso.id)}
        renderItem={({ item: curso }) => (
          <ItemCursoCatalogoVitrine
            curso={curso}
            onAbrirDetalhe={() => setCursoDetalhe(curso)}
            onComecarGratis={() => comecarGratis(curso)}
            onComprar={() => setCursoParaComprar(curso)}
            processando={processando === curso.id}
          />
        )}
      />

      <DetalheCursoSheet
        curso={cursoDetalhe}
        onComecarGratis={() => {
          const curso = cursoDetalhe;
          setCursoDetalhe(null);
          comecarGratis(curso);
        }}
        onComprar={() => {
          const curso = cursoDetalhe;
          setCursoDetalhe(null);
          setCursoParaComprar(curso);
        }}
        onFechar={() => setCursoDetalhe(null)}
        processando={processando === cursoDetalhe?.id}
        visivel={Boolean(cursoDetalhe)}
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

function ChipFiltro({ ativo, onPress, rotulo }) {
  return (
    <TouchableOpacity
      accessibilityHint={`Mostra ${rotulo === "Todos" ? "todos os cursos" : `só ${rotulo.toLowerCase()}`}`}
      accessibilityLabel={rotulo}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={onPress}
      style={[estilos.chip, ativo ? estilos.chipAtivo : null]}
    >
      <Text numberOfLines={1} style={[estilos.chipTexto, ativo ? estilos.chipTextoAtivo : null]}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

// Cartao de vitrine (item 2 do prompt): capa grande no topo com a etiqueta
// de preco e o selo "Com acompanhamento" sobrepostos, corpo compacto com
// titulo+descricao+rodape ("Detalhes" + botao pilula menor, sem repetir o
// preco que ja esta na etiqueta). Tocar na capa ou em "Detalhes" abre o
// DetalheCursoSheet; o botao de acao continua chamando onComecarGratis/
// onComprar direto, como hoje.
function ItemCursoCatalogoVitrine({ curso, onAbrirDetalhe, onComecarGratis, onComprar, processando }) {
  const gratuito = !(Number(curso.preco) > 0);
  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  return (
    <View style={estilos.cartaoVitrine}>
      <Pressable
        accessibilityHint="Abre os detalhes do curso"
        accessibilityLabel={`Ver detalhes de ${curso.titulo}`}
        accessibilityRole="button"
        onPress={onAbrirDetalhe}
        style={estilos.capaVitrineContainer}
      >
        <CapaCurso altura={118} curso={curso} estilo={estilos.capaVitrineImagem} largura="100%" reservaIniciais />

        <View style={[estilos.etiquetaPreco, gratuito ? estilos.etiquetaPrecoGratis : null]}>
          <Text style={[estilos.etiquetaPrecoTexto, gratuito ? estilos.etiquetaPrecoTextoGratis : null]}>
            {gratuito ? "Grátis" : formatMoney(curso.preco)}
          </Text>
        </View>

        {ehAcompanhado ? (
          <View style={estilos.seloAcompanhamentoVitrine}>
            <Text style={estilos.seloAcompanhamentoVitrineTexto}>Com acompanhamento</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={estilos.corpoVitrine}>
        <Text numberOfLines={2} style={estilos.tituloVitrine}>{curso.titulo}</Text>
        {curso.descricao ? <Text numberOfLines={2} style={estilos.descricaoVitrine}>{curso.descricao}</Text> : null}

        <View style={estilos.rodapeVitrine}>
          <TouchableOpacity
            accessibilityHint="Abre os detalhes do curso"
            accessibilityLabel={`Ver detalhes de ${curso.titulo}`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onAbrirDetalhe}
            style={estilos.linkDetalhes}
          >
            <Text style={estilos.linkDetalhesTexto}>Detalhes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint={gratuito ? `Começa o curso ${curso.titulo} gratuitamente` : `Abre a confirmação de compra de ${curso.titulo}`}
            accessibilityLabel={gratuito ? `Começar grátis ${curso.titulo}` : `Comprar ${curso.titulo}`}
            accessibilityRole="button"
            disabled={processando}
            onPress={gratuito ? onComecarGratis : onComprar}
            style={[estilos.botaoAcaoVitrine, gratuito ? estilos.botaoAcaoVitrineGratis : estilos.botaoAcaoVitrinePago]}
          >
            {processando ? (
              <ActivityIndicator color={gratuito ? cores.fundo : cores.texto} size="small" />
            ) : (
              <Text style={[estilos.botaoAcaoVitrineTexto, gratuito ? estilos.botaoAcaoVitrineTextoGratis : null]}>
                {gratuito ? "Começar grátis" : "Comprar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  mensagemContainer: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.md },
  topoFiltros: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.lg, gap: espacamentos.sm },
  buscaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  buscaEntrada: { flex: 1, color: cores.texto, paddingVertical: 10, fontSize: tipografia.corpo },
  chipsLinha: { gap: espacamentos.xs },
  chip: {
    borderRadius: raios.pilula,
    backgroundColor: cores.fundoCartao,
    paddingHorizontal: 10,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  chipAtivo: { backgroundColor: "rgba(123, 47, 247, 0.18)", borderWidth: 1, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.legenda },
  chipTextoAtivo: { color: cores.acento, fontWeight: "700" },
  contagemTexto: { color: cores.textoRotulo, fontSize: 11 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },

  cartaoVitrine: {
    borderRadius: raios.lg,
    backgroundColor: cores.fundoCartao,
    borderWidth: 1,
    borderColor: "rgba(123, 47, 247, 0.2)",
    overflow: "hidden"
  },
  capaVitrineContainer: { width: "100%", height: 118 },
  capaVitrineImagem: { borderRadius: 0 },
  etiquetaPreco: {
    position: "absolute",
    top: espacamentos.sm,
    right: espacamentos.sm,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: raios.pilula,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 4
  },
  etiquetaPrecoGratis: { backgroundColor: cores.sucesso },
  etiquetaPrecoTexto: { color: cores.texto, fontWeight: "800", fontSize: 11.5 },
  etiquetaPrecoTextoGratis: { color: cores.fundo },
  seloAcompanhamentoVitrine: {
    position: "absolute",
    bottom: espacamentos.sm,
    left: espacamentos.sm,
    backgroundColor: "rgba(17, 19, 25, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(157, 103, 255, 0.45)",
    borderRadius: raios.sm,
    paddingHorizontal: espacamentos.sm,
    paddingVertical: 3
  },
  seloAcompanhamentoVitrineTexto: { color: "#c4b5fd", fontSize: 10, fontWeight: "700" },

  corpoVitrine: { padding: espacamentos.md },
  tituloVitrine: { color: cores.texto, fontWeight: "700", fontSize: 14 },
  descricaoVitrine: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4 },
  rodapeVitrine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espacamentos.sm
  },
  linkDetalhes: { paddingVertical: espacamentos.xs },
  linkDetalhesTexto: { color: "#c4b5fd", fontWeight: "700", fontSize: tipografia.rotulo },
  botaoAcaoVitrine: {
    borderRadius: raios.pilula,
    paddingHorizontal: 14,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  botaoAcaoVitrinePago: { backgroundColor: cores.destaque },
  botaoAcaoVitrineGratis: { backgroundColor: cores.sucesso },
  botaoAcaoVitrineTexto: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  botaoAcaoVitrineTextoGratis: { color: cores.fundo }
});
