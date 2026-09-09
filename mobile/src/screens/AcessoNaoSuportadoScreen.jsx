import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { cores, espacamentos, raios } from "../lib/theme.js";

/* Rede de seguranca pra sessoes de Professor/Coordenador/Admin ja persistidas
   no aparelho antes desta tela existir (o app mobile so implementa o fluxo
   do Aluno — ver LoginScreen.jsx, que agora barra esses perfis no login).
   Sem isso, reabrir o app com uma sessao assim salva quebraria de novo ao
   tentar renderizar uma Home que precisa de dados que esses perfis nao tem. */
export default function AcessoNaoSuportadoScreen({ onLogout, usuario }) {
  return (
    <View style={estilos.container}>
      <Ionicons color={cores.textoSuave} name="phone-portrait-outline" size={40} />
      <Text style={estilos.titulo}>App mobile exclusivo para alunos</Text>
      <Text style={estilos.texto}>
        Ola, {usuario?.nome || "usuario"}. Sua conta e do tipo {usuario?.tipoUsuario || "outro perfil"}, e por enquanto
        o app mobile so oferece a experiencia do Aluno. Acesse pelo navegador (site) pra usar sua conta.
      </Text>
      <TouchableOpacity onPress={onLogout} style={estilos.botao}>
        <Text style={estilos.botaoTexto}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacamentos.xxl,
    gap: espacamentos.md
  },
  titulo: { color: cores.texto, fontSize: 18, fontWeight: "700", textAlign: "center" },
  texto: { color: cores.textoSuave, fontSize: 14, textAlign: "center", lineHeight: 20 },
  botao: {
    marginTop: espacamentos.md,
    borderWidth: 1,
    borderColor: cores.erro,
    borderRadius: raios.md,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minHeight: 44,
    justifyContent: "center"
  },
  botaoTexto: { color: cores.erro, fontWeight: "700" }
});
