import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RevisaoTentativaAvaliacao } from "./RevisaoTentativaAvaliacao.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const AVALIACAO_ID = 1;
const TENTATIVA_ID = 50;

function montarRevisao(overrides = {}) {
  return {
    tentativaId: TENTATIVA_ID,
    avaliacaoId: AVALIACAO_ID,
    statusTentativa: 3,
    notaBruta: 7,
    notaMaxima: 10,
    questoes: [
      {
        questaoId: 1,
        ordem: 1,
        contexto: "",
        enunciado: "Qual alternativa esta correta?",
        tipoQuestao: 1,
        pontos: 5,
        pontosObtidos: 5,
        correta: true,
        alternativaEscolhidaId: 20,
        respostaTexto: "",
        explicacao: "",
        referenciasBibliograficas: "",
        alternativas: [
          { id: 10, letra: "A", texto: "Alternativa errada", ehCorreta: false, justificativa: "" },
          { id: 20, letra: "B", texto: "Alternativa certa", ehCorreta: true, justificativa: "" }
        ],
        afirmativas: [],
        anexos: [{ id: 900, titulo: "Figura da questao 1", tipoAnexo: "Imagem", arquivoUrl: "/uploads/questoes/figura.png", ordem: 1 }]
      },
      {
        questaoId: 2,
        ordem: 2,
        contexto: "",
        enunciado: "Segunda questao, respondida errada.",
        tipoQuestao: 1,
        pontos: 5,
        pontosObtidos: 0,
        correta: false,
        alternativaEscolhidaId: 31,
        respostaTexto: "",
        explicacao: "",
        referenciasBibliograficas: "",
        alternativas: [
          { id: 30, letra: "A", texto: "Alternativa certa", ehCorreta: true, justificativa: "" },
          { id: 31, letra: "B", texto: "Alternativa escolhida, errada", ehCorreta: false, justificativa: "" }
        ],
        afirmativas: [],
        anexos: []
      },
      {
        questaoId: 3,
        ordem: 3,
        contexto: "",
        enunciado: "Questao dissertativa aguardando correcao.",
        tipoQuestao: 3,
        pontos: 5,
        pontosObtidos: 0,
        correta: null,
        alternativaEscolhidaId: null,
        respostaTexto: "Minha resposta dissertativa.",
        explicacao: "",
        referenciasBibliograficas: "",
        alternativas: [],
        afirmativas: []
      }
    ],
    ...overrides
  };
}

function renderizar(props = {}) {
  return render(
    <RevisaoTentativaAvaliacao
      avaliacaoId={AVALIACAO_ID}
      onFechar={vi.fn()}
      onSessionExpired={vi.fn()}
      tentativaId={TENTATIVA_ID}
      tituloAvaliacao="Quiz do Modulo 1"
      {...props}
    />
  );
}

describe("RevisaoTentativaAvaliacao", () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue(montarRevisao());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("usa a mesma classe de tamanho grande da janela do professor", async () => {
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    expect(document.querySelector(".modal-caixa--revisao-avaliacao")).not.toBeNull();
  });

  test("lista de questoes a esquerda mostra o estado de cada uma: certa, errada e aguardando correcao", async () => {
    renderizar();

    const lista = await screen.findByRole("navigation", { name: "Questões" });
    const itens = within(lista).getAllByRole("button");
    expect(itens).toHaveLength(3);

    expect(within(itens[0]).getByLabelText("Correta")).toHaveClass("revisao-avaliacao__lista-status--certo");
    expect(within(itens[1]).getByLabelText("Incorreta")).toHaveClass("revisao-avaliacao__lista-status--errado");
    expect(within(itens[2]).getByLabelText("Aguardando correção")).toHaveClass("revisao-avaliacao__lista-status--pendente");
  });

  test("clicar numa questao da lista troca a questao exibida a direita", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    expect(screen.getByText("Qual alternativa esta correta?")).toBeInTheDocument();

    const lista = screen.getByRole("navigation", { name: "Questões" });
    await usuario.click(within(lista).getAllByRole("button")[2]);

    expect(screen.getByText("Questao dissertativa aguardando correcao.")).toBeInTheDocument();
  });

  test("Proxima questao e Questao anterior navegam entre as questoes", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");

    const botaoAnterior = screen.getByRole("button", { name: "Questão anterior" });
    const botaoProximo = screen.getByRole("button", { name: "Próxima questão" });
    expect(botaoAnterior).toBeDisabled();

    await usuario.click(botaoProximo);
    expect(document.querySelector(".janela-previa-item__rodape-contador")).toHaveTextContent("Questão 2 de 3");
    expect(screen.getByText("Segunda questao, respondida errada.")).toBeInTheDocument();

    await usuario.click(botaoAnterior);
    expect(screen.getByText("Qual alternativa esta correta?")).toBeInTheDocument();
  });

  test("anexo de imagem da questao e desenhado", async () => {
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    expect(screen.getByAltText("Figura da questao 1")).toBeInTheDocument();
  });

  test("a alternativa correta fica marcada com o circulo verde (classe item--correta)", async () => {
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    const itemCorreto = screen.getByText("Alternativa certa").closest(".revisao-alternativas__item");
    expect(itemCorreto).toHaveClass("revisao-alternativas__item--correta");
  });

  test("a alternativa escolhida e errada fica vermelha, com 'Sua resposta' na mesma linha", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    await usuario.click(screen.getByRole("button", { name: "Próxima questão" }));

    const itemEscolhidoErrado = screen.getByText("Alternativa escolhida, errada").closest(".revisao-alternativas__item");
    expect(itemEscolhidoErrado).toHaveClass("revisao-alternativas__item--escolhida-errada");
    expect(within(itemEscolhidoErrado).getByText("Sua resposta")).toBeInTheDocument();
  });

  test("questao dissertativa mostra a resposta do aluno", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    await usuario.click(screen.getByRole("button", { name: "Próxima questão" }));
    await usuario.click(screen.getByRole("button", { name: "Próxima questão" }));

    expect(screen.getByText("Minha resposta dissertativa.")).toBeInTheDocument();
  });

  test("nao mostra a linha redundante 'Sua resposta: X' no topo da questao", async () => {
    renderizar();

    await screen.findByText("Qual alternativa esta correta?");
    expect(screen.queryByText(/^Sua resposta:/)).not.toBeInTheDocument();
  });
});
