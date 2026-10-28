// Paleta do redesign (ver docs/redesign-mobile/PROMPT-agente-mobile.md,
// secao 2) - nomes de chave mantidos de proposito (as telas existentes ja os
// usam), so os valores de fundo/texto/borda mudaram. Status (sucesso/erro/
// aviso/informativo) ficam iguais, por pedido explicito do prompt. `destaque`
// e a cor de marca, inalterada (ja era #7b2ff7); `acento` e nova.
export const cores = {
  fundo: "#111319",
  fundoCartao: "#1d1f26",
  // "Cartao em destaque" do redesign (ex.: card ativo/selecionado) - mesma
  // chave que ja existia pra esse papel, so o valor mudou.
  fundoCartaoAtivo: "#22242e",
  // Borda de cartao (1px, roxo a 20%). Divisorias finas (linhas separadoras
  // dentro de um cartao) usam `divisoria` abaixo, nao esta - as duas eram a
  // mesma cor antes do redesign, agora sao conceitos diferentes.
  bordaCartao: "rgba(123, 47, 247, 0.2)",
  divisoria: "rgba(255, 255, 255, 0.06)",
  destaque: "#7b2ff7",
  acento: "#9d67ff",
  texto: "#e2e2ea",
  textoSuave: "#ccc3d9",
  textoRotulo: "#958da2",
  erro: "#ef4444",
  sucesso: "#22c55e",
  aviso: "#f59e0b",
  informativo: "#3b82f6",
  bloqueado: "#5c5468",
  // Variantes translucidas (~15% opacidade) das cores semanticas acima —
  // mesmo padrao do design system web (--cor-sucesso-fundo etc.), pra fundos
  // suaves de icones/badges sem precisar de rgba(...) solto em cada tela.
  sucessoFundo: "rgba(34, 197, 94, 0.15)",
  erroFundo: "rgba(239, 68, 68, 0.15)",
  avisoFundo: "rgba(245, 158, 11, 0.15)",
  informativoFundo: "rgba(59, 130, 246, 0.15)"
};

export const raios = {
  sm: 6,
  md: 10,
  lg: 16,
  // Pilula (badge/status totalmente arredondado) - usado pelo destaque da
  // aba ativa na bottom bar e pelos selos de status das telas futuras.
  pilula: 999
};

// Escala de espacamento (padding/margin/gap) - cada tela reinventava seus
// proprios valores soltos (14/16/20/24 apareciam sem padrao); esta escala
// e o vocabulario comum daqui pra frente.
export const espacamentos = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
};

// Escala tipografica - nomeia os tamanhos de fonte que ja apareciam soltos
// nas telas (10 a 40), sem alterar nenhuma tela existente; telas novas
// devem usar estes tokens em vez de numeros ad-hoc.
export const tipografia = {
  legenda: 11,
  rotulo: 12,
  corpo: 13,
  subtitulo: 16,
  titulo: 18,
  destaque: 20,
  numeroGrande: 40
};

// Escala de tamanho de icone (Ionicons) - substitui os numeros soltos
// (13/14/16/18/20/22/24) que cada tela escolhia por conta propria.
export const tamanhosIcone = {
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24
};

// Elevacao - preset unico de sombra pra cartoes/modais que precisam se
// destacar do fundo preto da tela; usado em MenuLateral e
// ModalConfirmarSaida.
export const sombra = {
  cartao: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  }
};
