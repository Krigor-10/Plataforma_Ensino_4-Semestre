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

function montarCenario({ conteudos = [], avaliacoes = [], modulos, curso } = {}) {
  return {
    usuario: { id: PROFESSOR_ID },
    cursos: [{ id: CURSO_ID, titulo: "Curso Teste", ...curso }],
    turmas: [{ id: TURMA_ID, cursoId: CURSO_ID, professorId: PROFESSOR_ID, nomeTurma: "Turma A" }],
    modulos: modulos || [{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }],
    conteudos,
    avaliacoes
  };
}

// A maioria dos testes abaixo e de item (conteudo/quiz dentro de um modulo) -
// como a trilha virou lista de modulos + tela do modulo (docs/
// TelaConteudosProfessor/PROMPT-agente-fluxo-professor-igual-coordenador.md,
// etapas 2/3), o default aqui ja entra direto na tela do (unico) modulo do
// cenario, pra nao ter que repetir moduloIdSelecionado em cada teste de item.
// Os poucos testes que exercitam a LISTA de modulos passam
// moduloIdSelecionado: null explicitamente.
function trilhaJsx({
  conteudos = [],
  avaliacoes = [],
  modulos,
  curso,
  moduloIdSelecionado = MODULO_ID,
  onSessionExpired = vi.fn(),
  onRefresh = vi.fn(),
  onNavigate = vi.fn()
} = {}) {
  const cenario = montarCenario({ avaliacoes, conteudos, curso, modulos });

  return (
    <ToastProvider>
      <SecaoConteudosProfessor
        avaliacoes={cenario.avaliacoes}
        conteudos={cenario.conteudos}
        cursoIdSelecionado={CURSO_ID}
        cursos={cenario.cursos}
        moduloIdSelecionado={moduloIdSelecionado}
        modulos={cenario.modulos}
        onNavigate={onNavigate}
        onRefresh={onRefresh}
        onSessionExpired={onSessionExpired}
        turmas={cenario.turmas}
        usuario={cenario.usuario}
      />
    </ToastProvider>
  );
}

function renderTrilha(props = {}) {
  const onNavigate = props.onNavigate || vi.fn();
  const onSessionExpired = props.onSessionExpired || vi.fn();
  const onRefresh = props.onRefresh || vi.fn();
  const resultado = render(trilhaJsx({ ...props, onNavigate, onSessionExpired, onRefresh }));

  return { ...resultado, onNavigate, onSessionExpired, onRefresh };
}

describe("TrilhaConteudosProfessor (SecaoConteudosProfessor)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("quiz vinculado a um material aparece logo depois dele, na lista de Conteudos", () => {
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

    const listaDeConteudos = document.querySelector(".painel-itens-modulo__lista");
    const titulos = within(listaDeConteudos)
      .getAllByRole("button", { name: /^Ver / })
      .map((botao) => botao.getAttribute("aria-label"));
    expect(titulos).toEqual(["Ver Aula 1", "Ver Quiz da Aula 1"]);
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

    const listaDeConteudos = document.querySelector(".painel-itens-modulo__lista");
    expect(within(listaDeConteudos).getByText("Quiz A da Aula 1")).toBeInTheDocument();
    expect(within(listaDeConteudos).getByText("Quiz B da Aula 1")).toBeInTheDocument();
  });

  test("quiz do modulo em rascunho aparece na contagem e no resumo do topo", () => {
    const { container } = renderTrilha({
      moduloIdSelecionado: null,
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
      moduloIdSelecionado: null,
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

  // docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-voltar-selo-
  // cartoes.md, item 3: titulo longo vira 1 linha com reticencias via CSS
  // (text-overflow), mas o nome completo precisa continuar acessivel no
  // `title` (tooltip nativo) - inclusive pro quiz dentro de um conteudo e
  // pro quiz solto, nao so pro material.
  test("titulo longo mantem o nome completo no atributo title, em material e quiz", () => {
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "ANALISE_DESENVOLV_SISTEMA_01", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "QUIZ_VINCULADO_DESENVOLV_SISTEMA_01", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "QUIZ_SOLTO_DESENVOLV_SISTEMA_01", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    const lista = document.querySelector(".painel-itens-modulo__lista");
    expect(within(lista).getByText("ANALISE_DESENVOLV_SISTEMA_01")).toHaveAttribute("title", "ANALISE_DESENVOLV_SISTEMA_01");
    expect(within(lista).getByText("QUIZ_VINCULADO_DESENVOLV_SISTEMA_01")).toHaveAttribute("title", "QUIZ_VINCULADO_DESENVOLV_SISTEMA_01");
    expect(within(lista).getByText("QUIZ_SOLTO_DESENVOLV_SISTEMA_01")).toHaveAttribute("title", "QUIZ_SOLTO_DESENVOLV_SISTEMA_01");
  });

  test("modulo vazio mostra o aviso no lugar da contagem", () => {
    const { container } = renderTrilha({ conteudos: [], moduloIdSelecionado: null });

    const contagemDoModulo = container.querySelector(".conteudos-modulo__contagem");
    expect(contagemDoModulo.textContent).toBe("Vazio · não aparece para o aluno");
  });

  // A distincao "so expande com descricao propria" nao existe mais - toda
  // linha agora abre a previa completa (PreviaItemAluno) a direita, com ou
  // sem descricao (docs/TelaConteudosProfessor/PROMPT-agente-fluxo-
  // professor-igual-coordenador.md, etapa 2). As duas linhas abaixo clicam
  // numa linha sem descricao e confirmam que a previa abre do mesmo jeito.
  test("linha sem descricao tambem abre a previa ao clicar", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Sem descricao", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByText("Sem descricao"));
    expect(await screen.findByRole("heading", { name: "Sem descricao" })).toBeInTheDocument();
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

    const listaDeConteudos = document.querySelector(".painel-itens-modulo__lista");
    expect(within(listaDeConteudos).getByText("Quiz do conteúdo")).toBeInTheDocument();
    expect(within(listaDeConteudos).queryByText("Quiz - Aula 1")).not.toBeInTheDocument();
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

    const listaDeConteudos = document.querySelector(".painel-itens-modulo__lista");
    expect(within(listaDeConteudos).getByText("Revisão de Variáveis")).toBeInTheDocument();
    expect(within(listaDeConteudos).queryByText("Quiz do conteúdo")).not.toBeInTheDocument();
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

    // Dois quizzes cairiam na regra generica (titulo igual ao conteudo e
    // "Quiz: {conteudo}"), entao os dois mostram o titulo real em vez de
    // "Quiz do conteúdo" - o quiz 200 so por coincidencia tem titulo real
    // identico ao do material ("Aula 1"), entao o texto aparece 2x na
    // mesma lista (material + esse quiz), o que e esperado.
    const listaDeConteudos = document.querySelector(".painel-itens-modulo__lista");
    expect(within(listaDeConteudos).getAllByText("Aula 1")).toHaveLength(2);
    expect(within(listaDeConteudos).getByText("Quiz: Aula 1")).toBeInTheDocument();
    expect(within(listaDeConteudos).queryByText("Quiz do conteúdo")).not.toBeInTheDocument();
  });

  test("aria-label de selecao do quiz vinculado mantem o titulo real mesmo com nome generico exibido, e Editar abre a edicao", async () => {
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByLabelText("Selecionar Quiz - Aula 1")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz - Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar Quiz" })).toBeInTheDocument();
  });

  // "Editar" continua so dentro do menu ⋮ de cada linha da lista - o unico
  // botao "Editar" solto que existe agora e o do rodape da previa (a direita,
  // fora da lista), que estas linhas nao tocam.
  test('linhas FECHADAS da lista nao tem mais botao "Editar" solto', () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz vinculado", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do modulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    // A janela de previa (com seu proprio botao "Editar" no cabecalho) nao
    // abre sozinha - as linhas da lista ficam todas fechadas, so com o ⋮.
    const lista = document.querySelector(".painel-itens-modulo__lista");
    expect(within(lista).queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });

  test('"Editar" no menu do conteudo abre a edicao do conteudo', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar conteúdo" })).toBeInTheDocument();
  });

  test('"Editar" no menu do quiz do modulo abre o assistente de quiz', async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url) => Promise.resolve(url.endsWith("/questoes") ? [] : {}));
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 201, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz do Módulo" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Editar" }));
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

  // O selo de status (Insignia) virou um ponto colorido + texto pequeno
  // (StatusPonto, verde/ambar) na propria linha do item - docs/
  // TelaConteudosProfessor/PROMPT-agente-tela-modulo-trilha-versao-b.md,
  // item 1.4. O icone do tipo (nao mais texto "Quiz") ja distingue material
  // de quiz na linha.
  test('quizzes (vinculado e do modulo) mostram o status "Publicado" junto do titulo', () => {
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

    const linhaQuizVinculado = screen.getByText("Quiz da Aula 1").closest(".painel-itens-modulo__linha");
    const linhaQuizDoModulo = screen.getByText("Quiz do Módulo").closest(".painel-itens-modulo__linha");
    [linhaQuizVinculado, linhaQuizDoModulo].forEach((linha) => {
      expect(within(linha).getByText("Publicado")).toBeInTheDocument();
    });
  });

  // A lista de modulos agora e cartoes que navegam pra tela do modulo (nao
  // mais um acordeao que abre sozinho) - docs/TelaConteudosProfessor/
  // PROMPT-agente-fluxo-professor-igual-coordenador.md, etapa 3. O cartao do
  // modulo com rascunho mostra a contagem em ambar; clicar nele navega.
  test("cartao do modulo com rascunho mostra a contagem em destaque e navega pro modulo ao clicar", async () => {
    const usuario = userEvent.setup();
    const MODULO_2 = 101;

    const { onNavigate } = renderTrilha({
      moduloIdSelecionado: null,
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_2, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula rascunho", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getByText(/1 rascunho/)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Módulo 02/ }));
    expect(onNavigate).toHaveBeenCalledWith(`/app/conteudos/${CURSO_ID}/modulos/${MODULO_2}`);
  });

  test('"Falta publicar" navega pro modulo com rascunho', async () => {
    const MODULO_2 = 101;
    const usuario = userEvent.setup();

    const { onNavigate } = renderTrilha({
      moduloIdSelecionado: null,
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

    await usuario.click(screen.getByRole("button", { name: "Falta publicar: 1" }));

    expect(onNavigate).toHaveBeenCalledWith(`/app/conteudos/${CURSO_ID}/modulos/${MODULO_2}`);
  });

  test("item arquivado fica oculto da lista do modulo", () => {
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 3, tipoConteudo: 1, titulo: "Aula Arquivada", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    expect(screen.getAllByText("Aula Publicada").length).toBeGreaterThan(0);
    expect(screen.queryByText("Aula Arquivada")).not.toBeInTheDocument();
  });

  test("itens arquivados aparecem no painel Ver arquivados (lista de modulos) e Restaurar funciona", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      moduloIdSelecionado: null,
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula Publicada", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 3, tipoConteudo: 1, titulo: "Aula Arquivada", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

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

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz do Módulo" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Arquivar" }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/Avaliacoes/200",
        expect.objectContaining({ method: "PUT", body: expect.stringContaining('"statusPublicacao":3') })
      )
    );
  });

  test("publicar quiz sem questoes mostra toast de erro dispensavel, sem faixa fixa no topo", async () => {
    // mockImplementation por URL evita que um eventual GET .../questoes
    // "roube" o mockRejectedValueOnce que o PUT de publicar precisa.
    apiRequest.mockImplementation((url, options) =>
      url.endsWith("/questoes")
        ? Promise.resolve([])
        : options?.method === "PUT"
          ? Promise.reject(new ApiError("Adicione ao menos uma questao antes de publicar o quiz.", 422))
          : Promise.resolve({})
    );
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 1, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz do Módulo" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Publicar" }));

    const mensagemErro = await screen.findByText("Adicione ao menos uma questao antes de publicar o quiz.");
    expect(mensagemErro.closest(".toast")).not.toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Fechar notificação" }));
    expect(screen.queryByText("Adicione ao menos uma questao antes de publicar o quiz.")).not.toBeInTheDocument();
  });

  test('"Excluir" no menu do quiz abre confirmacao e mostra toast de arquivamento quando o backend arquiva', async () => {
    // Mesmo motivo do teste de publicar acima.
    apiRequest.mockImplementation((url, options) =>
      url.endsWith("/questoes") ? Promise.resolve([]) : options?.method === "DELETE" ? Promise.resolve({ arquivado: true }) : Promise.resolve({})
    );
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz do Módulo" }));
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

  test('em modulo vazio, "Novo conteudo" e "Adicionar Quiz" continuam disponiveis (no topo) e acionam o fluxo certo', async () => {
    const usuario = userEvent.setup();
    renderTrilha({ conteudos: [] });

    expect(screen.getByText(/ainda não tem conteúdo/)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Novo conteúdo" }));
    expect(await screen.findByRole("dialog", { name: "Novo conteúdo" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await usuario.click(screen.getByRole("button", { name: "Adicionar Quiz" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar Quiz" })).toBeInTheDocument();
  });

  // docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-roteiro.md, item 1:
  // os 3 botoes de adicionar ficam no topo da tela (ao lado de "← curso"),
  // nao no cabecalho do roteiro nem na lista de passos.
  test('botoes de adicionar ficam no topo da tela, nao na lista do roteiro', () => {
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    const topo = document.querySelector(".modulo-lista-janela__caminho");
    expect(within(topo).getByRole("button", { name: "Novo conteúdo" })).toBeInTheDocument();
    expect(within(topo).getByRole("button", { name: "Adicionar Quiz" })).toBeInTheDocument();
    expect(within(topo).getByRole("button", { name: "Gerar quiz com IA" })).toBeInTheDocument();

    const lista = document.querySelector(".painel-itens-modulo__lista");
    expect(within(lista).queryByRole("button", { name: "Novo conteúdo" })).not.toBeInTheDocument();
    expect(within(lista).queryByRole("button", { name: "Adicionar Quiz" })).not.toBeInTheDocument();
  });

  test('"Gerar quiz com IA" so aparece com conteudo do tipo Texto ou PDF no modulo', () => {
    const { rerender } = renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 3, titulo: "Aula em video", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    expect(screen.queryByRole("button", { name: "Gerar quiz com IA" })).not.toBeInTheDocument();

    rerender(
      trilhaJsx({
        conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula em texto", turmaId: TURMA_ID, cursoId: CURSO_ID }]
      })
    );

    expect(screen.getByRole("button", { name: "Gerar quiz com IA" })).toBeInTheDocument();
  });

  // O menu agora abre em portal (MenuAcoes.jsx) - o jsdom nao calcula layout
  // de verdade, mas confirma que o menu do ULTIMO item da lista e do quiz
  // recuado dentro de um conteudo renderizam com todas as opcoes esperadas
  // (nao e cortado/omitido por estar no fim da lista ou aninhado).
  test("menu ⋮ do ultimo item da lista e do quiz dentro de um conteudo abrem com todas as opcoes", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2 (ultima)", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz da Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 2 (ultima)" }));
    let menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Visualizar",
      "Editar",
      "Voltar para rascunho",
      "Mover para cima",
      "Mover para baixo",
      "Excluir"
    ]);

    await usuario.keyboard("{Escape}");

    await usuario.click(screen.getByRole("button", { name: "Opções de Quiz da Aula 1" }));
    menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Visualizar",
      "Editar",
      "Voltar para rascunho",
      "Arquivar",
      "Excluir"
    ]);
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

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));

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

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // Abrir o menu ⋮ de uma linha nao fecha nem troca a janela de previa de
  // outro item ja aberta.
  test("abrir o menu de outra linha nao fecha a previa ja aberta", async () => {
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
        },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByText("Texto da previa")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Opções de Aula 2" }));

    expect(within(janela).getByText("Texto da previa")).toBeInTheDocument();
  });

  test('"Selecionar tudo" marca, desmarca e fica indeterminado', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [
        { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
        { id: 2, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));

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

  test("selecao e limpa ao trocar de modulo (navegar pra outro modulo)", async () => {
    const MODULO_2 = 101;
    const usuario = userEvent.setup();
    const modulos = [
      { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
      { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
    ];
    const conteudos = [
      { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID },
      { id: 2, moduloId: MODULO_2, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 2", turmaId: TURMA_ID, cursoId: CURSO_ID }
    ];

    const { rerender } = renderTrilha({ modulos, conteudos, moduloIdSelecionado: MODULO_ID });

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));
    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);

    rerender(trilhaJsx({ modulos, conteudos, moduloIdSelecionado: MODULO_2 }));

    // Trocar de modulo tambem sai do modo de selecao (volta o botao
    // "Selecionar") - a marcacao anterior some junto.
    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByLabelText("Selecionar Aula 2").checked).toBe(false);
  });

  test('opcoes de "Mais ações" ficam desabilitadas sem selecao', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Publicar selecionados" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Voltar para rascunho" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Arquivar selecionados" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Excluir selecionados" })).toBeDisabled();
  });

  test("clicar na caixa de selecao nao abre/fecha a previa", async () => {
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

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByText("Texto da previa")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByLabelText("Selecionar Aula 1"));

    expect(screen.getByLabelText("Selecionar Aula 1").checked).toBe(true);
    expect(within(janela).getByText("Texto da previa")).toBeInTheDocument();
  });

  test('linha de "Quizzes do modulo" tem uma unica caixa de selecao', async () => {
    const usuario = userEvent.setup();
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));

    const lista = document.querySelector(".painel-itens-modulo__lista");
    const linhaDoQuiz = within(lista).getByText("Quiz do Módulo").closest(".painel-itens-modulo__item");
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
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

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByLabelText("Selecionar Aula Publicada"));
    await usuario.click(screen.getByLabelText("Selecionar Aula Rascunho"));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Publicar selecionados" }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/2", expect.objectContaining({ method: "PUT" })));
    expect(apiRequest).not.toHaveBeenCalledWith("/ConteudosDidaticos/1", expect.anything());
    expect(await screen.findByText(/já estava nesse status/)).toBeInTheDocument();
  });

  // Editar/Excluir modulo saiu de "Mais ações" (que agora so tem as acoes em
  // lote de materiais/quizzes) pro menu ⋮ do cartao do modulo, na LISTA de
  // modulos - igual PainelCursoGestao.jsx (Coordenador/Admin). "Mais ações"
  // dentro da tela do modulo nao tem mais Editar/Excluir modulo.
  test('"Mais ações" da tela do modulo nao tem mais Editar/Excluir modulo', async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).queryByRole("menuitem", { name: "Editar módulo" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Excluir módulo" })).not.toBeInTheDocument();
  });

  test("cartao do modulo (lista) tem Editar/Excluir modulo sempre habilitados, mesmo com o modulo vazio", async () => {
    const usuario = userEvent.setup();
    renderTrilha({ conteudos: [], moduloIdSelecionado: null });

    await usuario.click(screen.getByRole("button", { name: "Opções de Módulo 1" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Editar módulo" })).toBeEnabled();
    expect(within(menu).getByRole("menuitem", { name: "Excluir módulo" })).toBeEnabled();
  });

  test('"Editar módulo" (cartao da lista) abre o formulario preenchido e salva o novo titulo', async () => {
    apiRequest.mockResolvedValueOnce({});
    const usuario = userEvent.setup();
    renderTrilha({
      moduloIdSelecionado: null,
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Módulo 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Editar módulo" }));

    const campoTitulo = screen.getByLabelText("Titulo *");
    expect(campoTitulo).toHaveValue("Módulo 1");

    await usuario.clear(campoTitulo);
    await usuario.type(campoTitulo, "Módulo renomeado");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        `/Modulos/${MODULO_ID}`,
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ titulo: "Módulo renomeado" }) })
      )
    );
  });

  test('"Excluir módulo" (cartao da lista) vazio chama o DELETE e atualiza a trilha', async () => {
    apiRequest.mockImplementation((url) =>
      Promise.resolve(url === `/Modulos/${MODULO_ID}/bloqueios-exclusao` ? { podeExcluir: true, motivo: null, temItemArquivado: false } : {})
    );
    const usuario = userEvent.setup();
    const { onRefresh } = renderTrilha({ conteudos: [], moduloIdSelecionado: null });

    await usuario.click(screen.getByRole("button", { name: "Opções de Módulo 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir módulo" }));
    await usuario.click(await screen.findByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`/Modulos/${MODULO_ID}`, expect.objectContaining({ method: "DELETE" })));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  // A pre-checagem (GET /Modulos/{id}/bloqueios-exclusao) ja mostra o motivo
  // ao abrir a janela - nao precisa mais clicar em "Confirmar exclusao" pra
  // descobrir que esta bloqueado (docs/TelaConteudosProfessor/PROMPT-agente-
  // excluir-modulo-vazio.md), e o botao nem aparece nesse caso.
  test('"Excluir módulo" (cartao da lista) bloqueado por dependencias mostra a mensagem do backend', async () => {
    apiRequest.mockImplementation((url) =>
      Promise.resolve(
        url === `/Modulos/${MODULO_ID}/bloqueios-exclusao`
          ? { podeExcluir: false, motivo: "Nao e possivel excluir: o modulo tem 1 conteudo.", temItemArquivado: false }
          : {}
      )
    );
    const usuario = userEvent.setup();
    renderTrilha({
      moduloIdSelecionado: null,
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Opções de Módulo 1" }));
    await usuario.click(screen.getByRole("menuitem", { name: "Excluir módulo" }));

    expect(await screen.findByText(/o modulo tem 1 conteudo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar exclusão" })).not.toBeInTheDocument();
  });

  // docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-correcoes-1.md,
  // item 1: colocar `carregandoQuestoesId` nas dependencias do efeito fazia
  // o proprio `setCarregandoQuestoesId` dispara-lo de novo, cuja limpeza
  // cancelava a requisicao que tinha acabado de comecar - a resposta chegava
  // depois mas era descartada, e o "Carregando..." ficava preso pra sempre.
  test("quiz nao fica preso em 'Carregando questões...' ao trocar de item durante a requisicao (corrida)", async () => {
    const usuario = userEvent.setup();
    let resolverQuestoes;
    apiRequest.mockImplementation((url) =>
      url.endsWith("/questoes") ? new Promise((resolve) => { resolverQuestoes = resolve; }) : Promise.resolve({})
    );
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Quiz do Módulo" }));
    expect(await screen.findByText("Carregando questões…")).toBeInTheDocument();

    // Troca pro item anterior e volta pro quiz com a 1a requisicao ainda no ar.
    await usuario.click(screen.getByRole("button", { name: "Item anterior" }));
    expect(await screen.findByRole("heading", { name: "Aula 1" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Próximo item" }));
    expect(await screen.findByRole("heading", { name: "Quiz do Módulo" })).toBeInTheDocument();
    expect(screen.getByText("Carregando questões…")).toBeInTheDocument();

    resolverQuestoes([
      { id: 1, enunciado: "Pergunta", alternativas: [{ id: 1, letra: "A", texto: "Resp", ehCorreta: true }], afirmativas: [] }
    ]);

    expect(await screen.findByText("Pergunta")).toBeInTheDocument();
    expect(screen.queryByText("Carregando questões…")).not.toBeInTheDocument();
  });

  test('erro ao carregar as questoes mostra "Tentar de novo", e clicar refaz a busca', async () => {
    const usuario = userEvent.setup();
    let chamadasQuestoes = 0;
    apiRequest.mockImplementation((url) => {
      if (!url.endsWith("/questoes")) {
        return Promise.resolve({});
      }
      chamadasQuestoes += 1;
      return chamadasQuestoes === 1
        ? Promise.reject(new Error("Falhou"))
        : Promise.resolve([{ id: 1, enunciado: "Pergunta", alternativas: [{ id: 1, letra: "A", texto: "Resp", ehCorreta: true }], afirmativas: [] }]);
    });
    renderTrilha({
      conteudos: [],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Quiz do Módulo" }));
    expect(await screen.findByText("Não foi possível carregar as questões.")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pergunta")).toBeInTheDocument();
  });

  test("trocar de item e voltar usa as questoes ja carregadas, sem buscar de novo", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url) =>
      url.endsWith("/questoes")
        ? Promise.resolve([{ id: 1, enunciado: "Pergunta", alternativas: [{ id: 1, letra: "A", texto: "Resp", ehCorreta: true }], afirmativas: [] }])
        : Promise.resolve({})
    );
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }],
      avaliacoes: [
        { id: 200, conteudoDidaticoId: null, moduloId: MODULO_ID, statusPublicacao: 2, tipoAvaliacao: 1, titulo: "Quiz do Módulo", turmaId: TURMA_ID, cursoId: CURSO_ID }
      ]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Quiz do Módulo" }));
    expect(await screen.findByText("Pergunta")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);

    await usuario.click(screen.getByRole("button", { name: "Item anterior" }));
    await screen.findByRole("heading", { name: "Aula 1" });
    await usuario.click(screen.getByRole("button", { name: "Próximo item" }));

    expect(await screen.findByText("Pergunta")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("rodape da janela de previa tem a classe modal-rodape (nao gruda na borda)", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));
    const rodape = (await screen.findByRole("button", { name: "Item anterior" })).closest("footer");
    expect(rodape).toHaveClass("modal-rodape");
  });

  test("topo da janela nao tem botoes soltos de Publicar/Editar - as acoes ficam no ⋮, que publica sem fechar a janela", async () => {
    const usuario = userEvent.setup();
    renderTrilha({
      conteudos: [{ id: 1, moduloId: MODULO_ID, statusPublicacao: 1, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID }]
    });

    await usuario.click(screen.getByRole("button", { name: "Ver Aula 1" }));
    const janela = await screen.findByRole("dialog");

    expect(within(janela).queryByRole("button", { name: "Publicar" })).not.toBeInTheDocument();
    expect(within(janela).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();

    await usuario.click(within(janela).getByRole("button", { name: "Opções de Aula 1" }));
    const opcoes = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(opcoes).not.toContain("Visualizar");
    expect(opcoes).toEqual(["Editar", "Publicar", "Mover para cima", "Mover para baixo", "Excluir"]);

    await usuario.click(screen.getByRole("menuitem", { name: "Publicar" }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/ConteudosDidaticos/1", expect.objectContaining({ method: "PUT" })));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// PROMPT-agente-progresso-e-trava-ao-concluir.md, Parte A: professor ve a
// faixa de aviso e os botoes de criar/editar/publicar/excluir desativados
// quando o curso esta concluido-aguardando ou encerrado.
describe("TrilhaConteudosProfessor - edicao travada (curso concluido ou encerrado)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const CONTEUDO = { id: 1, moduloId: MODULO_ID, statusPublicacao: 2, tipoConteudo: 1, titulo: "Aula 1", turmaId: TURMA_ID, cursoId: CURSO_ID };
  const CURSO_GRATUITO_CONCLUIDO = { modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };
  const CURSO_GRATUITO_ENCERRADO = { modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-10T12:00:00", encerradoEm: "2026-02-01T12:00:00" };

  test("curso concluido e aguardando: mostra a faixa, esconde 'Novo modulo' e nao mostra 'Concluir curso'", () => {
    renderTrilha({ conteudos: [CONTEUDO], curso: CURSO_GRATUITO_CONCLUIDO, moduloIdSelecionado: null });

    expect(screen.getByText(/aguardando o encerramento pelo coordenador/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo modulo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Concluir curso/ })).not.toBeInTheDocument();
  });

  test("curso encerrado: mostra a faixa de encerrado", () => {
    renderTrilha({ conteudos: [CONTEUDO], curso: CURSO_GRATUITO_ENCERRADO, moduloIdSelecionado: null });

    expect(screen.getByText("Curso encerrado. A edição está travada.")).toBeInTheDocument();
  });

  test("cartao do modulo (lista) fica com Editar/Excluir modulo desabilitados", async () => {
    const usuario = userEvent.setup();
    renderTrilha({ conteudos: [CONTEUDO], curso: CURSO_GRATUITO_CONCLUIDO, moduloIdSelecionado: null });

    await usuario.click(screen.getByRole("button", { name: "Opções de Módulo 1" }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Editar módulo" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Excluir módulo" })).toBeDisabled();
  });

  // Com edicaoTravada o botao "Selecionar" nem aparece (item 2.4 do prompt
  // trilha-versao-b) - sem ele nao ha como entrar no modo de selecao, entao
  // "Mais ações" tambem nunca aparece. Substitui o teste antigo (que checava
  // os itens do menu desabilitados) porque esse menu agora e inalcancavel
  // pela UI quando a edicao esta travada.
  test("com edicaoTravada o botao 'Selecionar' nao aparece, entao 'Mais ações' tambem nao", () => {
    renderTrilha({ conteudos: [CONTEUDO], curso: CURSO_GRATUITO_CONCLUIDO });

    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mais ações" })).not.toBeInTheDocument();
  });

  test("menu do conteudo fica com Editar/Publicar/Excluir desabilitados; botoes 'Novo conteúdo'/'Adicionar Quiz' somem", async () => {
    const usuario = userEvent.setup();
    renderTrilha({ conteudos: [CONTEUDO], curso: CURSO_GRATUITO_CONCLUIDO });

    await usuario.click(screen.getByRole("button", { name: `Opções de ${CONTEUDO.titulo}` }));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "Editar" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Voltar para rascunho" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "Excluir" })).toBeDisabled();

    expect(screen.queryByRole("button", { name: /Novo conteúdo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar Quiz/ })).not.toBeInTheDocument();
  });

  test("curso aberto (sem conclusao/encerramento): nenhuma faixa aparece e as acoes continuam habilitadas", () => {
    renderTrilha({ conteudos: [CONTEUDO], curso: { modeloCurso: 1 }, moduloIdSelecionado: null });

    expect(screen.queryByText(/A edição está travada/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo modulo/ })).toBeInTheDocument();
  });
});
