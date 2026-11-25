import { fireEvent, render, screen } from "@testing-library/react-native";
import CatalogoScreen from "../CatalogoScreen.jsx";

// Catalogo em vitrine (docs/redesign-mobile/PROMPT-agente-catalogo-
// vitrine.md) - estes testes cobrem exatamente a secao "Testes (jest)" do
// prompt.

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() })
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve())
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

const mockApiRequest = jest.fn(() => Promise.resolve());
jest.mock("../../../lib/api.js", () => {
  const real = jest.requireActual("../../../lib/api.js");
  return { ...real, apiRequest: (...args) => mockApiRequest(...args) };
});

const CURSO_PAGO = {
  id: 1,
  titulo: "Curso Pago Teste",
  preco: 29.9,
  modeloCurso: 2,
  publicadoParaVendaEm: "2026-01-01T00:00:00Z",
  descricao: "Descrição completa do curso pago, com todos os detalhes do conteúdo oferecido."
};
const CURSO_GRATIS = {
  id: 2,
  titulo: "Curso Gratis Teste",
  preco: 0,
  modeloCurso: 1,
  descricao: "Descrição completa do curso gratuito, com todos os detalhes do conteúdo oferecido."
};
const CURSO_ACOMPANHADO = { id: 3, titulo: "Curso Acompanhado Teste", preco: 0, modeloCurso: 3 };

function montarProps(cursos) {
  return {
    onRecarregar: jest.fn(() => Promise.resolve()),
    onSessionExpired: jest.fn(),
    snapshot: { cursos, matriculas: [] },
    usuario: { id: 99, nome: "Aluno Demo" }
  };
}

beforeEach(() => {
  mockApiRequest.mockClear();
});

describe("CatalogoScreen - chips e contagem", () => {
  test("'Grátis' mostra só os de preço 0, 'Pagos' só os > 0, 'Com acompanhamento' só o modelo Acompanhado", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_PAGO, CURSO_GRATIS, CURSO_ACOMPANHADO])} />);

    await fireEvent.press(screen.getByLabelText("Grátis"));
    expect(screen.getByText("Curso Gratis Teste")).toBeTruthy();
    expect(screen.getByText("Curso Acompanhado Teste")).toBeTruthy();
    expect(screen.queryByText("Curso Pago Teste")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Pagos"));
    expect(screen.getByText("Curso Pago Teste")).toBeTruthy();
    expect(screen.queryByText("Curso Gratis Teste")).toBeNull();
    expect(screen.queryByText("Curso Acompanhado Teste")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Com acompanhamento"));
    expect(screen.getByText("Curso Acompanhado Teste")).toBeTruthy();
    expect(screen.queryByText("Curso Pago Teste")).toBeNull();
    expect(screen.queryByText("Curso Gratis Teste")).toBeNull();
  });

  test("chip sem nenhum curso nao renderiza", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_GRATIS])} />);

    expect(screen.getByLabelText("Todos")).toBeTruthy();
    expect(screen.getByLabelText("Grátis")).toBeTruthy();
    expect(screen.queryByLabelText("Pagos")).toBeNull();
    expect(screen.queryByLabelText("Com acompanhamento")).toBeNull();
  });

  test("a contagem acompanha o filtro e a busca", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_PAGO, CURSO_GRATIS, CURSO_ACOMPANHADO])} />);

    expect(screen.getByText("3 cursos disponíveis")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Grátis"));
    expect(screen.getByText("2 cursos disponíveis")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Pesquisar cursos"), "Acompanhado");
    expect(screen.getByText("1 curso disponível")).toBeTruthy();
  });
});

describe("CatalogoScreen - cartao de vitrine", () => {
  test("pago mostra a etiqueta 'R$ 29,90' e o botão 'Comprar' sem o preço", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_PAGO])} />);

    expect(screen.getByText("R$ 29,90")).toBeTruthy();
    expect(screen.getByText("Comprar")).toBeTruthy();
    expect(screen.queryByText(/Comprar ·/)).toBeNull();
  });

  test("gratis mostra 'Grátis' e 'Começar grátis'", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_GRATIS])} />);

    // "Gratis" tambem e o rotulo do chip de filtro - getAllByText evita a
    // ambiguidade entre o chip e a etiqueta sobre a capa.
    expect(screen.getAllByText("Grátis").length).toBeGreaterThan(0);
    expect(screen.getByText("Começar grátis")).toBeTruthy();
  });

  test("'Com acompanhamento' aparece sobre a capa", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_ACOMPANHADO])} />);

    // Idem: "Com acompanhamento" tambem e o rotulo do chip.
    expect(screen.getAllByText("Com acompanhamento").length).toBeGreaterThan(0);
  });
});

describe("CatalogoScreen - painel de detalhes", () => {
  test("abre o painel com a descrição inteira", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_PAGO])} />);

    await fireEvent.press(screen.getAllByLabelText("Ver detalhes de Curso Pago Teste")[0]);

    // O cartao por baixo do painel ainda esta montado (numberOfLines so
    // corta visualmente, o texto completo continua na arvore) - por isso
    // getAllByText em vez de getByText.
    expect(screen.getAllByText(CURSO_PAGO.descricao).length).toBeGreaterThan(0);
    expect(screen.getByText("Comprar · R$ 29,90")).toBeTruthy();
  });

  test("botao do painel (pago) chama o mesmo fluxo de compra - abre a confirmacao", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_PAGO])} />);

    await fireEvent.press(screen.getAllByLabelText("Ver detalhes de Curso Pago Teste")[0]);
    await fireEvent.press(screen.getByLabelText("Confirmar compra no painel de detalhes"));

    expect(await screen.findByText("Confirmar compra")).toBeTruthy();
  });

  test("botao do painel (gratis) chama o mesmo fluxo de comecar gratis", async () => {
    await render(<CatalogoScreen {...montarProps([CURSO_GRATIS])} />);

    await fireEvent.press(screen.getAllByLabelText("Ver detalhes de Curso Gratis Teste")[0]);
    await fireEvent.press(screen.getByLabelText("Confirmar começar grátis no painel de detalhes"));

    expect(mockApiRequest).toHaveBeenCalledWith("/Matriculas", expect.objectContaining({ method: "POST" }));
  });
});
