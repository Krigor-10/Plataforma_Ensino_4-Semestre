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
  melhorNota: 8,
  ultimaTentativaId: 101,
  ultimoStatusTentativa: 3,
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

function montarSnapshot(avaliacoes, cursos = []) {
  return { avaliacoes, cursos, matriculas: [], pagamentos: [], progressos: { cursos: [] } };
}

function montarAvaliacao(sobrescritas) {
  return {
    id: 99,
    cursoId: 40,
    cursoTitulo: "Curso Qualquer",
    titulo: "Avaliacao Qualquer",
    moduloId: null,
    tipoAvaliacao: 2,
    totalQuestoes: 3,
    tentativasPermitidas: 2,
    tentativasRealizadas: 1,
    tentativasRestantes: 1,
    progressoLiberado: true,
    dataAbertura: null,
    dataFechamento: null,
    ultimaNota: 8,
    melhorNota: 8,
    ultimaTentativaId: 1,
    ultimoStatusTentativa: 3,
    notaMaxima: 10,
    tempoLimiteMinutos: 0,
    ...sobrescritas
  };
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

    expect(screen.getByLabelText("Todos")).toBeTruthy();
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

  // docs/redesign-mobile/PROMPT-agente-avaliacoes-ajustes-1.md, item 2: com
  // cursoTitulo vazio (prova final sem modulo), o chip e o cartao buscam o
  // nome em snapshot.cursos - nunca "Curso #id".
  test("chip e cartao: cursoTitulo vazio cai no nome de snapshot.cursos, nunca 'Curso #id'", async () => {
    const avaliacaoSemModulo = montarAvaliacao({ id: 40, cursoId: 50, cursoTitulo: "", titulo: "Avaliacao final" });
    const snapshot = montarSnapshot([avaliacaoSemModulo], [{ id: 50, titulo: "Curso Via Snapshot" }]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByLabelText("Curso Via Snapshot")).toBeTruthy();
    expect(screen.getAllByText("Curso Via Snapshot").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Curso #50/)).toBeNull();
  });

  test("selo 'Concluida' renderiza com o icone de check e a cor de sucesso", async () => {
    const snapshot = montarSnapshot([PROVA_CONCLUIDA_DADOS]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(await screen.findByText("Prova Final")).toBeTruthy();
    expect(screen.getByText("Concluída")).toBeTruthy();
    expect(screen.getByTestId("selo-icone-concluida")).toBeTruthy();
  });

  test("nota 7,0 (limite incluido) fica verde, com 'aprovado'", async () => {
    const avaliacao = montarAvaliacao({ ultimaNota: 7, melhorNota: 7 });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("✓ Nota 7,0 · aprovado")).toBeTruthy();
  });

  test("nota 6,9 fica vermelha, abaixo de 7,0", async () => {
    const avaliacao = montarAvaliacao({ ultimaNota: 6.9, melhorNota: 6.9 });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("Nota 6,9 · abaixo de 7,0")).toBeTruthy();
  });

  // Decisao F1 da auditoria de 26/11: vale a MELHOR tentativa corrigida.
  test("ultima tentativa pior que a melhor: mostra a melhor (8,0) e fica verde", async () => {
    const avaliacao = montarAvaliacao({ ultimaNota: 4, melhorNota: 8 });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("✓ Nota 8,0 · aprovado")).toBeTruthy();
  });

  test("sem tentativa, nenhuma linha de nota aparece", async () => {
    const avaliacao = montarAvaliacao({ tentativasRealizadas: 0, ultimaNota: null, melhorNota: null, ultimaTentativaId: null });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.queryByText(/Nota/)).toBeNull();
  });

  test("titulo grande da aba nao aparece mais (so o breadcrumb, fora desta tela)", async () => {
    const snapshot = montarSnapshot([PROVA_DISPONIVEL_WEB]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.queryByText("Avaliações")).toBeNull();
    expect(screen.queryByText("Testes práticos e teóricos do seu curso")).toBeNull();
  });

  // docs/redesign-mobile/PROMPT-agente-avaliacoes-ajustes-2-icone.md
  //
  // MaterialCommunityIcons renderiza o glifo internamente (name/color nao
  // sobrevivem como props no no host que o testID aponta) - a cor da
  // borda do quadrado (vem do mesmo objeto VISUAL_TIPO_AVALIACAO que
  // escolhe o icone) identifica o tipo sem depender de detalhe interno
  // da lib de icone.
  function estiloAchatado(elemento) {
    return Array.isArray(elemento.props.style) ? Object.assign({}, ...elemento.props.style.flat(Infinity)) : elemento.props.style;
  }

  test("icone: Prova usa a borda roxa e o rotulo PROVA", async () => {
    const snapshot = montarSnapshot([montarAvaliacao({ tipoAvaliacao: 2 })]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("PROVA")).toBeTruthy();
    expect(estiloAchatado(screen.getByTestId("icone-tipo-avaliacao")).borderColor).toBe("rgba(157, 103, 255, 0.45)");
  });

  test("icone: Exercicio usa a borda azul e o rotulo EXERCÍCIO", async () => {
    const snapshot = montarSnapshot([montarAvaliacao({ tipoAvaliacao: 3 })]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("EXERCÍCIO")).toBeTruthy();
    expect(estiloAchatado(screen.getByTestId("icone-tipo-avaliacao")).borderColor).toBe("rgba(96, 165, 250, 0.45)");
  });

  test("icone: bloqueada usa a cor cinza, independente do tipo", async () => {
    const bloqueada = montarAvaliacao({ progressoLiberado: false, tentativasRealizadas: 0, ultimaNota: null, melhorNota: null, ultimoStatusTentativa: null });
    const snapshot = montarSnapshot([bloqueada]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    const estilo = estiloAchatado(screen.getByTestId("icone-tipo-avaliacao"));
    expect(estilo.backgroundColor).toBe("rgba(255, 255, 255, 0.06)");
    expect(estilo.borderColor).toBe("rgba(255, 255, 255, 0.12)");
  });

  test("nota: ultimoStatusTentativa EmAndamento (1) nao renderiza a linha de nota", async () => {
    const avaliacao = montarAvaliacao({ ultimoStatusTentativa: 1, melhorNota: null });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.queryByText(/Nota/)).toBeNull();
  });

  test("nota: ultimoStatusTentativa Enviada (2) renderiza 'aguardando correcao'", async () => {
    const avaliacao = montarAvaliacao({ ultimoStatusTentativa: 2, melhorNota: null });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("Nota: aguardando correção")).toBeTruthy();
  });

  test("nota: Corrigida (3) com nota 0 renderiza 'Nota 0,0 · abaixo de 7,0', nunca '-'", async () => {
    const avaliacao = montarAvaliacao({ ultimoStatusTentativa: 3, ultimaNota: 0, melhorNota: 0 });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("Nota 0,0 · abaixo de 7,0")).toBeTruthy();
  });

  test("nota: Corrigida (3) com nota 8 renderiza 'aprovado' em verde", async () => {
    const avaliacao = montarAvaliacao({ ultimoStatusTentativa: 3, ultimaNota: 8, melhorNota: 8 });
    const snapshot = montarSnapshot([avaliacao]);

    await render(<AvaliacoesScreen snapshot={snapshot} />);

    expect(screen.getByText("✓ Nota 8,0 · aprovado")).toBeTruthy();
  });
});
