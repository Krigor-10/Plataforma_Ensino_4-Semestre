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
    expect(screen.getAllByText("Pendente").length).toBe(2);
    expect(screen.getAllByText(/^Media /).length).toBe(2);
  });
});
