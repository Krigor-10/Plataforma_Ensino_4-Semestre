import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { obterDisponibilidadeAvaliacao } from "../../lib/avaliacoes.js";
import { formatGrade, normalizeEvaluationType } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";
import QuizModal from "../../components/QuizModal.jsx";

const CORES_TONE = {
  sucesso: cores.sucesso,
  aviso: cores.aviso,
  erro: cores.erro
};

export default function AvaliacoesScreen({ onRecarregar, onSessionExpired, snapshot }) {
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

  const avaliacoesOrdenadas = useMemo(
    () => [...(snapshot.avaliacoes || [])].sort((a, b) => (a.cursoTitulo || "").localeCompare(b.cursoTitulo || "")),
    [snapshot.avaliacoes]
  );

  if (avaliacoesOrdenadas.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Quando um professor publicar uma avaliacao para sua turma, ela aparecera aqui.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <ScrollView contentContainerStyle={estilos.corpo}>
        {avaliacoesOrdenadas.map((avaliacao) => {
          const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
          return (
            <View key={avaliacao.id} style={estilos.cartao}>
              <View style={estilos.cartaoTopo}>
                <Text style={estilos.cartaoTitulo}>{avaliacao.titulo}</Text>
                <Text style={[estilos.status, { color: CORES_TONE[disponibilidade.tone] || cores.textoSuave }]}>{disponibilidade.label}</Text>
              </View>
              <Text style={estilos.cartaoMeta}>{avaliacao.cursoTitulo} - {avaliacao.moduloTitulo}</Text>
              <Text style={estilos.cartaoMeta}>{normalizeEvaluationType(avaliacao.tipoAvaliacao)} - {avaliacao.tentativasRealizadas || 0}/{avaliacao.tentativasPermitidas || 1} tentativa(s)</Text>
              {avaliacao.ultimaNota !== null && avaliacao.ultimaNota !== undefined ? (
                <Text style={estilos.cartaoNota}>Ultima nota: {formatGrade(avaliacao.ultimaNota)}</Text>
              ) : null}

              {disponibilidade.podeRealizar ? (
                <TouchableOpacity onPress={() => setAvaliacaoSelecionada(avaliacao)} style={estilos.botaoPrimario}>
                  <Text style={estilos.botaoPrimarioTexto}>Realizar avaliacao</Text>
                </TouchableOpacity>
              ) : (
                <Text style={estilos.bloqueadoInfo}>{disponibilidade.mensagem}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

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
  corpo: { padding: 20, gap: 12 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16 },
  cartaoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 16, flex: 1, marginRight: 10 },
  status: { fontWeight: "700", fontSize: 12 },
  cartaoMeta: { color: cores.textoSuave, fontSize: 12, marginTop: 2 },
  cartaoNota: { color: cores.destaque, fontWeight: "700", marginTop: 6 },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  bloqueadoInfo: { color: cores.textoSuave, fontSize: 12, marginTop: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
