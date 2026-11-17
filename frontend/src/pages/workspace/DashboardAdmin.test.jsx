import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DashboardAdmin } from "./DashboardAdmin.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

function renderDashboard(props = {}) {
  return render(
    <DashboardAdmin
      alunos={[]}
      coordenadores={[]}
      cursos={[]}
      matriculas={[]}
      onMudarSecao={vi.fn()}
      onSessionExpired={vi.fn()}
      professores={[]}
      usuario={{ nome: "Admin Teste" }}
      {...props}
    />
  );
}

// PROMPT-agente-tela-inscricoes.md, item 9: "Taxa de aprovacao" (sempre
// 100% desde que matricula deixou de ser aprovada manualmente) vira "Taxa
// de conclusao" = concluiram/inscritos, com os mesmos dados de GET
// /Cursos/inscricoes sem filtro de periodo.
describe("DashboardAdmin - KPI 'Taxa de conclusao'", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("soma concluiram/inscritos de todos os cursos de GET /Cursos/inscricoes", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/inscricoes") {
        return Promise.resolve([
          { cursoId: 1, inscritos: 5, comecaram: 5, concluiram: 4 },
          { cursoId: 2, inscritos: 2, comecaram: 2, concluiram: 1 }
        ]);
      }
      return Promise.resolve([]);
    });

    renderDashboard();

    // (4 + 1) / (5 + 2) = 71,4% arredondado pra 71%.
    expect(await screen.findByText("71%")).toBeInTheDocument();
    expect(screen.getByText("Taxa de conclusao")).toBeInTheDocument();
    expect(screen.queryByText("Taxa de aprovacao")).not.toBeInTheDocument();
  });

  test("sem nenhum inscrito, mostra 0% em vez de quebrar", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/inscricoes") {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderDashboard();

    expect(await screen.findByRole("article", { name: "Taxa de conclusao: 0%" })).toBeInTheDocument();
  });
});
