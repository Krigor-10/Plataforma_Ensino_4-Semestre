import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BannerGradiente from "../../components/BannerGradiente.jsx";
import CapaCurso from "../../components/CapaCurso.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { resolverUrlArquivo } from "../../lib/arquivos.js";
import { formatPercent, normalizeContentType } from "../../lib/format.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";

const ICONE_TIPO_CONTEUDO = {
  1: "document-text-outline",
  2: "document-attach-outline",
  3: "videocam-outline",
  4: "link-outline",
  5: "image-outline"
};

export default function ConteudosScreen({ onRecarregar, onSessionExpired, snapshot, token }) {
  const [cursoAtivoId, setCursoAtivoId] = useState(null);
  const [seletorCursoAberto, setSeletorCursoAberto] = useState(false);
  const [modulosAbertos, setModulosAbertos] = useState(() => new Set());
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [mensagem, setMensagem] = useState(null);
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
    setMensagem(null);

    try {
      await apiRequest(`/Progressos/conteudos/${conteudoId}/concluir`, { method: "PUT" });
      await onRecarregar();
      setMensagem({ tipo: "sucesso", texto: "Conteudo concluido." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagem({ tipo: "erro", texto: err.message || "Nao foi possivel atualizar o progresso." });
    } finally {
      setConteudoProcessando(null);
    }
  }

  function abrirConteudo(conteudo) {
    const url = resolverUrlArquivo(conteudo.arquivoUrl || conteudo.linkUrl, token);
    if (url) {
      Linking.openURL(url).catch(() => setMensagem({ tipo: "erro", texto: "Nao foi possivel abrir o arquivo." }));
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
      <BannerGradiente
        accessibilityLabel={`Curso em estudo: ${cursoAtivo.titulo}. Toque para trocar de curso`}
        icone="school-outline"
        onPress={() => setSeletorCursoAberto(true)}
      >
        <Text style={estilos.seletorRotulo}>Curso em estudo</Text>
        <View style={estilos.seletorLinha}>
          <Text numberOfLines={1} style={estilos.seletorCursoTexto}>{cursoAtivo.titulo}</Text>
          <Ionicons color={cores.texto} name="chevron-down" size={18} />
        </View>
        <Text style={estilos.seletorDica}>Toque para trocar de curso</Text>
      </BannerGradiente>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <Text style={estilos.progressoCurso}>{formatPercent(cursoAtivo.progresso)} de progresso - {cursoAtivo.modulos.length} modulo(s)</Text>

        {cursoAtivo.proximoConteudo ? (
          <TouchableOpacity onPress={() => alternarModulo(cursoAtivo.proximoConteudo.moduloId)} style={estilos.continuar}>
            <View>
              <Text style={estilos.continuarRotulo}>Continue de onde parou</Text>
              <Text style={estilos.continuarTitulo}>{cursoAtivo.proximoConteudo.titulo}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <Toast mensagem={mensagem?.texto} onFechar={() => setMensagem(null)} tipo={mensagem?.tipo} />

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
                  {modulo.bloqueado ? (
                    <Text style={estilos.moduloContagem}>Conclua o modulo anterior para desbloquear</Text>
                  ) : null}
                </View>
                {modulo.bloqueado ? (
                  <Text style={estilos.moduloBloqueadoRotulo}>Bloqueado</Text>
                ) : (
                  <View style={estilos.moduloIndicadores}>
                    <Text
                      accessibilityLabel={`${modulo.concluidos} de ${modulo.conteudos.length} conteudos concluidos`}
                      style={estilos.moduloContagemInline}
                    >
                      {modulo.concluidos}/{modulo.conteudos.length}
                    </Text>
                    {modulo.conteudos.length > 0 && modulo.concluidos === modulo.conteudos.length ? (
                      <View accessibilityLabel="Modulo concluido" accessible>
                        <Ionicons color={cores.sucesso} name="checkmark-circle" size={16} />
                      </View>
                    ) : null}
                    <Ionicons color={cores.textoSuave} name={aberto ? "chevron-up" : "chevron-down"} size={18} />
                  </View>
                )}
              </TouchableOpacity>

              {aberto ? (
                <View style={estilos.itensLista}>
                  {modulo.conteudos.map((conteudo) => (
                    <View key={conteudo.id}>
                      <View style={estilos.item}>
                        <View accessibilityLabel={`Conteudo em ${normalizeContentType(conteudo.tipoConteudo)}`} accessible>
                          <Ionicons color={cores.textoSuave} name={ICONE_TIPO_CONTEUDO[conteudo.tipoConteudo] || "document-outline"} size={18} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={estilos.itemTitulo}>{conteudo.titulo}</Text>
                        </View>
                        {conteudo.bloqueado ? (
                          <Text style={estilos.itemBloqueadoRotulo}>Bloqueado</Text>
                        ) : conteudo.concluido ? (
                          <View style={estilos.itemConcluidoAcoes}>
                            <View accessibilityLabel="Concluido" accessible>
                              <Ionicons color={cores.sucesso} name="checkmark-circle" size={20} />
                            </View>
                            {conteudo.arquivoUrl || conteudo.linkUrl ? (
                              <TouchableOpacity
                                accessibilityLabel={`Ver novamente: ${conteudo.titulo}`}
                                onPress={() => abrirConteudo(conteudo)}
                                style={estilos.botaoIconeSecundario}
                              >
                                <Ionicons color={cores.textoSuave} name="eye-outline" size={18} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
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
                          <View accessibilityLabel="Quiz" accessible>
                            <Ionicons color={cores.textoSuave} name="help-circle-outline" size={18} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={estilos.itemTitulo}>{quiz.titulo}</Text>
                            <Text style={estilos.itemMeta}>{quiz.totalQuestoes || 0} questao(oes)</Text>
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
                      <View accessibilityLabel="Quiz" accessible>
                        <Ionicons color={cores.textoSuave} name="help-circle-outline" size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.itemTitulo}>{quiz.titulo}</Text>
                        <Text style={estilos.itemMeta}>{quiz.totalQuestoes || 0} questao(oes)</Text>
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

      <Modal animationType="fade" onRequestClose={() => setSeletorCursoAberto(false)} transparent visible={seletorCursoAberto}>
        <TouchableOpacity
          accessibilityLabel="Fechar selecao de curso"
          activeOpacity={1}
          onPress={() => setSeletorCursoAberto(false)}
          style={estilos.seletorFundo}
        >
          <TouchableOpacity activeOpacity={1} style={estilos.seletorPainel}>
            <Text style={estilos.seletorPainelTitulo}>Selecionar curso</Text>
            <ScrollView contentContainerStyle={estilos.seletorLista}>
              {grupos.map((curso) => {
                const ativo = curso.id === cursoAtivo.id;
                return (
                  <TouchableOpacity
                    accessibilityLabel={curso.titulo}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    key={curso.id}
                    onPress={() => {
                      setCursoAtivoId(curso.id);
                      setSeletorCursoAberto(false);
                    }}
                    style={[estilos.seletorItem, ativo ? estilos.seletorItemAtivo : null]}
                  >
                    <CapaCurso curso={curso} size={40} />
                    <Text numberOfLines={2} style={[estilos.seletorItemTexto, ativo ? estilos.seletorItemTextoAtivo : null]}>
                      {curso.titulo}
                    </Text>
                    {ativo ? <Ionicons color={cores.destaque} name="checkmark" size={18} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  seletorRotulo: { color: cores.textoRotulo, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  seletorLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacamentos.sm, marginTop: 4 },
  seletorCursoTexto: { color: cores.texto, fontSize: 18, fontWeight: "700", flex: 1 },
  seletorDica: { color: cores.textoRotulo, fontSize: 12, marginTop: 4 },
  seletorFundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", paddingHorizontal: espacamentos.xl, paddingTop: 100 },
  seletorPainel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, maxHeight: "70%", overflow: "hidden" },
  seletorPainelTitulo: {
    color: cores.textoSuave,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: espacamentos.lg,
    paddingBottom: espacamentos.sm
  },
  seletorLista: { paddingHorizontal: espacamentos.sm, paddingBottom: espacamentos.sm },
  seletorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacamentos.sm,
    paddingHorizontal: espacamentos.md,
    paddingVertical: espacamentos.md,
    borderRadius: raios.md,
    minHeight: 44
  },
  seletorItemAtivo: { backgroundColor: cores.fundoCartaoAtivo },
  seletorItemTexto: { color: cores.textoSuave, fontSize: 15, fontWeight: "600", flex: 1 },
  seletorItemTextoAtivo: { color: cores.texto },
  corpo: { padding: espacamentos.xl, paddingTop: 0, paddingBottom: 40 },
  progressoCurso: { color: cores.textoSuave, marginBottom: 16 },
  continuar: { backgroundColor: cores.fundoCartaoAtivo, borderRadius: raios.lg, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: cores.destaque },
  continuarRotulo: { color: cores.destaque, fontWeight: "700", fontSize: 12, marginBottom: 4 },
  continuarTitulo: { color: cores.texto, fontWeight: "600" },
  modulo: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, marginBottom: 12, overflow: "hidden" },
  moduloCabecalho: { flexDirection: "row", alignItems: "center", padding: 14 },
  moduloTitulo: { color: cores.texto, fontWeight: "700" },
  moduloContagem: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  moduloIndicadores: { flexDirection: "row", alignItems: "center", gap: 8 },
  moduloContagemInline: { color: cores.textoSuave, fontSize: 12, fontWeight: "600" },
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
  itemTitulo: { color: cores.texto, fontWeight: "600" },
  itemMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  itemBloqueadoRotulo: { color: cores.bloqueado, fontSize: 11, fontWeight: "700" },
  itemAcoes: { flexDirection: "row", gap: 8 },
  itemConcluidoAcoes: { flexDirection: "row", alignItems: "center", gap: 10 },
  botaoIconeSecundario: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  botaoSecundario: { borderWidth: 1, borderColor: cores.destaque, borderRadius: raios.sm, paddingHorizontal: 10, paddingVertical: 6 },
  botaoSecundarioTexto: { color: cores.destaque, fontWeight: "600", fontSize: 12 },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
