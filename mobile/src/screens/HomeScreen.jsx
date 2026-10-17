import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CapaCurso from "../components/CapaCurso.jsx";
import { formatPercent } from "../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../lib/theme.js";

/* Tela "Inicio" do Aluno — resumo real (cursos matriculados + progresso),
   nao mais o catalogo inteiro do sistema. Recebe snapshot ja carregado pelo
   AlunoWorkspace.jsx (mesma fonte de dados que Progresso/Conteudos usam),
   em vez de fazer sua propria chamada GET /Cursos. Saudacao e acoes de
   notificacoes/perfil/logout viraram HeaderGlobal.jsx (persistente em
   todas as abas, nao so aqui). */
export default function HomeScreen({ onAbrirAba, snapshot }) {
  const cursoPorId = new Map(snapshot.cursos.map((curso) => [curso.id, curso]));
  const progressosPorCurso = [...(snapshot.progressos.cursos || [])].sort((a, b) => {
    const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
    const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
    return tituloA.localeCompare(tituloB);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.tituloSecao}>Meus cursos</Text>

      {progressosPorCurso.length === 0 ? (
        <Text style={styles.vazio}>
          Você ainda não está matriculado em nenhum curso. Vá em Matrículas para explorar o catálogo.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listaConteudo} style={styles.lista}>
          {progressosPorCurso.map((progresso) => {
            const curso = cursoPorId.get(progresso.cursoId);
            const percentual = Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100));

            const tituloCurso = curso?.titulo || `Curso #${progresso.cursoId}`;

            return (
              <TouchableOpacity
                accessibilityLabel={`Ver conteúdos de ${tituloCurso}, ${formatPercent(percentual)} concluído`}
                accessibilityRole="button"
                disabled={!onAbrirAba}
                key={progresso.id}
                onPress={() => onAbrirAba?.("conteudos")}
                style={styles.cartao}
              >
                <CapaCurso curso={curso} size={56} />
                <View style={styles.cartaoConteudo}>
                  <Text style={styles.cartaoTitulo}>{tituloCurso}</Text>
                  <View style={styles.barraFundo}>
                    <View style={[styles.barraPreenchida, { width: `${percentual}%` }]} />
                  </View>
                  <Text style={styles.cartaoMeta}>
                    {formatPercent(percentual)} concluído - {progresso.modulosConcluidos}/{progresso.totalModulos} módulo(s)
                  </Text>
                </View>
                <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.xl
  },
  tituloSecao: {
    color: cores.texto,
    fontSize: tipografia.subtitulo,
    fontWeight: "700",
    marginBottom: 12
  },
  lista: {
    flex: 1
  },
  listaConteudo: {
    paddingBottom: 24,
    gap: 10
  },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque
  },
  cartaoConteudo: {
    flex: 1
  },
  cartaoTitulo: {
    color: cores.texto,
    fontWeight: "600",
    marginBottom: 10
  },
  barraFundo: {
    height: 6,
    borderRadius: raios.sm,
    backgroundColor: cores.bordaCartao,
    overflow: "hidden",
    marginBottom: 8
  },
  barraPreenchida: {
    height: 6,
    borderRadius: raios.sm,
    backgroundColor: cores.destaque
  },
  cartaoMeta: {
    color: cores.textoSuave,
    fontSize: tipografia.rotulo
  },
  vazio: {
    color: cores.textoSuave,
    textAlign: "center",
    marginTop: 24
  }
});
