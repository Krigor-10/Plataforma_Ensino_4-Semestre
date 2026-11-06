import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoConteudosProfessor } from "./SecaoConteudosProfessor.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";

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

function renderTrilha({ conteudos = [], avaliacoes = [], modulos } = {}) {
  const cenario = montarCenario({ avaliacoes, conteudos, modulos });

  return render(
    <ToastProvider>
      <SecaoConteudosProfessor
        avaliacoes={cenario.avaliacoes}
        conteudos={cenario.conteudos}
        cursoIdSelecionado={CURSO_ID}
        cursos={cenario.cursos}
        modulos={cenario.modulos}
        onNavigate={vi.fn()}
        onRefresh={vi.fn()}
        onSessionExpired={vi.fn()}
        turmas={cenario.turmas}
        usuario={cenario.usuario}
      />
    </ToastProvider>
  );
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

  test("quiz do modulo em rascunho aparece na contagem e no texto de progresso do topo", () => {
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

    const progressoDoTopo = container.querySelector(".atividades-curso__progresso-texto");
    expect(progressoDoTopo.textContent).toMatch(/1 de 2 publicados/);

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

  test("Publicado fica sem selo visivel mas acessivel ao leitor de tela; Rascunho mantem o selo", () => {
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula Rascunho", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    const selosPublicado = screen.getAllByText("Publicado");
    expect(selosPublicado[0]).toHaveClass("atividades-curso__status-badge--oculto");

    const selosRascunho = screen.getAllByText("Rascunho");
    expect(selosRascunho[0]).not.toHaveClass("atividades-curso__status-badge--oculto");
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

  test('menu "Adicionar" funciona por teclado e aciona os dois fluxos (Conteudo e Quiz)', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    const botaoAdicionar = screen.getByRole("button", { name: "Adicionar" });
    botaoAdicionar.focus();
    await usuario.keyboard("{Enter}");

    expect(screen.getByRole("menu")).toBeInTheDocument();
    await usuario.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Novo conteúdo" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await usuario.click(screen.getByRole("button", { name: "Adicionar" }));
    await usuario.keyboard("{ArrowDown}");
    await usuario.keyboard("{Enter}");

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
    const itemExcluir = screen.getByRole("menuitem", { name: "Excluir" });
    expect(itemExcluir).toHaveFocus();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(botaoMenu).toHaveFocus();

    await usuario.click(botaoMenu);
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir" }));

    expect(screen.getByRole("dialog", { name: "Excluir conteúdo" })).toBeInTheDocument();
  });
});
