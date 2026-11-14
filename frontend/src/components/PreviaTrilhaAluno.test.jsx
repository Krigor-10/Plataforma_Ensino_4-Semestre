import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import PreviaTrilhaAluno from "./PreviaTrilhaAluno.jsx";

const MODULOS_DO_CURSO = [{ id: 1, titulo: "Modulo 1" }];

const CONTEUDO_PUBLICADO = {
  id: 10,
  titulo: "Material publicado",
  tipoConteudo: 2,
  statusPublicacao: 2,
  arquivoUrl: "/uploads/conteudos/material.pdf",
  linkUrl: ""
};

const CONTEUDO_RASCUNHO = {
  id: 11,
  titulo: "Material rascunho",
  tipoConteudo: 1,
  statusPublicacao: 1,
  arquivoUrl: "",
  linkUrl: ""
};

const QUIZ_VINCULADO = { id: 101, titulo: "Quiz do conteudo", statusPublicacao: 2, totalQuestoes: 1 };

const QUESTAO_COM_GABARITO = {
  id: 1,
  enunciado: "Pergunta de exemplo",
  alternativas: [
    { id: 1, letra: "A", texto: "Alternativa errada", ehCorreta: false },
    { id: 2, letra: "B", texto: "Alternativa certa", ehCorreta: true }
  ],
  afirmativas: []
};

function conteudosPorModuloId(lista = [CONTEUDO_PUBLICADO, CONTEUDO_RASCUNHO]) {
  return new Map([[1, lista]]);
}

// Uso do Professor ("Visualizar como aluno", SecaoConteudosProfessor.jsx):
// so os props originais, nenhum dos opcionais do Coordenador.
describe("PreviaTrilhaAluno - uso do Professor (sem regressao apos extracao)", () => {
  test("mostra so o conteudo publicado, sem selo, sem link de arquivo e sem gabarito", () => {
    render(
      <PreviaTrilhaAluno
        conteudosPorModuloId={conteudosPorModuloId()}
        cursoTitulo="Curso Teste"
        modulosDoCurso={MODULOS_DO_CURSO}
        onFechar={vi.fn()}
        quizPorConteudoId={new Map([[10, QUIZ_VINCULADO]])}
        quizzesPorModuloId={new Map([[1, []]])}
      />
    );

    const dialog = screen.getByRole("dialog", { name: /Visualizar como aluno/ });
    expect(within(dialog).getByText("Material publicado")).toBeInTheDocument();
    expect(within(dialog).queryByText("Material rascunho")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Quiz do conteudo")).toBeInTheDocument();

    expect(within(dialog).queryByText("Somente leitura")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: /Abrir arquivo/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Pergunta de exemplo")).not.toBeInTheDocument();
  });

  test("sem nenhum conteudo ou quiz publicado, mostra o estado vazio", () => {
    render(
      <PreviaTrilhaAluno
        conteudosPorModuloId={new Map([[1, []]])}
        cursoTitulo="Curso Teste"
        modulosDoCurso={MODULOS_DO_CURSO}
        onFechar={vi.fn()}
        quizPorConteudoId={new Map()}
        quizzesPorModuloId={new Map([[1, []]])}
      />
    );

    expect(screen.getByText("Nenhum material publicado neste curso ainda.")).toBeInTheDocument();
  });
});

// Uso do Coordenador ("Ver conteudo", PainelCursoGestao.jsx): props opcionais
// preenchidas - nao pode afetar o comportamento acima sem elas.
describe("PreviaTrilhaAluno - uso do Coordenador (props opcionais)", () => {
  test("mostra o selo Somente leitura, o link de abrir arquivo e o gabarito do quiz", () => {
    render(
      <PreviaTrilhaAluno
        conteudosPorModuloId={conteudosPorModuloId([CONTEUDO_PUBLICADO])}
        cursoTitulo="Curso Teste"
        modulosDoCurso={MODULOS_DO_CURSO}
        onFechar={vi.fn()}
        permitirAbrirArquivo
        questoesPorAvaliacaoId={new Map([[101, [QUESTAO_COM_GABARITO]]])}
        quizPorConteudoId={new Map([[10, QUIZ_VINCULADO]])}
        quizzesPorModuloId={new Map([[1, []]])}
        seloSomenteLeitura
      />
    );

    const dialog = screen.getByRole("dialog", { name: /Visualizar como aluno/ });
    expect(within(dialog).getByText("Somente leitura")).toBeInTheDocument();

    const linkArquivo = within(dialog).getByRole("link", { name: /Abrir arquivo/ });
    expect(linkArquivo).toHaveAttribute("href", CONTEUDO_PUBLICADO.arquivoUrl);
    expect(linkArquivo).toHaveAttribute("target", "_blank");

    expect(within(dialog).getByText("Pergunta de exemplo")).toBeInTheDocument();
    const itemAlternativaCerta = within(dialog).getByText(
      (_, element) =>
        element.tagName === "LI" &&
        element.className.includes("revisao-alternativas__item") &&
        element.textContent.includes("Alternativa certa")
    );
    expect(itemAlternativaCerta).toHaveClass("revisao-alternativas__item--correta");
  });

  test("sem questoesPorAvaliacaoId preenchido pro quiz, nao mostra gabarito (so renderiza quando os dados vierem)", () => {
    render(
      <PreviaTrilhaAluno
        conteudosPorModuloId={conteudosPorModuloId([CONTEUDO_PUBLICADO])}
        cursoTitulo="Curso Teste"
        modulosDoCurso={MODULOS_DO_CURSO}
        onFechar={vi.fn()}
        permitirAbrirArquivo
        questoesPorAvaliacaoId={new Map()}
        quizPorConteudoId={new Map([[10, QUIZ_VINCULADO]])}
        quizzesPorModuloId={new Map([[1, []]])}
        seloSomenteLeitura
      />
    );

    const dialog = screen.getByRole("dialog", { name: /Visualizar como aluno/ });
    expect(within(dialog).getByText("Quiz do conteudo")).toBeInTheDocument();
    expect(within(dialog).queryByText("Pergunta de exemplo")).not.toBeInTheDocument();
  });
});
