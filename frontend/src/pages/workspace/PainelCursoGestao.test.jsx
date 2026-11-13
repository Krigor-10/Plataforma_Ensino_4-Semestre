import { render, screen, waitFor, within } from "@testing-library/react";
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

  test("aba Avaliacoes do curso: card fechado nao mostra metricas, abre com as 5 metricas e so um fica aberto por vez (aria-expanded)", async () => {
    mockApi(DESEMPENHO);
    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("tab", { name: /Avaliacoes do curso/ }));

    expect(screen.queryByText("Participantes")).not.toBeInTheDocument();

    const botaoModuloA = screen.getByRole("button", { name: /Prova do modulo A/ });
    const botaoProvaSolta = screen.getByRole("button", { name: /Prova solta do curso/ });

    await userEvent.click(botaoModuloA);

    expect(botaoModuloA).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Participantes")).toBeInTheDocument();
    expect(screen.getByText("Nota média")).toBeInTheDocument();
    expect(screen.getByText("Nota máxima")).toBeInTheDocument();
    expect(screen.getByText("Conclusão")).toBeInTheDocument();
    expect(screen.getByText("Aproveitamento")).toBeInTheDocument();
    expect(screen.getByText("5,0")).toBeInTheDocument();

    await userEvent.click(botaoProvaSolta);

    expect(botaoProvaSolta).toHaveAttribute("aria-expanded", "true");
    expect(botaoModuloA).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(botaoProvaSolta);

    expect(botaoProvaSolta).toHaveAttribute("aria-expanded", "false");
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

  test("perfil Admin mostra Foto de capa e Coordenador, nao mostra Novo modulo nem Encerrar curso", async () => {
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
    expect(screen.queryByRole("button", { name: /Novo modulo/ })).not.toBeInTheDocument();
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

describe("PainelCursoGestao - confirmacao ao encerrar e reabrir curso", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const CURSO_GRATUITO_CONCLUIDO = { ...CURSO, modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };
  const CURSO_ACOMPANHADO_CONCLUIDO = { ...CURSO, modeloCurso: 3, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };
  const CURSO_GRATUITO_ENCERRADO = { ...CURSO_GRATUITO_CONCLUIDO, encerradoEm: "2026-02-01T12:00:00" };
  const CURSO_ACOMPANHADO_ENCERRADO = { ...CURSO_ACOMPANHADO_CONCLUIDO, encerradoEm: "2026-02-01T12:00:00" };

  test("Gratuito: abre a confirmacao com data, alunos e aviso de reabrir depois; Cancelar nao chama a API", async () => {
    mockApi(DESEMPENHO);
    const onEncerrarCurso = vi.fn();

    renderPainel({ curso: CURSO_GRATUITO_CONCLUIDO, onEncerrarCurso });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Encerrar curso/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/10\/01/)).toBeInTheDocument();
    expect(within(dialog).getByText(/5 alunos matriculados continuam/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Admin é avisado/)).toBeInTheDocument();
    expect(within(dialog).getByText(/reabrir depois/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onEncerrarCurso).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("Gratuito: confirmar chama onEncerrarCurso uma vez e fecha a janela", async () => {
    mockApi(DESEMPENHO);
    const onEncerrarCurso = vi.fn().mockResolvedValue(undefined);

    renderPainel({ curso: CURSO_GRATUITO_CONCLUIDO, onEncerrarCurso });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Encerrar curso/ }));

    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar curso" }));

    expect(onEncerrarCurso).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("Acompanhado: mostra certificado automatico, aviso de certificados nao desfeitos e botao 'Encerrar e emitir certificados'", async () => {
    mockApi(DESEMPENHO);
    const onEncerrarCurso = vi.fn().mockResolvedValue(undefined);

    renderPainel({ curso: CURSO_ACOMPANHADO_CONCLUIDO, onEncerrarCurso });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Encerrar curso/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/recebem o certificado automaticamente/)).toBeInTheDocument();
    expect(within(dialog).getByText(/não são desfeitos/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Admin é avisado/)).not.toBeInTheDocument();

    const botaoConfirmar = within(dialog).getByRole("button", { name: "Encerrar e emitir certificados" });
    await userEvent.click(botaoConfirmar);

    expect(onEncerrarCurso).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("Reabrir: abre confirmacao, Cancelar nao chama nada e confirmar chama onReabrirCurso uma vez", async () => {
    mockApi(DESEMPENHO);
    const onReabrirCurso = vi.fn().mockResolvedValue(undefined);

    renderPainel({ curso: CURSO_GRATUITO_ENCERRADO, onReabrirCurso });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Reabrir curso/ }));

    const dialogCancelar = screen.getByRole("dialog");
    await userEvent.click(within(dialogCancelar).getByRole("button", { name: "Cancelar" }));

    expect(onReabrirCurso).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Reabrir curso/ }));
    const dialogConfirmar = screen.getByRole("dialog");
    await userEvent.click(within(dialogConfirmar).getByRole("button", { name: "Reabrir curso" }));

    expect(onReabrirCurso).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("Reabrir no Acompanhamento: mostra que os certificados ja emitidos continuam validos", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ curso: CURSO_ACOMPANHADO_ENCERRADO, onReabrirCurso: vi.fn() });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Reabrir curso/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/certificados já emitidos continuam válidos/)).toBeInTheDocument();
  });
});
