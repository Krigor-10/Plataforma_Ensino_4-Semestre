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
 */
export function obterStatusCertificado(mapaStatus, matriculaId) {
  const status = mapaStatus.get(Number(matriculaId));

  return {
    desbloqueado: Boolean(status?.certificadoDisponivel),
    pendencias: status?.pendenciasCertificado || []
  };
}
