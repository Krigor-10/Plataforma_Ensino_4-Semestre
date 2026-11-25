import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import BotaoContornoSeta from "../BotaoContornoSeta.jsx";

// docs/redesign-mobile/PROMPT-agente-inicio-seta-e-catalogo.md, item 1
// (opcao B): componente reutilizavel pilula+seta -> que substitui o
// "Ver"/chevron-forward fino e desalinhado dos banners da Inicio.
describe("BotaoContornoSeta", () => {
  test("repassa onPress e accessibilityLabel, e mostra a seta arrow-forward", async () => {
    const onPress = jest.fn();

    await render(
      <BotaoContornoSeta
        accessibilityHint="Abre o catálogo de cursos"
        accessibilityLabel="Ver cursos"
        onPress={onPress}
        rotulo="Ver cursos"
      />
    );

    expect(screen.getByText("Ver cursos")).toBeTruthy();
    // getByTestId resolve pro no nativo final (Text com o glifo da fonte do
    // icone), que nao expoe a prop `name` do Ionicons - so a presenca do
    // testID (so existe neste componente, ver BotaoContornoSeta.jsx) ja
    // confirma que a seta renderizou.
    expect(screen.getByTestId("icone-seta")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Ver cursos"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // Relevo (PROMPT-agente-botao-seta-relevo.md, item 3): texto quase branco
  // e bem mais pesado que o roxo-sobre-contorno de antes, pra ficar legivel
  // sobre o degrade preenchido.
  test("texto em #efe7ff com peso 800", async () => {
    await render(
      <BotaoContornoSeta accessibilityHint="Abre o catálogo de cursos" accessibilityLabel="Ver cursos" onPress={jest.fn()} rotulo="Ver cursos" />
    );

    const estiloTexto = StyleSheet.flatten(screen.getByText("Ver cursos").props.style);

    expect(estiloTexto.color).toBe("#efe7ff");
    expect(estiloTexto.fontWeight).toBe("800");
  });
});
