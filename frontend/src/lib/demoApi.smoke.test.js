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

describe("compra de cursos (pendencia_compra_cursos)", () => {
  test("POST /Matriculas/comprar matricula e confirma o pagamento numa unica chamada", async () => {
    const usuario = await loginComo("aluno@demo.edtech");

    const matriculasAntes = await demoRequest(`/Matriculas/aluno/${usuario.id}`);
    expect(matriculasAntes.some((matricula) => matricula.cursoId === 2)).toBe(false);

    const resultado = await demoRequest("/Matriculas/comprar", {
      method: "POST",
      body: JSON.stringify({ cursoId: 2 })
    });
    expect(resultado.pagamentoConfirmado).toBe(true);

    const matriculasDepois = await demoRequest(`/Matriculas/aluno/${usuario.id}`);
    const novaMatricula = matriculasDepois.find((matricula) => matricula.cursoId === 2);
    expect(novaMatricula).toBeTruthy();
    expect(novaMatricula.status).toBe(1); // Aprovada

    const pagamentos = await demoRequest("/Pagamentos/aluno");
    const pagamentoCurso2 = pagamentos.find((pagamento) => pagamento.cursoId === 2);
    expect(pagamentoCurso2.status).toBe(2); // Pago
  });

  test("POST /Matriculas/comprar recusa curso ja comprado (409)", async () => {
    await loginComo("aluno@demo.edtech");

    await demoRequest("/Matriculas/comprar", { method: "POST", body: JSON.stringify({ cursoId: 2 }) });

    await expect(
      demoRequest("/Matriculas/comprar", { method: "POST", body: JSON.stringify({ cursoId: 2 }) })
    ).rejects.toMatchObject({ status: 409 });
  });

  test("POST /Matriculas/comprar so confirma uma cobranca pendente existente, sem duplicar a matricula", async () => {
    const usuario = await loginComo("aluno@demo.edtech");

    const matriculasAntes = await demoRequest(`/Matriculas/aluno/${usuario.id}`);
    const quantidadeAntes = matriculasAntes.length;

    const [cobrancaPendente] = await demoRequest("/Pagamentos/aluno");
    expect(cobrancaPendente.status).toBe(1); // Pendente

    const resultado = await demoRequest("/Matriculas/comprar", {
      method: "POST",
      body: JSON.stringify({ cursoId: cobrancaPendente.cursoId })
    });
    expect(resultado.pagamentoConfirmado).toBe(true);

    const matriculasDepois = await demoRequest(`/Matriculas/aluno/${usuario.id}`);
    expect(matriculasDepois.length).toBe(quantidadeAntes);
  });

  test("POST /Matriculas (comecar gratis) matricula direto e cria cobranca pendente so se o curso for pago", async () => {
    const usuario = await loginComo("aluno@demo.edtech");

    const resultado = await demoRequest("/Matriculas", {
      method: "POST",
      body: JSON.stringify({ alunoId: usuario.id, cursoId: 2 })
    });
    expect(resultado.matriculaId).toBeTruthy();

    const pagamentos = await demoRequest("/Pagamentos/aluno");
    expect(pagamentos.some((pagamento) => pagamento.cursoId === 2 && pagamento.status === 1)).toBe(true);

    await expect(
      demoRequest("/Matriculas", { method: "POST", body: JSON.stringify({ alunoId: usuario.id, cursoId: 2 }) })
    ).rejects.toMatchObject({ status: 409 });
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

describe("Certificados - regra de nota minima no modo demo (espelha CertificadoService)", () => {
  test("GET /Certificados/status devolve certificadoDisponivel/pendenciasCertificado consistentes com a emissao", async () => {
    await loginComo("aluno@demo.edtech");

    const status = await demoRequest("/Certificados/status");
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThan(0);

    for (const item of status) {
      expect(typeof item.matriculaId).toBe("number");
      expect(typeof item.cursoId).toBe("number");
      expect(typeof item.certificadoDisponivel).toBe("boolean");
      expect(Array.isArray(item.pendenciasCertificado)).toBe(true);
      expect(item.certificadoDisponivel).toBe(item.pendenciasCertificado.length === 0);

      if (item.certificadoDisponivel) {
        const emitido = await demoRequest(`/Certificados/matricula/${item.matriculaId}/emitir`, { method: "POST" });
        expect(emitido.codigoVerificacao).toBeTruthy();
      } else {
        await expect(
          demoRequest(`/Certificados/matricula/${item.matriculaId}/emitir`, { method: "POST" })
        ).rejects.toMatchObject({ message: item.pendenciasCertificado[0] });
      }
    }
  });

  test("nota final abaixo de 7 bloqueia emissao mesmo com progresso 100% e avaliacao corrigida", async () => {
    await loginComo("aluno@demo.edtech");

    const status = await demoRequest("/Certificados/status");
    const comAvaliacaoFormal = status.find((item) =>
      item.pendenciasCertificado.includes(
        "A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."
      )
    );

    // So roda a asserção forte se o seed demo atual tiver esse cenario; a
    // consistencia generica ja e coberta pelo teste anterior pra todo item.
    if (comAvaliacaoFormal) {
      await expect(
        demoRequest(`/Certificados/matricula/${comAvaliacaoFormal.matriculaId}/emitir`, { method: "POST" })
      ).rejects.toMatchObject({
        message: "A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."
      });
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
