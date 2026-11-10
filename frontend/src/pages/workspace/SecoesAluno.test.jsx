import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoConteudosAluno, SecaoCursosAluno } from "./SecoesAluno.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
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
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    expect(screen.queryByText(/ainda nao possui modulos publicados/i)).not.toBeInTheDocument();
    expect(screen.getByText("Fundamentos")).toBeInTheDocument();
  });

  test("mostra o estado vazio quando o curso realmente nao tem modulo nenhum", async () => {
    const cursos = [{ id: 20, titulo: "Curso Sem Modulo Nenhum", imagemUrl: null }];
    const matriculas = [{ id: 6, cursoId: 20, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = { conteudos: [], modulos: [], cursos: [] };

    render(
      <SecaoCursosAluno
        avaliacoes={[]}
        conteudos={[]}
        cursoIdSelecionado={20}
        cursos={cursos}
        matriculas={matriculas}
        modulos={[]}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={[]}
      />
    );

    expect(screen.getByText(/ainda nao possui modulos publicados/i)).toBeInTheDocument();
  });

  test("clicar num curso navega pra /app/meus-cursos/:id, e Voltar navega de volta pra lista", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();
    const onNavigate = vi.fn();

    const { rerender } = render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={onNavigate}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));
    expect(onNavigate).toHaveBeenCalledWith("/app/meus-cursos/10");

    rerender(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={onNavigate}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: "Voltar para Progresso" }));
    expect(onNavigate).toHaveBeenCalledWith("/app/meus-cursos");
  });

  // Reproduz o bug: progresso de conteudo/modulo em 100% nao pode, por si
  // so, liberar o card de certificado - so GET /Certificados/status (que
  // sabe de avaliacao formal/nota minima/correcao pendente) pode.
  test("nao mostra o card de certificado so porque o progresso de conteudo esta em 100%", async () => {
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
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/Certificados/status"));

    expect(screen.queryByText(/Parabens! Certificado disponivel/i)).not.toBeInTheDocument();
  });

  test("mostra o card de certificado quando o backend confirma a liberacao real", async () => {
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
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    expect(await screen.findByText(/Parabens! Certificado disponivel/i)).toBeInTheDocument();
  });
});

describe("SlideConteudosCurso (SecaoConteudosAluno, prompt padronizar conteudos do aluno)", () => {
  const CURSO_ID = 10;
  const TURMA_ID = 77;
  const MATRICULA_ID = 5;
  const MODULO_ID = 100;

  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderConteudosAluno({ avaliacoes = [], conteudos = [], modulos, progressos } = {}) {
    return render(
      <ToastProvider>
        <SecaoConteudosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={CURSO_ID}
          cursos={[{ id: CURSO_ID, titulo: "Curso Teste" }]}
          matriculas={[{ id: MATRICULA_ID, cursoId: CURSO_ID, turmaId: TURMA_ID, status: "Aprovada" }]}
          modulos={modulos || [{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }]}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
          onSessionExpired={vi.fn()}
          progressos={progressos || { conteudos: [], modulos: [], cursos: [] }}
          turmas={[{ id: TURMA_ID, cursoId: CURSO_ID, nomeTurma: "Turma A" }]}
        />
      </ToastProvider>
    );
  }

  test('contagem inclui quizzes, com singular em "1/1 concluído"', () => {
    const { container } = renderConteudosAluno({
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          totalQuestoes: 1,
          tentativasRealizadas: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const contagem = container.querySelector(".conteudos-modulo__contagem");
    expect(contagem.textContent).toMatch(/1\/1 concluído$/);
  });

  test("módulo concluído mostra check e seta, e abre e fecha", async () => {
    const usuario = userEvent.setup();
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      progressos: { conteudos: [{ conteudoDidaticoId: 1, percentualConclusao: 100 }], modulos: [], cursos: [] }
    });

    expect(screen.getByLabelText("Módulo concluído")).toBeInTheDocument();
    const botaoModulo = screen.getByRole("button", { expanded: true });
    expect(botaoModulo.querySelector(".conteudos-modulo__chevron")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Atividades de Módulo 1" })).toBeInTheDocument();

    await usuario.click(botaoModulo);
    expect(botaoModulo).toHaveAttribute("aria-expanded", "false");

    await usuario.click(botaoModulo);
    expect(botaoModulo).toHaveAttribute("aria-expanded", "true");
  });

  test('"Ver revisão" aparece com texto e abre a revisão', async () => {
    const usuario = userEvent.setup();
    apiRequest.mockResolvedValue({ questoes: [], notaBruta: 0, notaMaxima: 10 });
    renderConteudosAluno({
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          totalQuestoes: 1,
          tentativasRealizadas: 1,
          ultimaTentativaId: 900,
          ultimoStatusTentativa: 3
        }
      ]
    });

    const botaoVerRevisao = screen.getByRole("button", { name: "Ver revisão" });
    expect(botaoVerRevisao).toBeInTheDocument();

    await usuario.click(botaoVerRevisao);

    expect(await screen.findByRole("dialog", { name: "Revisao detalhada" })).toBeInTheDocument();
  });

  test('"Iniciar quiz" aparece nos dois tipos de quiz e abre a confirmação', async () => {
    const usuario = userEvent.setup();
    renderConteudosAluno({
      conteudos: [
        {
          id: 1,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          turmaId: TURMA_ID,
          titulo: "Aula 1",
          tipoConteudo: 1,
          ordemExibicao: 1
        }
      ],
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz vinculado",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        },
        {
          id: 201,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do módulo",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const botoesIniciar = screen.getAllByRole("button", { name: "Iniciar quiz" });
    expect(botoesIniciar).toHaveLength(2);

    await usuario.click(botoesIniciar[0]);

    expect(screen.getByRole("dialog", { name: "Antes de comecar" })).toBeInTheDocument();
  });

  test("item bloqueado mantém cadeado, sem ação e sem quizzes", () => {
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 2, arquivoUrl: "a.pdf", ordemExibicao: 1 },
        { id: 2, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 2", tipoConteudo: 2, arquivoUrl: "b.pdf", ordemExibicao: 2 }
      ],
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz da Aula 2",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const itemBloqueado = screen.getByText("Aula 2").closest(".atividades-curso__item");
    expect(within(itemBloqueado).getByLabelText("Conteúdo bloqueado")).toBeInTheDocument();
    expect(within(itemBloqueado).queryByRole("button", { name: /Abrir PDF/ })).not.toBeInTheDocument();
    expect(within(itemBloqueado).queryByText("Quiz da Aula 2")).not.toBeInTheDocument();
  });

  test('quiz com titulo generico exibe "Quiz do conteúdo", e o titulo proprio e mantido', () => {
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz - Aula 1",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const tituloQuiz = screen.getByText("Quiz do conteúdo");
    expect(tituloQuiz).toBeInTheDocument();
    expect(tituloQuiz).toHaveAttribute("title", "Quiz - Aula 1");
    expect(screen.queryByText("Quiz - Aula 1")).not.toBeInTheDocument();
  });

  test("módulo sem quizzes não mostra a faixa", () => {
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ]
    });

    expect(screen.queryByText("Quizzes do módulo")).not.toBeInTheDocument();
  });
});
