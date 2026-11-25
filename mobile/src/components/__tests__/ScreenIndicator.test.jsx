import { fireEvent, render, screen } from "@testing-library/react-native";
import ScreenIndicator from "../ScreenIndicator.jsx";

// docs/gamificacao/PROMPT-agente-barra-xp-mobile.md, item 3: o placeholder
// de medalha vira o chip de XP real.
const XP = { nivel: 3, percentualNivel: 40, xpNoNivel: 200, xpPorNivel: 500 };

describe("ScreenIndicator", () => {
  test("com xp, renderiza 'Nv N' e chama onAbrirXp ao tocar", async () => {
    const onAbrirXp = jest.fn();

    await render(<ScreenIndicator icone="home" onAbrirXp={onAbrirXp} titulo="Início" xp={XP} />);

    expect(screen.getByText("Nv 3")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/Nível 3/));

    expect(onAbrirXp).toHaveBeenCalledTimes(1);
  });

  // Sem `xp`, nao renderiza mais nada a direita - nem o chip, nem o
  // placeholder de medalha antigo (removido de vez, nao so trocado por
  // outro icone fixo).
  test("sem xp, nao renderiza nada a direita (nem a medalha antiga)", async () => {
    await render(<ScreenIndicator icone="home" onAbrirXp={jest.fn()} titulo="Início" xp={null} />);

    expect(screen.queryByText(/Nv /)).toBeNull();
    expect(screen.queryByLabelText(/Nível/)).toBeNull();
  });
});
