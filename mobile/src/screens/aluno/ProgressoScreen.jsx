import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CapaCurso from "../../components/CapaCurso.jsx";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { formatGrade, formatPercent } from "../../lib/format.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";

/* Progresso do Aluno segue o mesmo contexto Curso->conteudo ja usado em
   Avaliacoes/Conteudos: primeiro o aluno escolhe o curso (mesmo cartao
   CapaCurso+titulo+borda esquerda da Home), so depois ve o progresso
   daquele curso — evita misturar KPIs de cursos diferentes na mesma tela.
   Estado local (cursoSelecionadoId), sem Navigator novo.

   Modulos continuam compactos: so nome->progresso->check (reaproveita
   agruparConteudosPorCurso, mesma funcao que ConteudosScreen.jsx ja usa);
   Progresso tem finalidade diferente de Conteudos (evolucao, nao navegacao
   pelos materiais), entao NAO repete tipo de material nem status por item
   aqui — esse detalhamento continua exclusivo da aba Conteudos. */
export default function ProgressoScreen({ snapshot }) {
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);

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

  if (!cursoSelecionadoId) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.tituloSecao}>Selecione um curso</Text>
        <ScrollView contentContainerStyle={estilos.listaCursos}>
          {progressosPorCurso.map((progresso) => {
            const curso = cursoPorId.get(progresso.cursoId);
            const tituloCurso = curso?.titulo || `Curso #${progresso.cursoId}`;
            return (
              <TouchableOpacity
                accessibilityLabel={`Ver progresso de ${tituloCurso}`}
                key={progresso.cursoId}
                onPress={() => setCursoSelecionadoId(progresso.cursoId)}
                style={estilos.cartaoCurso}
              >
                <CapaCurso curso={curso} size={56} />
                <Text numberOfLines={2} style={estilos.cartaoCursoTitulo}>{tituloCurso}</Text>
                <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const progresso = progressosPorCurso.find((item) => item.cursoId === cursoSelecionadoId);
  const curso = cursoPorId.get(cursoSelecionadoId);
  const grupo = gruposPorCursoId.get(cursoSelecionadoId);
  const tituloCursoAtivo = curso?.titulo || `Curso #${cursoSelecionadoId}`;

  return (
    <View style={estilos.container}>
      <TouchableOpacity
        accessibilityLabel="Voltar para a selecao de cursos"
        onPress={() => setCursoSelecionadoId(null)}
        style={estilos.voltar}
      >
        <Ionicons color={cores.destaque} name="chevron-back" size={18} />
        <Text style={estilos.voltarTexto}>Cursos</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <View style={estilos.cartao}>
          <View style={estilos.cabecalhoLinha}>
            <CapaCurso curso={curso} size={48} />
            <View style={estilos.cabecalhoConteudo}>
              <Text numberOfLines={1} style={estilos.titulo}>{tituloCursoAtivo}</Text>
              <View style={estilos.barraFundo}>
                <View
                  style={[
                    estilos.barraPreenchida,
                    { width: `${Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100))}%` }
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={estilos.linhaMetricas}>
            <Metrica rotulo="Progresso" valor={formatPercent(progresso?.percentualConclusao)} />
            <Metrica rotulo="Modulos" valor={`${progresso?.modulosConcluidos || 0}/${progresso?.totalModulos || 0}`} />
            <Metrica rotulo="Media" valor={formatGrade(progresso?.mediaCurso)} />
          </View>
        </View>

        <View style={estilos.modulosLista}>
          {!grupo || grupo.modulos.length === 0 ? (
            <Text style={estilos.vazioModulo}>Nenhum modulo publicado neste curso ainda.</Text>
          ) : (
            grupo.modulos.map((modulo) => {
              const totalConteudos = modulo.conteudos.length;
              const moduloConcluido = totalConteudos > 0 && modulo.concluidos === totalConteudos;

              return (
                <View
                  accessibilityLabel={`${modulo.titulo}. ${moduloConcluido ? "Modulo concluido. " : ""}${modulo.concluidos} de ${totalConteudos} conteudos concluidos.`}
                  accessible
                  key={modulo.id}
                  style={estilos.modulo}
                >
                  <Text numberOfLines={1} style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  <View style={estilos.moduloIndicadores}>
                    <Text style={estilos.moduloProgresso}>{modulo.concluidos}/{totalConteudos}</Text>
                    {moduloConcluido ? <Ionicons color={cores.sucesso} name="checkmark-circle" size={18} /> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: 16, padding: espacamentos.xl, paddingBottom: espacamentos.md },
  listaCursos: { paddingHorizontal: espacamentos.xl, paddingBottom: espacamentos.xl, gap: espacamentos.md },
  cartaoCurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.md,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque,
    padding: 14
  },
  cartaoCursoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 15, flex: 1 },
  voltar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.lg,
    marginLeft: -6
  },
  voltarTexto: { color: cores.destaque, fontWeight: "600" },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.sm, gap: 14 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: 16 },
  cabecalhoLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cabecalhoConteudo: { flex: 1 },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: 16, marginBottom: 8 },
  barraFundo: { height: 8, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden" },
  barraPreenchida: { height: 8, borderRadius: raios.sm, backgroundColor: cores.destaque },
  linhaMetricas: { flexDirection: "row", justifyContent: "space-between" },
  metrica: { alignItems: "center", flex: 1 },
  metricaValor: { color: cores.texto, fontWeight: "700", fontSize: 15 },
  metricaRotulo: { color: cores.textoSuave, fontSize: 11, marginTop: 2 },
  modulosLista: { gap: 8 },
  modulo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: 13, flex: 1 },
  moduloIndicadores: { flexDirection: "row", alignItems: "center", gap: 6 },
  moduloProgresso: { color: cores.textoSuave, fontSize: 12, fontWeight: "600" },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
