import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";

export default function NotificacoesScreen({ onNotificacoesAtualizadas, onSessionExpired, onVoltar }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    apiRequest("/Notificacoes")
      .then((resposta) => {
        if (ativo) {
          setNotificacoes(resposta || []);
        }
      })
      .catch((err) => {
        if (!ativo) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }
        setErro(err.message || "Nao foi possivel carregar suas notificacoes agora.");
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const naoLidas = notificacoes.filter((item) => !item.lida).length;

  async function marcarComoLida(notificacao) {
    if (notificacao.lida) {
      return;
    }

    setNotificacoes((atuais) => atuais.map((item) => (item.id === notificacao.id ? { ...item, lida: true } : item)));
    onNotificacoesAtualizadas?.();

    try {
      await apiRequest(`/Notificacoes/${notificacao.id}/lida`, { method: "PUT" });
    } catch {
      // ignora falha silenciosamente; proxima abertura da tela resincroniza
    }
  }

  async function marcarTodasComoLidas() {
    setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida: true })));
    onNotificacoesAtualizadas?.();

    try {
      await apiRequest("/Notificacoes/lidas", { method: "PUT" });
    } catch {
      // ignora falha silenciosamente; proxima abertura da tela resincroniza
    }
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.cabecalho}>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={estilos.voltarTexto}>{"< Voltar"}</Text>
        </TouchableOpacity>
        {naoLidas > 0 ? (
          <TouchableOpacity onPress={marcarTodasComoLidas}>
            <Text style={estilos.marcarTodasTexto}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={estilos.titulo}>Notificacoes</Text>

      {carregando ? (
        <ActivityIndicator color={cores.destaque} style={{ marginTop: 40 }} />
      ) : erro ? (
        <Text style={estilos.erro}>{erro}</Text>
      ) : notificacoes.length === 0 ? (
        <Text style={estilos.vazio}>Nenhuma notificacao por aqui.</Text>
      ) : (
        <ScrollView contentContainerStyle={estilos.corpo}>
          {notificacoes.map((notificacao) => (
            <TouchableOpacity
              key={notificacao.id}
              onPress={() => marcarComoLida(notificacao)}
              style={[estilos.cartao, !notificacao.lida ? estilos.cartaoNaoLido : null]}
            >
              <Text style={estilos.cartaoTitulo}>{notificacao.titulo}</Text>
              <Text style={estilos.cartaoMensagem}>{notificacao.mensagem}</Text>
              <Text style={estilos.cartaoData}>{formatDate(notificacao.criadoEm)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo, padding: 20 },
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  voltarTexto: { color: cores.destaque, fontWeight: "600" },
  marcarTodasTexto: { color: cores.textoSuave, fontSize: 12, fontWeight: "600" },
  titulo: { color: cores.texto, fontWeight: "700", fontSize: 20, marginBottom: 16 },
  corpo: { gap: 10, paddingBottom: 30 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: "transparent" },
  cartaoNaoLido: { borderLeftColor: cores.destaque },
  cartaoTitulo: { color: cores.texto, fontWeight: "700", fontSize: 14 },
  cartaoMensagem: { color: cores.textoRotulo, fontSize: 13, marginTop: 4 },
  cartaoData: { color: cores.textoSuave, fontSize: 11, marginTop: 6 },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 60 },
  erro: { color: cores.erro, textAlign: "center", marginTop: 40 }
});
