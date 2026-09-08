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
  bloqueado: "#5c5468"
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
