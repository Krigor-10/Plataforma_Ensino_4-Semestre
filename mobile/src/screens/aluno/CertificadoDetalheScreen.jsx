import { useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import EstadoVazio from "../../components/EstadoVazio.jsx";
import Toast from "../../components/Toast.jsx";
import { deveMostrarNotaCertificado } from "../../lib/certificados.js";
import { WEB_BASE_URL } from "../../lib/config.js";
import { formatDate, formatGrade } from "../../lib/format.js";
import { hapticSucesso } from "../../lib/haptics.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";

/* Tela de pilha aberta por "Ver certificado" na aba Certificados (docs/
   certificados-mobile/PROMPT-agente-certificados-mobile.md, item 10) - o
   certificado inteiro recebido por `route.params.certificado` (o mesmo
   objeto de GET /Certificados/meus), sem chamada de API propria. Registrada
   em AlunoWorkspace.jsx com CabecalhoSimples (seta + "Certificado"). */
export default function CertificadoDetalheScreen() {
  const route = useRoute();
  const certificado = route.params?.certificado;
  const [linkCopiado, setLinkCopiado] = useState(false);

  if (!certificado) {
    return (
      <View style={estilos.container}>
        <EstadoVazio icone="alert-circle-outline" mensagem="Certificado não encontrado." />
      </View>
    );
  }

  const linkVerificacao = `${WEB_BASE_URL}/verificar/${certificado.codigoVerificacao}`;
  const mostrarNota = deveMostrarNotaCertificado(certificado.notaFinal);

  function compartilhar() {
    Share.share({
      message:
        `Certificado de conclusao — ${certificado.cursoTitulo}\n` +
        `${certificado.alunoNome} — nota final ${formatGrade(certificado.notaFinal)} de 10,0\n` +
        `Codigo de verificacao: ${certificado.codigoVerificacao}\n` +
        `${linkVerificacao}`
    }).catch(() => {});
  }

  async function copiarLink() {
    await Clipboard.setStringAsync(linkVerificacao);
    hapticSucesso();
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  return (
    <ScrollView contentContainerStyle={estilos.container}>
      <View style={estilos.cartaoCertificado}>
        <Text style={estilos.certificadoMarca}>CODERYSE ACADEMY · OFICIAL</Text>
        <Text style={estilos.certificadoEyebrow}>CERTIFICADO DE CONCLUSÃO</Text>
        <Text style={estilos.certificadoIntro}>Outorgado a</Text>
        <Text style={estilos.certificadoNome}>{certificado.alunoNome}</Text>
        <Text style={estilos.certificadoTexto}>
          pela conclusão com êxito de <Text style={estilos.certificadoDestaque}>{certificado.cursoTitulo}</Text>
          {certificado.turmaNome ? ` na turma ${certificado.turmaNome}` : ""}
          {mostrarNota ? `, com nota final ${formatGrade(certificado.notaFinal)} de 10,0.` : "."}
        </Text>

        <View style={estilos.certificadoDivisor} />

        <View style={estilos.certificadoInfoLinha}>
          <View style={estilos.certificadoInfoItem}>
            <Text style={estilos.certificadoInfoRotulo}>Emitido em</Text>
            <Text style={estilos.certificadoInfoValor}>{formatDate(certificado.emitidoEm)}</Text>
          </View>
          <View style={estilos.certificadoInfoItem}>
            <Text style={estilos.certificadoInfoRotulo}>Instituição</Text>
            <Text style={estilos.certificadoInfoValor}>CodeRyse</Text>
          </View>
        </View>
      </View>

      <View style={estilos.cartaoVerificacao}>
        <Text style={estilos.verificacaoRotulo}>Código de verificação</Text>
        <Text style={estilos.verificacaoCodigo}>{certificado.codigoVerificacao}</Text>
        <Text numberOfLines={1} style={estilos.verificacaoLink}>
          {linkVerificacao}
        </Text>
      </View>

      <Botao icone="share-social-outline" onPress={compartilhar} variante="primario">
        Compartilhar
      </Botao>
      <Botao icone="link-outline" onPress={copiarLink} variante="secundario">
        Copiar link de verificação
      </Botao>
      {linkCopiado ? <Toast mensagem="Link copiado" tipo="sucesso" /> : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: cores.fundo, padding: espacamentos.xl, gap: espacamentos.md },
  cartaoCertificado: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.destaque,
    padding: espacamentos.xl,
    alignItems: "center",
    gap: 6
  },
  certificadoMarca: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5, alignSelf: "flex-start" },
  certificadoEyebrow: { color: cores.destaque, fontWeight: "800", fontSize: tipografia.rotulo, letterSpacing: 1, marginTop: espacamentos.sm },
  certificadoIntro: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: espacamentos.sm },
  certificadoNome: { color: cores.texto, fontWeight: "800", fontSize: tipografia.destaque, textAlign: "center" },
  certificadoTexto: { color: cores.textoRotulo, fontSize: tipografia.corpo, textAlign: "center", lineHeight: 19, marginTop: 4 },
  certificadoDestaque: { color: cores.texto, fontWeight: "700" },
  certificadoDivisor: { height: 1, backgroundColor: cores.divisoria, alignSelf: "stretch", marginVertical: espacamentos.md },
  certificadoInfoLinha: { flexDirection: "row", gap: espacamentos.xl, alignSelf: "stretch", justifyContent: "center" },
  certificadoInfoItem: { alignItems: "center" },
  certificadoInfoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  certificadoInfoValor: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, marginTop: 2 },
  cartaoVerificacao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: 4
  },
  verificacaoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  verificacaoCodigo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, letterSpacing: 1 },
  verificacaoLink: { color: cores.destaque, fontSize: tipografia.rotulo }
});
