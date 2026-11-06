import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoConteudosProfessor } from "./SecaoConteudosProfessor.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const PROFESSOR_ID = 1;
const CURSO_ID = 10;
const MODULO_ID = 100;
const TURMA_ID = 50;

function montarCenario({ conteudos = [], avaliacoes = [], modulos } = {}) {
  return {
    usuario: { id: PROFESSOR_ID },
    cursos: [{ id: CURSO_ID, titulo: "Curso Teste" }],
    turmas: [{ id: TURMA_ID, cursoId: CURSO_ID, professorId: PROFESSOR_ID, nomeTurma: "Turma A" }],
    modulos: modulos || [{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }],
    conteudos,
    avaliacoes
  };
}

function renderTrilha({ conteudos = [], avaliacoes = [], modulos, onSessionExpired = vi.fn(), onRefresh = vi.fn() } = {}) {
  const cenario = montarCenario({ avaliacoes, conteudos, modulos });

  const resultado = render(
    <ToastProvider>
      <SecaoConteudosProfessor
        avaliacoes={cenario.avaliacoes}
        conteudos={cenario.conteudos}
        cursoIdSelecionado={CURSO_ID}
        cursos={cenario.cursos}
        modulos={cenario.modulos}
        onNavigate={vi.fn()}
        onRefresh={onRefresh}
        onSessionExpired={onSessionExpired}
        turmas={cenario.turmas}
        usuario={cenario.usuario}
      />
    </ToastProvider>
  );

  return { ...resultado, onSessionExpired, onRefresh };
}

describe("TrilhaConteudosProfessor (SecaoConteudosProfessor)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("quiz vinculado a um material renderiza dentro do item desse material", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz da Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    expect(screen.getByText("Aula 1")).toBeInTheDocument();

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Quiz da Aula 1")).toBeInTheDocument();
  });

  test("dois quizzes vinculados ao mesmo material aparecem os dois", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz A da Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        },
        {
          id: 201,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz B da Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Quiz A da Aula 1")).toBeInTheDocument();
    expect(within(listaQuizzesDoMaterial).getByText("Quiz B da Aula 1")).toBeInTheDocument();
  });

  test("quiz do modulo em rascunho aparece na contagem e no resumo do topo", () => {
    const { container } = renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: null,
          moduloId: MODULO_ID,
          statusPublicacao: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const contagemDoModulo = container.querySelector(".conteudos-modulo__contagem");
    expect(contagemDoModulo.textContent).toMatch(/1 rascunho/);

    const resumoPublicado = container.querySelector(".atividades-curso__resumo-publicado");
    expect(resumoPublicado.textContent).toMatch(/50% publicado/);

    expect(screen.getByRole("button", { name: "Falta publicar: 1" })).toBeInTheDocument();
  });

  test("contagem do modulo ignora arquivados (bug da auditoria de hierarquia)", () => {
    const { container } = renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz A", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz B", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 202, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 3, tipoAvaliacao: 1, titulo: "Quiz Arquivado", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    const contagemDoModulo = container.querySelector(".conteudos-modulo__contagem");
    expect(contagemDoModulo.textContent).toMatch(/2 quizzes/);
    expect(contagemDoModulo.textContent).not.toMatch(/3 quiz/);
  });

  test("selo de status fica sempre visivel, tanto em Publicado quanto em Rascunho", () => {
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula Rascunho", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    const selosPublicado = screen.getAllByText("Publicado");
    expect(selosPublicado[0]).not.toHaveClass("atividades-curso__status-badge--oculto");
    expect(selosPublicado[0]).toBeVisible();

    const selosRascunho = screen.getAllByText("Rascunho");
    expect(selosRascunho[0]).not.toHaveClass("atividades-curso__status-badge--oculto");
    expect(selosRascunho[0]).toBeVisible();
  });

  test("modulo vazio mostra o aviso no lugar da contagem", () => {
    const { container } = renderTrilha({ conteudos: [] });

    const contagemDoModulo = container.querySelector(".conteudos-modulo__contagem");
    expect(contagemDoModulo.textContent).toBe("Vazio · não aparece para o aluno");
  });

  test("seta do conteudo so aparece quando ha descricao", () => {
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Com descricao", descricao: "Texto", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Sem descricao", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getByRole("button", { name: /Ver detalhes.*Com descricao/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver detalhes.*Sem descricao/ })).not.toBeInTheDocument();
  });

  test("descricao igual ao titulo (maiusculas/acentos diferentes) conta como sem descricao", () => {
    renderTrilha({
      conteudos: [
        {
          id: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoConteudo: 1,
          titulo: "Visão Geral",
          descricao: "  visao geral  ",
          turmaId: TURMA_ID,
          cursoId: CURSO_ID
        }
      ]
    });

    expect(screen.queryByRole("button", { name: /Ver detalhes.*Visão Geral/ })).not.toBeInTheDocument();
    expect(screen.queryByText("visao geral")).not.toBeInTheDocument();
  });

  test("quiz vinculado com titulo generico (igual ou \"Quiz - {conteudo}\") exibe \"Quiz do conteúdo\"", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz - Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Quiz do conteúdo")).toBeInTheDocument();
    expect(within(listaQuizzesDoMaterial).queryByText("Quiz - Aula 1")).not.toBeInTheDocument();
  });

  test("quiz vinculado com titulo proprio exibe o titulo real", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Revisão de Variáveis",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Revisão de Variáveis")).toBeInTheDocument();
    expect(within(listaQuizzesDoMaterial).queryByText("Quiz do conteúdo")).not.toBeInTheDocument();
  });

  test("dois quizzes do mesmo conteudo que cairiam na regra generica exibem os titulos reais", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        },
        {
          id: 201,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz: Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getAllByText("Aula 1")).toHaveLength(1);
    expect(within(listaQuizzesDoMaterial).getByText("Quiz: Aula 1")).toBeInTheDocument();
    expect(within(listaQuizzesDoMaterial).queryByText("Quiz do conteúdo")).not.toBeInTheDocument();
  });

  test("aria-label de selecao do quiz vinculado mantem o titulo real mesmo com nome generico exibido, e Editar e a 1a opcao do menu", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url) => Promise.resolve(url.endsWith("/questoes") ? [] : {}));
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz - Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    expect(screen.getByLabelText("Selecionar Quiz - Aula 1")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Opções do quiz Quiz - Aula 1" }));
    const opcoes = screen.getAllByRole("menuitem");
    expect(opcoes[0]).toHaveTextContent("Editar");

    await usuario.click(opcoes[0]);
    expect(screen.getByRole("dialog", { name: "Editar Quiz" })).toBeInTheDocument();
  });

  test('linhas de conteudo e quiz nao tem mais botao "Editar" solto', () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz vinculado", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do modulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });

  test('"Editar" e a 1a opcao do menu do conteudo e abre a edicao do conteudo', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    const opcoes = screen.getAllByRole("menuitem");
    expect(opcoes[0]).toHaveTextContent("Editar");

    await usuario.click(opcoes[0]);
    expect(screen.getByRole("dialog", { name: "Editar conteúdo" })).toBeInTheDocument();
  });

  test('"Editar" e a 1a opcao do menu do quiz do modulo e abre o assistente de quiz', async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url) => Promise.resolve(url.endsWith("/questoes") ? [] : {}));
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções do quiz Quiz do Módulo" }));
    const opcoes = screen.getAllByRole("menuitem");
    expect(opcoes[0]).toHaveTextContent("Editar");

    await usuario.click(opcoes[0]);
    expect(screen.getByRole("dialog", { name: "Editar Quiz" })).toBeInTheDocument();
  });

  test('"Editar" fica desabilitado enquanto o conteudo esta processando', async () => {
    const usuario = userEvent.setup();
    let resolverRequisicao;
    apiRequest.mockImplementation(() => new Promise((resolve) => { resolverRequisicao = resolve; }));

    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Publicar" }));

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeDisabled();

    resolverRequisicao({});
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Editar" })).not.toBeDisabled());
  });

  test('quizzes (vinculado e do modulo) nao exibem mais o texto "Quiz" abaixo do titulo', () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz da Aula 1",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        },
        {
          id: 201,
          conteudoDidaticoId: null,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    expect(screen.queryByText("Quiz", { selector: "p span" })).not.toBeInTheDocument();
  });

  test("abre o modulo com rascunho ao entrar; sem rascunho, abre o primeiro", () => {
    const MODULO_2 = 101;

    const { unmount } = renderTrilha({
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_2, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula rascunho", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getByRole("button", { name: /Módulo 02/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Módulo 01/ })).toHaveAttribute("aria-expanded", "false");
    unmount();

    renderTrilha({
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_2, statusPublicacao: 2, tipoConteudo: 1, titulo: "Outra publicada", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getByRole("button", { name: /Módulo 01/ })).toHaveAttribute("aria-expanded", "true");
  });

  test('"Falta publicar" abre o modulo certo e move o foco pro item em rascunho', async () => {
    const MODULO_2 = 101;
    const usuario = userEvent.setup();

    renderTrilha({
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        {
          id: 2,
          moduloId: MODULO_2,
          statusPublicacao: 1,
          tipoConteudo: 1,
          titulo: "Aula rascunho",
          descricao: "Texto",
          turmaId: TURMA_ID,
          cursoId: CURSO_ID
        }
      ]
    });

    // O modulo com rascunho (Módulo 2) ja abre sozinho ao entrar (item 5) -
    // fecha ele aqui pra confirmar que "Falta publicar" e quem reabre.
    await usuario.click(screen.getByRole("button", { name: /Módulo 02/ }));
    expect(screen.getByRole("button", { name: /Módulo 02/ })).toHaveAttribute("aria-expanded", "false");

    await usuario.click(screen.getByRole("button", { name: "Falta publicar: 1" }));

    expect(screen.getByRole("button", { name: /Módulo 02/ })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: /Ver detalhes.*Aula rascunho/ })).toHaveFocus(), { timeout: 2000 });
  });

  test("itens arquivados ficam ocultos da lista do modulo e aparecem no painel Ver arquivados", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 3, tipoConteudo: 1, titulo: "Aula Arquivada", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getByText("Aula Publicada")).toBeInTheDocument();
    expect(screen.queryByText("Aula Arquivada")).not.toBeInTheDocument();

    const botaoVerArquivados = screen.getByRole("button", { name: "Ver arquivados (1)" });
    await usuario.click(botaoVerArquivados);

    const modal = screen.getByRole("dialog", { name: "Arquivados (1)" });
    expect(within(modal).getByText("Aula Arquivada")).toBeInTheDocument();

    await usuario.click(within(modal).getByRole("button", { name: "Restaurar como rascunho" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/2", expect.objectContaining({ method: "PUT" })));
  });

  test("sem itens arquivados, o botao Ver arquivados nao aparece", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    expect(screen.queryByRole("button", { name: /Ver arquivados/ })).not.toBeInTheDocument();
  });

  test("confirmar exclusao mostra toast de arquivamento quando o backend arquiva em vez de excluir", async () => {
    apiRequest.mockResolvedValueOnce({ arquivado: true, mensagem: "arquivado" });
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(await screen.findByText(/foi arquivado em vez de excluído definitivamente/)).toBeInTheDocument();
  });

  test('"Arquivar" no menu do quiz chama PUT com status arquivado', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções do quiz Quiz do Módulo" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Arquivar" }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/Avaliacoes/200",
        expect.objectContaining({ method: "PUT", body: expect.stringContaining('"statusPublicacao":3') })
      )
    );
  });

  test('"Excluir" no menu do quiz abre confirmacao e mostra toast de arquivamento quando o backend arquiva', async () => {
    apiRequest.mockResolvedValueOnce({ arquivado: true });
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções do quiz Quiz do Módulo" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir" }));

    expect(screen.getByRole("dialog", { name: "Excluir quiz" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(await screen.findByText(/foi arquivado em vez de excluído definitivamente/)).toBeInTheDocument();
  });

  test('botoes "Novo conteudo" e "Adicionar Quiz" acionam os dois fluxos', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Novo conteúdo" }));
    expect(await screen.findByRole("dialog", { name: "Novo conteúdo" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await usuario.click(screen.getByRole("button", { name: "Adicionar Quiz" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar Quiz" })).toBeInTheDocument();
  });

  test('em modulo vazio, "Novo conteudo" e "Adicionar Quiz" continuam disponiveis e acionam o fluxo certo', async () => {
    const usuario = userEvent.setup();
    renderTrilha({ conteudos: [] });

    expect(screen.getByText("Vazio · não aparece para o aluno")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Novo conteúdo" }));
    expect(await screen.findByRole("dialog", { name: "Novo conteúdo" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await usuario.click(screen.getByRole("button", { name: "Adicionar Quiz" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar Quiz" })).toBeInTheDocument();
  });

  test("menu de acoes do material abre e fecha pelo teclado, e Excluir abre a confirmacao", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    const botaoMenu = screen.getByRole("button", { name: "Opções de Aula 1" });
    botaoMenu.focus();
    await usuario.keyboard("{Enter}");

    expect(screen.getByRole("menu")).toBeInTheDocument();

    await usuario.keyboard("{ArrowDown}");
    await usuario.keyboard("{ArrowDown}");
    const itemExcluir = screen.getByRole("menuitem", { name: "Excluir" });
    expect(itemExcluir).toHaveFocus();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(botaoMenu).toHaveFocus();

    await usuario.click(botaoMenu);
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir" }));

    expect(screen.getByRole("dialog", { name: "Excluir conteúdo" })).toBeInTheDocument();
  });

  test("abrir o menu de um item fecha o menu de outro item ja aberto", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    expect(screen.getAllByRole("menu")).toHaveLength(1);

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 2" }));

    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(within(screen.getByRole("menu")).queryByText("Excluir")).toBeInTheDocument();
  });

  test("clicar em outro lugar da linha fecha o menu de acoes aberto", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await usuario.click(screen.getByText("Aula 1"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("clicar de novo no mesmo botao de opcoes fecha o menu (alternar)", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    const botaoMenu = screen.getByRole("button", { name: "Opções de Aula 1" });
    await usuario.click(botaoMenu);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await usuario.click(botaoMenu);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("clicar numa opcao do menu continua executando a acao", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Voltar para rascunho" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/1", expect.objectContaining({ method: "PUT" })));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("clicar fora (na linha do conteudo) fecha o menu aberto", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        {
          id: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoConteudo: 1,
          titulo: "Aula 1",
          descricao: "Texto",
          turmaId: TURMA_ID,
          cursoId: CURSO_ID
        }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Ver detalhes.*Aula 1/ }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("clicar no botao de opcoes nao abre nem fecha a previa da linha", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        {
          id: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoConteudo: 1,
          titulo: "Aula 1",
          descricao: "Texto da previa",
          turmaId: TURMA_ID,
          cursoId: CURSO_ID
        }
      ]
    });

    expect(screen.queryByText("Texto da previa")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));

    expect(screen.queryByText("Texto da previa")).not.toBeInTheDocument();

    await usuario.keyboard("{Escape}");
    await usuario.click(screen.getByRole("button", { name: /Ver detalhes.*Aula 1/ }));
    expect(screen.getByText("Texto da previa")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));

    expect(screen.getByText("Texto da previa")).toBeInTheDocument();
  });

  test('"Selecionar tudo" marca, desmarca e fica indeterminado', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    const selecionarTudo = screen.getByLabelText("Selecionar tudo");
    expect(selecionarTudo.checked).toBe(false);
    expect(selecionarTudo.indeterminate).toBe(false);

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    expect(selecionarTudo.indeterminate).toBe(true);

    await usuario.click(selecionarTudo);
    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);
    expect(screen.getByLabelText("Selecionar Aula 2").checked).toBe(true);
    expect(selecionarTudo.indeterminate).toBe(false);

    await usuario.click(selecionarTudo);
    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(false);
    expect(screen.getByLabelText("Selecionar Aula 2").checked).toBe(false);
  });

  test("selecao e limpa ao trocar de modulo aberto", async () => {
    const MODULO_2 = 101;
    const usuario = userEvent.setup();
    renderTrilha({
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_2, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);

    await usuario.click(screen.getByRole("button", { name: /Módulo 02/ }));
    await usuario.click(screen.getByRole("button", { name: /Módulo 01/ }));

    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(false);
  });

  test('opcoes de "Mais ações" ficam desabilitadas sem selecao', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Publicar selecionados" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Voltar para rascunho" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Arquivar selecionados" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Excluir selecionados" })).toBeDisabled();
  });

  test("clicar na caixa de selecao nao expande a linha do conteudo", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        {
          id: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoConteudo: 1,
          titulo: "Aula 1",
          descricao: "Texto da previa",
          turmaId: TURMA_ID,
          cursoId: CURSO_ID
        }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));

    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);
    expect(screen.queryByText("Texto da previa")).not.toBeInTheDocument();
  });

  test('linha de "Quizzes do modulo" tem uma unica caixa de selecao', () => {
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: null,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    const linhaDoQuiz = screen.getByText("Quiz do Módulo").closest(".atividades-curso__linha");
    expect(within(linhaDoQuiz).getAllByRole("checkbox")).toHaveLength(1);
  });

  test("mover pelo menu de opcoes (sem mais a seta na linha) continua funcionando", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Mover para baixo" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
  });

  test("exclusao em lote chama os quizzes antes dos conteudos", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: null,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          turmaId: TURMA_ID, cursoId: CURSO_ID
        }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    await usuario.click(screen.getByLabelText("Selecionar Quiz do Módulo"));

    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/Avaliacoes/200", expect.objectContaining({ method: "DELETE" })));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/1", expect.objectContaining({ method: "DELETE" })));

    const ordemChamadas = apiRequest.mock.calls.map((chamada) => chamada[0]);
    expect(ordemChamadas.indexOf("/Avaliacoes/200")).toBeLessThan(ordemChamadas.indexOf("/ConteudosDidaticos/1"));
  });

  test("resposta com arquivado:true entra no resumo da acao em lote como arquivado", async () => {
    apiRequest.mockResolvedValueOnce({ arquivado: true, mensagem: "arquivado" });
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/1 arquivado/)).toBeInTheDocument();
  });

  test("falha em um item do lote nao interrompe os demais e o item continua selecionado", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Falhou")).mockResolvedValueOnce({});
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    await usuario.click(screen.getByLabelText("Selecionar Aula 2"));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/1 item não foi processado/)).toBeInTheDocument();

    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);
    expect(screen.getByLabelText("Selecionar Aula 2").checked).toBe(false);
  });

  test("401 em uma acao de lote aborta o lote e notifica sessao expirada", async () => {
    apiRequest.mockRejectedValueOnce(new ApiError("Sessão expirada", 401));
    const usuario = userEvent.setup();
    const { onSessionExpired } = renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    await usuario.click(screen.getByLabelText("Selecionar Aula 2"));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("acao de status em lote ignora itens que ja estao no status pedido", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula Rascunho", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByLabelText("Selecionar Aula Publicada"));
    await usuario.click(screen.getByLabelText("Selecionar Aula Rascunho"));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Publicar selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/2", expect.objectContaining({ method: "PUT" })));
    expect(apiRequest).not.toHaveBeenCalledWith("/ConteudosDidaticos/1", expect.anything());
    expect(await screen.findByText(/já estava nesse status/)).toBeInTheDocument();
  });
});
