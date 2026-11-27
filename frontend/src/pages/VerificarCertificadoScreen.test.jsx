import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import VerificarCertificadoScreen from "./VerificarCertificadoScreen.jsx";
import { apiRequest } from "../lib/api.js";

vi.mock("../lib/api.js", async () => {
  const real = await vi.importActual("../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const CERTIFICADO = {
  codigoVerificacao: "MAT-ABC123",
  alunoNome: "Maria Aluna",
  cursoTitulo: "Curso de Redes",
  turmaNome: null,
  notaFinal: 8.5,
  emitidoEm: "2026-11-20T10:00:00Z",
  revogadoEm: null
};

// docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md, decisao F3.
describe("VerificarCertificadoScreen", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("certificado valido mostra 'Certificado autentico'", async () => {
    apiRequest.mockResolvedValue(CERTIFICADO);
    render(<VerificarCertificadoScreen codigo="MAT-ABC123" onNavigate={vi.fn()} />);

    expect(await screen.findByText("Certificado autêntico")).toBeInTheDocument();
    expect(screen.getByText("Maria Aluna")).toBeInTheDocument();
  });

  test("certificado revogado mostra a data da revogacao e nao diz que e autentico", async () => {
    apiRequest.mockResolvedValue({ ...CERTIFICADO, revogadoEm: "2026-11-25T10:00:00Z" });
    render(<VerificarCertificadoScreen codigo="MAT-ABC123" onNavigate={vi.fn()} />);

    expect(await screen.findByText("Certificado revogado")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/revogado em/);
    expect(screen.queryByText("Certificado autêntico")).not.toBeInTheDocument();
    expect(document.title).toMatch(/^Certificado revogado/);
  });
});
