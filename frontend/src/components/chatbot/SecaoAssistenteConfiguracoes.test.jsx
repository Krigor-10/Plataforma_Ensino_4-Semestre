import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SecaoAssistenteConfiguracoes from "./SecaoAssistenteConfiguracoes.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { ApiError } from "../../lib/api.js";
import { atualizarConfiguracaoChatbot, obterConfiguracaoChatbot, obterUsoChatbot } from "../../lib/chatbotApi.js";

// Migrado de CartaoAssistenteAdmin.test.jsx (docs/chatbot/PROMPT-agente-
// assistente-config-no-perfil.md) - mesmo comportamento, agora dentro de
// Meu perfil > Configuracoes em vez do topo de Chamados.
vi.mock("../../lib/chatbotApi.js", () => ({
  obterConfiguracaoChatbot: vi.fn(),
  atualizarConfiguracaoChatbot: vi.fn(),
  obterUsoChatbot: vi.fn()
}));

function renderSecao(props = {}) {
  return render(
    <ToastProvider>
      <SecaoAssistenteConfiguracoes {...props} />
    </ToastProvider>
  );
}

describe("SecaoAssistenteConfiguracoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterConfiguracaoChatbot.mockResolvedValue({ ativo: true, tetoMensalUsd: 20 });
    obterUsoChatbot.mockResolvedValue({ gastoMesUsd: 4.2, tetoMensalUsd: 20, quantidadePerguntasMes: 128 });
  });

  test("carrega e mostra estado ligado, teto e uso do mes", async () => {
    renderSecao();

    expect(await screen.findByRole("switch", { name: "Desligar assistente" })).toBeInTheDocument();
    expect(screen.getByLabelText("Teto mensal (US$)")).toHaveValue(20);
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText(/\$4\.20 de \$20\.00/)).toBeInTheDocument();
  });

  test("mostra a barra de uso com o percentual do teto", async () => {
    renderSecao();

    const barra = await screen.findByRole("progressbar");
    // 4.2 / 20 = 21%
    expect(barra).toHaveAttribute("aria-valuenow", "21");
  });

  test("desligar chama atualizarConfiguracao com ativo=false e mostra toast", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderSecao();

    await userEvent.click(await screen.findByRole("switch", { name: "Desligar assistente" }));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: false, tetoMensalUsd: 20 }));
    expect(await screen.findByText("Assistente desligado.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Ligar assistente" })).toBeInTheDocument();
  });

  test("salvar novo teto mensal chama atualizarConfiguracao com o valor digitado", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderSecao();

    await screen.findByRole("switch", { name: "Desligar assistente" });
    const usuario = userEvent.setup();
    const campoTeto = screen.getByLabelText("Teto mensal (US$)");
    await usuario.clear(campoTeto);
    await usuario.type(campoTeto, "35");
    await usuario.click(screen.getByRole("button", { name: /Salvar teto/ }));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: true, tetoMensalUsd: 35 }));
    expect(await screen.findByText("Teto mensal atualizado.")).toBeInTheDocument();
  });

  test("teto invalido (zero) nao chama a API e avisa por toast", async () => {
    renderSecao();

    await screen.findByRole("switch", { name: "Desligar assistente" });
    const usuario = userEvent.setup();
    const campoTeto = screen.getByLabelText("Teto mensal (US$)");
    await usuario.clear(campoTeto);
    await usuario.click(screen.getByRole("button", { name: /Salvar teto/ }));

    expect(await screen.findByText("Informe um teto mensal maior que zero.")).toBeInTheDocument();
    expect(atualizarConfiguracaoChatbot).not.toHaveBeenCalled();
  });

  test("401 ao carregar chama onSessionExpired", async () => {
    obterConfiguracaoChatbot.mockRejectedValue(new ApiError("sessao expirada", 401));
    const onSessionExpired = vi.fn();

    renderSecao({ onSessionExpired });

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
});
