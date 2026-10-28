import { construirMapaStatusCertificados, obterStatusCertificado } from "../certificados.js";

describe("construirMapaStatusCertificados / obterStatusCertificado", () => {
  it("certificado disponivel: desbloqueado true e sem pendencias", () => {
    const mapa = construirMapaStatusCertificados([
      { matriculaId: 1, cursoId: 10, certificadoDisponivel: true, pendenciasCertificado: [] }
    ]);

    expect(obterStatusCertificado(mapa, 1)).toEqual({ desbloqueado: true, pendencias: [] });
  });

  it("certificado bloqueado: desbloqueado false e lista de pendencias do servidor", () => {
    const mapa = construirMapaStatusCertificados([
      {
        matriculaId: 2,
        cursoId: 20,
        certificadoDisponivel: false,
        pendenciasCertificado: ["A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."]
      }
    ]);

    expect(obterStatusCertificado(mapa, 2)).toEqual({
      desbloqueado: false,
      pendencias: ["A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."]
    });
  });

  it("falha de carregamento (map vazio) trata a matricula como bloqueada, nunca liberada por padrao", () => {
    const mapa = construirMapaStatusCertificados([]);

    expect(obterStatusCertificado(mapa, 99)).toEqual({ desbloqueado: false, pendencias: [] });
  });

  it("aceita matriculaId como string (vindo de outro JSON) e ainda casa com o Map numerico", () => {
    const mapa = construirMapaStatusCertificados([
      { matriculaId: "3", cursoId: 30, certificadoDisponivel: true, pendenciasCertificado: [] }
    ]);

    expect(obterStatusCertificado(mapa, "3").desbloqueado).toBe(true);
  });

  it("statusLista undefined/null nao quebra, so produz um Map vazio", () => {
    expect(construirMapaStatusCertificados(undefined).size).toBe(0);
    expect(construirMapaStatusCertificados(null).size).toBe(0);
  });
});
