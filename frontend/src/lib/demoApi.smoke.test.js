import { beforeEach, describe, expect, test } from "vitest";
import { demoRequest, DemoApiError } from "./demoApi.js";

/* Smoke tests do modo demo (frontend/src/lib/demoApi.js) — cobrem exatamente os
   fluxos que a auditoria de 2026-09-02 encontrou quebrados (achados C1/A1/A2):
   dashboard do Aluno, Progresso do Coordenador (incluindo avaliacoes sem
   modulo) e Progresso do Professor. Nao usam mock de rede: demoRequest opera
   inteiramente sobre localStorage (jsdom), como no navegador real. */

async function loginComo(email) {
  const resposta = await demoRequest("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha: "demo123" })
  });
  window.localStorage.setItem("usuarioLogado", JSON.stringify(resposta.usuario));
  return resposta.usuario;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("login por papel", () => {
  test.each([
    ["aluno@demo.edtech", "Aluno"],
    ["professor@demo.edtech", "Professor"],
    ["coordenacao@demo.edtech", "Coordenador"]
  ])("%s entra como %s", async (email, tipoEsperado) => {
    const usuario = await loginComo(email);
    expect(usuario.tipoUsuario).toBe(tipoEsperado);
  });

  test("credenciais invalidas rejeitam com 401", async () => {
    await expect(
      demoRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "aluno@demo.edtech", senha: "senha-errada" })
      })
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("dashboard do Aluno (regressao do achado C1)", () => {
  test("Promise.all completo de loadWorkspaceSnapshot nao lanca 404", async () => {
    const usuario = await loginComo("aluno@demo.edtech");

    const [cursos, turmas, matriculas, modulos, conteudos, avaliacoes, progressos, pagamentos] = await Promise.all([
      demoRequest("/Cursos"),
      demoRequest("/Turmas"),
      demoRequest(`/Matriculas/aluno/${usuario.id}`),
      demoRequest(`/Modulos/aluno/${usuario.id}`),
      demoRequest(`/ConteudosDidaticos/aluno/${usuario.id}`),
      demoRequest(`/Avaliacoes/aluno/${usuario.id}`),
      demoRequest(`/Progressos/aluno/${usuario.id}`),
      demoRequest("/Pagamentos/aluno")
    ]);

    expect(cursos.length).toBeGreaterThan(0);
    expect(Array.isArray(turmas)).toBe(true);
    expect(Array.isArray(matriculas)).toBe(true);
    expect(Array.isArray(modulos)).toBe(true);
    expect(Array.isArray(conteudos)).toBe(true);
    expect(Array.isArray(avaliacoes)).toBe(true);
    expect(progressos).toBeTruthy();
    expect(Array.isArray(pagamentos)).toBe(true);
  });
});

describe("pagamento simulado", () => {
  test("cobranca pendente pode ser confirmada e o estado persiste", async () => {
    await loginComo("aluno@demo.edtech");

    const [primeiraCobranca] = await demoRequest("/Pagamentos/aluno");
    expect(primeiraCobranca.status).toBe(1); // Pendente

    const confirmada = await demoRequest(`/Pagamentos/${primeiraCobranca.matriculaId}/confirmar`, { method: "POST" });
    expect(confirmada.status).toBe(2); // Pago
    expect(confirmada.pagoEm).toBeTruthy();

    const [cobrancaAtualizada] = await demoRequest("/Pagamentos/aluno");
    expect(cobrancaAtualizada.status).toBe(2);
  });

  test("confirmar pagamento ja processado retorna 422 em vez de quebrar", async () => {
    await loginComo("aluno@demo.edtech");
    const [cobranca] = await demoRequest("/Pagamentos/aluno");
    await demoRequest(`/Pagamentos/${cobranca.matriculaId}/confirmar`, { method: "POST" });

    await expect(
      demoRequest(`/Pagamentos/${cobranca.matriculaId}/confirmar`, { method: "POST" })
    ).rejects.toBeInstanceOf(DemoApiError);
    await expect(
      demoRequest(`/Pagamentos/${cobranca.matriculaId}/confirmar`, { method: "POST" })
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("Progresso do Coordenador (regressao dos achados A1/A2)", () => {
  test("GET /Cursos/desempenho retorna os cursos sob coordenacao", async () => {
    await loginComo("coordenacao@demo.edtech");

    const cursos = await demoRequest("/Cursos/desempenho");
    expect(cursos.length).toBeGreaterThan(0);

    for (const curso of cursos) {
      expect(Array.isArray(curso.modulos)).toBe(true);
      expect(Array.isArray(curso.avaliacoesSemModulo)).toBe(true);
    }
  });
});

describe("Progresso do Professor (regressao do achado A1)", () => {
  test("GET /Turmas/desempenho retorna as turmas do professor", async () => {
    await loginComo("professor@demo.edtech");

    const turmas = await demoRequest("/Turmas/desempenho");
    expect(turmas.length).toBeGreaterThan(0);

    for (const turma of turmas) {
      expect(Array.isArray(turma.alunos)).toBe(true);
      expect(Array.isArray(turma.avaliacoes)).toBe(true);
    }
  });
});
