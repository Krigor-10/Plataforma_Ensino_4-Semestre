import { fireEvent, render, screen } from "@testing-library/react-native";
import AbasSegmentadas from "../AbasSegmentadas.jsx";

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return { ...Reanimated, useReducedMotion: () => false };
});

const OPCOES = [
  { chave: "emAndamento", rotulo: "Em andamento", contador: 3 },
  { chave: "conquistados", rotulo: "Conquistados", contador: 2 }
];

describe("AbasSegmentadas", () => {
  test("renderiza as opcoes com os contadores", async () => {
    await render(<AbasSegmentadas onSelecionar={jest.fn()} opcoes={OPCOES} valorSelecionado="emAndamento" />);

    expect(screen.getByText("Em andamento · 3")).toBeTruthy();
    expect(screen.getByText("Conquistados · 2")).toBeTruthy();
  });

  test("expoe tablist/tab/selected", async () => {
    await render(<AbasSegmentadas onSelecionar={jest.fn()} opcoes={OPCOES} valorSelecionado="emAndamento" />);

    expect(screen.getByTestId("trilho-abas-segmentadas").props.accessibilityRole).toBe("tablist");

    const emAndamento = screen.getByLabelText("Em andamento, 3");
    const conquistados = screen.getByLabelText("Conquistados, 2");
    expect(emAndamento.props.accessibilityRole).toBe("tab");
    expect(emAndamento.props.accessibilityState).toEqual({ selected: true });
    expect(conquistados.props.accessibilityState).toEqual({ selected: false });
  });

  test("troca a aba no toque", async () => {
    const aoSelecionar = jest.fn();
    await render(<AbasSegmentadas onSelecionar={aoSelecionar} opcoes={OPCOES} valorSelecionado="emAndamento" />);

    await fireEvent.press(screen.getByLabelText("Conquistados, 2"));

    expect(aoSelecionar).toHaveBeenCalledWith("conquistados");
  });
});
