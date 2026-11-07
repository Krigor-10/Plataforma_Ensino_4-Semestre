import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import PainelCursoCoordenador from "./PainelCursoCoordenador.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const CURSO = { id: 10, titulo: "Curso Teste", codigoRegistro: "CUR-010", descricao: "", modeloCurso: 2 };

// Ordem de criacao (dataCriacao) coloca "Modulo B" ANTES de "Modulo A", mesmo
// o array trazendo "Modulo A" primeiro e o DTO de desempenho tambem listando
// "Modulo A" primeiro - testa que a juncao usa a ordem do snapshot, nao a do
// array nem a do DTO.
const MODULOS_SNAPSHOT = [
  { id: 1, cursoId: 10, titulo: "Modulo A", dataCriacao: "2026-01-02", totalConteudos: 2, totalAvaliacoes: 1 },
  { id: 2, cursoId: 10, titulo: "Modulo B", dataCriacao: "2026-01-01", totalConteudos: 1, totalAvaliacoes: 0 }
];

const DESEMPENHO = {
  cursoId: 10,
  cursoTitulo: "Curso Teste",
  totalAlunos: 5,
  alunosAtivos: 5,
  progressoMedio: 42,
  percentualConclusao: 10,
  desempenhoMedio: 7.5,
  modulos: [
    {
      moduloId: 1,
      titulo: "Modulo A",
      totalMateriais: 1,
      progressoMedio: 60,
      percentualConclusao: 20,
      desempenhoMedio: 8,
      materiais: [
        { conteudoDidaticoId: 1, titulo: "Conteudo 1", tipoConteudo: 1, statusPublicacao: 2, alunosConcluiram: 2, percentualConclusao: 50 }
      ],
      avaliacoes: []
    },
    { moduloId: 2, titulo: "Modulo B", totalMateriais: 0, progressoMedio: 10, percentualConclusao: 0, desempenhoMedio: 0, materiais: [], avaliacoes: [] }
  ],
  avaliacoesSemModulo: []
};

function renderPainel(props = {}) {
  return render(
    <ToastProvider>
      <PainelCursoCoordenador
        curso={CURSO}
        modulos={MODULOS_SNAPSHOT}
        onEditarCurso={vi.fn()}
        onEncerrarCurso={vi.fn()}
        onReabrirCurso={vi.fn()}
        onRefresh={vi.fn()}
        onSessionExpired={vi.fn()}
        onVoltar={vi.fn()}
        professores={[]}
        salvandoCurso={false}
        {...props}
      />
    </ToastProvider>
  );
}

describe("PainelCursoCoordenador", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("junta o desempenho por moduloId mantendo a ordem de criacao do snapshot", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.resolve(DESEMPENHO);
      if (url === "/Cursos/10/professores") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    const titulosModulos = screen.getAllByText(/^Modulo [AB]$/).map((elemento) => elemento.textContent);
    expect(titulosModulos).toEqual(["Modulo B", "Modulo A"]);
  });

  test("abrir um modulo usa a contagem do desempenho carregado (materiais/avaliacoes), nao os totais do snapshot", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.resolve(DESEMPENHO);
      if (url === "/Cursos/10/professores") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const { container } = renderPainel();

    await waitFor(() => expect(container.textContent).toContain("1 conteudo · 0 avaliacaoes"));

    await userEvent.click(screen.getByText("Modulo A"));

    expect(await screen.findByText("Progresso")).toBeInTheDocument();
    expect(screen.getByText("Conteudo 1")).toBeInTheDocument();
  });

  test("enquanto carrega professores, mostra 'Carregando professores...' antes da lista", async () => {
    let resolverProfessores;
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.resolve(DESEMPENHO);
      if (url === "/Cursos/10/professores") {
        return new Promise((resolve) => {
          resolverProfessores = resolve;
        });
      }
      return Promise.resolve([]);
    });

    renderPainel({ professores: [{ id: 1, nome: "Professor Teste" }] });

    expect(await screen.findByText("Carregando professores...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum professor vinculado a este curso ainda.")).not.toBeInTheDocument();

    resolverProfessores([]);

    await waitFor(() => expect(screen.getByText("Nenhum professor vinculado a este curso ainda.")).toBeInTheDocument());
  });

  test("desempenho com erro: mostra mensagem, mantem modulos e acoes com — nos percentuais", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.reject(new Error("Falha de rede"));
      if (url === "/Cursos/10/professores") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPainel();

    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();

    expect(screen.getByText("Modulo A")).toBeInTheDocument();
    expect(screen.getByText("Modulo B")).toBeInTheDocument();
    expect(screen.getByText("2 conteudos · 1 avaliacao")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Novo modulo")).toBeInTheDocument();
  });
});
