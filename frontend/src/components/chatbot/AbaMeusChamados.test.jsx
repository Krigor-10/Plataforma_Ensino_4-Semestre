import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AbaMeusChamados from "./AbaMeusChamados.jsx";
import { listarMeusChamados, reabrirChamado, responderChamado } from "../../lib/chamadosApi.js";

vi.mock("../../lib/chamadosApi.js", () => ({
  listarMeusChamados: vi.fn(),
  reabrirChamado: vi.fn(),
  responderChamado: vi.fn()
}));

const ALUNO_ID = 1;

function chamadoBase(sobrescritas = {}) {
  return {
    id: 1,
    alunoId: ALUNO_ID,
    cursoId: 10,
    cursoTitulo: "Desenvolvimento Web",
    status: 1,
    resumo: "Problema para acessar a prova final",
    criadoEm: "2026-11-10T10:00:00Z",
    atualizadoEm: "2026-11-10T10:00:00Z",
    resolvidoEm: null,
    mensagens: [
      { id: 1, autorId: ALUNO_ID, autorNome: "Aluno Teste", texto: "Nao consigo acessar a prova.", criadoEm: "2026-11-10T10:00:00Z" }
    ],
    ...sobrescritas
  };
}

describe("AbaMeusChamados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("lista vazia mostra a mensagem de 'ainda nao abriu nenhum chamado'", async () => {
    listarMeusChamados.mockResolvedValue([]);

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={null} />);

    await waitFor(() => expect(screen.getByText(/ainda não abriu nenhum chamado/)).toBeInTheDocument());
  });

  test("mostra a lista com assunto, curso e status, e abre o detalhe ao clicar", async () => {
    listarMeusChamados.mockResolvedValue([chamadoBase()]);

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={null} />);

    const item = await screen.findByText("Problema para acessar a prova final");
    expect(screen.getByText("Desenvolvimento Web")).toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();

    await userEvent.setup().click(item);

    expect(screen.getByText("Nao consigo acessar a prova.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Meus chamados" })).toBeInTheDocument();
  });

  test("chamadoInicialId abre o detalhe direto, sem precisar clicar", async () => {
    listarMeusChamados.mockResolvedValue([chamadoBase()]);

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={1} />);

    await waitFor(() => expect(screen.getByText("Nao consigo acessar a prova.")).toBeInTheDocument());
  });

  test("responder envia a mensagem e atualiza a conversa", async () => {
    listarMeusChamados.mockResolvedValue([chamadoBase()]);
    responderChamado.mockResolvedValue(
      chamadoBase({
        status: 2,
        mensagens: [
          ...chamadoBase().mensagens,
          { id: 2, autorId: ALUNO_ID, autorNome: "Aluno Teste", texto: "Complementando a dúvida.", criadoEm: "2026-11-10T11:00:00Z" }
        ]
      })
    );

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={1} />);
    await screen.findByText("Nao consigo acessar a prova.");

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Responder ao chamado"), "Complementando a dúvida.");
    await usuario.click(screen.getByRole("button", { name: "Enviar resposta" }));

    await waitFor(() => expect(responderChamado).toHaveBeenCalledWith(1, "Complementando a dúvida."));
    expect(await screen.findByText("Complementando a dúvida.")).toBeInTheDocument();
  });

  test("resolvido ha menos de 7 dias mostra o botao Reabrir, nao o campo de resposta", async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    listarMeusChamados.mockResolvedValue([chamadoBase({ status: 3, resolvidoEm: ontem })]);

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={1} />);
    await screen.findByText("Nao consigo acessar a prova.");

    expect(screen.getByRole("button", { name: /Reabrir/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Responder ao chamado")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: /Reabrir/ }));
    await waitFor(() => expect(reabrirChamado).toHaveBeenCalledWith(1));
  });

  test("resolvido ha mais de 7 dias nao mostra Reabrir nem o campo de resposta", async () => {
    const dezDiasAtras = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    listarMeusChamados.mockResolvedValue([chamadoBase({ status: 3, resolvidoEm: dezDiasAtras })]);

    render(<AbaMeusChamados usuarioId={ALUNO_ID} chamadoInicialId={1} />);
    await screen.findByText("Nao consigo acessar a prova.");

    expect(screen.queryByRole("button", { name: /Reabrir/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Responder ao chamado")).not.toBeInTheDocument();
    expect(screen.getByText(/resolvido há mais de 7 dias/i)).toBeInTheDocument();
  });
});
