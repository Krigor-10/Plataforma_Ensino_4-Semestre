import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { normalizarTermoBusca } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import { ROUTES } from "../../lib/routes.js";

const LIMITE_POR_GRUPO = 20;

/* Busca global do Aluno — 100% client-side sobre o snapshot que o
   AlunoWorkspace.jsx ja carrega pra montar as outras telas (Cursos/Modulos/
   ConteudosDidaticos/Avaliacoes do aluno). Nao existe nenhum endpoint de
   busca/filtro no backend (auditado antes de implementar) e o app ja tem
   esses dados inteiros em memoria, entao filtrar localmente e a escolha
   certa aqui — mesmo padrao que o web ja usa em SecaoCursos.jsx (filtro via
   useMemo, sem chamada nova). Sem debounce: e um filtro sincrono sobre um
   array ja carregado, nao uma consulta remota. */
export default function BuscaScreen({ navigation, onVoltar, snapshot }) {
  const [termo, setTermo] = useState("");
  const termoNormalizado = normalizarTermoBusca(termo);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const grupos = useMemo(() => {
    if (!termoNormalizado) {
      return [];
    }

    const cursos = snapshot.cursos
      .filter((curso) => normalizarTermoBusca(curso.titulo).includes(termoNormalizado))
      .slice(0, LIMITE_POR_GRUPO)
      .map((curso) => ({
        chave: `curso-${curso.id}`,
        titulo: curso.titulo,
        contexto: null,
        icone: "school-outline",
        onPress: () => abrirCurso(ROUTES.CONTEUDOS, curso.id)
      }));

    const conteudos = snapshot.conteudos
      .filter((conteudo) => normalizarTermoBusca(conteudo.titulo).includes(termoNormalizado))
      .slice(0, LIMITE_POR_GRUPO)
      .map((conteudo) => ({
        chave: `conteudo-${conteudo.id}`,
        titulo: conteudo.titulo,
        contexto: [cursoPorId.get(conteudo.cursoId)?.titulo, conteudo.moduloTitulo].filter(Boolean).join(" · "),
        icone: "document-text-outline",
        onPress: () => abrirCurso(ROUTES.CONTEUDOS, conteudo.cursoId)
      }));

    const avaliacoes = snapshot.avaliacoes
      .filter((avaliacao) => normalizarTermoBusca(avaliacao.titulo).includes(termoNormalizado))
      .slice(0, LIMITE_POR_GRUPO)
      .map((avaliacao) => ({
        chave: `avaliacao-${avaliacao.id}`,
        titulo: avaliacao.titulo,
        contexto: cursoPorId.get(avaliacao.cursoId)?.titulo || null,
        icone: "clipboard-outline",
        onPress: () => abrirCurso(ROUTES.AVALIACOES, avaliacao.cursoId)
      }));

    function abrirCurso(tela, cursoId) {
      navigation.navigate(ROUTES.ALUNO_TABS, { params: { cursoId }, screen: tela });
    }

    return [
      { chave: "cursos", itens: cursos, titulo: "Cursos" },
      { chave: "conteudos", itens: conteudos, titulo: "Conteudos" },
      { chave: "avaliacoes", itens: avaliacoes, titulo: "Avaliacoes" }
    ].filter((grupo) => grupo.itens.length > 0);
  }, [cursoPorId, navigation, snapshot.avaliacoes, snapshot.conteudos, snapshot.cursos, termoNormalizado]);

  const totalResultados = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);

  return (
    <View style={estilos.container}>
      <View style={estilos.cabecalho}>
        <TouchableOpacity
          accessibilityHint="Fecha a busca e volta pra tela anterior"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onVoltar}
          style={estilos.botaoVoltar}
        >
          <Ionicons color={cores.texto} name="chevron-back" size={22} />
        </TouchableOpacity>
        <View style={estilos.campoBusca}>
          <Ionicons color={cores.textoSuave} name="search" size={18} />
          <TextInput
            accessibilityHint="Digite pra filtrar cursos, conteudos e avaliacoes"
            accessibilityLabel="Buscar cursos, conteudos, avaliacoes"
            autoFocus
            onChangeText={setTermo}
            placeholder="Buscar cursos, conteudos, avaliacoes..."
            placeholderTextColor={cores.textoSuave}
            returnKeyType="search"
            style={estilos.entrada}
            value={termo}
          />
          {termo ? (
            <TouchableOpacity
              accessibilityHint="Apaga o texto digitado na busca"
              accessibilityLabel="Limpar busca"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setTermo("")}
            >
              <Ionicons color={cores.textoSuave} name="close-circle" size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!termoNormalizado ? (
        <View style={estilos.estadoVazio}>
          <Ionicons color={cores.textoSuave} name="search-outline" size={32} />
          <Text style={estilos.estadoVazioTexto}>Digite pra buscar nos seus cursos, conteudos e avaliacoes.</Text>
        </View>
      ) : totalResultados === 0 ? (
        <View style={estilos.estadoVazio}>
          <Ionicons color={cores.textoSuave} name="file-tray-outline" size={32} />
          <Text style={estilos.estadoVazioTexto}>Nenhum resultado para &quot;{termo.trim()}&quot;.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
          {grupos.map((grupo) => (
            <View key={grupo.chave} style={estilos.grupo}>
              <Text style={estilos.grupoTitulo}>{grupo.titulo}</Text>
              {grupo.itens.map((item) => (
                <TouchableOpacity
                  accessibilityHint="Abre o resultado selecionado"
                  accessibilityLabel={`${item.titulo}${item.contexto ? `, ${item.contexto}` : ""}`}
                  accessibilityRole="button"
                  key={item.chave}
                  onPress={item.onPress}
                  style={estilos.item}
                >
                  <Ionicons color={cores.destaque} name={item.icone} size={20} />
                  <View style={estilos.itemTextos}>
                    <Text numberOfLines={1} style={estilos.itemTitulo}>{item.titulo}</Text>
                    {item.contexto ? <Text numberOfLines={1} style={estilos.itemContexto}>{item.contexto}</Text> : null}
                  </View>
                  <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    paddingHorizontal: espacamentos.lg,
    paddingVertical: espacamentos.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaCartao
  },
  botaoVoltar: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  campoBusca: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    paddingHorizontal: espacamentos.md,
    minHeight: 44
  },
  entrada: { flex: 1, color: cores.texto, fontSize: tipografia.corpo, paddingVertical: 10 },
  estadoVazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacamentos.md, paddingHorizontal: espacamentos.xxl },
  estadoVazioTexto: { color: cores.textoSuave, textAlign: "center", fontSize: tipografia.corpo, lineHeight: 20 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.lg },
  grupo: { gap: espacamentos.sm },
  grupoTitulo: {
    color: cores.textoRotulo,
    fontSize: tipografia.legenda,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    padding: espacamentos.md,
    minHeight: 44
  },
  itemTextos: { flex: 1 },
  itemTitulo: { color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  itemContexto: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 }
});
