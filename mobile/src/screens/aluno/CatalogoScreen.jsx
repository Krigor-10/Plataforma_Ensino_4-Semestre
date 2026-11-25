import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import CartaoVitrineCurso from "../../components/CartaoVitrineCurso.jsx";
import ChipFiltro from "../../components/ChipFiltro.jsx";
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

  const gratuitoDetalhe = cursoDetalhe ? !(Number(cursoDetalhe.preco) > 0) : false;

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
        acaoPrincipal={
          cursoDetalhe
            ? {
                accessibilityHint: gratuitoDetalhe
                  ? `Começa o curso ${cursoDetalhe.titulo} gratuitamente`
                  : `Abre a confirmação de compra de ${cursoDetalhe.titulo}`,
                accessibilityLabel: gratuitoDetalhe ? "Confirmar começar grátis no painel de detalhes" : "Confirmar compra no painel de detalhes",
                icone: gratuitoDetalhe ? undefined : "card",
                onPress: () => {
                  const curso = cursoDetalhe;
                  setCursoDetalhe(null);
                  if (gratuitoDetalhe) {
                    comecarGratis(curso);
                  } else {
                    setCursoParaComprar(curso);
                  }
                },
                processando: processando === cursoDetalhe.id,
                rotulo: gratuitoDetalhe ? "Começar grátis" : `Comprar · ${formatMoney(cursoDetalhe.preco)}`,
                variante: gratuitoDetalhe ? "sucesso" : "primario"
              }
            : null
        }
        curso={cursoDetalhe}
        etiqueta={
          cursoDetalhe
            ? gratuitoDetalhe
              ? { corFundo: cores.sucesso, corTexto: cores.fundo, rotulo: "Grátis" }
              : { corFundo: "rgba(0, 0, 0, 0.7)", corTexto: cores.texto, rotulo: formatMoney(cursoDetalhe.preco) }
            : null
        }
        onFechar={() => setCursoDetalhe(null)}
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

// Cartao de vitrine (item 2 do prompt): capa grande no topo com a etiqueta
// de preco e o selo "Com acompanhamento" sobrepostos, corpo compacto com
// titulo+descricao+rodape ("Detalhes" + botao pilula menor, sem repetir o
// preco que ja esta na etiqueta). Tocar na capa ou em "Detalhes" abre o
// DetalheCursoSheet; o botao de acao continua chamando onComecarGratis/
// onComprar direto, como hoje. CartaoVitrineCurso (docs/redesign-mobile/
// PROMPT-agente-cursos-vitrine.md) e o mesmo componente reaproveitado pela
// aba Cursos - aqui so calcula a cor/rotulo que cabe ao Catalogo.
function ItemCursoCatalogoVitrine({ curso, onAbrirDetalhe, onComecarGratis, onComprar, processando }) {
  const gratuito = !(Number(curso.preco) > 0);
  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  return (
    <CartaoVitrineCurso
      acaoPrincipal={{
        accessibilityHint: gratuito ? `Começa o curso ${curso.titulo} gratuitamente` : `Abre a confirmação de compra de ${curso.titulo}`,
        accessibilityLabel: gratuito ? `Começar grátis ${curso.titulo}` : `Comprar ${curso.titulo}`,
        onPress: gratuito ? onComecarGratis : onComprar,
        processando,
        rotulo: gratuito ? "Começar grátis" : "Comprar",
        variante: gratuito ? "verde" : "roxo"
      }}
      acaoSecundaria={{
        accessibilityHint: "Abre os detalhes do curso",
        accessibilityLabel: `Ver detalhes de ${curso.titulo}`,
        onPress: onAbrirDetalhe,
        rotulo: "Detalhes"
      }}
      apoioTexto={curso.descricao}
      capaAccessibilityHint="Abre os detalhes do curso"
      capaAccessibilityLabel={`Ver detalhes de ${curso.titulo}`}
      curso={curso}
      etiqueta={
        gratuito
          ? { corFundo: cores.sucesso, corTexto: cores.fundo, rotulo: "Grátis" }
          : { corFundo: "rgba(0, 0, 0, 0.7)", corTexto: cores.texto, rotulo: formatMoney(curso.preco) }
      }
      onAbrirCapa={onAbrirDetalhe}
      selo={ehAcompanhado ? { corBorda: "rgba(157, 103, 255, 0.45)", corFundo: "rgba(17, 19, 25, 0.8)", corTexto: "#c4b5fd", rotulo: "Com acompanhamento" } : null}
    />
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
  contagemTexto: { color: cores.textoRotulo, fontSize: 11 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md }
});
