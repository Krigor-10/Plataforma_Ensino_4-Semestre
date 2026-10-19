import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CapaCurso from "../../components/CapaCurso.jsx";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { formatGrade, formatPercent } from "../../lib/format.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";
import SeletorCurso from "../../components/SeletorCurso.jsx";

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

  // Mesmo ajuste de ConteudosScreen.jsx/AvaliacoesScreen.jsx: curso
  // selecionado e estado local, nao rota — sem isso o voltar fisico do
  // Android pulava direto pra fora da aba em vez de voltar pra selecao
  // de curso.
  useEffect(() => {
    if (!cursoSelecionadoId) {
      return undefined;
    }

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      setCursoSelecionadoId(null);
      return true;
    });

    return () => assinatura.remove();
  }, [cursoSelecionadoId]);

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
        <Text style={estilos.vazio}>Assim que sua matrícula for aprovada e você começar a trilha, seu progresso aparecerá aqui.</Text>
      </View>
    );
  }

  if (!cursoSelecionadoId) {
    return (
      <View style={estilos.container}>
        <SeletorCurso
          accessibilityLabelPrefix="Ver progresso de"
          itens={progressosPorCurso.map((progresso) => ({ curso: cursoPorId.get(progresso.cursoId), id: progresso.cursoId }))}
          onSelecionar={setCursoSelecionadoId}
        />
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
        accessibilityLabel="Trocar de curso"
        onPress={() => setCursoSelecionadoId(null)}
        style={estilos.voltar}
      >
        <Ionicons color={cores.destaque} name="chevron-back" size={18} />
        <Text style={estilos.voltarTexto}>Trocar de curso</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <View style={estilos.cartao}>
          <View style={estilos.cabecalhoLinha}>
            <CapaCurso curso={curso} size={48} />
            <View style={estilos.cabecalhoConteudo}>
              <Text numberOfLines={2} style={estilos.titulo}>{tituloCursoAtivo}</Text>
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
            <Metrica rotulo="Módulos" valor={`${progresso?.modulosConcluidos || 0}/${progresso?.totalModulos || 0}`} />
            <Metrica
              rotulo="Média"
              valor={Number(progresso?.mediaCurso) > 0 ? `${formatGrade(progresso.mediaCurso)} / 10` : "-"}
            />
          </View>
          {/* O percentual de "Progresso" soma conteudos+quizzes (ver
              ProgressoAlunoService.RecalcularProgressoCursoAsync no backend) —
              provas/exercicios NAO entram aqui, so entram na Media. Por isso
              100% de progresso pode coexistir com uma avaliacao (prova) ainda
              pendente, de proposito: sao dois indicadores diferentes. Texto
              explicando isso na tela foi removido (cabecalho mais compacto,
              pedido explicito do usuario) — a regra em si continua valendo,
              so nao aparece mais escrita aqui. */}
        </View>

        <View style={estilos.modulosLista}>
          {!grupo || grupo.modulos.length === 0 ? (
            <Text style={estilos.vazioModulo}>Nenhum módulo publicado neste curso ainda.</Text>
          ) : (
            grupo.modulos.map((modulo) => {
              const totalConteudos = modulo.conteudos.length;
              const moduloConcluido = totalConteudos > 0 && modulo.concluidos === totalConteudos;

              return (
                <View
                  accessibilityLabel={`${modulo.titulo}. ${moduloConcluido ? "Módulo concluído. " : ""}${modulo.concluidos} de ${totalConteudos} conteúdos concluídos.`}
                  accessible
                  key={modulo.id}
                  style={estilos.modulo}
                >
                  <View style={estilos.moduloTituloLinha}>
                    <Ionicons accessibilityElementsHidden color={cores.destaque} importantForAccessibility="no" name="grid-outline" size={15} />
                    <Text numberOfLines={1} style={estilos.moduloTitulo}>{modulo.titulo}</Text>
                  </View>
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
  // Icone igual ao TbLayoutGrid da Web (SecoesAluno.jsx) — reforca a
  // hierarquia curso->modulo tambem no mobile. So identificacao visual, sem
  // acao propria nem hitSlop: todo o resto da linha ja nao e clicavel aqui
  // (Progresso nao navega pelos modulos, so mostra evolucao). gap em sm (nao
  // xs) pra bater com o mesmo respiro icone->titulo ja usado em
  // ConteudosScreen.jsx (moduloCabecalho) — xs ficava visualmente colado.
  moduloTituloLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, flex: 1 },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: 13, flex: 1 },
  moduloIndicadores: { flexDirection: "row", alignItems: "center", gap: 6 },
  moduloProgresso: { color: cores.textoSuave, fontSize: 12, fontWeight: "600" },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
