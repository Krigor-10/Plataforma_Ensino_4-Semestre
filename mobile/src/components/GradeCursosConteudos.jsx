import { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import Botao from "./Botao.jsx";
import CartaoVitrineCurso from "./CartaoVitrineCurso.jsx";
import ChipFiltro from "./ChipFiltro.jsx";
import EstadoVazio from "./EstadoVazio.jsx";
import {
  obterApoioTextoCurso,
  obterEtiquetaSituacao,
  obterGrupoSituacao,
  obterRotuloAcaoPrincipal,
  obterSituacaoCurso,
  obterVarianteAcaoPrincipalCartao,
  temAcessoLiberado
} from "../lib/cursosVitrine.js";
import { cores, espacamentos, tipografia } from "../lib/theme.js";

// Ordem de "Todos" (item 1 do prompt): em andamento (maior % primeiro),
// compra pendente, nao iniciados, concluidos.
const ORDEM_GRUPO = { andamento: 0, compraPendente: 1, naoIniciado: 2, concluido: 3 };

const FILTROS_CHIP = [
  { id: "todos", rotulo: "Todos", corresponde: () => true },
  { id: "andamento", rotulo: "Em andamento", corresponde: (item) => obterGrupoSituacao(obterSituacaoCurso(item)) === "andamento" },
  { id: "naoIniciados", rotulo: "Não iniciados", corresponde: (item) => obterGrupoSituacao(obterSituacaoCurso(item)) === "naoIniciado" },
  { id: "concluidos", rotulo: "Concluídos", corresponde: (item) => obterGrupoSituacao(obterSituacaoCurso(item)) === "concluido" },
  { id: "compraPendente", rotulo: "Compra pendente", corresponde: (item) => obterGrupoSituacao(obterSituacaoCurso(item)) === "compraPendente" }
];

function formatarContagemCursos(total) {
  return `${total} curso${total === 1 ? "" : "s"}`;
}

function compararCursos(itemA, itemB) {
  const grupoA = ORDEM_GRUPO[obterGrupoSituacao(obterSituacaoCurso(itemA))];
  const grupoB = ORDEM_GRUPO[obterGrupoSituacao(obterSituacaoCurso(itemB))];
  if (grupoA !== grupoB) {
    return grupoA - grupoB;
  }
  return (Number(itemB.progresso) || 0) - (Number(itemA.progresso) || 0);
}

/* Vitrine de 1 coluna pra "meus cursos" na aba Cursos (docs/redesign-
   mobile/PROMPT-agente-cursos-vitrine.md) - mesmo formato/estilo do
   Catalogo em vitrine (PROMPT-agente-catalogo-vitrine.md): chips por
   situacao + CartaoVitrineCurso.jsx compartilhado entre as duas telas. A
   situacao de cada curso (em andamento/nao iniciado/concluido/compra
   pendente/comprar) vem de lib/cursosVitrine.js, reaproveitada tambem pelo
   botao do DetalheCursoSheet em ConteudosScreen.jsx. */
export default function GradeCursosConteudos({ accessibilityLabelPrefix, itens, onAbrirDetalhe, onConcluirCompra, onDesistir, onSelecionar, processandoPagamentoId }) {
  const [filtroAtivo, setFiltroAtivo] = useState("todos");

  const chipsComCursos = useMemo(() => FILTROS_CHIP.filter((filtro) => itens.some(filtro.corresponde)), [itens]);
  const filtroAplicado = chipsComCursos.find((filtro) => filtro.id === filtroAtivo) || chipsComCursos[0] || FILTROS_CHIP[0];

  const itensOrdenados = useMemo(
    () => itens.filter(filtroAplicado.corresponde).sort(compararCursos),
    [itens, filtroAplicado]
  );

  return (
    <View style={estilos.container}>
      <View style={estilos.topoFiltros}>
        <ScrollView contentContainerStyle={estilos.chipsLinha} horizontal showsHorizontalScrollIndicator={false}>
          {chipsComCursos.map((filtro) => (
            <ChipFiltro ativo={filtro.id === filtroAplicado.id} key={filtro.id} onPress={() => setFiltroAtivo(filtro.id)} rotulo={filtro.rotulo} />
          ))}
        </ScrollView>

        <Text style={estilos.contagemTexto}>{formatarContagemCursos(itensOrdenados.length)}</Text>
      </View>

      <FlatList
        ListEmptyComponent={<EstadoVazio icone="search-outline" mensagem="Nenhum curso nessa situação." />}
        contentContainerStyle={estilos.lista}
        data={itensOrdenados}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CardCurso
            accessibilityLabelPrefix={accessibilityLabelPrefix}
            item={item}
            onAbrirDetalhe={onAbrirDetalhe}
            onConcluirCompra={onConcluirCompra}
            onDesistir={onDesistir}
            onSelecionar={onSelecionar}
            processando={processandoPagamentoId === item.matriculaId}
          />
        )}
      />
    </View>
  );
}

function CardCurso({ accessibilityLabelPrefix, item, onAbrirDetalhe, onConcluirCompra, onDesistir, onSelecionar, processando }) {
  const [confirmandoDesistencia, setConfirmandoDesistencia] = useState(false);
  const { curso, id } = item;
  const tituloCurso = curso?.titulo || `Curso #${id}`;
  const situacao = obterSituacaoCurso(item);
  const comAcesso = temAcessoLiberado(situacao);
  const percentual = Math.max(0, Math.min(Number(item.progresso) || 0, 100));

  function abrirDetalhe() {
    onAbrirDetalhe?.(item);
  }

  const acaoPrincipal = comAcesso
    ? {
        accessibilityHint: `Abre a trilha do curso ${tituloCurso}`,
        accessibilityLabel: `${obterRotuloAcaoPrincipal(situacao)} ${tituloCurso}`,
        onPress: () => onSelecionar(id),
        rotulo: obterRotuloAcaoPrincipal(situacao),
        variante: obterVarianteAcaoPrincipalCartao(situacao)
      }
    : {
        accessibilityHint: `Abre a confirmação de compra de ${tituloCurso}`,
        accessibilityLabel: `${obterRotuloAcaoPrincipal(situacao)} ${tituloCurso}`,
        onPress: () => onConcluirCompra?.(item),
        processando,
        rotulo: obterRotuloAcaoPrincipal(situacao),
        variante: obterVarianteAcaoPrincipalCartao(situacao)
      };

  const acaoSecundaria = comAcesso
    ? { accessibilityHint: "Abre os detalhes do curso", accessibilityLabel: `Ver detalhes de ${tituloCurso}`, onPress: abrirDetalhe, rotulo: "Detalhes" }
    : situacao === "pendente"
      ? { accessibilityLabel: `Desistir da compra de ${tituloCurso}`, onPress: () => setConfirmandoDesistencia(true), rotulo: "Desistir", tom: "cinza" }
      : null;

  return (
    <CartaoVitrineCurso
      acaoPrincipal={acaoPrincipal}
      acaoSecundaria={acaoSecundaria}
      apoioTexto={obterApoioTextoCurso(item, situacao)}
      apoioLinhas={1}
      barra={comAcesso ? { concluido: percentual >= 100, percentual } : null}
      capaAccessibilityHint={comAcesso ? "Abre a trilha do curso" : "Abre os detalhes do curso"}
      capaAccessibilityLabel={comAcesso ? `${accessibilityLabelPrefix} ${tituloCurso}` : `Ver detalhes de ${tituloCurso}`}
      curso={curso}
      etiqueta={obterEtiquetaSituacao(situacao)}
      onAbrirCapa={comAcesso ? () => onSelecionar(id) : abrirDetalhe}
      rodapeConteudo={
        confirmandoDesistencia ? (
          <View style={estilos.confirmacao}>
            <Text style={estilos.confirmacaoTexto}>Desistir da compra de {tituloCurso}? Você pode comprar de novo depois.</Text>
            <View style={estilos.confirmacaoBotoes}>
              <Botao
                carregando={processando}
                onPress={() => {
                  setConfirmandoDesistencia(false);
                  onDesistir?.(item);
                }}
                style={estilos.botaoConfirmacao}
                textoStyle={estilos.botaoConfirmacaoTexto}
                variante="sucesso"
              >
                Sim, desistir
              </Botao>
              <Botao
                disabled={processando}
                onPress={() => setConfirmandoDesistencia(false)}
                style={estilos.botaoConfirmacao}
                textoStyle={estilos.botaoConfirmacaoTexto}
                variante="perigo"
              >
                Não
              </Botao>
            </View>
          </View>
        ) : null
      }
      selo={
        item.certificadoEmitidoEm
          ? { corBorda: "rgba(245, 197, 66, 0.5)", corFundo: "rgba(17, 19, 25, 0.8)", corTexto: "#f5c542", rotulo: "🏆 Certificado" }
          : null
      }
    />
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1 },
  topoFiltros: { paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.lg, gap: espacamentos.sm },
  chipsLinha: { gap: espacamentos.xs },
  contagemTexto: { color: cores.textoRotulo, fontSize: 11 },
  lista: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },
  confirmacao: { marginTop: espacamentos.sm, gap: espacamentos.xs },
  confirmacaoTexto: { color: cores.texto, fontSize: tipografia.legenda, lineHeight: 16 },
  confirmacaoBotoes: { flexDirection: "row", gap: espacamentos.xs },
  botaoConfirmacao: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
  botaoConfirmacaoTexto: { fontSize: tipografia.rotulo }
});
