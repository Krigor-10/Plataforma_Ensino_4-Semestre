import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoMatriculas, SecaoMeusCursosMatriculados } from "./SecaoMatriculas.jsx";
import { AssistenteChatbotProvider } from "../../hooks/useAssistenteChatbot.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
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
  aReceber: 0,
  cancelados: 0,
  valorCancelado: 0,
  tentativasCompra: 0,
  compraram: 0,
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
  aReceber: 1290,
  cancelados: 1,
  valorCancelado: 990,
  tentativasCompra: 4,
  compraram: 2,
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
  aReceber: 0,
  cancelados: 0,
  valorCancelado: 0,
  tentativasCompra: 0,
  compraram: 0,
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
  aReceber: 0,
  cancelados: 0,
  valorCancelado: 0,
  tentativasCompra: 1,
  compraram: 1,
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
    aReceber: 0,
    cancelados: 0,
    valorCancelado: 0,
    tentativasCompra: 0,
    compraram: 0,
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

  describe("abas 'Alunos' e 'Vendas'", () => {
    test("comeca em 'Alunos', com os 4 KPIs academicos", async () => {
      mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO, INSCRICAO_PAGO_A_VENDA]);
      renderInscricoes();

      await screen.findByText("Introdução à IA");

      expect(screen.getByRole("tab", { name: /Alunos/ })).toHaveAttribute("aria-selected", "true");
      // 5 + 2 = 7 inscritos; 4 + 1 = 5 concluiram (71% de 7, arredondado).
      expect(screen.getByRole("article", { name: /^Inscrições: 7$/ })).toBeInTheDocument();
      expect(screen.getByRole("article", { name: /Concluíram: 5 - 71% das inscrições/ })).toBeInTheDocument();
      expect(screen.queryByRole("article", { name: /^Recebido:/ })).not.toBeInTheDocument();
    });

    test("clicar em 'Vendas' troca os 4 KPIs pros numeros de vendas", async () => {
      const usuario = userEvent.setup();
      mockInscricoes([INSCRICAO_PAGO_A_VENDA]);
      renderInscricoes();

      await screen.findByText("Desenvolvimento Web");
      await usuario.click(screen.getByRole("tab", { name: /Vendas/ }));

      expect(screen.getByRole("tab", { name: /Vendas/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByRole("article", { name: /^Inscrições:/ })).not.toBeInTheDocument();
      // receita 1290, compraram 2 pagamentos.
      expect(screen.getByRole("article", { name: /^Recebido: R\$\s*1\.290,00 - 2 pagamentos$/ })).toBeInTheDocument();
      // aReceber 1290, 1 aluno pendente (singular).
      expect(screen.getByRole("article", { name: /^A receber: R\$\s*1\.290,00 - 1 aluno pendente$/ })).toBeInTheDocument();
      // cancelados 1, valorCancelado 990.
      expect(screen.getByRole("article", { name: /^Cancelados: 1 - R\$\s*990,00$/ })).toBeInTheDocument();
      // compraram 2 de tentativasCompra 4 = 50%.
      expect(screen.getByRole("article", { name: /^Conversão: 50% - 2 de 4 pagaram$/ })).toBeInTheDocument();
    });

    test("Conversão mostra '—' quando nao ha tentativas de compra (curso gratuito)", async () => {
      const usuario = userEvent.setup();
      mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
      renderInscricoes();

      await screen.findByText("Introdução à IA");
      await usuario.click(screen.getByRole("tab", { name: /Vendas/ }));

      expect(screen.getByRole("article", { name: /^Conversão: —$/ })).toBeInTheDocument();
    });

    test("aba Vendas mostra 'N pendentes' quando ha pendentes, e nada quando nao ha", async () => {
      mockInscricoes([INSCRICAO_PAGO_A_VENDA]);
      renderInscricoes();

      await screen.findByText("Desenvolvimento Web");
      expect(within(screen.getByRole("tab", { name: /Vendas/ })).getByText("1 pendente")).toBeInTheDocument();
    });

    test("aba Vendas nao mostra contador quando nao ha pendentes", async () => {
      mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
      renderInscricoes();

      await screen.findByText("Introdução à IA");
      expect(within(screen.getByRole("tab", { name: /Vendas/ })).queryByText(/pendente/)).not.toBeInTheDocument();
    });

    test("seta do teclado troca de aba e move o foco", async () => {
      const usuario = userEvent.setup();
      mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
      renderInscricoes();

      await screen.findByText("Introdução à IA");
      screen.getByRole("tab", { name: /Alunos/ }).focus();

      await usuario.keyboard("{ArrowRight}");

      const abaVendas = screen.getByRole("tab", { name: /Vendas/ });
      expect(abaVendas).toHaveAttribute("aria-selected", "true");
      expect(abaVendas).toHaveFocus();

      await usuario.keyboard("{ArrowLeft}");

      const abaAlunos = screen.getByRole("tab", { name: /Alunos/ });
      expect(abaAlunos).toHaveAttribute("aria-selected", "true");
      expect(abaAlunos).toHaveFocus();
    });
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

  test("clicar na linha ou numa celula nao abre o curso - so o botao 'Ver curso' abre", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    mockInscricoes([INSCRICAO_GRATUITO_ENCERRADO]);
    renderInscricoes({ onNavigate });

    await screen.findByText("Introdução à IA");
    await usuario.click(screen.getByText("Introdução à IA"));
    await usuario.click(screen.getByText("Introdução à IA").closest("tr"));

    expect(onNavigate).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Ver curso Introdução à IA" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/app/cursos/1");
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

const CURSO_PAGO_PENDENTE = { id: 10, titulo: "Curso Pago X", preco: 300, modeloCurso: 2, descricao: "Descrição do curso" };

function criarLinhaMatriculaPendente(overrides = {}) {
  return {
    id: 55,
    cursoId: 10,
    status: "Aprovada",
    pagamentoStatus: 1,
    pagamentoValor: 300,
    pagamentoVenceEm: "2026-11-20T12:00:00Z",
    acessoLiberado: false,
    dataSolicitacao: "2026-11-17T00:00:00Z",
    notaFinal: 0,
    codigoRegistro: "MAT-0001",
    ...overrides
  };
}

// So com Pagamento Cancelado (desistiu ou venceu) - prompt-agente-inscricoes-
// v3.md, item 3: sem pendente e sem acesso liberado, a matricula volta a
// mostrar "Comprar" em vez de "Entrar no curso".
function criarLinhaMatriculaSoCancelada(overrides = {}) {
  return {
    id: 56,
    cursoId: 10,
    status: "Aprovada",
    pagamentoStatus: null,
    pagamentoValor: null,
    pagamentoVenceEm: null,
    acessoLiberado: false,
    dataSolicitacao: "2026-11-10T00:00:00Z",
    notaFinal: 0,
    codigoRegistro: "MAT-0002",
    ...overrides
  };
}

function renderMeusCursos(props = {}) {
  return render(
    <ToastProvider>
      <AssistenteChatbotProvider ativo={false}>
        <SecaoMeusCursosMatriculados
          cursos={[CURSO_PAGO_PENDENTE]}
          linhasMatriculas={[criarLinhaMatriculaPendente()]}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
          onSessionExpired={vi.fn()}
          {...props}
        />
      </AssistenteChatbotProvider>
    </ToastProvider>
  );
}

describe("SecaoMeusCursosMatriculados - desistir da compra (pagamento pendente)", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("mostra 'Pague até DD/MM' e o botao 'Desistir da compra'", async () => {
    renderMeusCursos();

    expect(await screen.findByText(/Pague até 20\/11/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desistir da compra" })).toBeInTheDocument();
  });

  test("Desistir da compra pede confirmacao antes de chamar a API", async () => {
    const usuario = userEvent.setup();
    const onRefresh = vi.fn();
    renderMeusCursos({ onRefresh });

    await usuario.click(await screen.findByRole("button", { name: "Desistir da compra" }));

    expect(screen.getByText(/Desistir da compra de Curso Pago X\?/)).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith("/Pagamentos/55/cancelar", expect.anything());

    await usuario.click(screen.getByRole("button", { name: "Sim, desistir" }));

    expect(apiRequest).toHaveBeenCalledWith("/Pagamentos/55/cancelar", { method: "POST" });
    expect(onRefresh).toHaveBeenCalled();
  });

  test("clicar em 'Não' cancela a desistencia sem chamar a API", async () => {
    const usuario = userEvent.setup();
    renderMeusCursos();

    await usuario.click(await screen.findByRole("button", { name: "Desistir da compra" }));
    await usuario.click(screen.getByRole("button", { name: "Não" }));

    expect(screen.queryByText(/Desistir da compra de/)).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith("/Pagamentos/55/cancelar", expect.anything());
  });
});

describe("SecaoMeusCursosMatriculados - comprar de novo depois de cancelado", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("matricula aprovada so com pagamento cancelado mostra 'Comprar', nao 'Entrar no curso'", async () => {
    renderMeusCursos({ linhasMatriculas: [criarLinhaMatriculaSoCancelada()] });

    expect(await screen.findByRole("button", { name: /Comprar/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Entrar no curso|Continuar curso|Iniciar curso/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pague até/)).not.toBeInTheDocument();
  });

  test("clicar em 'Comprar' abre a confirmacao e chama POST /Matriculas/comprar", async () => {
    const usuario = userEvent.setup();
    renderMeusCursos({ linhasMatriculas: [criarLinhaMatriculaSoCancelada()] });

    await usuario.click(await screen.findByRole("button", { name: /Comprar/ }));
    await usuario.click(await screen.findByRole("button", { name: "Confirmar compra" }));

    expect(apiRequest).toHaveBeenCalledWith("/Matriculas/comprar", { method: "POST", body: JSON.stringify({ cursoId: 10 }) });
  });
});
