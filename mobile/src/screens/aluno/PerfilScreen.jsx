import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatCep, onlyDigits } from "../../lib/format.js";
import { cores } from "../../lib/theme.js";

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

export default function PerfilScreen({ onSessionExpired, onUsuarioAtualizado, onVoltar, usuario }) {
  const [dados, setDados] = useState(() => estadoFormularioInicial(usuario));
  const [mensagemPerfil, setMensagemPerfil] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [senha, setSenha] = useState(SENHA_INICIAL);
  const [mensagemSenha, setMensagemSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

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
      setMensagemPerfil("Preencha todos os campos para salvar seu perfil.");
      return;
    }

    if (onlyDigits(dados.cep).length !== 8) {
      setMensagemPerfil("Informe um CEP com 8 digitos.");
      return;
    }

    if (dados.estado.trim().length !== 2) {
      setMensagemPerfil("Informe a UF com 2 letras.");
      return;
    }

    setSalvandoPerfil(true);
    setMensagemPerfil("");

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
      setMensagemPerfil("Perfil atualizado com sucesso.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagemPerfil(err.message || "Nao foi possivel salvar seu perfil agora.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function salvarSenha() {
    if (senha.novaSenha.length < 6) {
      setMensagemSenha("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha.novaSenha !== senha.confirmarNovaSenha) {
      setMensagemSenha("As senhas nao coincidem.");
      return;
    }

    setSalvandoSenha(true);
    setMensagemSenha("");

    try {
      await apiRequest("/Usuarios/me/senha", {
        method: "PUT",
        body: JSON.stringify({ senhaAtual: senha.senhaAtual, novaSenha: senha.novaSenha })
      });

      setSenha(SENHA_INICIAL);
      setMensagemSenha("Senha atualizada com sucesso.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagemSenha(err.message || "Nao foi possivel atualizar sua senha agora.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.corpo} style={estilos.container}>
      <TouchableOpacity onPress={onVoltar} style={estilos.voltar}>
        <Text style={estilos.voltarTexto}>{"< Voltar"}</Text>
      </TouchableOpacity>

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

        {mensagemPerfil ? <Text style={estilos.mensagem}>{mensagemPerfil}</Text> : null}

        <TouchableOpacity disabled={salvandoPerfil} onPress={salvarPerfil} style={estilos.botaoPrimario}>
          {salvandoPerfil ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Salvar alteracoes</Text>}
        </TouchableOpacity>
      </View>

      <Text style={estilos.tituloSecao}>Trocar senha</Text>
      <View style={estilos.cartao}>
        <Campo label="Senha atual" onChangeText={(v) => setSenha((atual) => ({ ...atual, senhaAtual: v }))} secureTextEntry value={senha.senhaAtual} />
        <Campo label="Nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, novaSenha: v }))} secureTextEntry value={senha.novaSenha} />
        <Campo label="Confirmar nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, confirmarNovaSenha: v }))} secureTextEntry value={senha.confirmarNovaSenha} />

        {mensagemSenha ? <Text style={estilos.mensagem}>{mensagemSenha}</Text> : null}

        <TouchableOpacity disabled={salvandoSenha} onPress={salvarSenha} style={estilos.botaoPrimario}>
          {salvandoSenha ? <ActivityIndicator color={cores.texto} /> : <Text style={estilos.botaoPrimarioTexto}>Trocar senha</Text>}
        </TouchableOpacity>
      </View>
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
  corpo: { padding: 20, paddingBottom: 40, gap: 8 },
  voltar: { marginBottom: 8 },
  voltarTexto: { color: cores.destaque, fontWeight: "600" },
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
  mensagem: { color: cores.destaque, fontSize: 13 },
  botaoPrimario: { backgroundColor: cores.destaque, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  botaoPrimarioTexto: { color: cores.texto, fontWeight: "700" }
});
