import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { formatGrade, formatPercent, normalizeContentType } from "../../lib/format.js";
import { cores, raios } from "../../lib/theme.js";

const TIPO_QUIZ = 1;

/* Progresso do Aluno — mesmo drill-down Curso -> Modulos -> Materiais/
   Avaliacoes usado em toda parte do web hoje (Aluno/Professor/Coordenador):
   cartao de curso com KPIs, expande pra um accordion por modulo mostrando
   status de cada material/quiz. So leitura (sem "Abrir"/"Concluir" — isso e
   papel da aba Conteudos); reaproveita agruparConteudosPorCurso (mesma
   funcao que ConteudosScreen.jsx ja usa) em vez de duplicar a logica de
   agrupamento/bloqueio. */
export default function ProgressoScreen({ snapshot }) {
  const [cursoAbertoId, setCursoAbertoId] = useState(null);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const progressosPorCurso = useMemo(
    () =>
      [...(snapshot.progressos.cursos || [])].sort((a, b) => {
        const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
        const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
        return tituloA.localeCompare(tituloB);
      }),
    [cursoPorId, snapshot.progressos.cursos]
  );

  const gruposPorCursoId = useMemo(() => {
    const grupos = agruparConteudosPorCurso({
      avaliacoes: snapshot.avaliacoes,
      conteudos: snapshot.conteudos,
      cursos: snapshot.cursos,
      matriculas: snapshot.matriculas,
      modulos: snapshot.modulos,
      progressos: snapshot.progressos
    });
    return new Map(grupos.map((grupo) => [grupo.id, grupo]));
  }, [snapshot]);

  if (progressosPorCurso.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Assim que sua matricula for aprovada e voce comecar a trilha, seu progresso aparecera aqui.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <ScrollView contentContainerStyle={estilos.corpo}>
        {progressosPorCurso.map((progresso) => {
          const curso = cursoPorId.get(progresso.cursoId);
          const aberto = cursoAbertoId === progresso.cursoId;
          const grupo = gruposPorCursoId.get(progresso.cursoId);

          return (
            <View key={progresso.id} style={estilos.cartao}>
              <TouchableOpacity onPress={() => setCursoAbertoId(aberto ? null : progresso.cursoId)}>
                <Text style={estilos.titulo}>{curso?.titulo || `Curso #${progresso.cursoId}`}</Text>

                <View style={estilos.barraFundo}>
                  <View style={[estilos.barraPreenchida, { width: `${Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100))}%` }]} />
                </View>

                <View style={estilos.linhaMetricas}>
                  <Metrica rotulo="Progresso" valor={formatPercent(progresso.percentualConclusao)} />
                  <Metrica rotulo="Modulos" valor={`${progresso.modulosConcluidos}/${progresso.totalModulos}`} />
                  <Metrica rotulo="Media" valor={formatGrade(progresso.mediaCurso)} />
                </View>

                <Text style={estilos.expandirRotulo}>{aberto ? "Ocultar modulos −" : "Ver modulos +"}</Text>
              </TouchableOpacity>

              {aberto && grupo ? (
                <View style={estilos.modulosLista}>
                  {grupo.modulos.length === 0 ? (
                    <Text style={estilos.vazioModulo}>Nenhum modulo publicado neste curso ainda.</Text>
                  ) : (
                    grupo.modulos.map((modulo) => {
                      const percentualModulo = modulo.conteudos.length
                        ? Math.round((modulo.concluidos / modulo.conteudos.length) * 100)
                        : 0;

                      return (
                        <View key={modulo.id} style={estilos.modulo}>
                          <View style={estilos.moduloCabecalho}>
                            <Text style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                            <Text style={estilos.moduloPercentual}>{percentualModulo}% concluido</Text>
                          </View>

                          {modulo.conteudos.map((conteudo) => (
                            <View key={`material-${conteudo.id}`} style={estilos.item}>
                              <View style={{ flex: 1 }}>
                                <Text style={estilos.itemTitulo}>{conteudo.titulo}</Text>
                                <Text style={estilos.itemMeta}>{normalizeContentType(conteudo.tipoConteudo)}</Text>
                              </View>
                              <Text style={[estilos.itemStatus, conteudo.concluido ? estilos.itemStatusOk : estilos.itemStatusPendente]}>
                                {conteudo.concluido ? "Concluido" : "Pendente"}
                              </Text>
                            </View>
                          ))}

                          {[...modulo.quizzes, ...modulo.conteudos.flatMap((conteudo) => conteudo.quizzes || [])].map((quiz) => {
                            const realizado = Number(quiz.tentativasRealizadas || 0) > 0;
                            const ehQuiz = Number(quiz.tipoAvaliacao) === TIPO_QUIZ;

                            return (
                              <View key={`quiz-${quiz.id}`} style={estilos.item}>
                                <View style={{ flex: 1 }}>
                                  <Text style={estilos.itemTitulo}>{quiz.titulo}</Text>
                                  <Text style={estilos.itemMeta}>{ehQuiz ? "Quiz - formativo, sem nota" : "Avaliacao"}</Text>
                                </View>
                                <Text style={[estilos.itemStatus, realizado ? estilos.itemStatusOk : estilos.itemStatusPendente]}>
                                  {realizado ? "Concluido" : "Pendente"}
                                </Text>
                              </View>
                            );
                          })}

                          {modulo.conteudos.length === 0 && modulo.quizzes.length === 0 ? (
                            <Text style={estilos.vazioModulo}>Nenhum material publicado neste modulo ainda.</Text>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Metrica({ rotulo, valor }) {
  return (
    <View style={estilos.metrica}>
      <Text style={estilos.metricaValor}>{valor}</Text>
      <Text style={estilos.metricaRotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: 20, gap: 14 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: 16 },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: 16, marginBottom: 12 },
  barraFundo: { height: 8, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginBottom: 14 },
  barraPreenchida: { height: 8, borderRadius: raios.sm, backgroundColor: cores.destaque },
  linhaMetricas: { flexDirection: "row", justifyContent: "space-between" },
  metrica: { alignItems: "center", flex: 1 },
  metricaValor: { color: cores.texto, fontWeight: "700", fontSize: 15 },
  metricaRotulo: { color: cores.textoSuave, fontSize: 11, marginTop: 2 },
  expandirRotulo: { color: cores.destaque, fontWeight: "600", fontSize: 12, textAlign: "center", marginTop: 14 },
  modulosLista: { marginTop: 16, gap: 10 },
  modulo: { backgroundColor: cores.fundo, borderRadius: raios.md, padding: 12 },
  moduloCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: 13, flex: 1, marginRight: 8 },
  moduloPercentual: { color: cores.textoSuave, fontSize: 12, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, gap: 8 },
  itemTitulo: { color: cores.texto, fontSize: 13, fontWeight: "600" },
  itemMeta: { color: cores.textoSuave, fontSize: 11, marginTop: 2 },
  itemStatus: { fontSize: 11, fontWeight: "700" },
  itemStatusOk: { color: cores.sucesso },
  itemStatusPendente: { color: cores.textoSuave },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
