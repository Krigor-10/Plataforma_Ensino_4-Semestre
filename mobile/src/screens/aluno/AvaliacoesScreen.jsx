import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatScore } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";
import SeletorCurso from "../../components/SeletorCurso.jsx";

const TIPO_QUIZ = 1;

/* Avaliacoes agora segue o mesmo contexto Curso->conteudo ja usado em
   Conteudos/Progresso: primeiro o aluno escolhe o curso (mesmo cartao
   CapaCurso+titulo da Home), so depois ve as avaliacoes daquele curso —
   evita misturar avaliacoes de cursos diferentes na mesma lista. Estado
   local (cursoSelecionadoId), sem Navigator novo: AlunoWorkspace.jsx ja
   troca de tela por state, entao uma tela de selecao dedicada seria uma
   segunda implementacao desnecessaria pro mesmo padrao.

   Cards de avaliacao continuam compactos: so identificam a avaliacao
   (titulo + modulo) e o estado (Play se disponivel, check verde se
   concluida — mesmo padrao de Conteudos). Detalhes (tempo, questoes, nota,
   tentativas) ficam pro Modal de confirmacao, o QuizModal.jsx ja existente
   (fase "confirmar"), reaproveitado sem alteracao. */
export default function AvaliacoesScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const cursosMatriculados = useMemo(
    () =>
      [...(snapshot.progressos.cursos || [])].sort((a, b) => {
        const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
        const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
        return tituloA.localeCompare(tituloB);
      }),
    [cursoPorId, snapshot.progressos.cursos]
  );

  const avaliacoesDoCurso = useMemo(
    () =>
      (snapshot.avaliacoes || [])
        .filter((avaliacao) => avaliacao.cursoId === cursoSelecionadoId)
        .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "")),
    [snapshot.avaliacoes, cursoSelecionadoId]
  );

  if (cursosMatriculados.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Voce ainda nao possui cursos com avaliacoes disponiveis.</Text>
      </View>
    );
  }

  if (!cursoSelecionadoId) {
    return (
      <View style={estilos.container}>
        <SeletorCurso
          accessibilityLabelPrefix="Ver avaliacoes de"
          itens={cursosMatriculados.map((progresso) => ({ curso: cursoPorId.get(progresso.cursoId), id: progresso.cursoId }))}
          onSelecionar={setCursoSelecionadoId}
        />
      </View>
    );
  }

  const cursoAtivo = cursoPorId.get(cursoSelecionadoId);
  const tituloCursoAtivo = cursoAtivo?.titulo || `Curso #${cursoSelecionadoId}`;

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

      <Text numberOfLines={1} style={estilos.tituloCursoAtivo}>{tituloCursoAtivo}</Text>

      {avaliacoesDoCurso.length === 0 ? (
        <Text style={estilos.vazio}>Este curso ainda nao possui avaliacoes disponiveis.</Text>
      ) : (
        <ScrollView contentContainerStyle={estilos.corpo}>
          {avaliacoesDoCurso.map((avaliacao) => {
            const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
            const concluida = !disponibilidade.podeRealizar && disponibilidade.tone === "sucesso";
            const contexto = avaliacao.moduloTitulo;
            const temTentativa = Number(avaliacao.tentativasRealizadas || 0) > 0;
            const mostrarNota = temTentativa && Number(avaliacao.tipoAvaliacao) !== TIPO_QUIZ && avaliacao.ultimaNota != null;

            return (
              <View
                accessibilityLabel={
                  disponibilidade.podeRealizar || concluida ? undefined : `${avaliacao.titulo}. ${contexto}. ${disponibilidade.mensagem}`
                }
                accessible={!disponibilidade.podeRealizar && !concluida}
                key={avaliacao.id}
                style={estilos.cartao}
              >
                <View style={estilos.cartaoTopo}>
                  <View style={estilos.cartaoTextos}>
                    <Text style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
                    <Text style={estilos.cartaoContexto}>{contexto}</Text>
                    {temTentativa ? (
                      <Text style={estilos.cartaoMeta}>
                        {mostrarNota ? `Nota ${formatScore(avaliacao.ultimaNota)} / ${formatScore(avaliacao.notaMaxima)} · ` : ""}
                        Tentativas {avaliacao.tentativasRealizadas} de {avaliacao.tentativasPermitidas || 1}
                      </Text>
                    ) : null}
                  </View>

                  {disponibilidade.podeRealizar ? (
                    <TouchableOpacity
                      accessibilityLabel={`Iniciar avaliacao ${avaliacao.titulo}`}
                      accessibilityRole="button"
                      onPress={() => setAvaliacaoSelecionada(avaliacao)}
                      style={estilos.botaoPlay}
                    >
                      <Ionicons color={cores.destaque} name="play-circle" size={30} />
                    </TouchableOpacity>
                  ) : concluida ? (
                    <View accessibilityLabel="Concluida" accessible style={estilos.iconeEstado}>
                      <Ionicons color={cores.sucesso} name="checkmark-circle" size={22} />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <QuizModal
        avaliacao={avaliacaoSelecionada}
        onConcluido={onRecarregar}
        onFechar={() => setAvaliacaoSelecionada(null)}
        onSessionExpired={onSessionExpired}
        visivel={Boolean(avaliacaoSelecionada)}
      />
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
  tituloCursoAtivo: {
    color: cores.texto,
    fontWeight: "700",
    fontSize: tipografia.titulo,
    paddingHorizontal: espacamentos.xl,
    paddingTop: espacamentos.sm,
    paddingBottom: espacamentos.sm
  },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.sm, gap: espacamentos.md },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.lg },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacamentos.sm },
  cartaoTextos: { flex: 1 },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  cartaoContexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 2 },
  cartaoMeta: { color: cores.textoRotulo, fontSize: tipografia.legenda, marginTop: 4, fontWeight: "600" },
  botaoPlay: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  iconeEstado: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
