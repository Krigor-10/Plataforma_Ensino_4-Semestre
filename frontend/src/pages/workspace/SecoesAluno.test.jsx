import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoCursosAluno } from "./SecoesAluno.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

/* Reproduz o bug relatado na tela PROGRESSO: matricula sem turma (matricula
   automatica/direta, ver pendencia_matriculas_sempre_automatica_2026_10_27 na
   memoria do projeto) mas com modulos/conteudos reais publicados pro curso -
   a consulta anterior filtrava conteudo/avaliacao por turmaId === matricula.
   turmaId, que dava vazio sempre que a matricula nao tinha turma, mesmo o
   curso tendo modulos. A correcao agrupa por cursoId. */
function montarCenario() {
  const cursos = [{ id: 10, titulo: "Curso Sem Turma na Matricula", imagemUrl: null }];
  const turmas = [{ id: 77, cursoId: 10, nomeTurma: "Turma online - Curso Sem Turma na Matricula" }];
  const modulos = [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }];
  const conteudos = [
    {
      id: 1,
      cursoId: 10,
      moduloId: 100,
      moduloTitulo: "Fundamentos",
      turmaId: 77,
      turmaNome: "Turma online - Curso Sem Turma na Matricula",
      titulo: "Aula 1",
      ordemExibicao: 1
    }
  ];
  const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 0 }];
  const avaliacoes = [];
  const progressos = { conteudos: [], modulos: [], cursos: [] };

  return { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas };
}

describe("SecaoCursosAluno (tela Progresso)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("lista os modulos do curso mesmo quando a matricula nao tem turma vinculada", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));

    expect(screen.queryByText(/ainda nao possui modulos publicados/i)).not.toBeInTheDocument();
    expect(screen.getByText("Fundamentos")).toBeInTheDocument();
  });

  test("mostra o estado vazio quando o curso realmente nao tem modulo nenhum", async () => {
    const usuario = userEvent.setup();
    const cursos = [{ id: 20, titulo: "Curso Sem Modulo Nenhum", imagemUrl: null }];
    const matriculas = [{ id: 6, cursoId: 20, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = { conteudos: [], modulos: [], cursos: [] };

    render(
      <SecaoCursosAluno
        avaliacoes={[]}
        conteudos={[]}
        cursos={cursos}
        matriculas={matriculas}
        modulos={[]}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={[]}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Modulo Nenhum/i }));

    expect(screen.getByText(/ainda nao possui modulos publicados/i)).toBeInTheDocument();
  });

  // Reproduz o bug: progresso de conteudo/modulo em 100% nao pode, por si
  // so, liberar o card de certificado - so GET /Certificados/status (que
  // sabe de avaliacao formal/nota minima/correcao pendente) pode.
  test("nao mostra o card de certificado so porque o progresso de conteudo esta em 100%", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, modulos, turmas } = montarCenario();
    const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = {
      conteudos: [],
      modulos: [],
      cursos: [{ matriculaId: 5, percentualConclusao: 100 }]
    };
    apiRequest.mockResolvedValue([
      { matriculaId: 5, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: ["A avaliacao final ainda nao foi realizada."] }
    ]);

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/Certificados/status"));

    expect(screen.queryByText(/Parabens! Certificado disponivel/i)).not.toBeInTheDocument();
  });

  test("mostra o card de certificado quando o backend confirma a liberacao real", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, modulos, turmas } = montarCenario();
    const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 8 }];
    const progressos = {
      conteudos: [],
      modulos: [],
      cursos: [{ matriculaId: 5, percentualConclusao: 100 }]
    };
    apiRequest.mockResolvedValue([{ matriculaId: 5, cursoId: 10, certificadoDisponivel: true, pendenciasCertificado: [] }]);

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));

    expect(await screen.findByText(/Parabens! Certificado disponivel/i)).toBeInTheDocument();
  });
});
