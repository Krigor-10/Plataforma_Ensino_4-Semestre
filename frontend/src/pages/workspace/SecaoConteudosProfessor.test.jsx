import { render, screen, within } from "@testing-library/react";
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

function montarCenario({ conteudos = [], avaliacoes = [] } = {}) {
  return {
    usuario: { id: PROFESSOR_ID },
    cursos: [{ id: CURSO_ID, titulo: "Curso Teste" }],
    turmas: [{ id: TURMA_ID, cursoId: CURSO_ID, professorId: PROFESSOR_ID, nomeTurma: "Turma A" }],
    modulos: [{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }],
    conteudos,
    avaliacoes
  };
}

function renderTrilha({ conteudos = [], avaliacoes = [] } = {}) {
  const cenario = montarCenario({ avaliacoes, conteudos });

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
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz da Aula 1",
          turmaId: TURMA_ID
        }
      ]
    });

    expect(screen.getByText("Aula 1")).toBeInTheDocument();

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Quiz da Aula 1")).toBeInTheDocument();
  });

  test("dois quizzes vinculados ao mesmo material aparecem os dois", () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz A da Aula 1",
          turmaId: TURMA_ID
        },
        {
          id: 201,
          conteudoDidaticoId: 1,
          moduloId: MODULO_ID,
          statusPublicacao: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz B da Aula 1",
          turmaId: TURMA_ID
        }
      ]
    });

    const listaQuizzesDoMaterial = screen.getByRole("list", { name: "Quizzes de Aula 1" });
    expect(within(listaQuizzesDoMaterial).getByText("Quiz A da Aula 1")).toBeInTheDocument();
    expect(within(listaQuizzesDoMaterial).getByText("Quiz B da Aula 1")).toBeInTheDocument();
  });

  test("quiz do modulo em rascunho aparece na contagem e impede o topo de mostrar 100%", () => {
    const { container } = renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID }],
      avaliacoes: [
        {
          id: 200,
          conteudoDidaticoId: null,
          moduloId: MODULO_ID,
          statusPublicacao: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          turmaId: TURMA_ID
        }
      ]
    });

    const contagemDoModulo = container.querySelector(".conteudos-modulo__contagem");
    expect(contagemDoModulo.textContent).toMatch(/1 rascunho/);

    const progressoDoTopo = container.querySelector(".atividades-curso__progresso-texto");
    expect(progressoDoTopo.textContent).not.toMatch(/100% publicado/);
    expect(progressoDoTopo.textContent).toMatch(/Falta publicar: 1/);
  });

  test("itens arquivados ficam ocultos por padrao e o botao Mostrar arquivados revela", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 3, tipoConteudo: 1, titulo: "Aula Arquivada", turmaId: TURMA_ID }
      ]
    });

    expect(screen.getByText("Aula Publicada")).toBeInTheDocument();
    expect(screen.queryByText("Aula Arquivada")).not.toBeInTheDocument();

    const botaoMostrarArquivados = screen.getByRole("button", { name: "Mostrar arquivados (1)" });
    await usuario.click(botaoMostrarArquivados);

    expect(screen.getByRole("button", { name: "Ocultar arquivados" })).toBeInTheDocument();
    expect(screen.getByText("Aula Arquivada")).toBeInTheDocument();
  });

  test("menu de acoes do material abre e fecha pelo teclado, e Excluir abre a confirmacao", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID }]
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
