import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { cores, raios } from "../lib/theme.js";

const COR_TEXTO_POR_VARIANTE = {
  primario: cores.texto,
  secundario: cores.destaque,
  perigo: cores.erro,
  sucesso: cores.texto,
  fantasma: cores.textoSuave
};

/* Botao central do mobile — mesmo vocabulario de variante da Web
   (Botao.jsx: primario/secundario/perigo/sucesso/fantasma), substituindo
   os botaoPrimario/botaoPerigo/botaoFantasma que cada tela reimplementava
   separadamente em seu proprio StyleSheet. */
export default function Botao({
  accessibilityLabel,
  carregando = false,
  children,
  disabled = false,
  icone,
  onPress,
  style,
  textoStyle,
  variante = "primario"
}) {
  const desabilitado = disabled || carregando;
  const corConteudo = COR_TEXTO_POR_VARIANTE[variante] || cores.texto;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      style={[estilos.base, estilos[variante], desabilitado ? estilos.desabilitado : null, style]}
    >
      {carregando ? (
        <ActivityIndicator color={corConteudo} />
      ) : (
        <>
          {icone ? <Ionicons color={corConteudo} name={icone} size={18} /> : null}
          <Text style={[estilos.texto, { color: corConteudo }, textoStyle]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: raios.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44
  },
  texto: { fontWeight: "700" },
  primario: { backgroundColor: cores.destaque },
  secundario: { backgroundColor: "transparent", borderWidth: 1, borderColor: cores.destaque },
  perigo: { backgroundColor: "transparent", borderWidth: 1, borderColor: cores.erro },
  sucesso: { backgroundColor: cores.sucesso },
  fantasma: { backgroundColor: "transparent", paddingHorizontal: 12 },
  desabilitado: { opacity: 0.5 }
});
