import { fireEvent, render, screen } from "@testing-library/react-native";
import ConteudosScreen from "../ConteudosScreen.jsx";
import { ROUTES } from "../../../lib/routes.js";

// docs/redesign-mobile/PROMPT-agente-avaliacoes-ajustes-1.md, item 6: o
// titulo grande "Cursos" (e o subtitulo) saem desta tela - so o breadcrumb
// (ScreenIndicator.jsx, fora desta tela) identifica onde o aluno esta.
// Mocka os componentes pesados (video/arquivo/quiz) que esta tela carrega
// no topo do arquivo - nenhum deles chega a renderizar na grade de
// selecao de curso, mas o import sozinho ja arrastaria modulos nativos
// (expo-video, expo-file-system) sem mock no jest.

// mockNavigate/mockRouteParams: prefixo "mock" exigido pelo babel-plugin-
// jest-hoist pra poder referenciar essas variaveis de dentro do factory do
// jest.mock (que e içado pro topo do arquivo). mockRouteParams comeca
// undefined (grade de cursos) - os testes da trilha compacta reatribuem
// antes de renderizar, pra cair direto no curso com `route.params.cursoId`.
const mockNavigate = jest.fn();
let mockRouteParams;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), navigate: mockNavigate, setParams: jest.fn() }),
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

jest.mock("../../../components/VisualizadorConteudo.jsx", () => () => null);
jest.mock("../../../components/QuizModal.jsx", () => () => null);
jest.mock("../../../components/RevisaoQuizModal.jsx", () => () => null);
jest.mock("../../../components/ConfirmacaoCompraSheet.jsx", () => () => null);
jest.mock("../../../lib/abrirArquivoSeguro", () => ({ abrirArquivoSeguro: jest.fn() }));

function montarSnapshot() {
  return {
    avaliacoes: [],
    conteudos: [],
    cursos: [{ id: 10, titulo: "Curso Teste" }],
    matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
    modulos: [],
    pagamentos: [],
    progressos: { conteudos: [], modulos: [], cursos: [] }
  };
}

afterEach(() => {
  mockRouteParams = undefined;
  mockNavigate.mockClear();
});

describe("ConteudosScreen - titulo so no breadcrumb", () => {
  test("nao renderiza mais o titulo grande 'Cursos' nem o subtitulo", async () => {
    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={montarSnapshot()} />);

    expect(await screen.findByLabelText("Ver catálogo")).toBeTruthy();
    expect(screen.queryByText("Cursos")).toBeNull();
    expect(screen.queryByText("Escolha um curso para continuar sua trilha")).toBeNull();
  });
});

// Trilha do curso compacta (docs/redesign-mobile/PROMPT-agente-trilha-
// curso-compacta.md) - testes cobrem exatamente a secao "Testes (jest)" do
// prompt. mockRouteParams simula a navegacao com cursoId (ver BuscaScreen.jsx)
// pra cair direto na trilha do curso, sem precisar tocar na grade.
const CURSO_WEB = { id: 10, titulo: "Curso Web Full Stack" };

function montarSnapshotCurso({ avaliacoes = [], conteudos = [], modulos = [], progressoConteudos = [], progressoModulos = [] }) {
  return {
    avaliacoes,
    conteudos,
    cursos: [CURSO_WEB],
    matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
    modulos,
    pagamentos: [],
    progressos: { conteudos: progressoConteudos, modulos: progressoModulos, cursos: [] }
  };
}

function conteudoPdf(id, extra = {}) {
  return { id, cursoId: 10, moduloId: 100, tipoConteudo: 2, titulo: `PDF ${id}`, arquivoUrl: `/storage/arquivo-${id}.pdf`, ...extra };
}

describe("ConteudosScreen - trilha do curso compacta: cabecalho", () => {
  test("'Voltar' solto nao existe mais; botao '‹' volta pra lista; mostra 'N de M modulos' dentro do ScrollView", async () => {
    mockRouteParams = { cursoId: 10 };
    const snapshot = montarSnapshotCurso({
      conteudos: [conteudoPdf(1000)],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }]
    });

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);

    expect(screen.queryByText("Voltar")).toBeNull();
    expect(screen.getByText(/de 1 módulos/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Voltar para a seleção de cursos"));

    expect(await screen.findByLabelText("Ver catálogo")).toBeTruthy();
  });
});

describe("ConteudosScreen - trilha do curso compacta: avaliacao liberada", () => {
  function montarComAvaliacaoLiberada() {
    mockRouteParams = { cursoId: 10 };
    return montarSnapshotCurso({
      avaliacoes: [
        {
          id: 5000,
          cursoId: 10,
          titulo: "Banco ENADE/CQA - Revisão",
          moduloId: null,
          tipoAvaliacao: 2,
          totalQuestoes: 10,
          tentativasRestantes: 2,
          progressoLiberado: true,
          dataAbertura: null,
          dataFechamento: null
        }
      ],
      conteudos: [conteudoPdf(1000)],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }]
    });
  }

  test("renderiza 'Avaliação liberada', o titulo e 'Iniciar'; toque navega pra Avaliacoes com cursoId", async () => {
    const snapshot = montarComAvaliacaoLiberada();

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);

    expect(screen.getByText("Avaliação liberada")).toBeTruthy();
    expect(screen.getByText("Banco ENADE/CQA - Revisão")).toBeTruthy();
    expect(screen.getByText("Iniciar")).toBeTruthy();
    expect(screen.queryByText(/Etapa concluída/)).toBeNull();

    await fireEvent.press(screen.getByLabelText("Ir para a avaliação Banco ENADE/CQA - Revisão"));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.AVALIACOES, { cursoId: 10 });
  });
});

describe("ConteudosScreen - trilha do curso compacta: modulo em 1 linha", () => {
  test("modulo concluido mostra ✓ no quadrado e nao mostra 'Progresso da trilha'", async () => {
    mockRouteParams = { cursoId: 10 };
    const snapshot = montarSnapshotCurso({
      conteudos: [conteudoPdf(1000)],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }],
      progressoConteudos: [{ conteudoDidaticoId: 1000, percentualConclusao: 100 }]
    });

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);

    expect(screen.getByTestId("icone-modulo-concluido")).toBeTruthy();
    expect(screen.queryByText("Progresso da trilha")).toBeNull();
    expect(screen.getByLabelText(/1 de 1 concluídos\. Módulo concluído/)).toBeTruthy();
  });

  test("modulo bloqueado mostra 'Conclua o módulo anterior' e nao tem chevron", async () => {
    mockRouteParams = { cursoId: 10 };
    const snapshot = montarSnapshotCurso({
      conteudos: [conteudoPdf(1000), conteudoPdf(1001, { moduloId: 200 })],
      modulos: [
        { id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" },
        { id: 200, cursoId: 10, titulo: "Avançado", dataCriacao: "2026-01-02" }
      ]
    });

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);

    expect(screen.getByText("Conclua o módulo anterior")).toBeTruthy();
    expect(screen.getByTestId("icone-modulo-bloqueado")).toBeTruthy();
    expect(screen.queryAllByTestId("icone-chevron-modulo")).toHaveLength(1);
  });
});

describe("ConteudosScreen - trilha do curso compacta: linha de conteudo", () => {
  function montarComUmConteudo(tipoConteudo, extra = {}) {
    mockRouteParams = { cursoId: 10 };
    return montarSnapshotCurso({
      conteudos: [conteudoPdf(1000, { tipoConteudo, ...extra })],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }]
    });
  }

  async function abrirModulo() {
    await fireEvent.press(screen.getByLabelText("Fundamentos"));
  }

  test("PDF pendente mostra 'Abrir'", async () => {
    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={montarComUmConteudo(2)} />);
    await abrirModulo();

    expect(screen.getByText("Abrir ›")).toBeTruthy();
  });

  test("imagem pendente mostra 'Ver'", async () => {
    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={montarComUmConteudo(5)} />);
    await abrirModulo();

    expect(screen.getByText("Ver ›")).toBeTruthy();
  });

  test("video pendente mostra 'Assistir'", async () => {
    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={montarComUmConteudo(3)} />);
    await abrirModulo();

    expect(screen.getByText("Assistir ›")).toBeTruthy();
  });

  test("conteudo concluido mostra 'Rever' e o ✓ no icone, sem a pilula 'Concluído'", async () => {
    const snapshot = montarSnapshotCurso({
      conteudos: [conteudoPdf(1000)],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }],
      progressoConteudos: [{ conteudoDidaticoId: 1000, percentualConclusao: 100 }]
    });
    mockRouteParams = { cursoId: 10 };

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);
    await abrirModulo();

    expect(screen.getByText("Rever ›")).toBeTruthy();
    // accessibilityElementsHidden tira o selo da arvore de acessibilidade de
    // proposito (decorativo, "Rever" ja comunica o estado pra leitor de
    // tela) - por isso precisa de includeHiddenElements aqui.
    expect(screen.getByTestId("selo-concluido", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText("Concluído")).toBeNull();
  });

  test("quiz disponivel mostra 'Responder'", async () => {
    mockRouteParams = { cursoId: 10 };
    const snapshot = montarSnapshotCurso({
      avaliacoes: [
        {
          id: 6000,
          cursoId: 10,
          moduloId: 100,
          conteudoDidaticoId: null,
          titulo: "Quiz de fixação",
          tipoAvaliacao: 1,
          totalQuestoes: 5,
          tentativasRestantes: 3,
          progressoLiberado: true,
          dataAbertura: null,
          dataFechamento: null
        }
      ],
      modulos: [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }]
    });

    await render(<ConteudosScreen onRecarregar={jest.fn()} onSessionExpired={jest.fn()} snapshot={snapshot} />);
    await abrirModulo();

    expect(screen.getByText("Responder")).toBeTruthy();
  });
});
