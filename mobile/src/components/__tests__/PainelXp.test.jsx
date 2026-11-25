import { render, screen } from "@testing-library/react-native";
import PainelXp from "../PainelXp.jsx";
import { XP_POR_CONTEUDO, XP_POR_CURSO, XP_POR_MODULO } from "../../../../shared/xp.js";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

// docs/gamificacao/PROMPT-agente-barra-xp-mobile.md, item 4 - os valores de
// "Como ganhar XP" vem das constantes de shared/xp.js, nao de numeros
// fixos no componente (por isso o teste tambem importa de la, em vez de
// escrever +10/+50/+200 direto).
const XP = { nivel: 3, percentualNivel: 40, xpNoNivel: 200, xpPorNivel: 500, faltamParaProximo: 300, total: 1200 };

describe("PainelXp", () => {
  test("mostra 'Faltam Y XP para o nível N+1' e os tres valores de Como ganhar XP", async () => {
    await render(<PainelXp onFechar={jest.fn()} visivel xp={XP} />);

    expect(screen.getByText("Faltam 300 XP para o nível 4")).toBeTruthy();
    expect(screen.getByText("Como ganhar XP")).toBeTruthy();
    expect(screen.getByText(`+${XP_POR_CONTEUDO} XP`)).toBeTruthy();
    expect(screen.getByText(`+${XP_POR_MODULO} XP`)).toBeTruthy();
    expect(screen.getByText(`+${XP_POR_CURSO} XP`)).toBeTruthy();
    expect(screen.getByText("Quizzes e avaliações ainda não contam XP.")).toBeTruthy();
  });

  test("sem xp, nao renderiza nada", async () => {
    await render(<PainelXp onFechar={jest.fn()} visivel xp={null} />);

    expect(screen.queryByText("Como ganhar XP")).toBeNull();
  });
});
