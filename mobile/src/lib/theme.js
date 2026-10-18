// Paleta e tokens de radius espelhando exatamente os valores de referencia
// do design system web (frontend/src/styles/base.css: --cor-sucesso/--cor-
// erro/--cor-aviso/--raio-sm/--raio-md/--raio-lg) — cor de marca ja batia,
// as 3 cores de status (sucesso/erro/aviso) divergiam antes desta correcao.
export const cores = {
  fundo: "#000000",
  fundoCartao: "#241a30",
  fundoCartaoAtivo: "#2c1f3d",
  bordaCartao: "#3a2a4a",
  destaque: "#7b2ff7",
  texto: "#fff",
  textoSuave: "#a89fb3",
  textoRotulo: "#d8d2e0",
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
  lg: 16
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
// destacar do fundo preto da tela; usado em MatriculasScreen, MenuLateral
// e ModalConfirmarSaida.
export const sombra = {
  cartao: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  }
};
