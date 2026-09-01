import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatGrade, formatPercent } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";

export default function ProgressoScreen({ snapshot }) {
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
          return (
            <View key={progresso.id} style={estilos.cartao}>
              <Text style={estilos.titulo}>{curso?.titulo || `Curso #${progresso.cursoId}`}</Text>

              <View style={estilos.barraFundo}>
                <View style={[estilos.barraPreenchida, { width: `${Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100))}%` }]} />
              </View>

              <View style={estilos.linhaMetricas}>
                <Metrica rotulo="Progresso" valor={formatPercent(progresso.percentualConclusao)} />
                <Metrica rotulo="Modulos" valor={`${progresso.modulosConcluidos}/${progresso.totalModulos}`} />
                <Metrica rotulo="Media" valor={formatGrade(progresso.mediaCurso)} />
              </View>
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
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16 },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: 16, marginBottom: 12 },
  barraFundo: { height: 8, borderRadius: 4, backgroundColor: cores.bordaCartao, overflow: "hidden", marginBottom: 14 },
  barraPreenchida: { height: 8, borderRadius: 4, backgroundColor: cores.destaque },
  linhaMetricas: { flexDirection: "row", justifyContent: "space-between" },
  metrica: { alignItems: "center", flex: 1 },
  metricaValor: { color: cores.texto, fontWeight: "700", fontSize: 15 },
  metricaRotulo: { color: cores.textoSuave, fontSize: 11, marginTop: 2 },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
