import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SecaoCursos } from "./SecaoCursos.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn().mockResolvedValue([]) };
});

const COORDENADORES = [{ id: 7, nome: "Ana Coordenadora" }];

// Curso A: "Em andamento", sem coordenador. Curso B: "Em andamento", com
// coordenador. Curso C: "A venda" (Pago + publicadoParaVendaEm), com
// coordenador - cobre os 2 estados do filtro de Modelo (ativo/desativado).
const CURSOS = [
  { id: 1, titulo: "Curso A", codigoRegistro: "CUR-001", modeloCurso: 1, coordenadorId: null },
  { id: 2, titulo: "Curso B", codigoRegistro: "CUR-002", modeloCurso: 3, coordenadorId: 7 },
  { id: 3, titulo: "Curso C", codigoRegistro: "CUR-003", modeloCurso: 2, coordenadorId: 7, publicadoParaVendaEm: "2026-01-01" }
];

function renderSecaoCursos(props = {}) {
  return render(
    <ToastProvider>
      <SecaoCursos coordenadores={COORDENADORES} cursos={CURSOS} ehAdmin onNavigate={vi.fn()} {...props} />
    </ToastProvider>
  );
}

// Rodada 2 do filtro de Cursos do Admin (docs/bugs/PROMPT-agente-filtros-
// cursos-admin-rodada2.md): 3 itens fixos (Coordenador/Modelo/Limpar), sem
// chip solto, sem o filtro de Modelo sumindo nas abas de venda.
describe("SecaoCursos - filtros do Admin (rodada 2)", () => {
  test("nao existe mais o chip solto 'N sem coordenador'", () => {
    renderSecaoCursos();

    // O chip antigo era um botao isolado com o texto "N sem coordenador"
    // (numero na frente); o selo "Sem coordenador" no card continua existindo
    // (regra da rodada 1), por isso o regex exige o numero antes do texto.
    expect(screen.queryByRole("button", { name: /^\d+ sem coordenador$/i })).not.toBeInTheDocument();
  });

  test("'Sem coordenador (N)' conta so dentro da aba aberta", async () => {
    renderSecaoCursos();

    const selectCoordenador = screen.getByLabelText("Coordenador");
    expect(within(selectCoordenador).getByRole("option", { name: "Coordenador: Sem coordenador (1)" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /À venda/ }));
    expect(within(selectCoordenador).getByRole("option", { name: "Coordenador: Sem coordenador (0)" })).toBeInTheDocument();
  });

  test("Modelo fica desativado mostrando 'Modelo: Pago' nas abas de venda, e volta a ativar", async () => {
    renderSecaoCursos();

    const selectModelo = screen.getByLabelText("Modelo");
    expect(selectModelo).toBeEnabled();
    expect(selectModelo).toHaveDisplayValue("Modelo: Todos");

    await userEvent.click(screen.getByRole("tab", { name: /À venda/ }));
    expect(selectModelo).toBeDisabled();
    expect(selectModelo).toHaveDisplayValue("Modelo: Pago");

    await userEvent.click(screen.getByRole("tab", { name: /Em andamento/ }));
    expect(selectModelo).toBeEnabled();
    expect(selectModelo).toHaveDisplayValue("Modelo: Todos");
  });

  test("Limpar (✕) comeca desativado e ativa com filtro, limpando tudo ao clicar", async () => {
    renderSecaoCursos();

    const botaoLimpar = screen.getByRole("button", { name: "Limpar filtros" });
    expect(botaoLimpar).toBeDisabled();

    const selectCoordenador = screen.getByLabelText("Coordenador");
    await userEvent.selectOptions(selectCoordenador, "aguardando");

    expect(botaoLimpar).toBeEnabled();
    await userEvent.click(botaoLimpar);

    expect(botaoLimpar).toBeDisabled();
    expect(selectCoordenador).toHaveDisplayValue("Coordenador: Todos");
  });
});
