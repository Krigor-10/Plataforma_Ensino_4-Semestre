import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import PainelCursoGestao from "./PainelCursoGestao.jsx";
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

// Modulo A tem 1 quiz publicado (conta), 1 quiz arquivado (nunca aparece em
// lugar nenhum) e 1 prova vinculada ao modulo (nao pode sumir - vai pra aba
// "Avaliacoes do curso"). Modulo B fica vazio.
const DESEMPENHO = {
  cursoId: 10,
  cursoTitulo: "Curso Teste",
  totalAlunos: 5,
  alunosAtivos: 5,
  progressoMedio: 42,
  percentualConclusao: 10,
  desempenhoMedio: 7.5,
  certificadosEmitidos: 1,
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
      avaliacoes: [
        { avaliacaoId: 101, titulo: "Quiz publicado", tipoAvaliacao: 1, statusPublicacao: 2, totalParticipantes: 1, mediaNota: 0, notaMaxima: 10 },
        { avaliacaoId: 102, titulo: "Quiz arquivado", tipoAvaliacao: 1, statusPublicacao: 3, totalParticipantes: 0, mediaNota: 0, notaMaxima: 10 },
        { avaliacaoId: 103, titulo: "Prova do modulo A", tipoAvaliacao: 2, statusPublicacao: 2, totalParticipantes: 1, mediaNota: 5, notaMaxima: 10 }
      ]
    },
    { moduloId: 2, titulo: "Modulo B", totalMateriais: 0, progressoMedio: 10, percentualConclusao: 0, desempenhoMedio: 0, materiais: [], avaliacoes: [] }
  ],
  avaliacoesSemModulo: [
    { avaliacaoId: 200, titulo: "Prova solta do curso", tipoAvaliacao: 2, statusPublicacao: 2, totalParticipantes: 2, mediaNota: 6, notaMaxima: 10 }
  ]
};

function renderPainel(props = {}) {
  return render(
    <ToastProvider>
      <PainelCursoGestao
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

function mockApi(desempenho, professoresDoCurso = []) {
  apiRequest.mockImplementation((url) => {
    if (url === "/Cursos/10/desempenho") return Promise.resolve(desempenho);
    if (url === "/Cursos/10/professores") return Promise.resolve(professoresDoCurso);
    return Promise.resolve([]);
  });
}

describe("PainelCursoGestao", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("junta o desempenho por moduloId mantendo a ordem de criacao do snapshot", async () => {
    mockApi(DESEMPENHO);

    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    const titulosModulos = screen.getAllByText(/^Modulo [AB]$/).map((elemento) => elemento.textContent);
    expect(titulosModulos).toEqual(["Modulo B", "Modulo A"]);
  });

  test("KPI Certificados mostra 'N de T' e o KPI Concluiram nao existe mais", async () => {
    mockApi(DESEMPENHO);
    const { container } = renderPainel();

    await waitFor(() => expect(container.textContent).toContain("1 de 5"));
    expect(screen.getByText("Certificados")).toBeInTheDocument();
    expect(screen.queryByText("Concluiram")).not.toBeInTheDocument();
  });

  test("modulo conta e lista so quiz nao arquivado - prova vinculada vai pra aba Avaliacoes do curso", async () => {
    mockApi(DESEMPENHO);
    const { container } = renderPainel();

    await waitFor(() => expect(container.textContent).toContain("1 conteudo · 1 quiz"));

    expect(screen.queryByText("Quiz arquivado")).not.toBeInTheDocument();
    expect(screen.queryByText("Prova do modulo A")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Modulo A"));

    await waitFor(() => expect(container.textContent).toContain("Quiz publicado"));
    expect(screen.getByText("Desempenho medio")).toBeInTheDocument();
    expect(screen.queryByText("Quiz arquivado")).not.toBeInTheDocument();
    expect(screen.queryByText("Prova do modulo A")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Avaliacoes do curso/ }));

    expect(screen.getByText("Prova do modulo A")).toBeInTheDocument();
    expect(screen.getByText("Prova solta do curso")).toBeInTheDocument();
  });

  test("botao Professores abre modal com carregamento antes da lista", async () => {
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

    expect(screen.queryByText("Carregando professores...")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Professores/ }));

    expect(await screen.findByText("Carregando professores...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum professor vinculado a este curso ainda.")).not.toBeInTheDocument();

    resolverProfessores([]);

    await waitFor(() => expect(screen.getByText("Nenhum professor vinculado a este curso ainda.")).toBeInTheDocument());
  });

  test("desempenho com erro: mostra mensagem, mantem modulos e acoes do menu com — nos percentuais", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.reject(new Error("Falha de rede"));
      if (url === "/Cursos/10/professores") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPainel();

    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();

    expect(screen.getByText("Modulo A")).toBeInTheDocument();
    expect(screen.getByText("Modulo B")).toBeInTheDocument();
    expect(screen.getByText("2 conteudos · 1 quiz")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);

    await userEvent.click(screen.getByLabelText("Opcoes para Modulo A"));
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  test("sem avaliacao de curso (toda avaliacao e quiz), a aba Avaliacoes do curso nao aparece", async () => {
    mockApi({ ...DESEMPENHO, avaliacoesSemModulo: [], modulos: [{ ...DESEMPENHO.modulos[0], avaliacoes: DESEMPENHO.modulos[0].avaliacoes.filter((a) => a.tipoAvaliacao === 1) }, DESEMPENHO.modulos[1]] });

    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.queryByRole("tab", { name: /Avaliacoes do curso/ })).not.toBeInTheDocument();
  });

  test("perfil Admin mostra Foto de capa, Coordenador e Novo modulo, e nao mostra Encerrar curso", async () => {
    mockApi(DESEMPENHO);

    const cursoAcompanhadoConcluido = { ...CURSO, modeloCurso: 3, concluidoPeloProfessorEm: "2026-01-01", coordenadorId: 7 };

    renderPainel({
      coordenadores: [{ id: 7, nome: "Coordenadora Teste" }],
      curso: cursoAcompanhadoConcluido,
      onAlterarFotoCurso: vi.fn(),
      onAtribuirCoordenador: vi.fn(),
      perfil: "Admin"
    });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Foto de capa/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coordenador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo modulo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Encerrar curso/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Coordenacao: Coordenadora Teste/)).toBeInTheDocument();
  });

  test("perfil Admin sem coordenador: botao vira 'Atribuir coordenador' e subtitulo mostra 'Sem coordenacao'", async () => {
    mockApi(DESEMPENHO);

    renderPainel({
      coordenadores: [],
      onAlterarFotoCurso: vi.fn(),
      onAtribuirCoordenador: vi.fn(),
      perfil: "Admin"
    });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Atribuir coordenador/ })).toBeInTheDocument();
    expect(screen.getByText(/Sem coordenacao/)).toBeInTheDocument();
  });

  test("perfil Coordenador (default) nao mostra as acoes exclusivas do Admin", async () => {
    mockApi(DESEMPENHO);

    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /Foto de capa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Atribuir coordenador/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coordenador" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo modulo/ })).not.toBeInTheDocument();
  });
});
