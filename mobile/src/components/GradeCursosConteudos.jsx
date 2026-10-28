import { Ionicons } from "@expo/vector-icons";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Botao from "./Botao.jsx";
import { resolverImagemCurso } from "../lib/courseCovers.js";
import { formatMoney } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

function obterStatus(item) {
  if (item.pagamentoPendente) {
    return { cor: cores.aviso, corFundo: cores.avisoFundo, rotulo: "Compra pendente" };
  }

  const percentual = Math.max(0, Math.min(Number(item.progresso) || 0, 100));
  if (percentual >= 100) {
    return { cor: cores.sucesso, corFundo: cores.sucessoFundo, rotulo: "Concluído" };
  }
  if (percentual <= 0) {
    return { cor: cores.textoSuave, corFundo: cores.fundoCartaoAtivo, rotulo: "Não iniciado" };
  }
  return { cor: cores.destaque, corFundo: cores.bordaCartao, rotulo: "Em andamento" };
}

/* Grade de 2 colunas pra selecao de curso na tela Cursos (redesign, docs/
   redesign-mobile/PROMPT-agente-mobile.md, secao 3, 2a_cursos_grade.png) -
   isolada de SeletorCurso.jsx (usado por Avaliacoes/Progresso) e
   CapaCurso.jsx (usado tambem por Home/Catalogo), so a funcao
   resolverImagemCurso e compartilhada. Cada item carrega o progresso e, se
   a matricula aprovada ainda nao teve o pagamento confirmado, os dados pra
   mostrar a pilula "Compra pendente" + botao "Concluir compra" (abre
   ConfirmacaoCompraSheet.jsx, pendencia_compra_cursos; fluxo que antes
   vivia em CursosScreen.jsx, removida nesta rodada do redesign -
   suas outras funcoes, incluindo "Cancelar solicitacao", eram inalcancaveis
   desde que matricula virou sempre automatica, ver pendencia_matriculas_
   sempre_automatica_2026_10_27 na memoria do projeto). */
export default function GradeCursosConteudos({ accessibilityLabelPrefix, itens, onConcluirCompra, onSelecionar, processandoPagamentoId }) {
  return (
    <FlatList
      columnWrapperStyle={estilos.linha}
      contentContainerStyle={estilos.lista}
      data={itens}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      renderItem={({ item }) => (
        <CardCurso
          accessibilityLabelPrefix={accessibilityLabelPrefix}
          item={item}
          onConcluirCompra={onConcluirCompra}
          onSelecionar={onSelecionar}
          processando={processandoPagamentoId === item.matriculaId}
        />
      )}
    />
  );
}

function CardCurso({ accessibilityLabelPrefix, item, onConcluirCompra, onSelecionar, processando }) {
  const { curso, id, pagamentoPendente, progresso, valorPagamento } = item;
  const tituloCurso = curso?.titulo || `Curso #${id}`;
  const capa = resolverImagemCurso(curso);
  const status = obterStatus(item);
  const percentual = Math.max(0, Math.min(Number(progresso) || 0, 100));

  const corpoCartao = (
    <>
      <View style={estilos.capa}>
        {capa ? (
          <Image resizeMode="cover" source={capa} style={estilos.capaImagem} />
        ) : (
          <View style={[StyleSheet.absoluteFill, estilos.capaMarcador]}>
            <Ionicons color={cores.destaque} name="book-outline" size={32} />
          </View>
        )}
      </View>

      <View style={estilos.corpo}>
        <Text numberOfLines={2} style={estilos.cartaoTitulo}>{tituloCurso}</Text>

        {!pagamentoPendente ? (
          <>
            <View style={estilos.barraFundo}>
              <View style={[estilos.barraPreenchida, { width: `${percentual}%` }]} />
            </View>
            <Text style={estilos.percentualTexto}>{Math.round(percentual)}%</Text>
          </>
        ) : null}

        <View style={estilos.rodape}>
          <View style={[estilos.pill, { backgroundColor: status.corFundo }]}>
            <Text numberOfLines={1} style={[estilos.pillTexto, { color: status.cor }]}>{status.rotulo}</Text>
          </View>
          {!pagamentoPendente ? <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} /> : null}
        </View>

        {pagamentoPendente ? (
          <View style={estilos.pagamentoLinha}>
            {valorPagamento ? <Text style={estilos.pagamentoValor}>{formatMoney(valorPagamento)}</Text> : null}
            <Botao
              carregando={processando}
              onPress={() => onConcluirCompra?.(item)}
              style={estilos.botaoPagamento}
              textoStyle={estilos.botaoPagamentoTexto}
              variante="sucesso"
            >
              Concluir compra
            </Botao>
          </View>
        ) : null}
      </View>
    </>
  );

  if (pagamentoPendente) {
    return <View style={estilos.cartao}>{corpoCartao}</View>;
  }

  return (
    <TouchableOpacity
      accessibilityHint="Abre a trilha do curso"
      accessibilityLabel={`${accessibilityLabelPrefix} ${tituloCurso}`}
      accessibilityRole="button"
      onPress={() => onSelecionar(id)}
      style={estilos.cartao}
    >
      {corpoCartao}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: espacamentos.xl, paddingBottom: espacamentos.xl },
  linha: { justifyContent: "space-between" },
  cartao: {
    width: "48%",
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    marginBottom: espacamentos.md,
    overflow: "hidden"
  },
  capa: { width: "100%", aspectRatio: 5 / 3, position: "relative", overflow: "hidden" },
  capaImagem: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  capaMarcador: { backgroundColor: cores.fundoCartaoAtivo, alignItems: "center", justifyContent: "center" },
  corpo: { padding: espacamentos.sm },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.corpo, minHeight: tipografia.corpo * 2.4 },
  barraFundo: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: espacamentos.xs },
  barraPreenchida: { height: 6, borderRadius: raios.sm, backgroundColor: cores.destaque },
  percentualTexto: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 4 },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: espacamentos.sm, gap: espacamentos.xs },
  pill: { borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3, flexShrink: 1 },
  pillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  pagamentoLinha: { marginTop: espacamentos.sm, gap: espacamentos.xs },
  pagamentoValor: { color: cores.aviso, fontWeight: "700", fontSize: tipografia.legenda },
  botaoPagamento: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
  botaoPagamentoTexto: { fontSize: tipografia.rotulo }
});
