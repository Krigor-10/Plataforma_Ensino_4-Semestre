import { fireEvent, render, screen } from "@testing-library/react-native";
import ProgressoScreen from "../ProgressoScreen.jsx";

// Visao geral direta (docs/redesign-mobile/PROMPT-agente-progresso-visao-
// geral.md) - estes testes cobrem exatamente a secao "Testes (jest)" do
// prompt.

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), navigate: mockNavigate })
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

const mockApiRequest = jest.fn();
jest.mock("../../../lib/api.js", () => {
  const real = jest.requireActual("../../../lib/api.js");
  return { ...real, apiRequest: (...args) => mockApiRequest(...args) };
});

const STATUS_CERTIFICADOS = [
  {
    matriculaId: 1,
    cursoId: 10,
    certificadoDisponivel: false,
    pendenciasCertificado: ["O curso ainda não foi concluído."],
    situacao: "EmAndamento",
    certificadoEmitidoEm: null
  },
  {
    matriculaId: 2,
    cursoId: 20,
    certificadoDisponivel: true,
    pendenciasCertificado: [],
    situacao: "Emitido",
    certificadoEmitidoEm: "2026-08-28T00:00:00Z"
  },
  {
    matriculaId: 3,
    cursoId: 30,
    certificadoDisponivel: false,
    pendenciasCertificado: ["O pagamento deste curso ainda não foi confirmado."],
    situacao: "AguardandoPagamento",
    certificadoEmitidoEm: null
  }
];

function montarSnapshot() {
  return {
    avaliacoes: [],
    conteudos: [],
    cursos: [
      { id: 10, titulo: "Curso Web" },
      { id: 20, titulo: "Curso Dados" },
      { id: 30, titulo: "Curso Pendente" }
    ],
    matriculas: [
      { id: 1, cursoId: 10, status: "Aprovada" },
      { id: 2, cursoId: 20, status: "Aprovada" },
      { id: 3, cursoId: 30, status: "Aprovada" }
    ],
    modulos: [],
    pagamentos: [],
    progressos: {
      conteudos: [],
      modulos: [],
      cursos: [
        { matriculaId: 1, cursoId: 10, percentualConclusao: 40, modulosConcluidos: 2, totalModulos: 5, mediaCurso: 0 },
        { matriculaId: 2, cursoId: 20, percentualConclusao: 100, modulosConcluidos: 3, totalModulos: 3, mediaCurso: 9 },
        { matriculaId: 3, cursoId: 30, percentualConclusao: 0, modulosConcluidos: 0, totalModulos: 4, mediaCurso: 0 }
      ]
    }
  };
}

describe("ProgressoScreen - visao geral direta", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((url) => (url === "/Certificados/status" ? Promise.resolve(STATUS_CERTIFICADOS) : Promise.resolve([])));
  });

  test("abre na visao geral, sem passo de selecao", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);

    expect(screen.getByText("Seus cursos")).toBeTruthy();
    expect(await screen.findByText("Curso Web")).toBeTruthy();
    expect(screen.queryByLabelText(/Ver progresso de/i)).toBeNull();
  });

  test("resumo mostra os 4 numeros calculados do snapshot e do status", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);
    await screen.findByText("Curso Web");

    expect(screen.getAllByText("Em andamento").length).toBeGreaterThan(0);
    expect(screen.getByText("Concluídos")).toBeTruthy();
    expect(screen.getByText("Certificados")).toBeTruthy();
    expect(screen.getByText("Média geral")).toBeTruthy();
    // 1 em andamento (Web), 1 concluido (Dados), 1 certificado (Dados,
    // Emitido), media geral so da media >0 (Dados, 9) = "9,0". Curso
    // Pendente (AguardandoPagamento) nao entra em nenhuma conta.
    expect(screen.getAllByText("1")).toHaveLength(3);
    expect(screen.getByText("9,0")).toBeTruthy();
  });

  test("cursos sem acesso/pagamento pendente nao aparecem, ordem certa e selo certo por situacao", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);
    await screen.findByText("Curso Web");

    expect(screen.queryByText("Curso Pendente")).toBeNull();
    expect(screen.getByLabelText("Curso Web. Em andamento.")).toBeTruthy();
    expect(screen.getByLabelText("Curso Dados. 🏆 Certificado.")).toBeTruthy();
  });

  test("tocar no curso abre o detalhe, e Voltar retorna", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);
    await screen.findByText("Curso Web");

    await fireEvent.press(screen.getByLabelText("Curso Web. Em andamento."));

    expect(screen.getByLabelText("Voltar")).toBeTruthy();
    expect(screen.queryByText("Seus cursos")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Voltar"));

    expect(screen.getByText("Seus cursos")).toBeTruthy();
  });

  test("detalhe: cabecalho com anel/titulo/selo/3 numeros, certificado 'emitido em' quando Emitido, sem a frase fixa antiga", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);
    await screen.findByText("Curso Web");

    await fireEvent.press(screen.getByLabelText("Curso Dados. 🏆 Certificado."));

    expect(screen.getByText("CURSO")).toBeTruthy();
    expect(screen.getAllByText("Curso Dados").length).toBeGreaterThan(0);
    expect(screen.getByText("módulos")).toBeTruthy();
    expect(screen.getByText("conteúdos")).toBeTruthy();
    expect(screen.getByText("nota final")).toBeTruthy();
    expect(screen.getByText(/Certificado emitido em/)).toBeTruthy();
    expect(screen.queryByText(/100% e média/)).toBeNull();
    expect(screen.queryByText(/liberado automaticamente/)).toBeNull();
  });

  test("detalhe: fora de Emitido, o cartao de certificado mostra 'Falta: ' com a 1a pendencia", async () => {
    await render(<ProgressoScreen snapshot={montarSnapshot()} />);
    await screen.findByText("Curso Web");

    await fireEvent.press(screen.getByLabelText("Curso Web. Em andamento."));

    expect(screen.getByText("Falta: O curso ainda não foi concluído.")).toBeTruthy();
  });
});
