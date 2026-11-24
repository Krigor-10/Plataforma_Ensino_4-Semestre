import { fireEvent, render, screen } from "@testing-library/react-native";
import AvaliacoesScreen from "../AvaliacoesScreen.jsx";

// Lista direta, sem passo de selecao de curso (docs/redesign-mobile/
// PROMPT-agente-avaliacoes-lista-direta.md) - estes testes cobrem
// exatamente a secao "Testes (jest)" do prompt.

const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
let mockRouteParams;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ addListener: mockAddListener, navigate: mockNavigate, setParams: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams })
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

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return { ...Reanimated, useReducedMotion: () => false };
});

const PROVA_DISPONIVEL_WEB = {
  id: 1,
  cursoId: 10,
  cursoTitulo: "Curso Web",
  titulo: "Prova 1",
  moduloId: null,
  tipoAvaliacao: 2,
  totalQuestoes: 5,
  tentativasPermitidas: 2,
  tentativasRealizadas: 0,
  tentativasRestantes: 2,
  progressoLiberado: true,
  dataAbertura: null,
  dataFechamento: null,
  ultimaNota: null,
  ultimaTentativaId: null,
  notaMaxima: 10,
  tempoLimiteMinutos: 0
};

const EXERCICIO_BLOQUEADO_WEB = {
  id: 2,
  cursoId: 10,
  cursoTitulo: "Curso Web",
  titulo: "Exercicio Bloqueado",
  moduloId: 5,
  tipoAvaliacao: 3,
  totalQuestoes: 4,
  tentativasPermitidas: 1,
  tentativasRealizadas: 0,
  tentativasRestantes: 1,
  progressoLiberado: false,
  dataAbertura: null,
  dataFechamento: null,
  ultimaNota: null,
  ultimaTentativaId: null,
  notaMaxima: 10,
  tempoLimiteMinutos: 0
};

const PROVA_CONCLUIDA_DADOS = {
  id: 3,
  cursoId: 20,
  cursoTitulo: "Curso Dados",
  titulo: "Prova Final",
  moduloId: null,
  tipoAvaliacao: 2,
  totalQuestoes: 6,
  tentativasPermitidas: 1,
  tentativasRealizadas: 1,
  tentativasRestantes: 0,
  progressoLiberado: true,
  dataAbertura: null,
  dataFechamento: null,
  ultimaNota: 8,
  ultimaTentativaId: 101,
  notaMaxima: 10,
  tempoLimiteMinutos: 0
};

const EXERCICIO_DISPONIVEL_DADOS = {
  id: 6,
  cursoId: 20,
  cursoTitulo: "Curso Dados",
  titulo: "Exercicio 2",
  moduloId: null,
  tipoAvaliacao: 3,
  totalQuestoes: 3,
  tentativasPermitidas: 1,
  tentativasRealizadas: 0,
  tentativasRestantes: 1,
  progressoLiberado: true,
  dataAbertura: null,
  dataFechamento: null,
  ultimaNota: null,
  ultimaTentativaId: null,
  notaMaxima: 10,
  tempoLimiteMinutos: 0
};

const QUIZ_CURSO_SO_QUIZ = {
  id: 5,
  cursoId: 30,
  cursoTitulo: "Curso Quiz Only",
  titulo: "Quiz X",
  moduloId: 7,
  tipoAvaliacao: 1,
  totalQuestoes: 2,
  tentativasPermitidas: 1,
  tentativasRealizadas: 0,
  tentativasRestantes: 1,
  progressoLiberado: true,
  dataAbertura: null,
  dataFechamento: null,
  ultimaNota: null,
  ultimaTentativaId: null,
  notaMaxima: 10,
  tempoLimiteMinutos: 0
};

function montarSnapshot(avaliacoes) {
  return { avaliacoes, cursos: [], matriculas: [], pagamentos: [], progressos: { cursos: [] } };
}

describe("AvaliacoesScreen - lista direta", () => {
  beforeEach(() => {
    mockRouteParams = undefined;
    mockNavigate.mockClear();
  });

  test("abre sem passo de selecao, mostrando avaliacoes de mais de um curso com o nome do curso no cartao", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB, EXERCICIO_BLOQUEADO_WEB, PROVA_CONCLUIDA_DADOS, EXERCICIO_DISPONIVEL_DADOS]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.queryByLabelText(/Selecione um curso/i)).toBeNull();
    expect(screen.getByText("Prova 1")).toBeTruthy();
    expect(screen.getByText("Exercicio 2")).toBeTruthy();
    expect(screen.getAllByText("Curso Web").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Curso Dados").length).toBeGreaterThan(0);
  });

  test("quiz nao aparece na lista nem gera chip de curso", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB, QUIZ_CURSO_SO_QUIZ]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.queryByText("Quiz X")).toBeNull();
    expect(screen.queryByLabelText("Curso Quiz Only")).toBeNull();
  });

  test("chips: so cursos com avaliacao formal aparecem, e tocar filtra a lista e os contadores", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB, EXERCICIO_BLOQUEADO_WEB, EXERCICIO_DISPONIVEL_DADOS, QUIZ_CURSO_SO_QUIZ]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByLabelText("Todos os cursos")).toBeTruthy();
    expect(screen.getByLabelText("Curso Web")).toBeTruthy();
    expect(screen.getByLabelText("Curso Dados")).toBeTruthy();
    expect(screen.queryByLabelText("Curso Quiz Only")).toBeNull();

    // Todos os cursos: 1 disponivel (Web) + 1 disponivel (Dados) + 1 bloqueada (Web) = 3.
    expect(screen.getByLabelText("Disponíveis, 3")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Curso Web"));

    expect(screen.getByText("Prova 1")).toBeTruthy();
    expect(screen.queryByText("Exercicio 2")).toBeNull();
    // So Curso Web: 1 disponivel + 1 bloqueada = 2.
    expect(screen.getByLabelText("Disponíveis, 2")).toBeTruthy();
  });

  test("abas: bloqueadas ficam no fim de Disponiveis, Concluidas separa pela regra de hoje", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB, EXERCICIO_BLOQUEADO_WEB, PROVA_CONCLUIDA_DADOS]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    // Aba inicial "Disponiveis": mostra a disponivel e a bloqueada (com o
    // subtitulo "Ainda bloqueadas"), mas nao a concluida de outro curso.
    expect(screen.getByText("Prova 1")).toBeTruthy();
    expect(screen.getByText("Ainda bloqueadas")).toBeTruthy();
    expect(screen.getByText("Exercicio Bloqueado")).toBeTruthy();
    expect(screen.queryByText("Prova Final")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Concluídas, 1"));

    expect(screen.getByText("Prova Final")).toBeTruthy();
    expect(screen.queryByText("Prova 1")).toBeNull();
  });

  test("aba inicial vira Concluidas quando Disponiveis esta vazia e ha concluidas", async () => {
    const snapshot = montarSnapshot([PROVA_CONCLUIDA_DADOS]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("Prova Final")).toBeTruthy();
  });

  test("tocar em Iniciar avaliacao abre o mesmo fluxo de confirmacao de hoje", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    await fireEvent.press(screen.getByText("▶ Iniciar avaliação"));

    expect(await screen.findByText("Agora não")).toBeTruthy();
  });
});
