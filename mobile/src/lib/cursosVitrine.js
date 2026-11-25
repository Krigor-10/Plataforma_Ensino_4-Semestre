import { formatDayMonth } from "./format.js";
import { cores } from "./theme.js";

// Situacao de cada curso matriculado na vitrine de Cursos (docs/redesign-
// mobile/PROMPT-agente-cursos-vitrine.md) - usada pelos chips de filtro, a
// ordenacao de "Todos" e a cor/rotulo do cartao (GradeCursosConteudos.jsx)
// e do botao principal do painel de detalhes (ConteudosScreen.jsx), pra um
// so lugar decidir "o que esse curso esta mostrando agora" pras duas telas.
const TONS_ETIQUETA = {
  andamento: { corBorda: "rgba(157, 103, 255, 0.45)", corFundo: "rgba(17, 19, 25, 0.8)", corTexto: "#c4b5fd", rotulo: "Em andamento" },
  naoIniciado: { corFundo: "rgba(0, 0, 0, 0.7)", corTexto: cores.texto, rotulo: "Não iniciado" },
  concluido: { corFundo: cores.sucesso, corTexto: cores.texto, rotulo: "✓ Concluído" },
  pendente: { corFundo: cores.aviso, corTexto: cores.fundo, rotulo: "Compra pendente" },
  comprar: { corFundo: cores.aviso, corTexto: cores.fundo, rotulo: "Comprar" }
};

const ROTULO_ACAO_PRINCIPAL = {
  andamento: "▶ Continuar",
  naoIniciado: "▶ Começar",
  concluido: "Revisar",
  pendente: "Concluir compra",
  comprar: "Comprar"
};

// Nomes de variante do CartaoVitrineCurso.jsx (so as 4 cores que ele
// entende) e do Botao.jsx (vocabulario primario/secundario/sucesso/aviso/
// perigo/fantasma, ja usado no resto do app) sao vocabularios diferentes -
// cada consumidor pede a sua.
const VARIANTE_ACAO_PRINCIPAL_CARTAO = {
  andamento: "roxo",
  naoIniciado: "roxo",
  concluido: "contornoRoxo",
  pendente: "ambar",
  comprar: "ambar"
};

const VARIANTE_ACAO_PRINCIPAL_BOTAO = {
  andamento: "primario",
  naoIniciado: "primario",
  concluido: "secundario",
  pendente: "aviso",
  comprar: "aviso"
};

// Compra pendente e "Comprar" (pagamento cancelado/vencido, sem cobranca
// ativa) caem no MESMO chip e no mesmo bucket de ordenacao ("Compra
// pendente"), mas tem etiqueta/apoio/acao proprios - ver a tabela do item 2
// do prompt.
const GRUPO_POR_SITUACAO = {
  andamento: "andamento",
  naoIniciado: "naoIniciado",
  concluido: "concluido",
  pendente: "compraPendente",
  comprar: "compraPendente"
};

export function obterSituacaoCurso(item) {
  if (item.pagamentoPendente) {
    return "pendente";
  }
  if (item.acessoLiberado === false) {
    return "comprar";
  }

  const percentual = Math.max(0, Math.min(Number(item.progresso) || 0, 100));
  if (percentual >= 100) {
    return "concluido";
  }
  if (percentual <= 0) {
    return "naoIniciado";
  }
  return "andamento";
}

export function obterGrupoSituacao(situacao) {
  return GRUPO_POR_SITUACAO[situacao];
}

export function obterEtiquetaSituacao(situacao) {
  return TONS_ETIQUETA[situacao];
}

export function obterRotuloAcaoPrincipal(situacao) {
  return ROTULO_ACAO_PRINCIPAL[situacao];
}

export function obterVarianteAcaoPrincipalCartao(situacao) {
  return VARIANTE_ACAO_PRINCIPAL_CARTAO[situacao];
}

export function obterVarianteAcaoPrincipalBotao(situacao) {
  return VARIANTE_ACAO_PRINCIPAL_BOTAO[situacao];
}

// "Com acesso" (andamento/nao iniciado/concluido): toca na capa abre a
// trilha. Sem acesso (pendente/comprar): toca na capa abre o painel de
// detalhes - mesmo criterio do antigo `bloqueado` de GradeCursosConteudos.jsx.
export function temAcessoLiberado(situacao) {
  return situacao === "andamento" || situacao === "naoIniciado" || situacao === "concluido";
}

export function obterApoioTextoCurso(item, situacao) {
  if (situacao === "pendente") {
    return item.pagamentoVenceEm ? `Pague até ${formatDayMonth(item.pagamentoVenceEm)}` : null;
  }
  if (situacao === "comprar") {
    return "Pagamento cancelado";
  }

  const percentual = Math.max(0, Math.min(Number(item.progresso) || 0, 100));
  return `${item.modulosConcluidos} de ${item.modulosTotal} módulos · ${Math.round(percentual)}% concluído`;
}
