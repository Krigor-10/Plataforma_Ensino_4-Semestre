/* Situacao UNICA do curso no web (pacote 6 da auditoria de 26/11, docs/
   auditorias/AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md, decisoes D5, D6,
   D6b, D10 e D11). A fonte e o servidor: todo Curso da API ja vem com
   `situacao` (Models/SituacaoCurso.cs). `calcularSituacaoCurso` so existe
   como reserva para objetos que chegam sem o campo (ex.: dados montados em
   teste) e segue a MESMA ordem do servidor - mude os dois juntos. */

export const SITUACAO_CURSO = {
  EM_ANDAMENTO: "EmAndamento",
  AGUARDANDO_COORDENADOR: "AguardandoCoordenador",
  ENCERRADO: "Encerrado",
  PRONTO_PARA_PUBLICAR: "ProntoParaPublicar",
  A_VENDA: "AVenda",
  NO_CATALOGO: "NoCatalogo",
  FORA_DE_VENDA: "ForaDeVenda"
};

const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;

export function calcularSituacaoCurso(curso) {
  if (!curso) {
    return SITUACAO_CURSO.EM_ANDAMENTO;
  }

  const modelo = Number(curso.modeloCurso);

  if (curso.publicadoParaVendaEm) {
    return modelo === MODELO_GRATUITO ? SITUACAO_CURSO.NO_CATALOGO : SITUACAO_CURSO.A_VENDA;
  }
  if (curso.retiradoDaVendaEm) {
    return SITUACAO_CURSO.FORA_DE_VENDA;
  }
  if (curso.encerradoEm) {
    return SITUACAO_CURSO.ENCERRADO;
  }
  if (curso.concluidoPeloProfessorEm) {
    return modelo === MODELO_PAGO_PACOTE ? SITUACAO_CURSO.PRONTO_PARA_PUBLICAR : SITUACAO_CURSO.AGUARDANDO_COORDENADOR;
  }
  return SITUACAO_CURSO.EM_ANDAMENTO;
}

export function situacaoDoCurso(curso) {
  return curso?.situacao || calcularSituacaoCurso(curso);
}

// Textos dos selos (decisao D10), iguais em todas as telas.
const ROTULO_POR_SITUACAO = {
  [SITUACAO_CURSO.EM_ANDAMENTO]: "Em andamento",
  [SITUACAO_CURSO.AGUARDANDO_COORDENADOR]: "Concluído · aguardando coordenador",
  [SITUACAO_CURSO.ENCERRADO]: "Encerrado",
  [SITUACAO_CURSO.PRONTO_PARA_PUBLICAR]: "Pronto para publicar",
  [SITUACAO_CURSO.A_VENDA]: "À venda",
  [SITUACAO_CURSO.NO_CATALOGO]: "No catálogo",
  [SITUACAO_CURSO.FORA_DE_VENDA]: "Fora de venda"
};

const VARIANTE_POR_SITUACAO = {
  [SITUACAO_CURSO.EM_ANDAMENTO]: "neutro",
  [SITUACAO_CURSO.AGUARDANDO_COORDENADOR]: "aviso",
  [SITUACAO_CURSO.ENCERRADO]: "neutro",
  [SITUACAO_CURSO.PRONTO_PARA_PUBLICAR]: "aviso",
  [SITUACAO_CURSO.A_VENDA]: "sucesso",
  [SITUACAO_CURSO.NO_CATALOGO]: "sucesso",
  [SITUACAO_CURSO.FORA_DE_VENDA]: "neutro"
};

export function rotuloSituacaoCurso(situacao) {
  return ROTULO_POR_SITUACAO[situacao] || ROTULO_POR_SITUACAO[SITUACAO_CURSO.EM_ANDAMENTO];
}

export function varianteSituacaoCurso(situacao) {
  return VARIANTE_POR_SITUACAO[situacao] || "neutro";
}

// Abas da tela Cursos do Admin (decisoes D5, D6, D6b):
// - Em andamento: em montagem/acompanhamento e concluidos aguardando o coordenador;
// - Encerrados: tudo em que o Admin precisa agir (encerrado ou pronto para publicar);
// - A venda: publicados (Pago ou Gratuito);
// - Fora de venda: ja publicados e retirados.
const ABA_POR_SITUACAO = {
  [SITUACAO_CURSO.EM_ANDAMENTO]: "andamento",
  [SITUACAO_CURSO.AGUARDANDO_COORDENADOR]: "andamento",
  [SITUACAO_CURSO.ENCERRADO]: "encerrados",
  [SITUACAO_CURSO.PRONTO_PARA_PUBLICAR]: "encerrados",
  [SITUACAO_CURSO.A_VENDA]: "a-venda",
  [SITUACAO_CURSO.NO_CATALOGO]: "a-venda",
  [SITUACAO_CURSO.FORA_DE_VENDA]: "fora-da-venda"
};

export function abaAdminDoCurso(curso) {
  return ABA_POR_SITUACAO[situacaoDoCurso(curso)] || "andamento";
}

// Trava de edicao do conteudo (pacote 7 da auditoria de 26/11). A fonte e o
// servidor (Curso.AceitaEdicao, enviado como `permiteEdicaoConteudo`); a
// reserva segue a mesma regra: publicado, concluido ou encerrado trava.
export function cursoTravadoParaEdicao(curso) {
  if (!curso) {
    return false;
  }
  if (typeof curso.permiteEdicaoConteudo === "boolean") {
    return !curso.permiteEdicaoConteudo;
  }
  return Boolean(curso.publicadoParaVendaEm || curso.concluidoPeloProfessorEm || curso.encerradoEm);
}

// Aviso mostrado ao professor explicando POR QUE a edicao esta travada.
export function motivoTravaEdicao(curso) {
  if (!cursoTravadoParaEdicao(curso)) {
    return "";
  }
  if (curso.publicadoParaVendaEm) {
    return "Curso publicado para os alunos. A edição está travada — para alterar, peça ao Admin para tirar o curso do catálogo/da venda.";
  }
  if (curso.encerradoEm) {
    return "Curso encerrado. A edição está travada.";
  }
  if (Number(curso.modeloCurso) === MODELO_PAGO_PACOTE) {
    return "Curso concluído — aguardando a publicação pelo Admin. A edição está travada.";
  }
  return "Curso concluído — aguardando o encerramento pelo coordenador. A edição está travada.";
}
