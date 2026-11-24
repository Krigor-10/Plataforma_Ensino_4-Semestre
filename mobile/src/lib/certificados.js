// Fonte unica de verdade pra "certificado disponivel" e o servidor (GET
// /Certificados/status) - nunca calcular essa regra localmente (percentual de
// progresso e nota locais sao so pra exibicao). Mesmo criterio ja usado no
// Web (frontend/src/pages/workspace/SecaoCertificados.jsx): um aluno com
// media abaixo de 7 ou com prova ainda sem correcao nao pode ver o
// certificado como "liberado" so porque o progresso bateu 100%.

/**
 * Monta um Map por matriculaId a partir da resposta de GET /Certificados/status
 * ({ matriculaId, cursoId, certificadoDisponivel, pendenciasCertificado }[]).
 */
export function construirMapaStatusCertificados(statusLista) {
  return new Map((statusLista || []).map((item) => [Number(item.matriculaId), item]));
}

/**
 * Resolve o status de uma matricula especifica a partir do Map montado acima.
 * Sem entrada no Map (falha ao carregar o status, ou matricula ainda nao
 * contemplada pela resposta) = bloqueado por padrao, nunca liberado.
 *
 * `situacao` (desde docs/certificados-mobile/PROMPT-agente-certificados-
 * mobile.md) e a string calculada pelo servidor - "Emitido",
 * "AguardandoPagamento", "EmAndamento", "AguardandoCorrecao",
 * "NotaAbaixoDoMinimo", "AguardandoEncerramento" ou "Disponivel". Sem
 * entrada no Map, cai em "EmAndamento" (mesmo "bloqueado por padrao" do
 * `desbloqueado` acima).
 */
export function obterStatusCertificado(mapaStatus, matriculaId) {
  const status = mapaStatus.get(Number(matriculaId));

  return {
    desbloqueado: Boolean(status?.certificadoDisponivel),
    pendencias: status?.pendenciasCertificado || [],
    situacao: status?.situacao || "EmAndamento",
    certificadoEmitidoEm: status?.certificadoEmitidoEm || null
  };
}

const SITUACOES_EM_ANDAMENTO = ["EmAndamento", "AguardandoCorrecao", "NotaAbaixoDoMinimo", "AguardandoEncerramento"];
const PAGAMENTO_PENDENTE = 1;

/**
 * Separa as matriculas aprovadas do aluno em dois grupos, a partir da
 * `situacao` de cada uma (GET /Certificados/status):
 * - `emAndamento`: EmAndamento, AguardandoCorrecao, NotaAbaixoDoMinimo ou
 *   AguardandoEncerramento - mostradas na secao "Em andamento" da tela.
 * - `disponiveisParaReserva`: Disponivel - matriculas antigas (de antes da
 *   emissao automatica existir, sem retroativo) que so ganham a data de
 *   emissao na proxima acao no curso OU ao abrir esta tela (POST .../emitir
 *   como reserva, ver item 5 do prompt).
 * "Emitido" e "AguardandoPagamento" ficam de fora dos dois (o primeiro ja
 * aparece via GET /Certificados/meus; o segundo entra em
 * agruparAguardandoPagamento abaixo, so quando ha pagamento pendente de
 * verdade).
 */
export function agruparMatriculasPorSituacao(matriculas, mapaStatus) {
  const emAndamento = [];
  const disponiveisParaReserva = [];

  (matriculas || []).forEach((matricula) => {
    const status = obterStatusCertificado(mapaStatus, matricula.id);
    if (SITUACOES_EM_ANDAMENTO.includes(status.situacao)) {
      emAndamento.push({ matricula, status });
    } else if (status.situacao === "Disponivel") {
      disponiveisParaReserva.push({ matricula, status });
    }
  });

  return { emAndamento, disponiveisParaReserva };
}

/**
 * Grupo "Aguardando pagamento": so matriculas com situacao
 * AguardandoPagamento E que tem um Pagamento Pendente de verdade - uma
 * matricula sem acesso liberado mas com o pagamento Cancelado ou vencido
 * (sem nada pendente pra concluir) nao aparece em nenhum grupo da tela
 * (item 12 do prompt, v3 das Inscricoes). Um item por CURSO, nunca
 * repetindo matriculas do mesmo curso.
 */
export function agruparAguardandoPagamento(matriculas, mapaStatus, pagamentos) {
  const porCursoId = new Map();

  (matriculas || []).forEach((matricula) => {
    const status = obterStatusCertificado(mapaStatus, matricula.id);
    if (status.situacao !== "AguardandoPagamento") {
      return;
    }

    const pagamentoPendente = (pagamentos || []).find(
      (pagamento) => pagamento.matriculaId === matricula.id && pagamento.status === PAGAMENTO_PENDENTE
    );
    if (!pagamentoPendente || porCursoId.has(matricula.cursoId)) {
      return;
    }

    porCursoId.set(matricula.cursoId, { cursoId: matricula.cursoId, matriculaId: matricula.id, venceEm: pagamentoPendente.venceEm });
  });

  return [...porCursoId.values()];
}

const ROTULOS_SITUACAO = {
  AguardandoCorrecao: "Aguardando correção",
  AguardandoEncerramento: "Aguardando encerramento",
  NotaAbaixoDoMinimo: "Nota abaixo de 7,0",
  EmAndamento: "Em andamento"
};

/** Selo em texto da situacao - cor fica a cargo de quem renderiza (ver item 8 do prompt). */
export function formatarSeloSituacao(situacao) {
  return ROTULOS_SITUACAO[situacao] || ROTULOS_SITUACAO.EmAndamento;
}

/** Nota 0 = curso sem avaliacao formal - a linha "Emitido em ... · Nota X,X" esconde a parte da nota nesse caso (item 7 do prompt). */
export function deveMostrarNotaCertificado(notaFinal) {
  return Number(notaFinal) > 0;
}
