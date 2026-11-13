import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SecaoCursos } from "./SecaoCursos.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";

function renderSecaoCursos(props = {}) {
  return render(
    <ToastProvider>
      <SecaoCursos
        coordenadores={[]}
        cursos={[]}
        matriculas={[]}
        modulos={[]}
        onNavigate={vi.fn()}
        onRefresh={vi.fn()}
        onSessionExpired={vi.fn()}
        professores={[]}
        {...props}
      />
    </ToastProvider>
  );
}

describe("SecaoCursos - Coordenador: abas Ativos/Encerrados (docs/fluxo-coordenador/partes/PARTE-1)", () => {
  const CURSO_ANDAMENTO = { id: 1, titulo: "Curso em andamento", codigoRegistro: "CUR-001", modeloCurso: 1 };
  const CURSO_AGUARDANDO = {
    id: 2,
    titulo: "Curso aguardando encerramento",
    codigoRegistro: "CUR-002",
    modeloCurso: 1,
    concluidoPeloProfessorEm: "2026-01-10T12:00:00"
  };
  const CURSO_ENCERRADO = {
    id: 3,
    titulo: "Curso ja encerrado",
    codigoRegistro: "CUR-003",
    modeloCurso: 1,
    concluidoPeloProfessorEm: "2026-01-05T12:00:00",
    encerradoEm: "2026-01-20T12:00:00"
  };
  const CURSOS = [CURSO_ANDAMENTO, CURSO_AGUARDANDO, CURSO_ENCERRADO];

  test("mostra as abas com a contagem certa e filtra a lista por aba", async () => {
    renderSecaoCursos({ cursos: CURSOS, ehCoordenador: true });

    const abaAtivos = screen.getByRole("tab", { name: /Ativos/ });
    const abaEncerrados = screen.getByRole("tab", { name: /Encerrados/ });
    expect(within(abaAtivos).getByText("2")).toBeInTheDocument();
    expect(within(abaEncerrados).getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Curso em andamento")).toBeInTheDocument();
    expect(screen.getByText("Curso aguardando encerramento")).toBeInTheDocument();
    expect(screen.queryByText("Curso ja encerrado")).not.toBeInTheDocument();

    await userEvent.click(abaEncerrados);

    expect(screen.getByText("Curso ja encerrado")).toBeInTheDocument();
    expect(screen.queryByText("Curso em andamento")).not.toBeInTheDocument();
    expect(screen.queryByText("Curso aguardando encerramento")).not.toBeInTheDocument();
  });

  test("subtitulo acompanha a aba selecionada", async () => {
    renderSecaoCursos({ cursos: CURSOS, ehCoordenador: true });

    expect(screen.getByText("Cursos ativos da sua coordenação.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Encerrados/ }));

    expect(screen.getByText("Cursos que você encerrou.")).toBeInTheDocument();
  });

  test("curso aguardando encerramento aparece primeiro na aba Ativos, com selo ambar", async () => {
    const aguardandoZ = { id: 10, titulo: "Zulu - aguardando", codigoRegistro: "CUR-010", modeloCurso: 1, concluidoPeloProfessorEm: "2026-01-10T12:00:00" };
    const andamentoA = { id: 11, titulo: "Alfa - em andamento", codigoRegistro: "CUR-011", modeloCurso: 1 };

    renderSecaoCursos({ cursos: [andamentoA, aguardandoZ], ehCoordenador: true });

    const titulos = screen.getAllByText(/Zulu - aguardando|Alfa - em andamento/).map((elemento) => elemento.textContent);
    expect(titulos).toEqual(["Zulu - aguardando", "Alfa - em andamento"]);

    expect(screen.getByText("Aguardando você")).toBeInTheDocument();
  });

  test("selo 'Encerrado' com cadeado na aba Encerrados; nenhum card mostra Media nem Coordenado", async () => {
    renderSecaoCursos({ cursos: CURSOS, ehCoordenador: true });

    expect(screen.queryByText(/^Media /)).not.toBeInTheDocument();
    expect(screen.queryByText("Coordenado")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Encerrados/ }));

    expect(screen.getByText("Encerrado")).toBeInTheDocument();
  });

  test("clicar no card continua abrindo o curso, nas duas abas", async () => {
    const onNavigate = vi.fn();
    renderSecaoCursos({ cursos: CURSOS, ehCoordenador: true, onNavigate });

    await userEvent.click(screen.getByText("Curso aguardando encerramento"));
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/2");

    await userEvent.click(screen.getByRole("tab", { name: /Encerrados/ }));
    await userEvent.click(screen.getByText("Curso ja encerrado"));
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/3");
  });

  test("Admin: sem abas Ativos/Encerrados, mantem Coordenado e Media no card", () => {
    renderSecaoCursos({ cursos: CURSOS, ehAdmin: true });

    // Aba padrao do Admin e "Em andamento" (categoriaCicloCurso) - so
    // CURSO_ANDAMENTO e CURSO_AGUARDANDO caem nela (CURSO_ENCERRADO tem
    // encerradoEm e vai pra aba "Encerrados" do Admin).
    expect(screen.queryByRole("tab", { name: /^Ativos/ })).not.toBeInTheDocument();
    // selector restrito ao role="status" (Insignia) pra nao contar a opcao
    // "Sem coordenador" do select de filtro, que tem o mesmo texto.
    expect(screen.getAllByText("Sem coordenador", { selector: '[role="status"]' }).length).toBe(2);
    expect(screen.getAllByText(/^Media /).length).toBe(2);
  });
});

describe("SecaoCursos - Admin: filtros na linha das abas (docs/bugs/PROMPT-agente-filtros-cursos-admin)", () => {
  const CURSO_GRATUITO_SEM_COORD = { id: 20, titulo: "Curso Gratuito Sem Coordenador", codigoRegistro: "CUR-020", modeloCurso: 1 };
  const CURSO_ACOMPANHADO_COM_COORD = { id: 21, titulo: "Curso Acompanhado Coordenado", codigoRegistro: "CUR-021", modeloCurso: 3, coordenadorId: 5 };
  const CURSO_PACOTE_A_VENDA = { id: 22, titulo: "Pacote A Venda", codigoRegistro: "CUR-022", modeloCurso: 2, publicadoParaVendaEm: "2026-01-01T12:00:00" };

  test("aba Em andamento: mostra filtro de modelo e o atalho 'N sem coordenador'; clique filtra e o segundo clique desfaz", async () => {
    renderSecaoCursos({ cursos: [CURSO_GRATUITO_SEM_COORD, CURSO_ACOMPANHADO_COM_COORD], ehAdmin: true });

    expect(screen.getByText("Modelo:")).toBeInTheDocument();

    const chip = screen.getByRole("button", { name: /1 sem coordenador/ });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Curso Gratuito Sem Coordenador")).toBeInTheDocument();
    expect(screen.getByText("Curso Acompanhado Coordenado")).toBeInTheDocument();

    await userEvent.click(chip);

    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Curso Gratuito Sem Coordenador")).toBeInTheDocument();
    expect(screen.queryByText("Curso Acompanhado Coordenado")).not.toBeInTheDocument();

    await userEvent.click(chip);

    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Curso Acompanhado Coordenado")).toBeInTheDocument();
  });

  test("aba A venda: filtro de modelo nao aparece e um filtro 'Gratis' escolhido antes nao fica aplicado escondido", async () => {
    renderSecaoCursos({ cursos: [CURSO_GRATUITO_SEM_COORD, CURSO_PACOTE_A_VENDA], ehAdmin: true });

    await userEvent.selectOptions(screen.getByLabelText("Modelo:"), "1");
    expect(screen.getByText("Curso Gratuito Sem Coordenador")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /À venda/ }));

    expect(screen.queryByText("Modelo:")).not.toBeInTheDocument();
    expect(screen.getByText("Pacote A Venda")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Em andamento/ }));

    expect(screen.getByLabelText("Modelo:")).toHaveValue("todos");
    expect(screen.getByText("Curso Gratuito Sem Coordenador")).toBeInTheDocument();
  });

  test("'Limpar filtros' so aparece com filtro ou busca ativa", async () => {
    renderSecaoCursos({ cursos: [CURSO_GRATUITO_SEM_COORD, CURSO_ACOMPANHADO_COM_COORD], ehAdmin: true });

    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Pesquisar cursos"), "Gratuito");

    const botaoLimpar = screen.getByRole("button", { name: "Limpar filtros" });
    expect(botaoLimpar).toBeInTheDocument();
    expect(screen.queryByText("Curso Acompanhado Coordenado")).not.toBeInTheDocument();

    await userEvent.click(botaoLimpar);

    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
    expect(screen.getByText("Curso Acompanhado Coordenado")).toBeInTheDocument();
  });
});
