import {
  agruparAguardandoPagamento,
  agruparMatriculasPorSituacao,
  construirMapaStatusCertificados,
  deveMostrarNotaCertificado,
  formatarSeloSituacao,
  obterStatusCertificado
} from "../certificados.js";

describe("construirMapaStatusCertificados / obterStatusCertificado", () => {
  it("certificado disponivel: desbloqueado true e sem pendencias", () => {
    const mapa = construirMapaStatusCertificados([
      { matriculaId: 1, cursoId: 10, certificadoDisponivel: true, pendenciasCertificado: [], situacao: "Disponivel", certificadoEmitidoEm: null }
    ]);

    expect(obterStatusCertificado(mapa, 1)).toEqual({
      desbloqueado: true,
      pendencias: [],
      situacao: "Disponivel",
      certificadoEmitidoEm: null
    });
  });

  it("certificado bloqueado: desbloqueado false e lista de pendencias do servidor", () => {
    const mapa = construirMapaStatusCertificados([
      {
        matriculaId: 2,
        cursoId: 20,
        certificadoDisponivel: false,
        pendenciasCertificado: ["A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."],
        situacao: "NotaAbaixoDoMinimo",
        certificadoEmitidoEm: null
      }
    ]);

    expect(obterStatusCertificado(mapa, 2)).toEqual({
      desbloqueado: false,
      pendencias: ["A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."],
      situacao: "NotaAbaixoDoMinimo",
      certificadoEmitidoEm: null
    });
  });

  it("certificado ja emitido: situacao Emitido e certificadoEmitidoEm preenchido", () => {
    const mapa = construirMapaStatusCertificados([
      {
        matriculaId: 4,
        cursoId: 40,
        certificadoDisponivel: true,
        pendenciasCertificado: [],
        situacao: "Emitido",
        certificadoEmitidoEm: "2026-08-28T00:00:00Z"
      }
    ]);

    const status = obterStatusCertificado(mapa, 4);
    expect(status.situacao).toBe("Emitido");
    expect(status.certificadoEmitidoEm).toBe("2026-08-28T00:00:00Z");
    expect(status.desbloqueado).toBe(true);
  });

  it("falha de carregamento (map vazio) trata a matricula como bloqueada, nunca liberada por padrao", () => {
    const mapa = construirMapaStatusCertificados([]);

    expect(obterStatusCertificado(mapa, 99)).toEqual({
      desbloqueado: false,
      pendencias: [],
      situacao: "EmAndamento",
      certificadoEmitidoEm: null
    });
  });

  it("aceita matriculaId como string (vindo de outro JSON) e ainda casa com o Map numerico", () => {
    const mapa = construirMapaStatusCertificados([
      { matriculaId: "3", cursoId: 30, certificadoDisponivel: true, pendenciasCertificado: [], situacao: "Disponivel", certificadoEmitidoEm: null }
    ]);

    expect(obterStatusCertificado(mapa, "3").desbloqueado).toBe(true);
  });

  it("statusLista undefined/null nao quebra, so produz um Map vazio", () => {
    expect(construirMapaStatusCertificados(undefined).size).toBe(0);
    expect(construirMapaStatusCertificados(null).size).toBe(0);
  });
});

describe("agruparMatriculasPorSituacao", () => {
  const matriculas = [
    { id: 1, cursoId: 10 },
    { id: 2, cursoId: 20 },
    { id: 3, cursoId: 30 },
    { id: 4, cursoId: 40 },
    { id: 5, cursoId: 50 },
    { id: 6, cursoId: 60 }
  ];

  function montarMapa(situacaoPorMatriculaId) {
    return construirMapaStatusCertificados(
      Object.entries(situacaoPorMatriculaId).map(([matriculaId, situacao]) => ({
        matriculaId: Number(matriculaId),
        cursoId: 0,
        certificadoDisponivel: situacao === "Emitido" || situacao === "Disponivel",
        pendenciasCertificado: [],
        situacao
      }))
    );
  }

  it("agrupa EmAndamento, AguardandoCorrecao, NotaAbaixoDoMinimo e AguardandoEncerramento em emAndamento", () => {
    const mapa = montarMapa({ 1: "EmAndamento", 2: "AguardandoCorrecao", 3: "NotaAbaixoDoMinimo", 4: "AguardandoEncerramento" });

    const { emAndamento, disponiveisParaReserva } = agruparMatriculasPorSituacao(matriculas.slice(0, 4), mapa);

    expect(emAndamento.map((item) => item.matricula.id)).toEqual([1, 2, 3, 4]);
    expect(disponiveisParaReserva).toHaveLength(0);
  });

  it("agrupa Disponivel em disponiveisParaReserva, e deixa Emitido/AguardandoPagamento fora dos dois grupos", () => {
    const mapa = montarMapa({ 1: "Disponivel", 2: "Emitido", 3: "AguardandoPagamento" });

    const { emAndamento, disponiveisParaReserva } = agruparMatriculasPorSituacao(matriculas.slice(0, 3), mapa);

    expect(disponiveisParaReserva.map((item) => item.matricula.id)).toEqual([1]);
    expect(emAndamento).toHaveLength(0);
  });

  it("lista de matriculas vazia/undefined nao quebra", () => {
    expect(agruparMatriculasPorSituacao(undefined, new Map())).toEqual({ emAndamento: [], disponiveisParaReserva: [] });
  });
});

describe("agruparAguardandoPagamento", () => {
  function montarMapaAguardandoPagamento(matriculaIds) {
    return construirMapaStatusCertificados(
      matriculaIds.map((matriculaId) => ({
        matriculaId,
        cursoId: 0,
        certificadoDisponivel: false,
        pendenciasCertificado: [],
        situacao: "AguardandoPagamento"
      }))
    );
  }

  it("inclui matricula com pagamento Pendente de verdade", () => {
    const matriculas = [{ id: 1, cursoId: 10 }];
    const mapa = montarMapaAguardandoPagamento([1]);
    const pagamentos = [{ matriculaId: 1, status: 1, venceEm: "2026-12-01" }];

    expect(agruparAguardandoPagamento(matriculas, mapa, pagamentos)).toEqual([{ cursoId: 10, matriculaId: 1, venceEm: "2026-12-01" }]);
  });

  it("exclui matricula com pagamento Cancelado/vencido (sem Pendente) - nao aparece em nenhum grupo", () => {
    const matriculas = [{ id: 1, cursoId: 10 }];
    const mapa = montarMapaAguardandoPagamento([1]);
    const pagamentos = [{ matriculaId: 1, status: 3, venceEm: null }];

    expect(agruparAguardandoPagamento(matriculas, mapa, pagamentos)).toEqual([]);
  });

  it("um item por curso, mesmo com duas matriculas pendentes do mesmo curso", () => {
    const matriculas = [
      { id: 1, cursoId: 10 },
      { id: 2, cursoId: 10 }
    ];
    const mapa = montarMapaAguardandoPagamento([1, 2]);
    const pagamentos = [
      { matriculaId: 1, status: 1, venceEm: "2026-12-01" },
      { matriculaId: 2, status: 1, venceEm: "2026-12-05" }
    ];

    expect(agruparAguardandoPagamento(matriculas, mapa, pagamentos)).toHaveLength(1);
  });

  it("matricula com outra situacao nao entra no grupo", () => {
    const matriculas = [{ id: 1, cursoId: 10 }];
    const mapa = construirMapaStatusCertificados([
      { matriculaId: 1, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "EmAndamento" }
    ]);

    expect(agruparAguardandoPagamento(matriculas, mapa, [{ matriculaId: 1, status: 1, venceEm: "2026-12-01" }])).toEqual([]);
  });
});

describe("formatarSeloSituacao", () => {
  it("traduz cada situacao bloqueada pro rotulo em portugues", () => {
    expect(formatarSeloSituacao("AguardandoCorrecao")).toBe("Aguardando correção");
    expect(formatarSeloSituacao("AguardandoEncerramento")).toBe("Aguardando encerramento");
    expect(formatarSeloSituacao("NotaAbaixoDoMinimo")).toBe("Nota abaixo de 7,0");
    expect(formatarSeloSituacao("EmAndamento")).toBe("Em andamento");
  });

  it("situacao desconhecida cai no rotulo neutro 'Em andamento'", () => {
    expect(formatarSeloSituacao("Disponivel")).toBe("Em andamento");
  });
});

describe("deveMostrarNotaCertificado", () => {
  it("nota maior que 0 mostra a nota", () => {
    expect(deveMostrarNotaCertificado(8.5)).toBe(true);
  });

  it("nota 0 (curso sem avaliacao formal) esconde a nota", () => {
    expect(deveMostrarNotaCertificado(0)).toBe(false);
  });
});
