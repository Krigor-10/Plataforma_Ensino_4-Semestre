import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CartaoAssistenteAdmin from "./CartaoAssistenteAdmin.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { ApiError } from "../../lib/api.js";
import { atualizarConfiguracaoChatbot, obterConfiguracaoChatbot, obterUsoChatbot } from "../../lib/chatbotApi.js";

vi.mock("../../lib/chatbotApi.js", () => ({
  obterConfiguracaoChatbot: vi.fn(),
  atualizarConfiguracaoChatbot: vi.fn(),
  obterUsoChatbot: vi.fn()
}));

function renderCartao(props = {}) {
  return render(
    <ToastProvider>
      <CartaoAssistenteAdmin {...props} />
    </ToastProvider>
  );
}

describe("CartaoAssistenteAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterConfiguracaoChatbot.mockResolvedValue({ ativo: true, tetoMensalUsd: 20 });
    obterUsoChatbot.mockResolvedValue({ gastoMesUsd: 4.2, tetoMensalUsd: 20, quantidadePerguntasMes: 128 });
  });

  test("carrega e mostra estado ligado, teto e uso do mes", async () => {
    renderCartao();

    expect(await screen.findByText("Ligado")).toBeInTheDocument();
    expect(screen.getByLabelText("Teto mensal (US$)")).toHaveValue(20);
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText(/\$4\.20 de \$20\.00/)).toBeInTheDocument();
  });

  test("desligar chama atualizarConfiguracao com ativo=false e mostra toast", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderCartao();

    await screen.findByText("Ligado");
    await userEvent.setup().click(screen.getByRole("checkbox"));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: false, tetoMensalUsd: 20 }));
    expect(await screen.findByText("Assistente desligado.")).toBeInTheDocument();
    expect(screen.getByText("Desligado")).toBeInTheDocument();
  });

  test("salvar novo teto mensal chama atualizarConfiguracao com o valor digitado", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderCartao();

    await screen.findByText("Ligado");
    const usuario = userEvent.setup();
    const campoTeto = screen.getByLabelText("Teto mensal (US$)");
    await usuario.clear(campoTeto);
    await usuario.type(campoTeto, "35");
    await usuario.click(screen.getByRole("button", { name: /Salvar/ }));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: true, tetoMensalUsd: 35 }));
    expect(await screen.findByText("Teto mensal atualizado.")).toBeInTheDocument();
  });

  test("teto invalido (zero) nao chama a API e avisa por toast", async () => {
    renderCartao();

    await screen.findByText("Ligado");
    const usuario = userEvent.setup();
    const campoTeto = screen.getByLabelText("Teto mensal (US$)");
    await usuario.clear(campoTeto);
    await usuario.click(screen.getByRole("button", { name: /Salvar/ }));

    expect(await screen.findByText("Informe um teto mensal maior que zero.")).toBeInTheDocument();
    expect(atualizarConfiguracaoChatbot).not.toHaveBeenCalled();
  });

  test("401 ao carregar chama onSessionExpired", async () => {
    obterConfiguracaoChatbot.mockRejectedValue(new ApiError("sessao expirada", 401));
    const onSessionExpired = vi.fn();

    renderCartao({ onSessionExpired });

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
});
