import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { cores, espacamentos, raios } from "../lib/theme.js";

const ICONE_POR_TIPO = {
  sucesso: "checkmark-circle",
  erro: "close-circle",
  aviso: "alert-circle",
  informativo: "information-circle"
};

const COR_POR_TIPO = {
  sucesso: cores.sucesso,
  erro: cores.erro,
  aviso: cores.aviso,
  informativo: cores.informativo
};

/* Feedback de acao (sucesso/erro/aviso/informativo) reutilizavel — antes cada
   tela escrevia sua propria <Text> de mensagem, e Perfil/Matriculas usavam a
   mesma cor roxa tanto pra sucesso quanto pra erro. Ícone + cor por tipo
   (nunca só cor), auto-some depois de `duracao`. */
export default function Toast({ duracao = 4000, mensagem, onFechar, tipo = "informativo" }) {
  useEffect(() => {
    if (!mensagem) {
      return undefined;
    }
    const temporizador = setTimeout(() => onFechar?.(), duracao);
    return () => clearTimeout(temporizador);
  }, [mensagem, duracao, onFechar]);

  if (!mensagem) {
    return null;
  }

  const cor = COR_POR_TIPO[tipo] || cores.informativo;

  return (
    <View style={[estilos.container, { borderLeftColor: cor }]}>
      <Ionicons color={cor} name={ICONE_POR_TIPO[tipo] || "information-circle"} size={18} />
      <Text style={estilos.texto}>{mensagem}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.sm,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.md,
    borderLeftWidth: 3,
    padding: espacamentos.md
  },
  texto: { color: cores.texto, fontSize: 13, flex: 1 }
});
