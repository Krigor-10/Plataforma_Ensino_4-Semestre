import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import LeituraItemConteudo from "./LeituraItemConteudo.jsx";

const MATERIAL = {
  tipo: "material",
  titulo: "Introdução ao HTML",
  conteudo: { tipoConteudo: 1, descricao: "", arquivoUrl: "", linkUrl: "" }
};

// O modulo ja aparece no titulo da pagina que usa esse componente
// (TelaModuloGestao.jsx) - a trilha "Modulo N › titulo › Material" foi
// removida por ser repetida (docs/fluxo-coordenador/PROMPT-agente-modulo-
// leitura-compacta.md, item 2).
describe("LeituraItemConteudo", () => {
  test("nao mostra a trilha 'Modulo N › ...' acima do titulo", () => {
    render(<LeituraItemConteudo item={MATERIAL} />);

    expect(screen.getByRole("heading", { name: "Introdução ao HTML" })).toBeInTheDocument();
    expect(screen.queryByText(/^Módulo \d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  test("mostra o selo 'Somente leitura' no cabecalho", () => {
    render(<LeituraItemConteudo item={MATERIAL} />);

    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
  });
});
