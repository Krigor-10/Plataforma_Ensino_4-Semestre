import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../lib/api.js";
import { formatPercent } from "../lib/format.js";
import { cores, raios } from "../lib/theme.js";

/* Tela "Inicio" do Aluno — resumo real (cursos matriculados + progresso),
   nao mais o catalogo inteiro do sistema. Recebe snapshot ja carregado pelo
   AlunoWorkspace.jsx (mesma fonte de dados que Progresso/Conteudos usam),
   em vez de fazer sua propria chamada GET /Cursos. */
export default function HomeScreen({ onAbrirAba, onAbrirNotificacoes, onAbrirPerfil, onLogout, snapshot, usuario }) {
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!onAbrirNotificacoes) {
      return;
    }

    let ignore = false;

    // Falha aqui e silenciosa de proposito (mesmo criterio do web): o badge
    // de notificacao nao e critico o suficiente pra interromper a tela.
    apiRequest("/Notificacoes/nao-lidas/contagem")
      .then((resposta) => {
        if (!ignore) {
          setNotificacoesNaoLidas(resposta?.total || 0);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so verifica presenca do prop no mount, nao precisa refazer a busca se a referencia mudar
  }, []);

  const cursoPorId = new Map(snapshot.cursos.map((curso) => [curso.id, curso]));
  const progressosPorCurso = [...(snapshot.progressos.cursos || [])].sort((a, b) => {
    const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
    const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
    return tituloA.localeCompare(tituloB);
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.saudacao}>Ola, {usuario.nome}</Text>
          <Text style={styles.perfil}>{usuario.tipoUsuario}</Text>
        </View>
        <View style={styles.acoesCabecalho}>
          {onAbrirNotificacoes ? (
            <TouchableOpacity onPress={onAbrirNotificacoes} style={styles.notificacoesBotao}>
              <Text style={styles.perfilLink}>Notificacoes</Text>
              {notificacoesNaoLidas > 0 ? (
                <View style={styles.notificacoesBadge}>
                  <Text style={styles.notificacoesBadgeTexto}>{notificacoesNaoLidas > 9 ? "9+" : notificacoesNaoLidas}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {onAbrirPerfil ? (
            <TouchableOpacity onPress={onAbrirPerfil}>
              <Text style={styles.perfilLink}>Perfil</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.sair}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.tituloSecao}>Meus cursos</Text>

      {progressosPorCurso.length === 0 ? (
        <Text style={styles.vazio}>
          Voce ainda nao esta matriculado em nenhum curso. Va em Matriculas para explorar o catalogo.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listaConteudo} style={styles.lista}>
          {progressosPorCurso.map((progresso) => {
            const curso = cursoPorId.get(progresso.cursoId);
            const percentual = Math.max(0, Math.min(Number(progresso.percentualConclusao) || 0, 100));

            return (
              <TouchableOpacity
                disabled={!onAbrirAba}
                key={progresso.id}
                onPress={() => onAbrirAba?.("conteudos")}
                style={styles.cartao}
              >
                <Text style={styles.cartaoTitulo}>{curso?.titulo || `Curso #${progresso.cursoId}`}</Text>
                <View style={styles.barraFundo}>
                  <View style={[styles.barraPreenchida, { width: `${percentual}%` }]} />
                </View>
                <Text style={styles.cartaoMeta}>
                  {formatPercent(percentual)} concluido - {progresso.modulosConcluidos}/{progresso.totalModulos} modulo(s)
                </Text>
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
    paddingHorizontal: 20
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  saudacao: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: "700"
  },
  perfil: {
    color: cores.textoSuave,
    marginTop: 2
  },
  acoesCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  perfilLink: {
    color: cores.textoSuave,
    fontWeight: "600"
  },
  notificacoesBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  notificacoesBadge: {
    backgroundColor: cores.erro,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  notificacoesBadgeTexto: {
    color: cores.texto,
    fontSize: 9,
    fontWeight: "700"
  },
  sair: {
    color: cores.erro,
    fontWeight: "600"
  },
  tituloSecao: {
    color: cores.texto,
    fontSize: 16,
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
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: cores.destaque
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
    fontSize: 12
  },
  vazio: {
    color: cores.textoSuave,
    textAlign: "center",
    marginTop: 24
  }
});
