import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import WorkspaceScreen from "./WorkspaceScreen.jsx";
import { ToastProvider } from "../hooks/useToast.jsx";
import { apiRequest } from "../lib/api.js";
import { loadWorkspaceSnapshot } from "../lib/dashboard.js";

vi.mock("../lib/api.js", async () => {
  const real = await vi.importActual("../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

vi.mock("../lib/dashboard.js", async () => {
  const real = await vi.importActual("../lib/dashboard.js");
  return { ...real, loadWorkspaceSnapshot: vi.fn() };
});

vi.mock("../lib/chamadosApi.js", () => ({
  listarChamadosParaStaff: vi.fn().mockResolvedValue([])
}));

const CURSO = { id: 12, titulo: "Curso Teste", codigoRegistro: "CUR-012", descricao: "", modeloCurso: 2, ativo: true, coordenadorId: 1 };
const MODULO = { id: 34, cursoId: 12, titulo: "Modulo Teste", dataCriacao: "2026-01-01", totalConteudos: 0, totalAvaliacoes: 0 };
const ADMIN = { id: 1, nome: "Admin Teste", email: "admin@test.com", cpf: "", tipoUsuario: "Admin" };

function snapshotComCursoEModulo() {
  return {
    cursos: [CURSO],
    modulos: [MODULO],
    conteudos: [],
    avaliacoes: [],
    alunos: [],
    coordenadores: [],
    professores: [],
    turmas: [],
    matriculas: [],
    pagamentos: [],
    progressos: { conteudos: [], modulos: [], cursos: [] }
  };
}

// So os fetches internos do PainelCursoGestao.jsx (desempenho/revisao-conteudo)
// pra tela do curso 12 abrir sem erro - o conteudo em si nao importa aqui,
// quem esta sob teste e a rota canonica do WorkspaceScreen.
function mockApiDoCurso() {
  apiRequest.mockImplementation((url) => {
    if (url === "/Cursos/12/desempenho") {
      return Promise.resolve({ cursoId: 12, totalAlunos: 0, progressoMedio: 0, certificadosEmitidos: 0, desempenhoMedio: 0, modulos: [], avaliacoesSemModulo: [] });
    }
    if (url === "/Cursos/12/revisao-conteudo") {
      return Promise.resolve({ cursoId: 12, cursoTitulo: "Curso Teste", modulos: [], avaliacoesSemModulo: [] });
    }
    return Promise.resolve([]);
  });
}

function renderWorkspace({ onNavigate, route, usuario = ADMIN }) {
  return render(
    <ToastProvider>
      <WorkspaceScreen
        onLogout={vi.fn()}
        onNavigate={onNavigate}
        onSessionExpired={vi.fn()}
        onUsuarioAtualizado={vi.fn()}
        route={route}
        usuario={usuario}
      />
    </ToastProvider>
  );
}

// Bug do commit 2324570, corrigido em seguida (docs/bugs/PROMPT-agente-rota-
// modulo-volta-sozinha.md): o efeito de rota canonica do WorkspaceScreen so
// olhava section/param, entao cortava /modulos/:id de volta pra /app/cursos/:id
// assim que a tela do modulo comecava a abrir.
describe("WorkspaceScreen - rota canonica preserva /modulos/:id", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("URL do modulo nao e cortada de volta pra lista - a tela do modulo abre", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshotComCursoEModulo());
    mockApiDoCurso();
    window.history.pushState({}, "", "/app/cursos/12/modulos/34");

    const onNavigate = vi.fn();
    renderWorkspace({
      onNavigate,
      route: { kind: "app", section: "cursos", param: "12", subsecao: "modulos", subparam: "34" }
    });

    const migalha = await screen.findByRole("navigation", { name: "Caminho até o módulo" });
    expect(within(migalha).getByText("Modulo Teste")).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalledWith("/app/cursos/12", { replace: true });
  });

  test("subsecao incompleta (sem moduloId na URL) continua sendo cortada, como antes", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshotComCursoEModulo());
    mockApiDoCurso();
    window.history.pushState({}, "", "/app/cursos/12/modulos");

    const onNavigate = vi.fn();
    renderWorkspace({
      onNavigate,
      route: { kind: "app", section: "cursos", param: "12", subsecao: "modulos", subparam: null }
    });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("/app/cursos/12", { replace: true }));
  });
});

// Mesma regressao do bloco acima, pra rota da avaliacao em tela propria
// (docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-propria.md).
describe("WorkspaceScreen - rota canonica preserva /avaliacoes/:id", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function mockApiDoCursoComAvaliacao() {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/12/desempenho") {
        return Promise.resolve({
          cursoId: 12,
          totalAlunos: 0,
          progressoMedio: 0,
          certificadosEmitidos: 0,
          desempenhoMedio: 0,
          modulos: [],
          avaliacoesSemModulo: [
            {
              avaliacaoId: 56,
              titulo: "Prova Teste",
              tipoAvaliacao: 2,
              totalParticipantes: 0,
              mediaNota: 0,
              notaMaxima: 10,
              percentualConclusao: 0,
              percentualAproveitamento: 0
            }
          ]
        });
      }
      if (url === "/Cursos/12/revisao-conteudo") {
        return Promise.resolve({
          cursoId: 12,
          cursoTitulo: "Curso Teste",
          modulos: [],
          avaliacoesSemModulo: [
            {
              avaliacao: {
                id: 56,
                titulo: "Prova Teste",
                descricao: "",
                notaMaxima: 10,
                tentativasPermitidas: 1,
                tipoAvaliacao: 2,
                moduloId: null
              },
              questoes: [{ id: 1, enunciado: "Pergunta", alternativas: [], afirmativas: [], pontos: 1, dificuldade: 2 }]
            }
          ]
        });
      }
      return Promise.resolve([]);
    });
  }

  test("URL da avaliacao nao e cortada de volta pra lista - a tela da avaliacao abre", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshotComCursoEModulo());
    mockApiDoCursoComAvaliacao();
    window.history.pushState({}, "", "/app/cursos/12/avaliacoes/56");

    const onNavigate = vi.fn();
    renderWorkspace({
      onNavigate,
      route: { kind: "app", section: "cursos", param: "12", subsecao: "avaliacoes", subparam: "56" }
    });

    const migalha = await screen.findByRole("navigation", { name: "Caminho até a avaliação" });
    expect(within(migalha).getByText("Avaliação 01")).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalledWith("/app/cursos/12", { replace: true });
  });

  test("subsecao incompleta (sem avaliacaoId na URL) continua sendo cortada, como antes", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshotComCursoEModulo());
    mockApiDoCursoComAvaliacao();
    window.history.pushState({}, "", "/app/cursos/12/avaliacoes");

    const onNavigate = vi.fn();
    renderWorkspace({
      onNavigate,
      route: { kind: "app", section: "cursos", param: "12", subsecao: "avaliacoes", subparam: null }
    });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("/app/cursos/12", { replace: true }));
  });
});
