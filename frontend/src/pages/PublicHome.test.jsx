import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import PublicHome from "./PublicHome.jsx";
import { apiRequest } from "../lib/api.js";

vi.mock("../lib/api.js", async () => {
  const real = await vi.importActual("../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

function cursoGratuito(id) {
  return { id, titulo: `Curso ${id}`, descricao: "Descricao", ehGratuito: true, preco: 0, modeloCurso: 1 };
}

describe("PublicHome - contagem de cursos disponiveis", () => {
  test("com 1 curso mostra '1 curso disponível.'", async () => {
    apiRequest.mockResolvedValue([cursoGratuito(1)]);

    render(<PublicHome hasSession={false} isDemoMode={false} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("1 curso disponível.")).toBeInTheDocument();
    });
  });

  test("com 3 cursos mostra '3 cursos disponíveis.'", async () => {
    apiRequest.mockResolvedValue([cursoGratuito(1), cursoGratuito(2), cursoGratuito(3)]);

    render(<PublicHome hasSession={false} isDemoMode={false} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("3 cursos disponíveis.")).toBeInTheDocument();
    });
  });
});
