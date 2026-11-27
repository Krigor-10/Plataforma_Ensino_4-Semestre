import { fireEvent, render, screen } from "@testing-library/react-native";
import CertificadosScreen from "../CertificadosScreen.jsx";

// Abas no topo (docs/certificados-mobile/PROMPT-agente-certificados-abas-
// topo.md) substituem as secoes empilhadas "Conquistados"/"Em andamento" -
// estes testes cobrem exatamente a secao "Testes (jest)" do prompt.

let mockRouteParams;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams })
}));

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve()) }));

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

const mockApiRequest = jest.fn();
jest.mock("../../../lib/api.js", () => {
  const real = jest.requireActual("../../../lib/api.js");
  return { ...real, apiRequest: (...args) => mockApiRequest(...args) };
});

const CURSO_EM_ANDAMENTO = { id: 10, titulo: "Curso Em Andamento" };
const CURSO_AGUARDANDO_PAGAMENTO = { id: 30, titulo: "Curso Pendente Pagamento" };
const CERTIFICADO_CONQUISTADO = {
  codigoVerificacao: "ABC123",
  alunoNome: "Aluno Demo",
  cursoTitulo: "Curso Concluido",
  turmaNome: null,
  notaFinal: 8.5,
  emitidoEm: "2026-08-28T00:00:00Z"
};

function montarSnapshot({ matriculas, pagamentos = [], progressos = [] }) {
  return {
    cursos: [CURSO_EM_ANDAMENTO, CURSO_AGUARDANDO_PAGAMENTO],
    matriculas,
    pagamentos,
    progressos: { cursos: progressos }
  };
}

function mockarApi({ meus, status }) {
  mockApiRequest.mockImplementation((url) => {
    if (url === "/Certificados/meus") {
      return Promise.resolve(meus);
    }
    if (url === "/Certificados/status") {
      return Promise.resolve(status);
    }
    return Promise.resolve([]);
  });
}

describe("CertificadosScreen - abas no topo", () => {
  beforeEach(() => {
    mockRouteParams = undefined;
    mockApiRequest.mockReset();
  });

  test("abre em 'Em andamento' e mostra so esse conteudo", async () => {
    mockarApi({
      meus: [CERTIFICADO_CONQUISTADO],
      status: [{ matriculaId: 1, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "EmAndamento", certificadoEmitidoEm: null }]
    });
    const snapshot = montarSnapshot({
      matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
      progressos: [{ matriculaId: 1, percentualConclusao: 40 }]
    });

    await render(<CertificadosScreen snapshot={snapshot} />);

    expect(await screen.findByText("Curso Em Andamento")).toBeTruthy();
    expect(screen.queryByText("Curso Concluido")).toBeNull();
  });

  test("tocar em 'Conquistados' mostra os certificados", async () => {
    mockarApi({
      meus: [CERTIFICADO_CONQUISTADO],
      status: [{ matriculaId: 1, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "EmAndamento", certificadoEmitidoEm: null }]
    });
    const snapshot = montarSnapshot({
      matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
      progressos: [{ matriculaId: 1, percentualConclusao: 40 }]
    });

    await render(<CertificadosScreen snapshot={snapshot} />);
    await screen.findByText("Curso Em Andamento");

    await fireEvent.press(screen.getByLabelText("Conquistados, 1"));

    expect(await screen.findByText("Curso Concluido")).toBeTruthy();
    expect(screen.queryByText("Curso Em Andamento")).toBeNull();
  });

  // Decisao F3 da auditoria de 26/11: revogado continua listado, com a data,
  // mas sem ver/compartilhar.
  test("certificado revogado mostra a data e esconde ver/compartilhar", async () => {
    mockarApi({ meus: [{ ...CERTIFICADO_CONQUISTADO, revogadoEm: "2026-11-25T00:00:00Z" }], status: [] });
    const snapshot = montarSnapshot({ matriculas: [] });

    await render(<CertificadosScreen snapshot={snapshot} />);

    expect(await screen.findByText(/Certificado revogado em/)).toBeTruthy();
    expect(screen.queryByText("Ver certificado")).toBeNull();
    expect(screen.queryByLabelText("Compartilhar certificado")).toBeNull();
  });

  test("com 'Em andamento' vazia e certificados existentes, abre em 'Conquistados'", async () => {
    mockarApi({ meus: [CERTIFICADO_CONQUISTADO], status: [] });
    const snapshot = montarSnapshot({ matriculas: [] });

    await render(<CertificadosScreen snapshot={snapshot} />);

    expect(await screen.findByText("Curso Concluido")).toBeTruthy();
  });

  test("'Aguardando pagamento' aparece no fim de 'Em andamento'", async () => {
    mockarApi({
      meus: [],
      status: [
        { matriculaId: 1, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "EmAndamento", certificadoEmitidoEm: null },
        { matriculaId: 3, cursoId: 30, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "AguardandoPagamento", certificadoEmitidoEm: null }
      ]
    });
    const snapshot = montarSnapshot({
      matriculas: [
        { id: 1, cursoId: 10, status: "Aprovada" },
        { id: 3, cursoId: 30, status: "Aprovada" }
      ],
      pagamentos: [{ matriculaId: 3, status: 1, venceEm: "2026-12-05" }],
      progressos: [{ matriculaId: 1, percentualConclusao: 40 }]
    });

    await render(<CertificadosScreen snapshot={snapshot} />);

    expect(await screen.findByText("Curso Em Andamento")).toBeTruthy();
    expect(screen.getByText("Aguardando pagamento · 1")).toBeTruthy();
  });

  test("a linha de numeros (statsLinha) nao existe mais", async () => {
    mockarApi({
      meus: [CERTIFICADO_CONQUISTADO],
      status: [{ matriculaId: 1, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: [], situacao: "EmAndamento", certificadoEmitidoEm: null }]
    });
    const snapshot = montarSnapshot({
      matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
      progressos: [{ matriculaId: 1, percentualConclusao: 40 }]
    });

    await render(<CertificadosScreen snapshot={snapshot} />);
    await screen.findByText("Curso Em Andamento");

    // So a aba (com "· N") deve existir - nao o rotulo solto da antiga
    // statsLinha. ("Em andamento" sozinho ainda existe de verdade no selo
    // de situacao do cartao - formatarSeloSituacao - entao nao serve pra
    // este teste.)
    expect(screen.queryByText("Conquistados")).toBeNull();
  });
});
