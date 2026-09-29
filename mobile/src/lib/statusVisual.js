import { cores } from "./theme.js";

// Fonte unica de cor+icone por status de matricula — antes vivia hardcoded
// dentro de MatriculasScreen.jsx; centralizado aqui pra qualquer tela nova
// que precise do mesmo vocabulario nao reinventar o mapeamento.
const STATUS_MATRICULA = {
  Pendente: { cor: cores.aviso, icone: "time-outline" },
  Aprovada: { cor: cores.sucesso, icone: "checkmark-circle" },
  Rejeitada: { cor: cores.erro, icone: "close-circle" },
  Cancelada: { cor: cores.textoSuave, icone: "ban-outline" }
};

export function corDoStatusMatricula(status) {
  return STATUS_MATRICULA[status]?.cor || cores.textoSuave;
}

export function iconeDoStatusMatricula(status) {
  return STATUS_MATRICULA[status]?.icone || "help-circle-outline";
}
