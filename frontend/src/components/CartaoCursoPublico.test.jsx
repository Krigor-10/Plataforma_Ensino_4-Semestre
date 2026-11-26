import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CartaoCursoPublico from "./CartaoCursoPublico.jsx";

const CURSO_GRATUITO = { id: 1, titulo: "Curso Gratuito Teste", descricao: "Descricao", ehGratuito: true, preco: 0 };
const CURSO_PAGO = { id: 2, titulo: "Curso Pago Teste", descricao: "Descricao", ehGratuito: false, preco: 199.9 };

describe("CartaoCursoPublico", () => {
  test("curso gratuito mostra 'Grátis' com acento", () => {
    render(<CartaoCursoPublico curso={CURSO_GRATUITO} />);

    expect(screen.getByText("Grátis")).toBeInTheDocument();
  });

  test("curso pago mostra o preco formatado, nao 'Grátis'", () => {
    render(<CartaoCursoPublico curso={CURSO_PAGO} />);

    expect(screen.queryByText("Grátis")).not.toBeInTheDocument();
  });
});
