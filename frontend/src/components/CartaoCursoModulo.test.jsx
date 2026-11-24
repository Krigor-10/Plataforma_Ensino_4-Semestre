import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CartaoCursoModulo from "./CartaoCursoModulo.jsx";

const CURSO = { id: 1, titulo: "Curso Teste", descricao: "Descricao do curso", imagemUrl: "" };

// docs/TelaConteudosAlunos/PROMPT-agente-tela-modulo-redundancias-e-icones.md,
// item 1: na variante media, o selo tinha que aparecer em um lugar so - sem
// kpis (Professor/Aluno) so no canto, com kpis (Coordenador/Admin, e agora
// Progresso do aluno) so na linha da barra, porque o canto e dos KPIs.
describe("CartaoCursoModulo - variante media, selo em um lugar so", () => {
  test("sem kpis, o selo aparece uma vez, no canto", () => {
    render(<CartaoCursoModulo curso={CURSO} percentual={50} selo="Curso em andamento" variante="medio" />);

    const selos = screen.getAllByText("Curso em andamento");
    expect(selos).toHaveLength(1);
    expect(selos[0]).toHaveClass("cartao-curso-modulo__selo");
  });

  test("com kpis, o selo aparece uma vez, na linha da barra", () => {
    render(
      <CartaoCursoModulo
        curso={CURSO}
        kpis={[{ id: "progresso", icone: null, rotulo: "Progresso", valor: "50%" }]}
        percentual={50}
        selo="🏆 Certificado emitido"
        variante="medio"
      />
    );

    const selos = screen.getAllByText("🏆 Certificado emitido");
    expect(selos).toHaveLength(1);
    expect(selos[0]).toHaveClass("cartao-curso-modulo__selo-inline");
  });
});
