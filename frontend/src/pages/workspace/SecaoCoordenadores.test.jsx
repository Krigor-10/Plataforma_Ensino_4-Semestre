import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { SecaoCoordenadores } from "./SecaoCoordenadores.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";

const COORDENADOR_COM_DOIS_CURSOS = { id: 1, nome: "Coordenacao Academica", email: "coordenacao@edtech.local", ativo: true };
const COORDENADOR_COM_UM_CURSO = { id: 2, nome: "Coordenador Rival Teste", email: "rival@edtech.local", ativo: true };
const COORDENADOR_SEM_CURSO = { id: 3, nome: "Coordenador Teste 01", email: "teste01@edtech.local", ativo: true };

const COORDENADORES = [COORDENADOR_COM_DOIS_CURSOS, COORDENADOR_COM_UM_CURSO, COORDENADOR_SEM_CURSO];

const CURSOS = [
  { id: 100, titulo: "Curso Beta", coordenadorId: 1 },
  { id: 101, titulo: "Curso Alpha", coordenadorId: 1 },
  { id: 102, titulo: "Curso Gamma", coordenadorId: 2 }
];

function renderTela(props = {}) {
  return render(
    <ToastProvider>
      <SecaoCoordenadores coordenadores={COORDENADORES} cursos={CURSOS} {...props} />
    </ToastProvider>
  );
}

describe("SecaoCoordenadores - celula de cursos supervisionados", () => {
  test("com mais de um curso: mostra a contagem e '<primeiro curso> e mais N' em ordem alfabetica", () => {
    renderTela();

    expect(screen.getByText("2 cursos")).toBeInTheDocument();
    expect(screen.getByText("Curso Alpha e mais 1")).toBeInTheDocument();
  });

  test("com exatamente um curso: mostra so o nome do curso, sem 'e mais 0'", () => {
    renderTela();

    expect(screen.getByText("1 curso")).toBeInTheDocument();
    expect(screen.getByText("Curso Gamma")).toBeInTheDocument();
    expect(screen.queryByText(/e mais 0/)).not.toBeInTheDocument();
  });

  test("sem nenhum curso: mostra a Insignia 'Sem curso'", () => {
    renderTela();

    expect(screen.getByText("Sem curso")).toBeInTheDocument();
  });

  test("tabela nao tem mais coluna Status", () => {
    renderTela();

    expect(screen.queryByRole("columnheader", { name: "Status" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Cursos supervisionados/ })).toBeInTheDocument();
  });
});

describe("SecaoCoordenadores - atalho de filtro 'N sem curso'", () => {
  test("mostra o total de coordenadores sem curso na aba aberta e filtra a tabela ao clicar", async () => {
    const usuario = userEvent.setup();
    renderTela();

    const botaoFiltro = screen.getByRole("button", { name: "1 sem curso" });
    expect(botaoFiltro).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(COORDENADOR_COM_DOIS_CURSOS.nome)).toBeInTheDocument();
    expect(screen.getByText(COORDENADOR_SEM_CURSO.nome)).toBeInTheDocument();

    await usuario.click(botaoFiltro);

    expect(botaoFiltro).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(COORDENADOR_COM_DOIS_CURSOS.nome)).not.toBeInTheDocument();
    expect(screen.queryByText(COORDENADOR_COM_UM_CURSO.nome)).not.toBeInTheDocument();
    expect(screen.getByText(COORDENADOR_SEM_CURSO.nome)).toBeInTheDocument();
  });

  test("clicar de novo desliga o filtro e volta a mostrar todos", async () => {
    const usuario = userEvent.setup();
    renderTela();

    const botaoFiltro = screen.getByRole("button", { name: "1 sem curso" });
    await usuario.click(botaoFiltro);
    await usuario.click(botaoFiltro);

    expect(botaoFiltro).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(COORDENADOR_COM_DOIS_CURSOS.nome)).toBeInTheDocument();
  });

  test("some quando nenhum coordenador da aba esta sem curso", () => {
    const todosComCurso = COORDENADORES.map((coordenador) =>
      coordenador.id === COORDENADOR_SEM_CURSO.id ? { ...coordenador } : coordenador
    );
    const cursosParaTodos = [...CURSOS, { id: 103, titulo: "Curso Delta", coordenadorId: 3 }];

    renderTela({ coordenadores: todosComCurso, cursos: cursosParaTodos });

    expect(screen.queryByText(/sem curso/i)).not.toBeInTheDocument();
  });
});

describe("SecaoCoordenadores - 'x' de limpar busca", () => {
  test("so aparece quando ha texto digitado e limpa o campo ao clicar", async () => {
    const usuario = userEvent.setup();
    renderTela();

    expect(screen.queryByRole("button", { name: "Limpar busca" })).not.toBeInTheDocument();

    const campoBusca = screen.getByLabelText("Buscar coordenador");
    await usuario.type(campoBusca, "Rival");

    expect(screen.queryByText(COORDENADOR_COM_DOIS_CURSOS.nome)).not.toBeInTheDocument();
    expect(screen.getByText(COORDENADOR_COM_UM_CURSO.nome)).toBeInTheDocument();

    const botaoLimpar = screen.getByRole("button", { name: "Limpar busca" });
    await usuario.click(botaoLimpar);

    expect(campoBusca).toHaveValue("");
    expect(screen.getByText(COORDENADOR_COM_DOIS_CURSOS.nome)).toBeInTheDocument();
  });

  test("nao existe mais o botao 'Limpar filtros' solto numa linha propria", () => {
    renderTela();

    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  test("limpar a busca nao desliga o filtro 'sem curso' - cada um tem seu proprio controle", async () => {
    const usuario = userEvent.setup();
    renderTela();

    const botaoFiltro = screen.getByRole("button", { name: "1 sem curso" });
    await usuario.click(botaoFiltro);

    const campoBusca = screen.getByLabelText("Buscar coordenador");
    await usuario.type(campoBusca, "Teste");
    await usuario.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(botaoFiltro).toHaveAttribute("aria-pressed", "true");
  });
});
