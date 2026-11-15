import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import AtalhoAssistente from "./AtalhoAssistente.jsx";
import { AssistenteChatbotProvider } from "../../hooks/useAssistenteChatbot.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { obterConversaAtualChatbot } from "../../lib/chatbotApi.js";

vi.mock("../../lib/chatbotApi.js", () => ({
  obterConversaAtualChatbot: vi.fn(),
  enviarMensagemChatbotStream: vi.fn(),
  enviarFeedbackMensagemChatbot: vi.fn()
}));

describe("AtalhoAssistente", () => {
  test("clicar abre o Assistente CodeRyse com a pergunta ja enviada", async () => {
    obterConversaAtualChatbot.mockResolvedValue(null);

    render(
      <ToastProvider>
        <AssistenteChatbotProvider ativo contexto={{ tela: "certificados", cursoId: null, cursoTitulo: null }} onNavigate={vi.fn()}>
          <AtalhoAssistente pergunta="O que falta para eu tirar o certificado de Curso X?" />
        </AssistenteChatbotProvider>
      </ToastProvider>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: /Por quê\? Pergunte ao assistente/ }));

    expect(await screen.findByRole("dialog", { name: "Assistente CodeRyse" })).toBeInTheDocument();
    expect(screen.getByText("O que falta para eu tirar o certificado de Curso X?")).toBeInTheDocument();
  });
});
