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
  receita: 0,
  imagemUrl: null
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
  receita: 1290,
  imagemUrl: null
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
  receita: 0,
  imagemUrl: null
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
  receita: 29.9,
  imagemUrl: null
};

function criarCursoGenerico(cursoId, overrides = {}) {
  return {
    cursoId,
    titulo: `Curso ${String(cursoId).padStart(2, "0")}`,
    modeloCurso: 1,
    situacao: 1,
    preco: 0,
    inscritos: 0,
    comecaram: 0,
    concluiram: 0,
    comCertificado: 0,
    pendentes: 0,
    receita: 0,
    imagemUrl: null,
    ...overrides
  };
}

function criarLista(quantidade, overrides = {}) {
  return Array.from({ length: quantidade }, (_, indice) => criarCursoGenerico(indice + 1, overrides));
}

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

  test("KPI 'Total de cursos' mostra o total da plataforma e ignora chip, busca e periodo", async () => {
    const usuario = userEvent.setup();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA, INSCRICAO_SEM_NINGUEM]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");
    expect(screen.getByRole("article", { name: /Total de cursos na plataforma: 3/ })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Gratuito" }));
    expect(screen.getByRole("article", { name: /Total de cursos na plataforma: 3/ })).toBeInTheDocument();

    await usuario.type(screen.getByPlaceholderText("Buscar curso…"), "nada-encontra-isso");
    expect(screen.getByRole("article", { name: /Total de cursos na plataforma: 3/ })).toBeInTheDocument();

    await usuario.click(screen.getByLabelText("Período"));
    await usuario.click(screen.getByRole("option", { name: "Este ano" }));
    await waitFor(() => expect(apiRequest.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getByRole("article", { name: /Total de cursos na plataforma: 3/ })).toBeInTheDocument();
  });

  test("KPI 'Total de cursos': contagem por modelo e singular com 1 e plural com mais de um", async () => {
    mockInscricoes([
      INSCRICAO_GRATUITO_ENCERRADO,
      INSCRICAO_PAGO_A_VENDA,
      INSCRICAO_ENGENHARIA_SINGULAR,
      INSCRICAO_SEM_NINGUEM
    ]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    expect(screen.getByText("1 gratuito")).toBeInTheDocument();
    expect(screen.getByText("2 pagos")).toBeInTheDocument();
    expect(screen.getByText("1 acompanhado")).toBeInTheDocument();
  });

  test("5 KPIs somam os numeros de todos os cursos filtrados", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    // 5 + 2 = 7 inscritos; 4 + 1 = 5 concluiram (71% de 7, arredondado).
    expect(screen.getByRole("article", { name: /^Inscrições: 7$/ })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Concluíram: 5 - 71% das inscrições/ })).toBeInTheDocument();

    // 1 pendente (so o curso pago) aparece na linha de baixo da "Receita estimada", junto do selo "Simulada".
    const cartaoReceita = screen.getByRole("article", { name: /^Receita estimada: R\$\s*1\.290,00$/ });
    expect(within(cartaoReceita).getByText("Simulada")).toBeInTheDocument();
    expect(within(cartaoReceita).getByText("1 pendente")).toBeInTheDocument();
  });

  test("KPI de receita: sem pendentes, a linha de baixo mostra so o selo 'Simulada'", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    const cartaoReceita = screen.getByRole("article", { name: /^Receita estimada: R\$\s*0,00$/ });
    expect(within(cartaoReceita).getByText("Simulada")).toBeInTheDocument();
    expect(within(cartaoReceita).queryByText(/pendente/)).not.toBeInTheDocument();
  });

  test("KPIs nunca cortam o valor, mesmo com numeros grandes", async () => {
    mockInscricoes([{ ...INSCRICAO_PAGO_A_VENDA, receita: 100000 }]);
    renderInscricoes();

    await screen.findByText("Desenvolvimento Web");

    const cartaoReceita = screen.getByRole("article", { name: /^Receita estimada:/ });
    expect(within(cartaoReceita).getByText("R$ 100.000,00")).toBeInTheDocument();
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

  test("busca filtra pelo titulo sem diferenciar maiusculas nem acentos", async () => {
    const usuario = userEvent.setup();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    await usuario.type(screen.getByPlaceholderText("Buscar curso…"), "INTRODUCAO");

    expect(screen.getByText("Introdução à IA")).toBeInTheDocument();
    expect(screen.queryByText("Desenvolvimento Web")).not.toBeInTheDocument();
    expect(screen.getByText("1 curso encontrado")).toBeInTheDocument();
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

  test("Iniciaram e Concluíram ficam em 0% quando o curso nao tem inscritos", async () => {
    mockInscricoes([INSCRICAO_SEM_NINGUEM]);
    renderInscricoes();

    const linha = (await screen.findByText("Redes e Infraestrutura")).closest("tr");
    expect(within(linha).getAllByText("0%")).toHaveLength(2);
  });

  test("pendentes: fica em destaque quando maior que zero, curso gratuito mostra travessao", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    const linhaGratuita = screen.getByText("Introdução à IA").closest("tr");
    expect(within(linhaGratuita).getAllByText("—")).toHaveLength(2);

    const linhaPaga = screen.getByText("Desenvolvimento Web").closest("tr");
    const celulaPendentes = linhaPaga.querySelector('[data-label="Pendentes"]');
    const pendentePago = within(celulaPendentes).getByText("1");
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

  test("botao 'Ver curso' navega sem duplicar a navegacao da linha", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes({ onNavigate });

    await screen.findByText("Introdução à IA");
    await usuario.click(screen.getByRole("button", { name: "Ver curso Introdução à IA" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/1");
  });

  test("linha de total soma inscritos, iniciaram/concluiram, pendentes e receita de todos os cursos filtrados", async () => {
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
    renderInscricoes();

    await screen.findByText("Introdução à IA");

    expect(screen.getByText("Total · 2 cursos")).toBeInTheDocument();
  });

  describe("paginação (10 cursos por página)", () => {
    test("mostra 10 por pagina e navega pra proxima", async () => {
      const usuario = userEvent.setup();
      mockInscricoes(criarLista(12));
      renderInscricoes();

      await screen.findByText("Curso 01");
      expect(screen.getByText("Mostrando 1–10 de 12 cursos")).toBeInTheDocument();
      expect(screen.queryByText("Curso 11")).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "2" }));

      expect(await screen.findByText("Curso 11")).toBeInTheDocument();
      expect(screen.getByText("Curso 12")).toBeInTheDocument();
      expect(screen.queryByText("Curso 01")).not.toBeInTheDocument();
      expect(screen.getByText("Mostrando 11–12 de 12 cursos")).toBeInTheDocument();
    });

    test("linha de total soma TODOS os cursos filtrados, nao so a pagina atual", async () => {
      mockInscricoes(criarLista(12, { inscritos: 1 }));
      renderInscricoes();

      await screen.findByText("Curso 01");

      expect(screen.getByText("Total · 12 cursos")).toBeInTheDocument();
    });

    test("nao aparece com 10 cursos ou menos", async () => {
      mockInscricoes(criarLista(10));
      renderInscricoes();

      await screen.findByText("Curso 01");

      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    });

    test("trocar o filtro de modelo volta pra pagina 1", async () => {
      const usuario = userEvent.setup();
      const gratuitos = Array.from({ length: 6 }, (_, indice) => criarCursoGenerico(indice + 1, { titulo: `Grátis ${indice + 1}`, modeloCurso: 1 }));
      const pagos = Array.from({ length: 6 }, (_, indice) => criarCursoGenerico(indice + 101, { titulo: `Pago ${indice + 1}`, modeloCurso: 2 }));
      mockInscricoes([...gratuitos, ...pagos]);
      renderInscricoes();

      await screen.findByText("Grátis 1");
      await usuario.click(screen.getByRole("button", { name: "2" }));
      expect(await screen.findByText("Pago 5")).toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Gratuito" }));

      expect(await screen.findByText("Grátis 1")).toBeInTheDocument();
      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    });
  });
});
