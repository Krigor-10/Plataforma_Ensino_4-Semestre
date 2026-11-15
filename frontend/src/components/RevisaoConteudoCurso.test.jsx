import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import RevisaoConteudoCurso from "./RevisaoConteudoCurso.jsx";

const MODULOS_DO_CURSO = [
  { id: 1, titulo: "Fundamentos" },
  { id: 2, titulo: "Avançado" }
];

const MATERIAL_A = {
  id: 10,
  titulo: "Introdução",
  tipoConteudo: 2,
  statusPublicacao: 2,
  arquivoUrl: "/uploads/conteudos/introducao.pdf",
  linkUrl: "",
  descricao: "Descrição do material A"
};

const MATERIAL_B_LINK = {
  id: 11,
  titulo: "Link externo",
  tipoConteudo: 4,
  statusPublicacao: 2,
  arquivoUrl: "",
  linkUrl: "https://exemplo.com/artigo",
  descricao: ""
};

const MATERIAL_C = {
  id: 12,
  titulo: "Texto final",
  tipoConteudo: 1,
  statusPublicacao: 2,
  arquivoUrl: "",
  linkUrl: "",
  descricao: ""
};

const QUIZ_VINCULADO = { id: 101, titulo: "Quiz de revisão", statusPublicacao: 2, totalQuestoes: 2 };
const QUIZ_SOLTO = { id: 102, titulo: "Quiz geral", statusPublicacao: 2, totalQuestoes: 3 };

function montarProps(sobrescritas = {}) {
  return {
    conteudosPorModuloId: new Map([
      [1, [MATERIAL_A, MATERIAL_B_LINK]],
      [2, [MATERIAL_C]]
    ]),
    cursoTitulo: "Curso Teste",
    modulosDoCurso: MODULOS_DO_CURSO,
    onFechar: vi.fn(),
    quizPorConteudoId: new Map([[MATERIAL_A.id, QUIZ_VINCULADO]]),
    quizzesPorModuloId: new Map([
      [1, [QUIZ_SOLTO]],
      [2, []]
    ]),
    questoesPorAvaliacaoId: new Map([
      [QUIZ_VINCULADO.id, [{ id: 1, enunciado: "Pergunta 1", alternativas: [{ id: 1, letra: "A", texto: "Errada", ehCorreta: false }, { id: 2, letra: "B", texto: "Certa", ehCorreta: true }], afirmativas: [] }]],
      [QUIZ_SOLTO.id, [{ id: 2, enunciado: "Pergunta 2", alternativas: [], afirmativas: [] }]]
    ]),
    ...sobrescritas
  };
}

function renderRevisao(sobrescritas = {}) {
  render(<RevisaoConteudoCurso {...montarProps(sobrescritas)} />);
  return screen.getByRole("dialog");
}

describe("RevisaoConteudoCurso", () => {
  test("titulo 'Revisar conteúdo · <curso>', selo Somente leitura e resumo com as contagens certas", () => {
    const dialog = renderRevisao();

    expect(within(dialog).getByRole("heading", { name: "Revisar conteúdo · Curso Teste" })).toBeInTheDocument();
    expect(within(dialog).getByText("Somente leitura")).toBeInTheDocument();
    expect(within(dialog).getByText("2 módulos · 3 conteúdos · 2 quizzes · 5 questões")).toBeInTheDocument();
  });

  test("ao abrir, seleciona o primeiro item do indice e destaca com aria-current", () => {
    const dialog = renderRevisao();

    const indice = within(dialog).getByRole("navigation", { name: "Índice do conteúdo" });
    const primeiroItem = within(indice).getByRole("button", { name: /Introdução/ });

    expect(primeiroItem).toHaveAttribute("aria-current", "true");
    expect(primeiroItem).toHaveClass("revisao-conteudo__item-indice--ativo");
    expect(within(dialog).getByRole("heading", { name: "Introdução" })).toBeInTheDocument();
  });

  test("clicar num item do indice troca a leitura e o destaque", async () => {
    const dialog = renderRevisao();
    const indice = within(dialog).getByRole("navigation", { name: "Índice do conteúdo" });

    await userEvent.click(within(indice).getByRole("button", { name: /Quiz geral/ }));

    expect(within(dialog).getByRole("heading", { name: "Quiz geral" })).toBeInTheDocument();
    expect(within(dialog).getByText("3 questões")).toBeInTheDocument();
    expect(within(dialog).getByText("Pergunta 2")).toBeInTheDocument();
    expect(within(indice).getByRole("button", { name: /Quiz geral/ })).toHaveAttribute("aria-current", "true");
    expect(within(indice).getByRole("button", { name: /Introdução/ })).not.toHaveAttribute("aria-current");
  });

  test("material com arquivo mostra 'Abrir arquivo'; material com link mostra 'Abrir link'", async () => {
    const dialog = renderRevisao();
    const indice = within(dialog).getByRole("navigation", { name: "Índice do conteúdo" });

    expect(within(dialog).getByRole("link", { name: "Abrir arquivo" })).toHaveAttribute("href", MATERIAL_A.arquivoUrl);

    await userEvent.click(within(indice).getByRole("button", { name: /Link externo/ }));
    expect(within(dialog).getByRole("link", { name: "Abrir link" })).toHaveAttribute("href", MATERIAL_B_LINK.linkUrl);
  });

  test("Anterior/Proximo seguem a ordem do indice e desativam nas pontas", async () => {
    const dialog = renderRevisao();
    const usuario = userEvent.setup();

    const botaoAnterior = () => within(dialog).getByRole("button", { name: /Anterior/ });
    const botaoProximo = () => within(dialog).getByRole("button", { name: /Próximo/ });

    expect(botaoAnterior()).toBeDisabled();
    expect(botaoProximo()).toHaveTextContent("Próximo: Quiz de revisão");

    await usuario.click(botaoProximo());
    expect(within(dialog).getByRole("heading", { name: "Quiz de revisão" })).toBeInTheDocument();
    expect(botaoAnterior()).toHaveTextContent("Anterior: Introdução");

    await usuario.click(botaoProximo());
    await usuario.click(botaoProximo());
    await usuario.click(botaoProximo());
    expect(within(dialog).getByRole("heading", { name: "Texto final" })).toBeInTheDocument();
    expect(botaoProximo()).toBeDisabled();
  });

  test("'Mostrar so quizzes' filtra o indice e o Anterior/Proximo passa a andar so entre quizzes", async () => {
    const dialog = renderRevisao();
    const usuario = userEvent.setup();

    await usuario.click(within(dialog).getByRole("button", { name: "Mostrar só quizzes" }));

    const indice = within(dialog).getByRole("navigation", { name: "Índice do conteúdo" });
    expect(within(indice).queryByRole("button", { name: /Introdução/ })).not.toBeInTheDocument();
    expect(within(indice).queryByRole("button", { name: /Link externo/ })).not.toBeInTheDocument();
    expect(within(indice).getByRole("button", { name: /Quiz de revisão/ })).toBeInTheDocument();
    expect(within(indice).getByRole("button", { name: /Quiz geral/ })).toBeInTheDocument();

    // filtro troca pro primeiro quiz sozinho, ja que "Introducao" (selecionado
    // antes) nao existe mais na lista filtrada.
    expect(within(dialog).getByRole("heading", { name: "Quiz de revisão" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Anterior/ })).toBeDisabled();

    await usuario.click(within(dialog).getByRole("button", { name: /Próximo/ }));
    expect(within(dialog).getByRole("heading", { name: "Quiz geral" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Próximo/ })).toBeDisabled();
  });

  test("setas do teclado no indice trocam o item selecionado", async () => {
    const dialog = renderRevisao();
    const indice = within(dialog).getByRole("navigation", { name: "Índice do conteúdo" });
    const primeiroItem = within(indice).getByRole("button", { name: /Introdução/ });

    primeiroItem.focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(within(dialog).getByRole("heading", { name: "Quiz de revisão" })).toBeInTheDocument();
  });

  test("curso sem conteudo publicado mostra o estado vazio", () => {
    const dialog = renderRevisao({
      conteudosPorModuloId: new Map([[1, []], [2, []]]),
      quizPorConteudoId: new Map(),
      quizzesPorModuloId: new Map([[1, []], [2, []]])
    });

    expect(within(dialog).getByText("Este curso ainda não tem conteúdo publicado.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("navigation", { name: "Índice do conteúdo" })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Mostrar só quizzes/)).not.toBeInTheDocument();
  });
});
