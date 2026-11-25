import { fireEvent, render, screen, within } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen.jsx";
import { ROUTES } from "../../lib/routes.js";

// Tela Inicio no estilo da referencia (docs/redesign-mobile/PROMPT-agente-
// inicio-referencia.md) - estes testes cobrem exatamente a secao "Testes
// (jest)" do prompt.

// useReducedMotion: true pra este arquivo (nao false, como nos outros
// testes de tela) - evita que fireEvent.press no botao "Continuar aula"
// dispare Animated.timing(...).start() de verdade (react-native puro, nao
// reanimated - useReducedMotion so controla o "if" no HomeScreen.jsx), que
// deixava callbacks pendentes vazando entre testes ("overlapping act()
// calls") e corrompendo o proximo render.
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return { ...Reanimated, useReducedMotion: () => true };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

const CURSO_WEB = { id: 10, titulo: "Curso Web" };
const CURSO_DADOS = { id: 20, titulo: "Curso Dados" };
const CURSO_CONCLUIDO = { id: 30, titulo: "Curso Concluido" };

const CONTEUDO_PROXIMO = { id: 1000, cursoId: 10, moduloId: 100, titulo: "Aula 1", moduloTitulo: "APIs e Integração" };

const AVALIACAO_DISPONIVEL = {
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

function montarSnapshot({ avaliacoes = [], conteudos = [], cursos = [], matriculas = [], modulos = [], progressos = [] }) {
  return {
    avaliacoes,
    conteudos,
    cursos,
    matriculas,
    modulos,
    pagamentos: [],
    progressos: { conteudos: [], modulos: [], cursos: progressos }
  };
}

function montarSnapshotComCursoEmAndamento(extra = {}) {
  return montarSnapshot({
    cursos: [CURSO_WEB],
    matriculas: [{ id: 1, cursoId: 10, status: "Aprovada" }],
    modulos: [{ id: 100, cursoId: 10, titulo: "APIs e Integração", dataCriacao: "2026-01-01" }],
    conteudos: [CONTEUDO_PROXIMO],
    progressos: [{ matriculaId: 1, cursoId: 10, percentualConclusao: 35, modulosConcluidos: 0, totalModulos: 1, mediaCurso: 0 }],
    ...extra
  });
}

describe("HomeScreen - estilo da referencia", () => {
  test("'Acesso rapido' nao renderiza mais", async () => {
    const snapshot = montarSnapshotComCursoEmAndamento();

    await render(<HomeScreen onAbrirAba={jest.fn()} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.queryByText("Acesso rápido")).toBeNull();
    expect(screen.queryByLabelText("Cursos")).toBeNull();
    expect(screen.queryByLabelText("Progresso")).toBeNull();
  });

  test("cartao 'Continue estudando': pilula, capa, Modulo N e N% concluido; botao abre a trilha", async () => {
    const onAbrirAba = jest.fn();
    const snapshot = montarSnapshotComCursoEmAndamento();

    await render(<HomeScreen onAbrirAba={onAbrirAba} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.getByText("CONTINUE ESTUDANDO")).toBeTruthy();
    // "Curso Web" aparece 2x (cartao "Continue estudando" + carrossel
    // "Meus cursos", ja que e o unico curso do fixture).
    expect(screen.getAllByText("Curso Web").length).toBeGreaterThan(0);
    expect(screen.getByText("Módulo 1 · APIs e Integração")).toBeTruthy();
    expect(screen.getByText("35% concluído")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Continuar aula"));

    expect(onAbrirAba).toHaveBeenCalledWith(ROUTES.CONTEUDOS, { cursoId: 10 });
  });

  test("banner de avaliacoes: so aparece com N > 0, mostra o total sem limite e o plural certo", async () => {
    const onAbrirAba = jest.fn();
    const snapshot = montarSnapshotComCursoEmAndamento({
      avaliacoes: [
        AVALIACAO_DISPONIVEL,
        { ...AVALIACAO_DISPONIVEL, id: 2, titulo: "Prova 2" },
        { ...AVALIACAO_DISPONIVEL, id: 3, titulo: "Prova 3" }
      ]
    });

    await render(<HomeScreen onAbrirAba={onAbrirAba} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.getByText("Avaliações pendentes")).toBeTruthy();
    expect(screen.getByText("Você tem 3 avaliações disponíveis")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Avaliações pendentes"));

    expect(onAbrirAba).toHaveBeenCalledWith(ROUTES.AVALIACOES);
  });

  test("banner de avaliacoes: singular quando N = 1", async () => {
    const snapshot = montarSnapshotComCursoEmAndamento({ avaliacoes: [AVALIACAO_DISPONIVEL] });

    await render(<HomeScreen onAbrirAba={jest.fn()} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.getByText("Você tem 1 avaliação disponível")).toBeTruthy();
  });

  test("banner de avaliacoes: some quando N = 0", async () => {
    const snapshot = montarSnapshotComCursoEmAndamento();

    await render(<HomeScreen onAbrirAba={jest.fn()} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.queryByText("Avaliações pendentes")).toBeNull();
  });

  test("Meus cursos: icone/cor certos para 0%, 35% e 100%, e 'Ver todos' abre Cursos", async () => {
    const onAbrirAba = jest.fn();
    const snapshot = montarSnapshot({
      cursos: [CURSO_WEB, CURSO_DADOS, CURSO_CONCLUIDO],
      matriculas: [
        { id: 1, cursoId: 10, status: "Aprovada" },
        { id: 2, cursoId: 20, status: "Aprovada" },
        { id: 3, cursoId: 30, status: "Aprovada" }
      ],
      progressos: [
        { matriculaId: 1, cursoId: 10, percentualConclusao: 35, modulosConcluidos: 0, totalModulos: 1, mediaCurso: 0 },
        { matriculaId: 2, cursoId: 20, percentualConclusao: 0, modulosConcluidos: 0, totalModulos: 1, mediaCurso: 0 },
        { matriculaId: 3, cursoId: 30, percentualConclusao: 100, modulosConcluidos: 1, totalModulos: 1, mediaCurso: 0 }
      ]
    });

    await render(<HomeScreen onAbrirAba={onAbrirAba} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.getByText("Em andamento")).toBeTruthy();
    expect(screen.getByText("Não iniciado")).toBeTruthy();
    expect(screen.getByText("Concluído")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Ver todos os cursos"));

    expect(onAbrirAba).toHaveBeenCalledWith(ROUTES.CONTEUDOS);
  });

  test("banner do catalogo: aparece com matricula e abre o Catalogo", async () => {
    const onAbrirAba = jest.fn();
    const snapshot = montarSnapshotComCursoEmAndamento();

    await render(<HomeScreen onAbrirAba={onAbrirAba} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    await fireEvent.press(screen.getByLabelText("Ver cursos"));

    expect(onAbrirAba).toHaveBeenCalledWith(ROUTES.CATALOGO);
  });

  test("banner do catalogo: aparece tambem sem nenhuma matricula (estado vazio)", async () => {
    const onAbrirAba = jest.fn();
    const snapshot = montarSnapshot({});

    await render(<HomeScreen onAbrirAba={onAbrirAba} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    expect(screen.getByText("Explorar catálogo")).toBeTruthy();
    expect(screen.getByText(/Olá, Aluno! 👋/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Ver cursos"));

    expect(onAbrirAba).toHaveBeenCalledWith(ROUTES.CATALOGO);
  });

  // docs/redesign-mobile/PROMPT-agente-inicio-seta-e-catalogo.md
  test("banner de avaliacoes: botao 'Ver' usa a seta arrow-forward", async () => {
    const snapshot = montarSnapshotComCursoEmAndamento({ avaliacoes: [AVALIACAO_DISPONIVEL] });

    await render(<HomeScreen onAbrirAba={jest.fn()} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    const botaoVer = screen.getByLabelText("Ver avaliações pendentes");
    // getByTestId resolve pro no nativo final, que nao expoe a prop `name`
    // do Ionicons - a presenca do testID (so existe no BotaoContornoSeta.jsx,
    // com name="arrow-forward" fixo) ja confirma que a seta renderizou.
    expect(within(botaoVer).getByTestId("icone-seta")).toBeTruthy();
  });

  test("banner do catalogo: texto completo sem numberOfLines, e 'Ver cursos' usa a seta arrow-forward", async () => {
    const snapshot = montarSnapshotComCursoEmAndamento();

    await render(<HomeScreen onAbrirAba={jest.fn()} snapshot={snapshot} usuario={{ nome: "Aluno Demo" }} />);

    const descricao = screen.getByText("Descubra novos cursos para turbinar seus conhecimentos.");
    expect(descricao.props.numberOfLines).toBeUndefined();

    const botaoVerCursos = screen.getByLabelText("Ver cursos");
    expect(within(botaoVerCursos).getByTestId("icone-seta")).toBeTruthy();
  });
});
