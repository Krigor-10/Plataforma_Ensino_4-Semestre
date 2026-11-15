import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import FormularioChamado from "./FormularioChamado.jsx";
import { apiRequest } from "../../lib/api.js";
import { abrirChamado } from "../../lib/chamadosApi.js";

vi.mock("../../lib/chamadosApi.js", () => ({
  abrirChamado: vi.fn()
}));

vi.mock("../../lib/api.js", () => ({
  apiRequest: vi.fn()
}));

const CONTEXTO_SEM_CURSO = { tela: "dashboard", cursoId: null, cursoTitulo: null };

describe("FormularioChamado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("pre-preenche o texto com a ultima pergunta e nao mostra curso quando nao ha contexto", () => {
    render(
      <FormularioChamado
        contexto={CONTEXTO_SEM_CURSO}
        conversaId={7}
        textoInicial="Como faço pra tirar meu certificado?"
        onCancelar={vi.fn()}
        onCriado={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Descreva sua dúvida ou problema")).toHaveValue(
      "Como faço pra tirar meu certificado?"
    );
    expect(screen.queryByText("Curso:")).not.toBeInTheDocument();
  });

  test("com curso aberto no contexto, busca e mostra o titulo", async () => {
    apiRequest.mockResolvedValue({ id: 10, titulo: "Desenvolvimento Web" });

    render(
      <FormularioChamado
        contexto={{ tela: "conteudos", cursoId: 10, cursoTitulo: null }}
        conversaId={null}
        textoInicial=""
        onCancelar={vi.fn()}
        onCriado={vi.fn()}
      />
    );

    expect(apiRequest).toHaveBeenCalledWith("/Cursos/10");
    await waitFor(() => expect(screen.getByText("Desenvolvimento Web")).toBeInTheDocument());
  });

  test("enviar chama abrirChamado com texto/curso/conversa e devolve o chamado criado", async () => {
    abrirChamado.mockResolvedValue({ id: 99, resumo: "Problema com pagamento" });
    const onCriado = vi.fn();

    render(
      <FormularioChamado
        contexto={CONTEXTO_SEM_CURSO}
        conversaId={7}
        textoInicial="Minha compra nao foi aprovada"
        onCancelar={vi.fn()}
        onCriado={onCriado}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir chamado" }));

    await waitFor(() =>
      expect(abrirChamado).toHaveBeenCalledWith({
        texto: "Minha compra nao foi aprovada",
        cursoId: null,
        conversaId: 7
      })
    );
    expect(onCriado).toHaveBeenCalledWith({ id: 99, resumo: "Problema com pagamento" });
  });

  test("falha ao abrir mostra mensagem de erro e mantem o formulario", async () => {
    abrirChamado.mockRejectedValue(new Error("falhou"));

    render(
      <FormularioChamado
        contexto={CONTEXTO_SEM_CURSO}
        conversaId={null}
        textoInicial="Duvida qualquer"
        onCancelar={vi.fn()}
        onCriado={vi.fn()}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir chamado" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Nao foi possivel abrir o chamado/);
  });

  test("Voltar chama onCancelar", async () => {
    const onCancelar = vi.fn();

    render(
      <FormularioChamado
        contexto={CONTEXTO_SEM_CURSO}
        conversaId={null}
        textoInicial=""
        onCancelar={onCancelar}
        onCriado={vi.fn()}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Voltar" }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
