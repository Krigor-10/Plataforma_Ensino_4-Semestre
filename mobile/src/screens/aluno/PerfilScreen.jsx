import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Botao from "../../components/Botao.jsx";
import ModalCentralizado from "../../components/ModalCentralizado.jsx";
import ModalConfirmarSaida from "../../components/ModalConfirmarSaida.jsx";
import Toast from "../../components/Toast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";
import { formatCep, formatTelefone, obterIniciais, onlyDigits } from "../../lib/format.js";
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

// Endereco compacto em 2 linhas pro cartao ENDERECO (8_meu_perfil.png):
// "{Rua}, {Numero} — {Bairro}" / "{Cidade} – {UF} · CEP {CEP}". Qualquer
// pedaco faltando some junto com o separador dele (nunca deixa virgula/
// traco sobrando); endereco todo vazio devolve null, pro chamador mostrar
// "Nenhum endereço cadastrado".
function formatarEnderecoCompacto(dados) {
  const ruaNumero = [dados.rua?.trim(), dados.numero?.trim()].filter(Boolean).join(", ");
  const linha1 = [ruaNumero, dados.bairro?.trim()].filter(Boolean).join(" — ");

  const cidadeUf = [dados.cidade?.trim(), dados.estado?.trim()].filter(Boolean).join(" – ");
  const cepFormatado = dados.cep ? formatCep(onlyDigits(dados.cep)) : "";
  const linha2 = [cidadeUf, cepFormatado ? `CEP ${cepFormatado}` : ""].filter(Boolean).join(" · ");

  const linhas = [linha1, linha2].filter(Boolean);
  return linhas.length > 0 ? linhas : null;
}

const SENHA_INICIAL = { senhaAtual: "", novaSenha: "", confirmarNovaSenha: "" };

export default function PerfilScreen({ onLogout, onSessionExpired, onUsuarioAtualizado, usuario }) {
  const [dados, setDados] = useState(() => estadoFormularioInicial(usuario));
  const [mensagemPerfil, setMensagemPerfil] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  // `rascunhoPerfil` null = tela em modo leitura (padrao); objeto = modal de
  // edicao aberto, editando uma COPIA de `dados` (nao os dados persistidos
  // direto) — assim "Cancelar"/fechar o modal so descarta o rascunho, sem
  // nenhuma chance de deixar a tela de leitura com valor editado e nao salvo.
  // Os dois botoes "Editar" (Dados pessoais e Endereco) abrem o MESMO modal,
  // com todos os campos — nao ha modal separado por grupo.
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

  const linhasEndereco = formatarEnderecoCompacto(dados);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={estilos.container}>
    <ScrollView contentContainerStyle={estilos.corpo}>
      <View style={estilos.identidadeCartao}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{obterIniciais(usuario?.nome)}</Text>
        </View>
        <View style={estilos.identidadeTextos}>
          <View style={estilos.identidadeNomeLinha}>
            <Text numberOfLines={1} style={estilos.identidadeNome}>{usuario?.nome}</Text>
            <View style={estilos.identidadePapelPilula}>
              <Text style={estilos.identidadePapelTexto}>{usuario?.tipoUsuario}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={estilos.identidadeEmail}>{usuario?.email}</Text>
        </View>
      </View>

      <TituloSecaoComEditar onEditar={abrirEdicaoPerfil} titulo="Dados pessoais" />
      <View style={estilos.cartao}>
        <CampoLeitura label="Nome completo" valor={dados.nome} />
        <View style={estilos.divisoriaFina} />
        <CampoLeitura label="E-mail" valor={dados.email} />
        <View style={estilos.divisoriaFina} />
        <CampoLeitura label="Telefone" valor={formatTelefone(dados.telefone)} />
      </View>

      <TituloSecaoComEditar onEditar={abrirEdicaoPerfil} titulo="Endereço" />
      <View style={estilos.cartao}>
        <View style={estilos.enderecoLinha}>
          <View style={estilos.enderecoIconeCirculo}>
            <Ionicons color={cores.destaque} name="location-outline" size={18} />
          </View>
          <View style={estilos.enderecoTextos}>
            {linhasEndereco ? (
              linhasEndereco.map((linha, indice) => (
                <Text key={indice} numberOfLines={1} style={indice === 0 ? estilos.enderecoLinhaPrincipal : estilos.enderecoLinhaSecundaria}>
                  {linha}
                </Text>
              ))
            ) : (
              <Text style={estilos.enderecoLinhaSecundaria}>Nenhum endereço cadastrado</Text>
            )}
          </View>
        </View>
      </View>

      <Toast mensagem={mensagemPerfil?.texto} onFechar={() => setMensagemPerfil(null)} tipo={mensagemPerfil?.tipo} />

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
        <Campo label="Número" onChangeText={(v) => atualizarCampoRascunho("numero", v)} value={rascunhoPerfil?.numero || ""} />
        <Campo label="Bairro" onChangeText={(v) => atualizarCampoRascunho("bairro", v)} value={rascunhoPerfil?.bairro || ""} />
        <Campo label="Cidade" onChangeText={(v) => atualizarCampoRascunho("cidade", v)} value={rascunhoPerfil?.cidade || ""} />
        <Campo autoCapitalize="characters" label="UF" maxLength={2} onChangeText={(v) => atualizarCampoRascunho("estado", v)} placeholder="SP" value={rascunhoPerfil?.estado || ""} />

        <Toast mensagem={mensagemPerfil?.texto} onFechar={() => setMensagemPerfil(null)} tipo={mensagemPerfil?.tipo} />
      </ModalCentralizado>

      <Text style={estilos.tituloSecaoRotulo}>Segurança da conta</Text>
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
            <View style={estilos.linhaAlterarSenhaTextos}>
              <Text style={estilos.linhaAlterarSenhaTexto}>Alterar senha</Text>
              <Text style={estilos.linhaAlterarSenhaLegenda}>Troque sua senha de acesso</Text>
            </View>
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

      <Botao
        accessibilityLabel="Sair da conta"
        icone="log-out-outline"
        onPress={() => setConfirmandoSaida(true)}
        style={estilos.botaoSair}
        textoStyle={estilos.botaoSairTexto}
        variante="perigo"
      >
        Sair da conta
      </Botao>

      <ModalConfirmarSaida onCancelar={() => setConfirmandoSaida(false)} onConfirmar={onLogout} visivel={confirmandoSaida} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Titulo de grupo (rotulo pequeno maiusculo) + botao de texto roxo "Editar"
// com lapis — usado por Dados pessoais e Endereco, que abrem o MESMO modal
// de edicao (abrirEdicaoPerfil). Segurança da conta nao tem acao no titulo,
// usa so o `tituloSecaoRotulo` sozinho (ver JSX acima).
function TituloSecaoComEditar({ onEditar, titulo }) {
  return (
    <View style={estilos.tituloSecaoLinha}>
      <Text style={estilos.tituloSecaoRotulo}>{titulo}</Text>
      <TouchableOpacity
        accessibilityHint={`Abre o modal de edição de ${titulo.toLowerCase()}`}
        accessibilityLabel={`Editar ${titulo.toLowerCase()}`}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={onEditar}
        style={estilos.botaoEditar}
      >
        <Ionicons color={cores.destaque} name="pencil" size={14} />
        <Text style={estilos.botaoEditarTexto}>Editar</Text>
      </TouchableOpacity>
    </View>
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
  identidadeCartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamentos.lg,
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    padding: espacamentos.lg,
    marginBottom: espacamentos.sm
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: cores.destaque, alignItems: "center", justifyContent: "center" },
  avatarTexto: { color: cores.texto, fontSize: 26, fontWeight: "800" },
  identidadeTextos: { flex: 1, gap: 4 },
  identidadeNomeLinha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, flexWrap: "wrap" },
  identidadeNome: { color: cores.texto, fontSize: tipografia.destaque, fontWeight: "700", flexShrink: 1 },
  identidadePapelPilula: { borderWidth: 1, borderColor: cores.destaque, borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 2 },
  identidadePapelTexto: { color: cores.destaque, fontSize: tipografia.legenda, fontWeight: "700" },
  identidadeEmail: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  // Rotulo pequeno e maiusculo compartilhado pelos 3 grupos (Dados pessoais,
  // Endereco, Segurança da conta) — mesmo papel do rotulo de secao do
  // redesign web, so que sem o tamanho grande que a tela tinha antes.
  tituloSecaoRotulo: {
    color: cores.textoRotulo,
    fontSize: tipografia.rotulo,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8
  },
  tituloSecaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 8 },
  botaoEditar: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32, paddingHorizontal: 4 },
  botaoEditarTexto: { color: cores.destaque, fontWeight: "600", fontSize: tipografia.rotulo },
  cartao: { backgroundColor: cores.fundoCartao, borderRadius: 12, padding: 16, gap: 12 },
  divisoriaFina: { height: 1, backgroundColor: cores.divisoria },
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
  enderecoLinha: { flexDirection: "row", alignItems: "flex-start", gap: espacamentos.md },
  enderecoIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: raios.md,
    backgroundColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  enderecoTextos: { flex: 1, gap: 2 },
  enderecoLinhaPrincipal: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  enderecoLinhaSecundaria: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  acoesEdicaoPerfil: { flexDirection: "row", gap: espacamentos.sm },
  acoesEdicaoPerfilBotao: { flex: 1 },
  linhaAlterarSenha: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, minHeight: 44 },
  linhaAlterarSenhaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center"
  },
  linhaAlterarSenhaTextos: { flex: 1, gap: 2 },
  linhaAlterarSenhaTexto: { color: cores.texto, fontWeight: "600", fontSize: tipografia.corpo },
  linhaAlterarSenhaLegenda: { color: cores.textoSuave, fontSize: tipografia.legenda },
  acoesSenha: { flexDirection: "row", gap: espacamentos.sm, marginTop: 4 },
  acoesSenhaBotao: { flex: 1 },
  // Contorno vermelho so a ~40% opacidade (nao o `perigo` padrao do Botao,
  // que usa cores.erro solido na borda) — "Sair da conta" fica discreto, so
  // o ultimo item da tela, nao uma acao de igual peso visual as outras.
  botaoSair: { marginTop: 28, borderColor: "rgba(239, 68, 68, 0.4)" },
  botaoSairTexto: { fontWeight: "600" }
});
