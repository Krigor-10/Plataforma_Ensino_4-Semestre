import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { cores, espacamentos, raios } from "../lib/theme.js";

/* Skeleton loading (docs/redesign-mobile/PENDENTE-segunda-23-11-auditoria-
   ux-ui-mobile.md, Fase 2) - retangulo com "respiracao" de opacidade via
   Reanimated (ja instalado, sem lib nova), no lugar do ActivityIndicator
   generico centralizado que cada tela usava enquanto o snapshot carrega.
   Com reducao de movimento ativada no aparelho, fica parado na opacidade
   media em vez de animar. */
export function Skeleton({ height = 16, radius = raios.sm, style, width = "100%" }) {
  const reduzMovimento = useReducedMotion();
  const opacidade = useSharedValue(reduzMovimento ? 0.65 : 0.4);

  useEffect(() => {
    if (reduzMovimento) {
      return;
    }
    opacidade.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so deve reiniciar se reduzMovimento mudar, nao a cada render.
  }, [reduzMovimento]);

  const estiloAnimado = useAnimatedStyle(() => ({ opacity: opacidade.value }));

  return <Animated.View style={[estilos.base, { borderRadius: radius, height, width }, estiloAnimado, style]} />;
}

/* Composicao pronta pro card "Continue sua trilha" + "Acesso rapido" da
   Home (HomeScreen.jsx) - usada so no carregamento inicial do app inteiro
   (AlunoTabsNavigator.jsx), que e o loading mais visivel de todos (tela
   em branco com spinner centralizado ate agora). */
export function SkeletonInicio() {
  return (
    <View style={estilos.container}>
      <Skeleton height={22} style={{ marginBottom: espacamentos.xs }} width="60%" />
      <Skeleton height={14} style={{ marginBottom: espacamentos.xl }} width="40%" />

      <View style={estilos.cartaoContinuar}>
        <View style={estilos.continuarTopo}>
          <View style={{ flex: 1, gap: espacamentos.sm }}>
            <Skeleton height={18} width="80%" />
            <Skeleton height={13} width="50%" />
          </View>
          <Skeleton height={56} radius={28} width={56} />
        </View>
        <Skeleton height={44} radius={raios.md} style={{ marginTop: espacamentos.lg }} />
      </View>

      <Skeleton height={16} style={{ marginBottom: espacamentos.md }} width="35%" />
      <View style={estilos.grade}>
        <Skeleton height={76} radius={raios.lg} style={estilos.gradeItem} />
        <Skeleton height={76} radius={raios.lg} style={estilos.gradeItem} />
        <Skeleton height={76} radius={raios.lg} style={estilos.gradeItem} />
        <Skeleton height={76} radius={raios.lg} style={estilos.gradeItem} />
      </View>
    </View>
  );
}

/* Composicao pronta pra aba Certificados (CertificadosScreen.jsx) - 2
   cartoes de estatistica + 1 cartao de certificado, no formato real da
   tela em vez de um spinner solto. */
export function SkeletonCertificados() {
  return (
    <View style={estilos.container}>
      <View style={estilos.statsLinha}>
        <Skeleton height={64} radius={raios.lg} style={{ flex: 1 }} />
        <Skeleton height={64} radius={raios.lg} style={{ flex: 1 }} />
      </View>
      <Skeleton height={16} style={{ marginTop: espacamentos.sm, marginBottom: espacamentos.sm }} width="40%" />
      <Skeleton height={96} radius={raios.lg} style={{ marginBottom: espacamentos.md }} />
      <Skeleton height={96} radius={raios.lg} />
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { backgroundColor: cores.fundoCartao },
  container: { padding: espacamentos.xl },
  cartaoContinuar: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    marginBottom: espacamentos.xl
  },
  continuarTopo: { flexDirection: "row", alignItems: "center", gap: espacamentos.md },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: espacamentos.sm },
  gradeItem: { flexBasis: "47%", flexGrow: 1 },
  statsLinha: { flexDirection: "row", gap: espacamentos.sm, marginBottom: espacamentos.md }
});
