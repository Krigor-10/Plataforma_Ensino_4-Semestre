import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import CadastroScreen from "./CadastroScreen.jsx";
import { apiRequest } from "../lib/api.js";

vi.mock("../lib/api.js", () => ({
  apiRequest: vi.fn()
}));

const CURSOS_MOCK = [
  { id: 1, titulo: "Curso Publico Um", descricao: "", preco: 0, ehGratuito: true },
  { id: 2, titulo: "Curso Publico Dois", descricao: "", preco: 199.9, ehGratuito: false },
  // Esse titulo esta na lista de ocultos do catalogo publico (appConfig.js).
  { id: 3, titulo: "Product Analytics para EdTech", descricao: "", preco: 0, ehGratuito: true }
];

describe("CadastroScreen", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("curso oculto do catalogo publico nao aparece na lista do select", async () => {
    apiRequest.mockResolvedValueOnce(CURSOS_MOCK);
    render(<CadastroScreen isDemoMode={false} onNavigate={vi.fn()} cursoId={null} />);

    const select = screen.getByLabelText("Curso desejado");
    await waitFor(() => expect(select).not.toBeDisabled());

    const rotulos = Array.from(select.options).map((opcao) => opcao.textContent);
    expect(rotulos).toContain("Curso Publico Um");
    expect(rotulos).toContain("Curso Publico Dois");
    expect(rotulos).not.toContain("Product Analytics para EdTech");
  });

  test("lista vazia apos filtro mostra aviso e nao quebra o formulario", async () => {
    apiRequest.mockResolvedValueOnce([CURSOS_MOCK[2]]); // so o curso oculto
    render(<CadastroScreen isDemoMode={false} onNavigate={vi.fn()} cursoId={null} />);

    await waitFor(() => expect(screen.getByLabelText("Curso desejado")).toBeDisabled());
    expect(screen.getByText(/nao ha cursos disponiveis para matricula/i)).toBeInTheDocument();
    // O restante do formulario continua utilizavel.
    expect(screen.getByLabelText("Nome completo")).toBeEnabled();
  });

  test("cursoId via prop pre-seleciona o select somente apos a lista carregar", async () => {
    apiRequest.mockResolvedValueOnce(CURSOS_MOCK);
    render(<CadastroScreen isDemoMode={false} onNavigate={vi.fn()} cursoId="2" />);

    const select = screen.getByLabelText("Curso desejado");
    expect(select.value).toBe("");

    await waitFor(() => expect(select.value).toBe("2"));
  });

  test("cursoId invalido/fora do catalogo filtrado nao e pre-selecionado", async () => {
    apiRequest.mockResolvedValueOnce(CURSOS_MOCK);
    render(<CadastroScreen isDemoMode={false} onNavigate={vi.fn()} cursoId="999" />);

    const select = screen.getByLabelText("Curso desejado");
    await waitFor(() => expect(select).not.toBeDisabled());

    expect(select.value).toBe("");
  });

  test("erro de carregamento do catalogo nao se mistura com erro de validacao do formulario", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Falha ao carregar cursos"));
    const usuario = userEvent.setup();
    render(<CadastroScreen isDemoMode={false} onNavigate={vi.fn()} cursoId={null} />);

    await waitFor(() => expect(screen.getByText("Falha ao carregar cursos")).toBeInTheDocument());

    await usuario.click(screen.getByRole("button", { name: "Proximo" }));

    expect(screen.getByText("Falha ao carregar cursos")).toBeInTheDocument();
    expect(screen.getAllByText("Preencha todos os campos desta etapa antes de continuar.").length).toBeGreaterThan(0);
  });
});
