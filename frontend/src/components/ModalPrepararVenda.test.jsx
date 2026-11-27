import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ModalPrepararVenda from "./ModalPrepararVenda.jsx";
import { apiRequest } from "../lib/api.js";

vi.mock("../lib/api.js", async () => {
  const real = await vi.importActual("../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const ACOMPANHADO_ENCERRADO = {
  id: 7,
  titulo: "Redes e Infraestrutura",
  descricao: "Curso de redes",
  modeloCurso: 3,
  preco: 59.9,
  encerradoEm: "2026-11-20T12:00:00"
};

function renderizar(curso) {
  const onSalvo = vi.fn();
  const onFechar = vi.fn();
  render(<ModalPrepararVenda curso={curso} onFechar={onFechar} onSalvo={onSalvo} />);
  return { onSalvo, onFechar };
}

function corpoDoPacote() {
  const chamada = apiRequest.mock.calls.find(([rota]) => rota.endsWith("/pacote"));
  return JSON.parse(chamada[1].body);
}

// Pacote 8 da auditoria de 26/11 (D1, D4): conversao Acompanhado/Gratuito.
describe("ModalPrepararVenda - conversao", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({});
  });

  test("Acompanhado encerrado escolhe Pago: envia o destino e o preco", async () => {
    const { onSalvo } = renderizar(ACOMPANHADO_ENCERRADO);

    expect(screen.getByRole("radio", { name: "Pago" })).toBeChecked();
    expect(screen.getByText(/passa de Acompanhado para Pago/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salvar sem publicar/ }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(corpoDoPacote()).toMatchObject({ modeloDestino: 2, preco: 59.9 });
  });

  test("Acompanhado encerrado escolhe Gratuito: some o preco, envia 0 e publica no catalogo", async () => {
    const { onSalvo } = renderizar(ACOMPANHADO_ENCERRADO);

    fireEvent.click(screen.getByRole("radio", { name: "Gratuito" }));

    expect(screen.queryByLabelText(/Preco/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Publicar no catálogo/ }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(corpoDoPacote()).toMatchObject({ modeloDestino: 1, preco: 0 });
    expect(apiRequest).toHaveBeenCalledWith("/Cursos/7/venda/publicar", { method: "POST" });
  });

  test("Pago ja existente nao mostra a escolha de modalidade nem manda destino", async () => {
    const { onSalvo } = renderizar({ ...ACOMPANHADO_ENCERRADO, modeloCurso: 2, preco: 29.9 });

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Salvar sem publicar/ }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(corpoDoPacote()).not.toHaveProperty("modeloDestino");
  });

  test("conversao salva mas publicacao recusada: atualiza a tela e explica o que ficou salvo", async () => {
    apiRequest.mockImplementation((rota) =>
      rota.endsWith("/venda/publicar")
        ? Promise.reject(new Error("Publique pelo menos um conteudo antes de colocar o curso no catalogo."))
        : Promise.resolve({})
    );
    const onAtualizar = vi.fn();
    render(<ModalPrepararVenda curso={ACOMPANHADO_ENCERRADO} onAtualizar={onAtualizar} onFechar={vi.fn()} onSalvo={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Gratuito" }));
    fireEvent.click(screen.getByRole("button", { name: /Publicar no catálogo/ }));

    expect(await screen.findByText(/já foi salvo como Gratuito, mas ainda não foi publicado/)).toBeInTheDocument();
    expect(onAtualizar).toHaveBeenCalled();
    expect(screen.queryByText(/passa de Acompanhado/)).not.toBeInTheDocument();
  });

  test("mostra a recusa do servidor (questao dissertativa) e nao fecha", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Este curso tem questao dissertativa em avaliacao publicada."));
    const { onSalvo, onFechar } = renderizar(ACOMPANHADO_ENCERRADO);

    fireEvent.click(screen.getByRole("button", { name: /Salvar sem publicar/ }));

    expect(await screen.findByText(/questao dissertativa/)).toBeInTheDocument();
    expect(onSalvo).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
