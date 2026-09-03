import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiRequest, ApiError } from "../../lib/api.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { resolverUrlArquivo } from "../../lib/arquivos.js";
import { formatPercent, normalizeContentType } from "../../lib/format.js";
import { cores, raios } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";

export default function ConteudosScreen({ onRecarregar, onSessionExpired, snapshot, token }) {
  const [cursoAtivoId, setCursoAtivoId] = useState(null);
  const [modulosAbertos, setModulosAbertos] = useState(() => new Set());
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [erro, setErro] = useState("");
  const [quizSelecionado, setQuizSelecionado] = useState(null);

  const grupos = useMemo(
    () =>
      agruparConteudosPorCurso({
        avaliacoes: snapshot.avaliacoes,
        conteudos: snapshot.conteudos,
        cursos: snapshot.cursos,
        matriculas: snapshot.matriculas,
        modulos: snapshot.modulos,
        progressos: snapshot.progressos
      }),
    [snapshot]
  );

  const cursoAtivo = grupos.find((curso) => curso.id === cursoAtivoId) || grupos[0] || null;

  function alternarModulo(moduloId) {
    setModulosAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(moduloId)) {
        proximo.delete(moduloId);
      } else {
        proximo.add(moduloId);
      }
      return proximo;
    });
  }

  async function marcarConcluido(conteudoId) {
    setConteudoProcessando(conteudoId);
    setErro("");

    try {
      await apiRequest(`/Progressos/conteudos/${conteudoId}/concluir`, { method: "PUT" });
      await onRecarregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErro(err.message || "Nao foi possivel atualizar o progresso.");
    } finally {
      setConteudoProcessando(null);
    }
  }

  function abrirConteudo(conteudo) {
    const url = resolverUrlArquivo(conteudo.arquivoUrl || conteudo.linkUrl, token);
    if (url) {
      Linking.openURL(url).catch(() => setErro("Nao foi possivel abrir o arquivo."));
    }
  }

  if (grupos.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Quando uma matricula for aprovada, os cursos e modulos da sua trilha aparecerao aqui.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <ScrollView contentContainerStyle={estilos.chipsLinha} horizontal showsHorizontalScrollIndicator={false}>
        {grupos.map((curso) => (
          <TouchableOpacity
            key={curso.id}
            onPress={() => setCursoAtivoId(curso.id)}
            style={[estilos.chip, curso.id === cursoAtivo.id ? estilos.chipAtivo : null]}
          >
            <Text style={[estilos.chipTexto, curso.id === cursoAtivo.id ? estilos.chipTextoAtivo : null]}>{curso.titulo}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <Text style={estilos.tituloCurso}>{cursoAtivo.titulo}</Text>
        <Text style={estilos.progressoCurso}>{formatPercent(cursoAtivo.progresso)} de progresso - {cursoAtivo.modulos.length} modulo(s)</Text>

        {cursoAtivo.proximoConteudo ? (
          <TouchableOpacity onPress={() => alternarModulo(cursoAtivo.proximoConteudo.moduloId)} style={estilos.continuar}>
            <View>
              <Text style={estilos.continuarRotulo}>Continue de onde parou</Text>
              <Text style={estilos.continuarTitulo}>{cursoAtivo.proximoConteudo.titulo}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

        {cursoAtivo.modulos.map((modulo) => {
          const aberto = !modulo.bloqueado && modulosAbertos.has(modulo.id);
          const totalItens = modulo.conteudos.length + modulo.quizzes.length;

          return (
            <View key={modulo.id} style={estilos.modulo}>
              <TouchableOpacity
                disabled={modulo.bloqueado}
                onPress={() => alternarModulo(modulo.id)}
                style={estilos.moduloCabecalho}
              >
                <View style={{ flex: 1 }}>
                  <Text style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  <Text style={estilos.moduloContagem}>
                    {modulo.bloqueado ? "Conclua o modulo anterior para desbloquear" : `${modulo.concluidos}/${modulo.conteudos.length} conteudo(s) concluido(s)`}
                  </Text>
                </View>
                {modulo.bloqueado ? (
                  <Text style={estilos.moduloBloqueadoRotulo}>Bloqueado</Text>
                ) : (
                  <Text style={estilos.moduloIcone}>{aberto ? "−" : "+"}</Text>
                )}
              </TouchableOpacity>

              {aberto ? (
                <View style={estilos.itensLista}>
                  {modulo.conteudos.map((conteudo) => (
                    <View key={conteudo.id}>
                      <View style={[estilos.item, conteudo.concluido ? estilos.itemConcluido : null]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[estilos.itemTitulo, conteudo.concluido ? estilos.itemTituloConcluido : null]}>{conteudo.titulo}</Text>
                          <Text style={estilos.itemMeta}>{normalizeContentType(conteudo.tipoConteudo)}</Text>
                        </View>
                        {conteudo.bloqueado ? (
                          <Text style={estilos.itemBloqueadoRotulo}>Bloqueado</Text>
                        ) : conteudo.concluido ? (
                          <Text style={estilos.itemStatusOk}>Concluido</Text>
                        ) : (
                          <View style={estilos.itemAcoes}>
                            {conteudo.arquivoUrl || conteudo.linkUrl ? (
                              <TouchableOpacity onPress={() => abrirConteudo(conteudo)} style={estilos.botaoSecundario}>
                                <Text style={estilos.botaoSecundarioTexto}>Abrir</Text>
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              disabled={conteudoProcessando === conteudo.id}
                              onPress={() => marcarConcluido(conteudo.id)}
                              style={estilos.botaoSecundario}
                            >
                              {conteudoProcessando === conteudo.id ? (
                                <ActivityIndicator color={cores.destaque} size="small" />
                              ) : (
                                <Text style={estilos.botaoSecundarioTexto}>Concluir</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {(conteudo.quizzes || []).map((quiz) => (
                        <View key={`quiz-${quiz.id}`} style={estilos.itemQuizAninhado}>
                          <View style={{ flex: 1 }}>
                            <Text style={estilos.itemTitulo}>{quiz.titulo}</Text>
                            <Text style={estilos.itemMeta}>Quiz deste material - {quiz.totalQuestoes || 0} questao(oes)</Text>
                          </View>
                          <TouchableOpacity onPress={() => setQuizSelecionado(quiz)} style={estilos.botaoSecundario}>
                            <Text style={estilos.botaoSecundarioTexto}>Iniciar quiz</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}

                  {modulo.quizzes.map((quiz) => (
                    <View key={`quiz-${quiz.id}`} style={estilos.item}>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.itemTitulo}>{quiz.titulo}</Text>
                        <Text style={estilos.itemMeta}>Quiz - {quiz.totalQuestoes || 0} questao(oes)</Text>
                      </View>
                      <TouchableOpacity onPress={() => setQuizSelecionado(quiz)} style={estilos.botaoSecundario}>
                        <Text style={estilos.botaoSecundarioTexto}>Iniciar quiz</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {totalItens === 0 ? <Text style={estilos.vazioModulo}>Nenhum material publicado neste modulo ainda.</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <QuizModal
        avaliacao={quizSelecionado}
        onConcluido={onRecarregar}
        onFechar={() => setQuizSelecionado(null)}
        onSessionExpired={onSessionExpired}
        visivel={Boolean(quizSelecionado)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  chipsLinha: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  chip: { backgroundColor: cores.fundoCartao, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: cores.bordaCartao },
  chipAtivo: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  chipTexto: { color: cores.textoSuave, fontWeight: "600", fontSize: 13 },
  chipTextoAtivo: { color: cores.texto },
  corpo: { padding: 20, paddingBottom: 40 },
  tituloCurso: { color: cores.texto, fontSize: 20, fontWeight: "700" },
  progressoCurso: { color: cores.textoSuave, marginTop: 4, marginBottom: 16 },
  continuar: { backgroundColor: cores.fundoCartaoAtivo, borderRadius: raios.lg, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: cores.destaque },
  continuarRotulo: { color: cores.destaque, fontWeight: "700", fontSize: 12, marginBottom: 4 },
  continuarTitulo: { color: cores.texto, fontWeight: "600" },
  erro: { color: cores.erro, marginBottom: 12 },
  modulo: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, marginBottom: 12, overflow: "hidden" },
  moduloCabecalho: { flexDirection: "row", alignItems: "center", padding: 14 },
  moduloTitulo: { color: cores.texto, fontWeight: "700" },
  moduloContagem: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  moduloIcone: { color: cores.textoSuave, fontSize: 18, marginLeft: 8 },
  moduloBloqueadoRotulo: { color: cores.bloqueado, fontSize: 11, fontWeight: "700", marginLeft: 8 },
  itensLista: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: cores.fundo, borderRadius: raios.md, padding: 12, gap: 10 },
  itemQuizAninhado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundo,
    borderRadius: raios.md,
    padding: 12,
    gap: 10,
    marginTop: 8,
    marginLeft: 16
  },
  itemConcluido: { opacity: 0.65 },
  itemTitulo: { color: cores.texto, fontWeight: "600" },
  itemTituloConcluido: { textDecorationLine: "line-through" },
  itemMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  itemBloqueadoRotulo: { color: cores.bloqueado, fontSize: 11, fontWeight: "700" },
  itemStatusOk: { color: cores.sucesso, fontWeight: "700", fontSize: 12 },
  itemAcoes: { flexDirection: "row", gap: 8 },
  botaoSecundario: { borderWidth: 1, borderColor: cores.destaque, borderRadius: raios.sm, paddingHorizontal: 10, paddingVertical: 6 },
  botaoSecundarioTexto: { color: cores.destaque, fontWeight: "600", fontSize: 12 },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
