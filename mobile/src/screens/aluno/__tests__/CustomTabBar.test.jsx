import { fireEvent, render, screen } from "@testing-library/react-native";
import CustomTabBar from "../CustomTabBar.jsx";
import { ROUTES } from "../../../lib/routes.js";

// CustomTabBar testado isolado do NavigationContainer: react-navigation
// passa `state`/`navigation` desse mesmo formato pra prop `tabBar` (ver
// docs/redesign-mobile/PROMPT-agente-barra-navegacao-quadrado-roxo.md,
// secao "Testes").
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 })
}));

// Mock oficial do reanimated (node_modules/react-native-reanimated/mock.js) -
// so nao cobre useReducedMotion ("ADD ME IF NEEDED" no fonte do pacote).
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return { ...Reanimated, useReducedMotion: () => false };
});

const ROTAS_ABAS = [
  { key: "inicio-key", name: ROUTES.INICIO },
  { key: "conteudos-key", name: ROUTES.CONTEUDOS },
  { key: "avaliacoes-key", name: ROUTES.AVALIACOES },
  { key: "progresso-key", name: ROUTES.PROGRESSO },
  { key: "certificados-key", name: ROUTES.CERTIFICADOS }
];

function montarEstado(index) {
  return { index, routes: ROTAS_ABAS };
}

function montarNavegacao() {
  return { navigate: jest.fn(), emit: jest.fn(() => ({ defaultPrevented: false })) };
}

describe("CustomTabBar", () => {
  // render() do @testing-library/react-native 14 e assincrono (suporte a
  // React 19/concurrent) - sem o await, o registro em `screen` nao acontece
  // a tempo e getByLabelText/getByText/getByTestId falham com "render
  // function has not been called".
  test("renderiza as 5 abas", async () => {
    await render(<CustomTabBar navigation={montarNavegacao()} state={montarEstado(0)} />);

    expect(screen.getByLabelText("Início")).toBeTruthy();
    expect(screen.getByLabelText("Cursos")).toBeTruthy();
    expect(screen.getByLabelText("Avaliações")).toBeTruthy();
    expect(screen.getByLabelText("Progresso")).toBeTruthy();
    expect(screen.getByLabelText("Certificados")).toBeTruthy();
  });

  test("aba ativa fica no quadrado, com o rotulo escondido mas accessibilityLabel/selected mantidos", async () => {
    await render(<CustomTabBar navigation={montarNavegacao()} state={montarEstado(1)} />);
    // O quadrado so aparece depois do onLayout medir a largura real da barra
    // (QuadradoAbaAtiva, CustomTabBar.jsx) - o test renderer nao dispara isso
    // por conta propria, entao simula a medida aqui.
    await fireEvent.layout(screen.getByTestId("barra-abas"), { width: 348 });

    expect(screen.getByTestId("quadrado-aba-ativa")).toBeTruthy();

    const abaCursos = screen.getByLabelText("Cursos");
    expect(abaCursos.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText("Cursos")).not.toBeVisible();
  });

  test("abas inativas mostram icone e rotulo visiveis", async () => {
    await render(<CustomTabBar navigation={montarNavegacao()} state={montarEstado(1)} />);

    const abaProgresso = screen.getByLabelText("Progresso");
    expect(abaProgresso.props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByText("Progresso")).toBeVisible();
  });

  test("tocar numa aba chama a navegacao para a rota certa", async () => {
    const navegacao = montarNavegacao();
    await render(<CustomTabBar navigation={navegacao} state={montarEstado(0)} />);

    await fireEvent.press(screen.getByLabelText("Avaliações"));

    expect(navegacao.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tabPress", target: "avaliacoes-key" })
    );
    expect(navegacao.navigate).toHaveBeenCalledWith(ROUTES.AVALIACOES);
  });

  test("tocar na propria aba ativa nao navega de novo", async () => {
    const navegacao = montarNavegacao();
    await render(<CustomTabBar navigation={navegacao} state={montarEstado(0)} />);

    await fireEvent.press(screen.getByLabelText("Início"));

    expect(navegacao.navigate).not.toHaveBeenCalled();
  });

  test("a barra respeita insets.bottom (mock do safe area)", async () => {
    await render(<CustomTabBar navigation={montarNavegacao()} state={montarEstado(0)} />);

    const barra = screen.getByTestId("barra-abas");
    const estiloAchatado = Array.isArray(barra.props.style) ? Object.assign({}, ...barra.props.style) : barra.props.style;
    expect(estiloAchatado.bottom).toBe(30);
  });
});
