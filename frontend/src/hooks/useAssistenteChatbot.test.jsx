import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AssistenteChatbotProvider, useAssistenteChatbot } from "./useAssistenteChatbot.jsx";
import { ToastProvider } from "./useToast.jsx";
import { enviarMensagemChatbotStream, obterConversaAtualChatbot } from "../lib/chatbotApi.js";

vi.mock("../lib/chatbotApi.js", () => ({
  obterConversaAtualChatbot: vi.fn(),
  enviarMensagemChatbotStream: vi.fn(),
  enviarFeedbackMensagemChatbot: vi.fn()
}));

function ConsumidorComPergunta({ pergunta }) {
  const { perguntarAoAssistente } = useAssistenteChatbot();
  return (
    <button type="button" onClick={() => perguntarAoAssistente(pergunta)}>
      Perguntar
    </button>
  );
}

describe("AssistenteChatbotProvider / useAssistenteChatbot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterConversaAtualChatbot.mockResolvedValue(null);
  });

  test("useAssistenteChatbot fora do provider lanca erro", () => {
    const ConsumidorSemProvider = () => {
      useAssistenteChatbot();
      return null;
    };

    expect(() => render(<ConsumidorSemProvider />)).toThrow(
      "useAssistenteChatbot precisa ser usado dentro de um AssistenteChatbotProvider"
    );
  });

  test("ativo=false: nao renderiza botao/painel, mas chamar perguntarAoAssistente nao quebra", async () => {
    render(
      <AssistenteChatbotProvider ativo={false} contexto={null} onNavigate={vi.fn()}>
        <ConsumidorComPergunta pergunta="Oi" />
      </AssistenteChatbotProvider>
    );

    expect(screen.queryByRole("button", { name: /Abrir Assistente CodeRyse/ })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Perguntar" }));

    expect(screen.queryByRole("dialog", { name: "Assistente CodeRyse" })).not.toBeInTheDocument();
  });

  test("um atalho em qualquer tela (via hook) abre o painel e ja envia a pergunta", async () => {
    enviarMensagemChatbotStream.mockImplementation(async (_payload, callbacks) => {
      callbacks.onTexto?.("Resposta do assistente.");
      callbacks.onFim?.({ conversaId: 1, mensagemId: 1 });
    });

    render(
      <ToastProvider>
        <AssistenteChatbotProvider
          ativo
          contexto={{ tela: "avaliacoes", cursoId: 10, cursoTitulo: null }}
          onNavigate={vi.fn()}
        >
          <ConsumidorComPergunta pergunta="Por que não consigo fazer a Prova final?" />
        </AssistenteChatbotProvider>
      </ToastProvider>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Perguntar" }));

    expect(await screen.findByRole("dialog", { name: "Assistente CodeRyse" })).toBeInTheDocument();
    expect(screen.getByText("Por que não consigo fazer a Prova final?")).toBeInTheDocument();

    await waitFor(() =>
      expect(enviarMensagemChatbotStream).toHaveBeenCalledWith(
        { texto: "Por que não consigo fazer a Prova final?", conversaId: null, contexto: { tela: "avaliacoes", cursoId: 10, cursoTitulo: null } },
        expect.anything()
      )
    );
    await waitFor(() => expect(screen.getByText("Resposta do assistente.")).toBeInTheDocument());
  });
});
