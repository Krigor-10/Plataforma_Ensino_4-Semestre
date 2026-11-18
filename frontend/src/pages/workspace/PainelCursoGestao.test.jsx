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

function painelJsx(props = {}) {
  return (
    <ToastProvider>
      <PainelCursoGestao
        curso={CURSO}
        modulos={MODULOS_SNAPSHOT}
        onEditarCurso={vi.fn()}
        onEncerrarCurso={vi.fn()}
        onNavigate={vi.fn()}
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

function renderPainel(props = {}) {
  return render(painelJsx(props));
}

// Fluxo-coordenador Parte 3/3 ("Ver conteudo"): payload de GET
// /Cursos/{id}/revisao-conteudo - so o que e Publicado, questoes com gabarito.
const REVISAO_CONTEUDO = {
  cursoId: 10,
  cursoTitulo: "Curso Teste",
  modulos: [
    {
      id: 1,
      titulo: "Modulo A",
      conteudos: [
        { id: 1, titulo: "Material revisado", tipoConteudo: 1, statusPublicacao: 2, corpoTexto: "Texto do material", arquivoUrl: "", linkUrl: "" }
      ],
      avaliacoes: [
        {
          avaliacao: { id: 101, titulo: "Quiz publicado", tipoAvaliacao: 1, statusPublicacao: 2, conteudoDidaticoId: null, totalQuestoes: 1 },
          questoes: [
            {
              id: 1,
              enunciado: "Qual a resposta certa?",
              alternativas: [
                { id: 1, letra: "A", texto: "Alternativa errada", ehCorreta: false },
                { id: 2, letra: "B", texto: "Alternativa certa", ehCorreta: true }
              ],
              afirmativas: []
            }
          ]
        }
      ]
    }
  ],
  avaliacoesSemModulo: []
};

function mockApi(desempenho, professoresDoCurso = [], revisaoConteudo = REVISAO_CONTEUDO) {
  apiRequest.mockImplementation((url) => {
    if (url === "/Cursos/10/desempenho") return Promise.resolve(desempenho);
    if (url === "/Cursos/10/professores") return Promise.resolve(professoresDoCurso);
    if (url === "/Cursos/10/revisao-conteudo") return Promise.resolve(revisaoConteudo);
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

  test("modulo conta so quiz nao arquivado e navega pra tela do modulo ao clicar - prova vinculada vai pra aba Avaliacoes do curso", async () => {
    mockApi(DESEMPENHO);
    const onNavigate = vi.fn();
    const { container } = renderPainel({ onNavigate });

    await waitFor(() => expect(container.textContent).toContain("1 conteudo · 1 quiz"));

    expect(screen.queryByText("Quiz arquivado")).not.toBeInTheDocument();
    expect(screen.queryByText("Prova do modulo A")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Modulo A"));
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10/modulos/1");

    await userEvent.click(screen.getByRole("tab", { name: /Avaliacoes do curso/ }));

    expect(screen.getByText("Prova do modulo A")).toBeInTheDocument();
    expect(screen.getByText("Prova solta do curso")).toBeInTheDocument();
  });

  // A aba parou de ser acordeao - cada cartao navega pra tela propria da
  // avaliacao (docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-propria.md).
  test("aba Avaliacoes do curso: cartao nao abre acordeao, navega pra tela da avaliacao ao clicar", async () => {
    mockApi(DESEMPENHO);
    const onNavigate = vi.fn();
    renderPainel({ onNavigate });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("tab", { name: /Avaliacoes do curso/ }));

    expect(screen.queryByText("Participantes")).not.toBeInTheDocument();

    const botaoProvaSolta = screen.getByRole("button", { name: /Prova solta do curso/ });
    expect(botaoProvaSolta).not.toHaveAttribute("aria-expanded");

    await userEvent.click(botaoProvaSolta);

    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10/avaliacoes/200");
    expect(screen.queryByText("Participantes")).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /Editar curso/ })).toBeInTheDocument();
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
    // docs/fluxo-coordenador/partes/PARTE-2: titulo/descricao viram texto de
    // venda, editar curso agora e exclusivo do Admin.
    expect(screen.queryByRole("button", { name: /Editar curso/ })).not.toBeInTheDocument();
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

// PROMPT-agente-progresso-e-trava-ao-concluir.md, Parte A: "Travar +
// devolver" - o coordenador desfaz a conclusao do professor sem precisar
// encerrar e reabrir so pra isso.
describe("PainelCursoGestao - devolver ao professor", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const CURSO_GRATUITO_CONCLUIDO = { ...CURSO, modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };
  const CURSO_PACOTE_VINDO_DO_GRATUITO = { ...CURSO, modeloCurso: 2, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };

  test("Gratuito concluido: mostra 'Devolver ao professor' ao lado de 'Encerrar curso'", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ curso: CURSO_GRATUITO_CONCLUIDO });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Encerrar curso/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Devolver ao professor/ })).toBeInTheDocument();
  });

  test("pacote vindo do Gratuito (concluidoPeloProfessorEm preenchido) nao mostra 'Devolver ao professor'", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ curso: CURSO_PACOTE_VINDO_DO_GRATUITO });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /Devolver ao professor/ })).not.toBeInTheDocument();
  });

  test("abre o dialogo com campo de motivo opcional; Cancelar nao chama a API", async () => {
    mockApi(DESEMPENHO);
    const onDevolverAoProfessor = vi.fn();

    renderPainel({ curso: CURSO_GRATUITO_CONCLUIDO, onDevolverAoProfessor });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Devolver ao professor/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/Motivo \(opcional\)/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onDevolverAoProfessor).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("confirmar com motivo preenchido chama onDevolverAoProfessor com o texto digitado e fecha a janela", async () => {
    mockApi(DESEMPENHO);
    const onDevolverAoProfessor = vi.fn().mockResolvedValue(undefined);

    renderPainel({ curso: CURSO_GRATUITO_CONCLUIDO, onDevolverAoProfessor });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Devolver ao professor/ }));

    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Motivo \(opcional\)/), "Falta corrigir o modulo 2.");
    await userEvent.click(within(dialog).getByRole("button", { name: /Devolver ao professor/ }));

    expect(onDevolverAoProfessor).toHaveBeenCalledWith("Falta corrigir o modulo 2.");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("Reabrir Gratuito: o texto explica que o curso volta pro professor e precisa concluir de novo", async () => {
    mockApi(DESEMPENHO);
    const cursoGratuitoEncerrado = { ...CURSO_GRATUITO_CONCLUIDO, encerradoEm: "2026-02-01T12:00:00" };

    renderPainel({ curso: cursoGratuitoEncerrado, onReabrirCurso: vi.fn() });

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Reabrir curso/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/precisa concluir de novo/)).toBeInTheDocument();
  });
});

describe("PainelCursoGestao - tela do modulo (docs/fluxo-coordenador/PROMPT-agente-modulo-tela-propria.md)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("nao existe mais botao 'Ver conteudo' no topo do curso", async () => {
    mockApi(DESEMPENHO);

    renderPainel();

    await waitFor(() => expect(screen.getByText("Modulo A")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /Ver conteúdo/ })).not.toBeInTheDocument();
  });

  test("migalha, titulo, KPIs e secoes Conteudos/Quizzes com as metricas do modulo (singular/plural, sem Media no quiz)", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ moduloIdSelecionado: 1 });

    // "← Voltar" pelo componente padrao (BotaoVoltar.jsx), nao mais um botao
    // so com seta dentro do caminho - docs/fluxo-coordenador/PROMPT-agente-
    // modulo-caminho-e-voltar.md.
    expect(screen.getByRole("button", { name: "Voltar para Módulos" })).toBeInTheDocument();

    const migalha = await screen.findByRole("navigation", { name: "Caminho até o módulo" });
    expect(within(migalha).getByRole("button", { name: "Cursos" })).toBeInTheDocument();
    expect(within(migalha).getByRole("button", { name: "Curso Teste" })).toBeInTheDocument();
    expect(within(migalha).getByText("Modulo A")).toBeInTheDocument();
    expect(within(migalha).getAllByRole("button")).toHaveLength(2);

    // O caminho entrou pro header (alinha com os KPIs, docs/fluxo-
    // coordenador/PROMPT-agente-avaliacao-tela-limpa.md, item 1).
    expect(migalha.closest("header")).toHaveClass("modulo-gestao__cabecalho");

    expect(screen.getByRole("heading", { level: 3, name: /Conteúdos/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Quizzes/ })).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();

    // Cartoes do modulo (docs/fluxo-coordenador/PROMPT-agente-modulo-
    // cartao-seta-e-metrica.md): sem a linha de concluintes/participantes,
    // ja repetida pelos KPIs do topo (Progresso/Conclusao).
    expect(screen.queryByText(/alunos? conclu[ií]u?ram?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/participante/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Média/)).not.toBeInTheDocument();
    expect(screen.getByText("Quiz · 1 questão")).toBeInTheDocument();

    // Desktop (jsdom default >= 768px): o 1o item (Material revisado) ja
    // abre sozinho, sem precisar clicar - prompt-agente-modulo-tela-
    // melhorias.md, item 5.
    expect(await screen.findByRole("heading", { name: "Material revisado" })).toBeInTheDocument();
  });

  test("abrir um material mostra Somente leitura, sem nenhum botao de editar/publicar/excluir (Admin e Coordenador)", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ moduloIdSelecionado: 1, perfil: "Admin" });

    expect(await screen.findByText("Somente leitura")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Publicar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
  });

  test("abrir o quiz mostra o gabarito com a alternativa correta marcada", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ moduloIdSelecionado: 1 });

    await screen.findByRole("heading", { name: "Material revisado" });
    await userEvent.click(screen.getByText("Quiz publicado"));

    await waitFor(() => expect(screen.getByText("Qual a resposta certa?")).toBeInTheDocument());

    // A previa (PreviaItemAluno) mostra o item exatamente como o aluno ve -
    // sem metrica de participantes, que nao faz parte dessa visao (docs/
    // TelaConteudosProfessor/PROMPT-agente-fluxo-professor-igual-
    // coordenador.md, etapa 1). O tipo aparece em maiusculo no cabecalho.
    expect(screen.getByText("QUIZ")).toBeInTheDocument();
    expect(screen.queryByText(/participante/)).not.toBeInTheDocument();

    const itemAlternativaCerta = screen.getByText(
      (_, element) =>
        element.tagName === "LI" &&
        element.className.includes("revisao-alternativas__item") &&
        element.textContent.includes("Alternativa certa")
    );
    expect(itemAlternativaCerta).toHaveClass("revisao-alternativas__item--correta");
  });

  // docs/bugs/PROMPT-agente-modulo-botoes-anterior-proximo.md: textos
  // curtos e fixos ("Anterior"/"Próximo") no lugar de "Item anterior:
  // <titulo completo>", que ficava cortado - o nome do item vizinho vai
  // pro `title` (dica do mouse) em vez do texto visivel.
  test("desktop: item anterior/proximo andam dentro do modulo, com texto fixo e o vizinho no title, desativados nas pontas", async () => {
    mockApi(DESEMPENHO);

    renderPainel({ moduloIdSelecionado: 1 });

    expect(await screen.findByRole("heading", { name: "Material revisado" })).toBeInTheDocument();

    const botaoAnterior = screen.getByRole("button", { name: "Item anterior" });
    const botaoProximo = screen.getByRole("button", { name: "Próximo item" });

    expect(botaoAnterior).toHaveTextContent("Anterior");
    expect(botaoProximo).toHaveTextContent("Próximo");
    expect(botaoAnterior).toBeDisabled();
    expect(botaoAnterior).not.toHaveAttribute("title");
    expect(botaoProximo).not.toBeDisabled();
    expect(botaoProximo).toHaveAttribute("title", "Quiz publicado");
    expect(screen.getByText("Item 1 de 2")).toBeInTheDocument();

    await userEvent.click(botaoProximo);
    expect(await screen.findByRole("heading", { name: "Quiz publicado" })).toBeInTheDocument();
    expect(botaoAnterior).not.toBeDisabled();
    expect(botaoAnterior).toHaveAttribute("title", "Material revisado");
    expect(botaoProximo).toBeDisabled();
    expect(screen.getByText("Item 2 de 2")).toBeInTheDocument();
  });

  test("desktop: trocar de modulo abre o 1o item do novo modulo", async () => {
    mockApi(DESEMPENHO);
    const { rerender } = renderPainel({ moduloIdSelecionado: 2 });

    expect(await screen.findByText("Este módulo ainda não tem conteúdo publicado.")).toBeInTheDocument();

    rerender(painelJsx({ moduloIdSelecionado: 1 }));

    expect(await screen.findByRole("heading", { name: "Material revisado" })).toBeInTheDocument();
  });

  test("celular (< 768px): nenhum item abre sozinho, e Fechar fecha sem reabrir", async () => {
    const larguraOriginal = window.innerWidth;
    window.innerWidth = 480;
    window.dispatchEvent(new Event("resize"));

    mockApi(DESEMPENHO);
    renderPainel({ moduloIdSelecionado: 1 });

    await waitFor(() => expect(screen.getByText("Material revisado")).toBeInTheDocument());
    expect(screen.queryByText("Somente leitura")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Material revisado"));
    expect(await screen.findByText("Somente leitura")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText("Somente leitura")).not.toBeInTheDocument();
    expect(screen.getByText("Escolha um conteúdo ou quiz para ver aqui.")).toBeInTheDocument();

    window.innerWidth = larguraOriginal;
    window.dispatchEvent(new Event("resize"));
  });

  test("modulo sem nada publicado mostra o aviso e o rodape de modulo anterior/proximo navega", async () => {
    mockApi(DESEMPENHO);
    const onNavigate = vi.fn();

    renderPainel({ moduloIdSelecionado: 2, onNavigate });

    expect(await screen.findByText("Este módulo ainda não tem conteúdo publicado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Módulo anterior/ })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Próximo módulo: Modulo A/ }));
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10/modulos/1");
  });

  test("moduloId que nao pertence ao curso volta pra lista de modulos (replace)", async () => {
    mockApi(DESEMPENHO);
    const onNavigate = vi.fn();

    renderPainel({ moduloIdSelecionado: 999, onNavigate });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10", { replace: true }));
  });

  test("erro ao carregar o modulo mostra mensagem com 'Tentar de novo'", async () => {
    apiRequest.mockImplementation((url) => {
      if (url === "/Cursos/10/desempenho") return Promise.resolve(DESEMPENHO);
      if (url === "/Cursos/10/revisao-conteudo") return Promise.reject(new Error("Falha ao carregar modulo"));
      return Promise.resolve([]);
    });

    renderPainel({ moduloIdSelecionado: 1 });

    expect(await screen.findByText("Falha ao carregar modulo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});

// Fluxo-coordenador: avaliacoes do curso em tela propria (docs/fluxo-
// coordenador/PROMPT-agente-avaliacao-tela-propria.md) - mesmo fluxo da
// tela do modulo acima, so que pra "Prova Completa"/"Prova Rascunho".
// "Prova Rascunho" (501) propositalmente so existe em DESEMPENHO_AVALIACOES
// (numeros) e nao em REVISAO_AVALIACOES (questoes) - simula uma avaliacao
// que esta na lista mas ainda nao foi publicada.
const DESEMPENHO_AVALIACOES = {
  cursoId: 10,
  cursoTitulo: "Curso Teste",
  totalAlunos: 3,
  alunosAtivos: 3,
  progressoMedio: 0,
  percentualConclusao: 0,
  desempenhoMedio: 0,
  certificadosEmitidos: 0,
  modulos: [],
  avaliacoesSemModulo: [
    {
      avaliacaoId: 500,
      titulo: "Prova Completa",
      tipoAvaliacao: 2,
      totalParticipantes: 3,
      mediaNota: 7,
      notaMaxima: 10,
      percentualConclusao: 80,
      percentualAproveitamento: 70
    },
    {
      avaliacaoId: 501,
      titulo: "Prova Rascunho",
      tipoAvaliacao: 2,
      totalParticipantes: 0,
      mediaNota: 0,
      notaMaxima: 10,
      percentualConclusao: 0,
      percentualAproveitamento: 0
    }
  ]
};

const REVISAO_AVALIACOES = {
  cursoId: 10,
  cursoTitulo: "Curso Teste",
  modulos: [],
  avaliacoesSemModulo: [
    {
      avaliacao: {
        id: 500,
        titulo: "Prova Completa",
        descricao: "Descricao da prova",
        notaMaxima: 10,
        tempoLimiteMinutos: 30,
        tentativasPermitidas: 2,
        dataAbertura: null,
        dataFechamento: null,
        moduloId: null,
        moduloTitulo: "",
        totalQuestoes: 2
      },
      questoes: [
        {
          id: 1,
          ordem: 1,
          enunciado: "Primeira pergunta",
          pontos: 1,
          dificuldade: 1,
          contexto: "",
          alternativas: [
            { id: 1, letra: "A", texto: "Errada", ehCorreta: false },
            { id: 2, letra: "B", texto: "Certa", ehCorreta: true }
          ],
          afirmativas: [],
          anexos: []
        },
        {
          id: 2,
          ordem: 2,
          enunciado: "Segunda pergunta",
          pontos: 1,
          dificuldade: 3,
          contexto: "",
          alternativas: [{ id: 3, letra: "A", texto: "Certa 2", ehCorreta: true }],
          afirmativas: [],
          anexos: []
        }
      ]
    }
  ]
};

function mockApiAvaliacoes() {
  apiRequest.mockImplementation((url) => {
    if (url === "/Cursos/10/desempenho") return Promise.resolve(DESEMPENHO_AVALIACOES);
    if (url === "/Cursos/10/revisao-conteudo") return Promise.resolve(REVISAO_AVALIACOES);
    return Promise.resolve([]);
  });
}

describe("PainelCursoGestao - tela da avaliacao (docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-propria.md)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-limpa.md: caminho
  // entrou pro header (alinha com os KPIs), sem "Somente leitura" no
  // titulo, resumo numa linha so (sem pilulas nem "avaliacao X de Y").
  test("caminho dentro do header, sem 'Somente leitura' no titulo, resumo numa linha so e descricao", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 500 });

    expect(await screen.findByRole("button", { name: "Voltar para Avaliações" })).toBeInTheDocument();

    const cabecalho = screen.getByRole("heading", { name: "Prova Completa" }).closest("header");
    const migalha = within(cabecalho).getByRole("navigation", { name: "Caminho até a avaliação" });
    expect(within(migalha).getByRole("button", { name: "Avaliações" })).toBeInTheDocument();
    expect(within(migalha).getByText("Avaliação 01")).toBeInTheDocument();

    expect(screen.queryByText("Somente leitura")).not.toBeInTheDocument();
    expect(screen.queryByText(/avaliação \d+ de \d+/i)).not.toBeInTheDocument();

    expect(screen.getByText("Tempo 30 min")).toBeInTheDocument();
    expect(screen.getByText("2 tentativas")).toBeInTheDocument();
    expect(screen.getByText("Descricao da prova")).toBeInTheDocument();

    expect(await screen.findByText("Primeira pergunta")).toBeInTheDocument();
  });

  test("sem participantes mostra a faixa; com participantes mostra os 4 KPIs", async () => {
    mockApiAvaliacoes();
    const { rerender } = renderPainel({ avaliacaoIdSelecionada: 501 });

    expect(await screen.findByText("Nenhum aluno fez esta prova ainda.")).toBeInTheDocument();
    expect(screen.queryByText("Participantes")).not.toBeInTheDocument();

    rerender(painelJsx({ avaliacaoIdSelecionada: 500 }));

    expect(await screen.findByText("Participantes")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum aluno fez esta prova ainda.")).not.toBeInTheDocument();
  });

  // jsdom nao calcula layout (flex/largura real) - este teste so garante a
  // estrutura/classe que o CSS depende pra nao espremer a questao
  // (docs/bugs/PROMPT-agente-avaliacao-questao-espremida.md); a largura em
  // si foi conferida visualmente no app real.
  test("indice e a questao ficam lado a lado dentro do corpo, cada um com a classe que o CSS usa pro layout", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 500 });

    const indice = await screen.findByRole("navigation", { name: "Questões" });
    const questao = screen.getByText("Primeira pergunta").closest(".avaliacao-gestao__questao");

    expect(questao).not.toBeNull();
    expect(indice.parentElement).toHaveClass("avaliacao-gestao__corpo");
    expect(questao.parentElement).toBe(indice.parentElement);
  });

  test("sem nenhum botao de editar/publicar/excluir/arquivar (Admin e Coordenador)", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 500, perfil: "Admin" });

    await screen.findByText("Primeira pergunta");
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Publicar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Arquivar/ })).not.toBeInTheDocument();
  });

  test("indice e anterior/proximo da questao andam e ficam desativados nas pontas", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 500 });

    expect(await screen.findByText("Primeira pergunta")).toBeInTheDocument();
    expect(screen.getByText("Questão 1 de 2")).toBeInTheDocument();

    const indiceNav = screen.getByRole("navigation", { name: "Questões" });
    const rodapeQuestao = screen.getByText("Questão 1 de 2").closest("footer");

    expect(within(indiceNav).getByRole("button", { name: "Questão 1" })).toHaveAttribute("aria-current", "true");
    expect(within(rodapeQuestao).getByRole("button", { name: "Questão anterior" })).toBeDisabled();
    expect(within(rodapeQuestao).getByRole("button", { name: "Próxima questão" })).not.toBeDisabled();
    expect(within(rodapeQuestao).queryByText(/Questão 0/)).not.toBeInTheDocument();

    await userEvent.click(within(indiceNav).getByRole("button", { name: "Questão 2" }));

    expect(await screen.findByText("Segunda pergunta")).toBeInTheDocument();
    expect(screen.getByText("Questão 2 de 2")).toBeInTheDocument();
    expect(within(rodapeQuestao).getByRole("button", { name: "Próxima questão" })).toBeDisabled();
    expect(within(rodapeQuestao).getByRole("button", { name: "Questão anterior" })).not.toBeDisabled();

    await userEvent.click(within(rodapeQuestao).getByRole("button", { name: "Questão anterior" }));
    expect(await screen.findByText("Primeira pergunta")).toBeInTheDocument();
  });

  // docs/bugs/PROMPT-agente-avaliacao-botoes-anterior-proxima.md: so a
  // questao aberta (aria-current) fica destacada no indice, mesmo depois
  // de clicar numa questao e voltar pra outra pelo rodape.
  test("so a questao aberta fica com aria-current, mesmo depois de ir e voltar entre questoes", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 500 });

    expect(await screen.findByText("Primeira pergunta")).toBeInTheDocument();
    const indiceNav = screen.getByRole("navigation", { name: "Questões" });

    await userEvent.click(within(indiceNav).getByRole("button", { name: "Questão 2" }));
    await screen.findByText("Segunda pergunta");

    const rodapeQuestao = screen.getByText("Questão 2 de 2").closest("footer");
    await userEvent.click(within(rodapeQuestao).getByRole("button", { name: "Questão anterior" }));
    await screen.findByText("Primeira pergunta");

    const botoesIndice = within(indiceNav).getAllByRole("button");
    const comAriaCurrent = botoesIndice.filter((botao) => botao.getAttribute("aria-current") === "true");
    expect(comAriaCurrent).toHaveLength(1);
    expect(comAriaCurrent[0]).toHaveTextContent("Questão 1");
  });

  test("avaliacao que esta na lista mas ainda nao foi publicada mostra o aviso em vez das questoes", async () => {
    mockApiAvaliacoes();
    renderPainel({ avaliacaoIdSelecionada: 501 });

    expect(
      await screen.findByText("Esta avaliação ainda não foi publicada. As questões aparecem aqui depois da publicação.")
    ).toBeInTheDocument();
  });

  test("rodape troca de avaliacao e fica desativado nas pontas", async () => {
    mockApiAvaliacoes();
    const onNavigate = vi.fn();
    renderPainel({ avaliacaoIdSelecionada: 500, onNavigate });

    await screen.findByText("Primeira pergunta");
    expect(screen.getByRole("button", { name: /Avaliação anterior/ })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Próxima avaliação: Prova Rascunho/ }));
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10/avaliacoes/501");
  });

  test("avaliacaoId que nao pertence ao curso volta pro curso (replace)", async () => {
    mockApiAvaliacoes();
    const onNavigate = vi.fn();
    renderPainel({ avaliacaoIdSelecionada: 999, onNavigate });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("/app/cursos/10", { replace: true }));
  });

  test("ao voltar da avaliacao (inclusive apos F5 direto na URL), a aba Avaliacoes do curso fica selecionada", async () => {
    mockApiAvaliacoes();
    const { rerender } = renderPainel({ avaliacaoIdSelecionada: 500 });

    await screen.findByText("Primeira pergunta");

    rerender(painelJsx({ avaliacaoIdSelecionada: null }));

    const abaAvaliacoes = await screen.findByRole("tab", { name: /Avaliacoes do curso/ });
    expect(abaAvaliacoes).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Modulos/ })).toHaveAttribute("aria-selected", "false");
  });
});
