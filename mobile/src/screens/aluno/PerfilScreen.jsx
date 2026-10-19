import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import ModalCentralizado from "../../components/ModalCentralizado.jsx";
import ModalConfirmarSaida from "../../components/ModalConfirmarSaida.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatCep, obterIniciais, onlyDigits } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";

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
  // `rascunhoPerfil` null = tela em modo leitura (padrao); objeto = modal de
  // edicao aberto, editando uma COPIA de `dados` (nao os dados persistidos
  // direto) — assim "Cancelar"/fechar o modal so descarta o rascunho, sem
  // nenhuma chance de deixar a tela de leitura com valor editado e nao salvo.
  const [rascunhoPerfil, setRascunhoPerfil] = useState(null);

  const [senha, setSenha] = useState(SENHA_INICIAL);
  const [mensagemSenha, setMensagemSenha] = useState(null);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  // Seção 3 (Segurança da conta): os 3 campos de senha ficam escondidos por
  // padrão atrás deste toggle — só aparecem quando o usuário efetivamente
  // entra no fluxo de troca, em vez de ocupar espaço permanentemente na tela.
  const [alterandoSenha, setAlterandoSenha] = useState(false);

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

  function atualizarCampoRascunho(campo, valor) {
    setRascunhoPerfil((atual) => ({ ...atual, [campo]: valor }));
  }

  function abrirEdicaoPerfil() {
    setMensagemPerfil(null);
    setRascunhoPerfil(dados);
  }

  function fecharEdicaoPerfil() {
    if (salvandoPerfil) {
      return;
    }
    setMensagemPerfil(null);
    setRascunhoPerfil(null);
  }

  async function salvarPerfil() {
    const obrigatorios = ["nome", "email", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado"];
    const campoVazio = obrigatorios.find((campo) => !String(rascunhoPerfil[campo] || "").trim());

    if (campoVazio) {
      setMensagemPerfil({ tipo: "erro", texto: "Preencha todos os campos para salvar seu perfil." });
      return;
    }

    if (onlyDigits(rascunhoPerfil.cep).length !== 8) {
      setMensagemPerfil({ tipo: "erro", texto: "Informe um CEP com 8 dígitos." });
      return;
    }

    if (rascunhoPerfil.estado.trim().length !== 2) {
      setMensagemPerfil({ tipo: "erro", texto: "Informe a UF com 2 letras." });
      return;
    }

    setSalvandoPerfil(true);
    setMensagemPerfil(null);

    try {
      const usuarioAtualizado = await apiRequest("/Usuarios/me", {
        method: "PUT",
        body: JSON.stringify({
          nome: rascunhoPerfil.nome.trim(),
          email: rascunhoPerfil.email.trim(),
          telefone: rascunhoPerfil.telefone.trim(),
          cep: formatCep(onlyDigits(rascunhoPerfil.cep)),
          rua: rascunhoPerfil.rua.trim(),
          numero: rascunhoPerfil.numero.trim(),
          bairro: rascunhoPerfil.bairro.trim(),
          cidade: rascunhoPerfil.cidade.trim(),
          estado: rascunhoPerfil.estado.trim().toUpperCase()
        })
      });

      onUsuarioAtualizado?.(usuarioAtualizado);
      setDados(estadoFormularioInicial(usuarioAtualizado));
      setRascunhoPerfil(null);
      setMensagemPerfil({ tipo: "sucesso", texto: "Perfil atualizado com sucesso." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setMensagemPerfil({ tipo: "erro", texto: err.message || "Não foi possível salvar seu perfil agora." });
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
      setMensagemSenha({ tipo: "erro", texto: "As senhas não coincidem." });
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
      setMensagemSenha({ tipo: "erro", texto: err.message || "Não foi possível atualizar sua senha agora." });
    } finally {
      setSalvandoSenha(false);
    }
  }

  function cancelarAlteracaoSenha() {
    setSenha(SENHA_INICIAL);
    setMensagemSenha(null);
    setAlterandoSenha(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.container}>
    <ScrollView contentContainerStyle={estilos.corpo}>
      <BotaoVoltar onPress={onVoltar} style={estilos.voltar} />

      <View style={estilos.identidadeCartao}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
        </View>
        <Text numberOfLines={1} style={estilos.identidadeNome}>{usuario?.nome}</Text>
        <Text style={estilos.identidadePapel}>{usuario?.tipoUsuario}</Text>
        <Text numberOfLines={1} style={estilos.identidadeEmail}>{usuario?.email}</Text>
      </View>

      <View style={estilos.tituloSecaoLinha}>
        <Text style={estilos.tituloSecao}>Dados pessoais</Text>
        <TouchableOpacity
          accessibilityHint="Abre o modal de edição dos seus dados pessoais"
          accessibilityLabel="Editar dados pessoais"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={abrirEdicaoPerfil}
          style={estilos.botaoEditar}
        >
          <Ionicons color={cores.destaque} name="pencil" size={18} />
        </TouchableOpacity>
      </View>
      <View style={estilos.cartao}>
        <CampoLeitura label="Nome completo" valor={dados.nome} />
        <CampoLeitura label="E-mail" valor={dados.email} />
        <CampoLeitura label="Telefone" valor={dados.telefone} />
        <CampoLeitura label="CEP" valor={dados.cep} />
        <CampoLeitura label="Rua" valor={dados.rua} />
        <CampoLeitura label="Numero" valor={dados.numero} />
        <CampoLeitura label="Bairro" valor={dados.bairro} />
        <CampoLeitura label="Cidade" valor={dados.cidade} />
        <CampoLeitura label="UF" valor={dados.estado} />

        <Toast mensagem={mensagemPerfil?.texto} onFechar={() => setMensagemPerfil(null)} tipo={mensagemPerfil?.tipo} />
      </View>

      <ModalCentralizado
        onFechar={fecharEdicaoPerfil}
        titulo="Editar dados pessoais"
        visivel={Boolean(rascunhoPerfil)}
        rodape={
          <View style={estilos.acoesEdicaoPerfil}>
            <Botao disabled={salvandoPerfil} onPress={fecharEdicaoPerfil} style={estilos.acoesEdicaoPerfilBotao} variante="fantasma">
              Cancelar
            </Botao>
            <Botao carregando={salvandoPerfil} onPress={salvarPerfil} style={estilos.acoesEdicaoPerfilBotao} variante="primario">
              Salvar alterações
            </Botao>
          </View>
        }
      >
        <Campo label="Nome completo" onChangeText={(v) => atualizarCampoRascunho("nome", v)} value={rascunhoPerfil?.nome || ""} />
        <Campo autoCapitalize="none" keyboardType="email-address" label="E-mail" onChangeText={(v) => atualizarCampoRascunho("email", v)} value={rascunhoPerfil?.email || ""} />
        <Campo keyboardType="phone-pad" label="Telefone" onChangeText={(v) => atualizarCampoRascunho("telefone", v)} placeholder="(11) 99999-9999" value={rascunhoPerfil?.telefone || ""} />
        <Campo keyboardType="numeric" label="CEP" onChangeText={(v) => atualizarCampoRascunho("cep", v)} placeholder="00000-000" value={rascunhoPerfil?.cep || ""} />
        <Campo label="Rua" onChangeText={(v) => atualizarCampoRascunho("rua", v)} value={rascunhoPerfil?.rua || ""} />
        <Campo label="Numero" onChangeText={(v) => atualizarCampoRascunho("numero", v)} value={rascunhoPerfil?.numero || ""} />
        <Campo label="Bairro" onChangeText={(v) => atualizarCampoRascunho("bairro", v)} value={rascunhoPerfil?.bairro || ""} />
        <Campo label="Cidade" onChangeText={(v) => atualizarCampoRascunho("cidade", v)} value={rascunhoPerfil?.cidade || ""} />
        <Campo autoCapitalize="characters" label="UF" maxLength={2} onChangeText={(v) => atualizarCampoRascunho("estado", v)} placeholder="SP" value={rascunhoPerfil?.estado || ""} />

        <Toast mensagem={mensagemPerfil?.texto} onFechar={() => setMensagemPerfil(null)} tipo={mensagemPerfil?.tipo} />
      </ModalCentralizado>

      <Text style={estilos.tituloSecao}>Segurança da conta</Text>
      <View style={estilos.cartao}>
        {!alterandoSenha ? (
          <TouchableOpacity
            accessibilityHint="Mostra os campos para trocar sua senha"
            accessibilityLabel="Alterar senha"
            accessibilityRole="button"
            onPress={() => setAlterandoSenha(true)}
            style={estilos.linhaAlterarSenha}
          >
            <View style={estilos.linhaAlterarSenhaIcone}>
              <Ionicons color={cores.destaque} name="lock-closed-outline" size={18} />
            </View>
            <Text style={estilos.linhaAlterarSenhaTexto}>Alterar senha</Text>
            <Ionicons color={cores.textoSuave} name="chevron-forward" size={18} />
          </TouchableOpacity>
        ) : (
          <>
            <Campo label="Senha atual" onChangeText={(v) => setSenha((atual) => ({ ...atual, senhaAtual: v }))} secureTextEntry value={senha.senhaAtual} />
            <Campo label="Nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, novaSenha: v }))} secureTextEntry value={senha.novaSenha} />
            <Campo label="Confirmar nova senha" onChangeText={(v) => setSenha((atual) => ({ ...atual, confirmarNovaSenha: v }))} secureTextEntry value={senha.confirmarNovaSenha} />

            <Toast mensagem={mensagemSenha?.texto} onFechar={() => setMensagemSenha(null)} tipo={mensagemSenha?.tipo} />

            <View style={estilos.acoesSenha}>
              <Botao disabled={salvandoSenha} onPress={cancelarAlteracaoSenha} style={estilos.acoesSenhaBotao} variante="fantasma">
                Cancelar
              </Botao>
              <Botao carregando={salvandoSenha} onPress={salvarSenha} style={estilos.acoesSenhaBotao} variante="primario">
                Trocar senha
              </Botao>
            </View>
          </>
        )}
      </View>

      <Botao accessibilityLabel="Sair da conta" icone="log-out-outline" onPress={() => setConfirmandoSaida(true)} style={estilos.botaoSair} variante="perigo">
        Sair
      </Botao>

      <ModalConfirmarSaida onCancelar={() => setConfirmandoSaida(false)} onConfirmar={onLogout} visivel={confirmandoSaida} />
    </ScrollView>
    </KeyboardAvoidingView>
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

// Mesma estrutura rotulo+valor do Campo (TextInput), so que so leitura — a
// tela de Perfil abre sempre nesse modo, pra nao editar nada por acidente;
// o modal de edicao (ModalCentralizado) e que usa o Campo editavel de verdade.
function CampoLeitura({ label, valor }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{label}</Text>
      <Text numberOfLines={1} style={estilos.valorLeitura}>{valor || "—"}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: espacamentos.xl, paddingBottom: 40, gap: espacamentos.sm },
  voltar: { alignSelf: "flex-start", marginBottom: 8 },
  identidadeCartao: { alignItems: "center", backgroundColor: cores.fundoCartao, borderRadius: raios.lg, paddingVertical: espacamentos.xl, marginBottom: espacamentos.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: cores.destaque, alignItems: "center", justifyContent: "center", marginBottom: espacamentos.sm },
  avatarTexto: { color: cores.texto, fontSize: 22, fontWeight: "800" },
  identidadeNome: { color: cores.texto, fontSize: tipografia.titulo, fontWeight: "700", maxWidth: "85%", textAlign: "center" },
  identidadePapel: { color: cores.textoSuave, fontSize: tipografia.corpo, marginTop: 2 },
  identidadeEmail: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: 4, maxWidth: "85%" },
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo, marginTop: 12, marginBottom: 8 },
  // Linha com o titulo da secao + icone de lapis alinhado a direita — mesmo
  // `tituloSecao` de base, so vira uma row quando precisa do botao de editar
  // (Dados pessoais); Segurança da conta nao tem acao no titulo, continua
  // usando `tituloSecao` sozinho.
  tituloSecaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 8 },
  botaoEditar: { minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16, gap: 12 },
  campo: { gap: 6 },
  rotulo: { color: cores.textoRotulo, fontSize: tipografia.corpo },
  entrada: {
    backgroundColor: cores.fundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: cores.texto,
    borderWidth: 1,
    borderColor: cores.bordaCartao
  },
  // Mesmo "slot" visual do `entrada` (TextInput), sem a borda/fundo de campo
  // ativo — reforca que a tela de Perfil, no modo leitura, nao e um
  // formulario editavel.
  valorLeitura: { color: cores.texto, fontSize: tipografia.corpo, paddingVertical: 10 },
  acoesEdicaoPerfil: { flexDirection: "row", gap: espacamentos.sm },
  acoesEdicaoPerfilBotao: { flex: 1 },
  linhaAlterarSenha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, minHeight: 44 },
  linhaAlterarSenhaIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  linhaAlterarSenhaTexto: { flex: 1, color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  acoesSenha: { flexDirection: "row", gap: espacamentos.sm, marginTop: 4 },
  acoesSenhaBotao: { flex: 1 },
  botaoSair: { marginTop: 28 }
});
