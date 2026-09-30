import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatCep, obterIniciais, onlyDigits } from "../../lib/format.js";
import { cores, espacamentos, raios } from "../../lib/theme.js";

function estadoFormularioInicial(usuario) {
  return {
    nome: usuario?.nome || "",
    email: usuario?.email || "",
    telefone: usuario?.telefone || "",
    cep: usuario?.cep || "",
    rua: usuario?.rua || "",
    numero: usuario?.numero || "",
    bairro: usuario?.bairro || "",
    cidade: usuario?.cidade || "",
    estado: usuario?.estado || ""
  };
}

const SENHA_INICIAL = { senhaAtual: "", novaSenha: "", confirmarNovaSenha: "" };

export default function PerfilScreen({ onLogout, onSessionExpired, onUsuarioAtualizado, onVoltar, usuario }) {
  const [dados, setDados] = useState(() => estadoFormularioInicial(usuario));
  const [mensagemPerfil, setMensagemPerfil] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [senha, setSenha] = useState(SENHA_INICIAL);
  const [mensagemSenha, setMensagemSenha] = useState(null);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  useEffect(() => {
    let ativo = true;

    apiRequest("/Usuarios/me")
      .then((perfilCompleto) => {
        if (ativo) {
          setDados(estadoFormularioInicial(perfilCompleto));
        }
      })
      .catch((err) => {
        if (ativo && err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizarCampo(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarPerfil() {
    const obrigatorios = ["nome", "email", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado"];
    const campoVazio = obrigatorios.find((campo) => !String(dados[campo] || "").trim());

    if (campoVazio) {
      setMensagemPerfil({ tipo: "erro", texto: "Preencha todos os campos para salvar seu perfil." });
      return;
    }

    if (onlyDigits(dados.cep).length !== 8) {
      setMensagemPerfil({ tipo: "erro", texto: "Informe um CEP com 8 digitos." });
      return;
    }

    if (dados.estado.trim().length !== 2) {
      setMensagemPerfil({ tipo: "erro", texto: "Informe a UF com 2 letras." });
      return;
    }

    setSalvandoPerfil(true);
    setMensagemPerfil(null);

    try {
      const usuarioAtualizado = await apiRequest("/Usuarios/me", {
        method: "PUT",
        body: JSON.stringify({
          nome: dados.nome.trim(),
          email: dados.email.trim(),
          telefone: dados.telefone.trim(),
          cep: formatCep(onlyDigits(dados.cep)),
          rua: dados.rua.trim(),
          numero: dados.numero.trim(),
          bairro: dados.bairro.trim(),
          cidade: dados.cidade.trim(),
          estado: dados.estado.trim().toUpperCase()
        })
      });

      onUsuarioAtualizado?.(usuarioAtualizado);
      setMensagemPerfil({ tipo: "sucesso", texto: "Perfil atualizado com sucesso." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagemPerfil({ tipo: "erro", texto: err.message || "Nao foi possivel salvar seu perfil agora." });
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function salvarSenha() {
    if (senha.novaSenha.length < 6) {
      setMensagemSenha({ tipo: "erro", texto: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    if (senha.novaSenha !== senha.confirmarNovaSenha) {
      setMensagemSenha({ tipo: "erro", texto: "As senhas nao coincidem." });
      return;
    }

    setSalvandoSenha(true);
    setMensagemSenha(null);

    try {
      await apiRequest("/Usuarios/me/senha", {
        method: "PUT",
        body: JSON.stringify({ senhaAtual: senha.senhaAtual, novaSenha: senha.novaSenha })
      });

      setSenha(SENHA_INICIAL);
      setMensagemSenha({ tipo: "sucesso", texto: "Senha atualizada com sucesso." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagemSenha({ tipo: "erro", texto: err.message || "Nao foi possivel atualizar sua senha agora." });
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.corpo} style={estilos.container}>
      <TouchableOpacity onPress={onVoltar} style={estilos.voltar}>
        <Ionicons color={cores.destaque} name="chevron-back" size={18} />
        <Text style={estilos.voltarTexto}>Voltar</Text>
      </TouchableOpacity>

      <View style={estilos.identidadeCartao}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
        </View>
        <Text numberOfLines={1} style={estilos.identidadeNome}>{usuario?.nome}</Text>
        <Text style={estilos.identidadePapel}>{usuario?.tipoUsuario}</Text>
      </View>

      <Text style={estilos.tituloSecao}>Editar dados</Text>
      <View style={estilos.cartao}>
        <Campo label="Nome completo" onChangeText={(v) => atualizarCampo("nome", v)} value={dados.nome} />
        <Campo autoCapitalize="none" keyboardType="email-address" label="E-mail" onChangeText={(v) => atualizarCampo("email", v)} value={dados.email} />
        <Campo keyboardType="phone-pad" label="Telefone" onChangeText={(v) => atualizarCampo("telefone", v)} placeholder="(11) 99999-9999" value={dados.telefone} />
        <Campo keyboardType="numeric" label="CEP" onChangeText={(v) => atualizarCampo("cep", v)} placeholder="00000-000" value={dados.cep} />
        <Campo label="Rua" onChangeText={(v) => atualizarCampo("rua", v)} value={dados.rua} />
        <Campo label="Numero" onChangeText={(v) => atualizarCampo("numero", v)} value={dados.numero} />
        <Campo label="Bairro" onChangeText={(v) => atualizarCampo("bairro", v)} value={dados.bairro} />
        <Campo label="Cidade" onChangeText={(v) => atualizarCampo("cidade", v)} value={dados.cidade} />
        <Campo autoCapitalize="characters" label="UF" maxLength={2} onChangeText={(v) => atualizarCampo("estado", v)} placeholder="SP" value={dados.estado} />

        <Toast mensagem={mensagemPerfil?.texto} onFechar={() => setMensagemPerfil(null)} tipo={mensagemPerfil?.tipo} />

        <TouchableOpacity disabled={salvandoPerfil} onPress={salvarPerfil} style={estilos.botaoPrimario}>
          {salvandoPerfil ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Salvar alteracoes</Text>}
        </TouchableOpacity>
      </View>

      <Text style={estilos.tituloSecao}>Trocar senha</Text>
      <View style={estilos.cartao}>
        <Campo label="Senha atual" onChangeText={(v) => setSenha((atual) => ({ ...atual, senhaAtual: v }))} secureTextEntry value={senha.senhaAtual} />
        <Campo label="Nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, novaSenha: v }))} secureTextEntry value={senha.novaSenha} />
        <Campo label="Confirmar nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, confirmarNovaSenha: v }))} secureTextEntry value={senha.confirmarNovaSenha} />

        <Toast mensagem={mensagemSenha?.texto} onFechar={() => setMensagemSenha(null)} tipo={mensagemSenha?.tipo} />

        <TouchableOpacity disabled={salvandoSenha} onPress={salvarSenha} style={estilos.botaoPrimario}>
          {salvandoSenha ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Trocar senha</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity accessibilityLabel="Sair da conta" onPress={() => setConfirmandoSaida(true)} style={estilos.botaoSair}>
        <Ionicons color={cores.erro} name="log-out-outline" size={18} />
        <Text style={estilos.botaoSairTexto}>Sair</Text>
      </TouchableOpacity>

      <Modal animationType="fade" onRequestClose={() => setConfirmandoSaida(false)} transparent visible={confirmandoSaida}>
        <View style={estilos.confirmacaoFundo}>
          <View style={estilos.confirmacaoPainel}>
            <Text style={estilos.confirmacaoTitulo}>Sair da conta</Text>
            <Text style={estilos.confirmacaoTexto}>Deseja realmente sair da sua conta?</Text>
            <View style={estilos.confirmacaoAcoes}>
              <TouchableOpacity onPress={() => setConfirmandoSaida(false)} style={estilos.botaoCancelar}>
                <Ionicons color={cores.erro} name="close" size={16} />
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onLogout} style={estilos.botaoConfirmar}>
                <Ionicons color={cores.texto} name="log-out-outline" size={16} />
                <Text style={estilos.botaoConfirmarTexto}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Campo({ label, ...props }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{label}</Text>
      <TextInput placeholderTextColor={cores.textoSuave} style={estilos.entrada} {...props} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: espacamentos.xl, paddingBottom: 40, gap: espacamentos.sm },
  voltar: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, alignSelf: "flex-start", marginBottom: 8, marginLeft: -6 },
  voltarTexto: { color: cores.destaque, fontWeight: "600" },
  identidadeCartao: { alignItems: "center", backgroundColor: cores.fundoCartao, borderRadius: raios.lg, paddingVertical: espacamentos.xl, marginBottom: espacamentos.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: cores.destaque, alignItems: "center", justifyContent: "center", marginBottom: espacamentos.sm },
  avatarTexto: { color: cores.texto, fontSize: 22, fontWeight: "800" },
  identidadeNome: { color: cores.texto, fontSize: 18, fontWeight: "700", maxWidth: "85%", textAlign: "center" },
  identidadePapel: { color: cores.textoSuave, fontSize: 13, marginTop: 2 },
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: 16, marginTop: 12, marginBottom: 8 },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16, gap: 12 },
  campo: { gap: 6 },
  rotulo: { color: cores.textoRotulo, fontSize: 13 },
  entrada: {
    backgroundColor: cores.fundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: cores.texto,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" },
  botaoSair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.erro,
    minHeight: 44
  },
  botaoSairTexto: { color: cores.erro, fontWeight: "700" },
  confirmacaoFundo: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", alignItems: "center", justifyContent: "center", padding: espacamentos.xl },
  confirmacaoPainel: { backgroundColor: cores.fundoCartao, borderRadius: raios.lg, padding: espacamentos.xl, width: "100%", maxWidth: 340, gap: espacamentos.sm },
  confirmacaoTitulo: { color: cores.texto, fontSize: 16, fontWeight: "700" },
  confirmacaoTexto: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  confirmacaoAcoes: { flexDirection: "row", gap: espacamentos.sm, marginTop: espacamentos.sm },
  botaoCancelar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: cores.erro,
    borderRadius: raios.sm,
    paddingVertical: 12,
    minHeight: 44
  },
  botaoCancelarTexto: { color: cores.erro, fontWeight: "700" },
  botaoConfirmar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: cores.sucesso,
    borderRadius: raios.sm,
    paddingVertical: 12,
    minHeight: 44
  },
  botaoConfirmarTexto: { color: cores.texto, fontWeight: "700" }
});
