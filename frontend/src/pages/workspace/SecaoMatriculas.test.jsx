import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoMatriculas } from "./SecaoMatriculas.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const INSCRICAO_GRATUITO_ENCERRADO = {
  cursoId: 1,
  titulo: "Introdução à IA",
  modeloCurso: 1,
  situacao: 3,
  preco: 0,
  inscritos: 5,
  comecaram: 5,
  concluiram: 4,
  comCertificado: 2,
  pendentes: 0,
  receita: 0
};

const INSCRICAO_PAGO_A_VENDA = {
  cursoId: 2,
  titulo: "Desenvolvimento Web",
  modeloCurso: 2,
  situacao: 4,
  preco: 1290,
  inscritos: 2,
  comecaram: 2,
  concluiram: 1,
  comCertificado: 1,
  pendentes: 1,
  receita: 1290
};

const INSCRICAO_SEM_NINGUEM = {
  cursoId: 3,
  titulo: "Redes e Infraestrutura",
  modeloCurso: 3,
  situacao: 1,
  preco: 59.9,
  inscritos: 0,
  comecaram: 0,
  concluiram: 0,
  comCertificado: 0,
  pendentes: 0,
  receita: 0
};

const INSCRICAO_ENGENHARIA_SINGULAR = {
  cursoId: 4,
  titulo: "Engenharia de Software",
  modeloCurso: 2,
  situacao: 4,
  preco: 29.9,
  inscritos: 1,
  comecaram: 1,
  concluiram: 1,
  comCertificado: 0,
  pendentes: 0,
  receita: 29.9
};

function mockInscricoes(lista) {
  apiRequest.mockImplementation((url) => {
    if (url.startsWith("/Cursos/inscricoes")) {
      return Promise.resolve(lista);
    }
    return Promise.resolve([]);
  });
}

function renderInscricoes(props = {}) {
  return render(<SecaoMatriculas cursos={[]} ehAluno={false} linhasMatriculas={[]} onNavigate={vi.fn()} onSessionExpired={vi.fn()} usuario={{ id: 1 }} {...props} />);
}

describe("SecaoMatriculas - VistaGestorMatriculas (tela Inscrições do Admin)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("cabecalho mostra 'Inscrições', nao 'Matriculas'", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes();

    expect(await screen.findByRole("heading", { name: "Inscrições" })).toBeInTheDocument();
  });

  test("resumo soma os numeros de todos os cursos carregados", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    // 5 + 2 = 7 inscritos; 4 + 1 = 5 concluiram (71% de 7, arredondado).
    expect(screen.getByRole("article", { name: /Inscrições: 7/ })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Concluíram · 71%: 5/ })).toBeInTheDocument();
    // 1 pendente (so o curso pago) aparece no resumo de Receita.
    expect(screen.getByRole("article", { name: /Receita \(simulada\) · 1 pendente: R\$\s*1\.290,00/ })).toBeInTheDocument();
  });

  test("filtro de modelo (chip) e feito no cliente, sem nova chamada a API", async () => {
    const usuario = userEvent.setup();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");
    const chamadasAntes = apiRequest.mock.calls.length;

    await usuario.click(screen.getByRole("button", { name: "Gratuito" }));

    expect(screen.getByText("Introdução à IA")).toBeInTheDocument();
    expect(screen.queryByText("Desenvolvimento Web")).not.toBeInTheDocument();
    expect(apiRequest.mock.calls.length).toBe(chamadasAntes);
  });

  test("seletor de periodo chama a API de novo com de/ate", async () => {
    const usuario = userEvent.setup();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    await usuario.click(screen.getByLabelText("Período"));
    await usuario.click(screen.getByRole("option", { name: "Este ano" }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(expect.stringMatching(/^\/Cursos\/inscricoes\?de=\d{4}-01-01&ate=\d{4}-\d{2}-\d{2}$/))
    );
  });

  test("funil: 0 inscritos mostra 'Ninguém inscrito ainda'", async () => {
    mockInscricoes([INSCRICAO_SEM_NINGUEM]);
    renderInscricoes();

    expect(await screen.findByText("Ninguém inscrito ainda")).toBeInTheDocument();
  });

  test("funil: plural quando mais de um comecou/concluiu", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes();

    expect(await screen.findByText("5 começaram › 4 concluíram › 2 com certificado")).toBeInTheDocument();
  });

  test("funil: singular quando exatamente 1 comecou/concluiu", async () => {
    mockInscricoes([INSCRICAO_ENGENHARIA_SINGULAR]);
    renderInscricoes();

    expect(await screen.findByText("1 começou › 1 concluiu › 0 com certificado")).toBeInTheDocument();
  });

  test("pendentes: fica em destaque quando maior que zero, curso gratuito mostra travessao", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    const linhaGratuita = screen.getByText("Introdução à IA").closest("tr");
    expect(within(linhaGratuita).getAllByText("—")).toHaveLength(2);

    const linhaPaga = screen.getByText("Desenvolvimento Web").closest("tr");
    const pendentePago = within(linhaPaga).getByText("1");
    expect(pendentePago).toHaveClass("inscricoes-pendentes--destaque");
  });

  test("clicar na linha chama onNavigate pra tela do curso", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes({ onNavigate });

    await screen.findByText("Introdução à IA");
    await usuario.click(screen.getByText("Introdução à IA").closest("tr"));

    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/1");
  });

  test("Enter com foco na linha tambem navega pra tela do curso", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes({ onNavigate });

    await screen.findByText("Introdução à IA");
    const linha = screen.getByText("Introdução à IA").closest("tr");
    linha.focus();
    await usuario.keyboard("{Enter}");

    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/1");
  });

  test("linha de total soma inscritos, pendentes e receita de todos os cursos filtrados", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    expect(screen.getByText("Total · 2 cursos")).toBeInTheDocument();
  });
});
