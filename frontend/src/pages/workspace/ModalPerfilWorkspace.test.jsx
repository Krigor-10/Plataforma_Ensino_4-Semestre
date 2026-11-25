import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ModalPerfilWorkspace } from "./ModalPerfilWorkspace.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";
import { atualizarConfiguracaoChatbot, obterConfiguracaoChatbot, obterUsoChatbot } from "../../lib/chatbotApi.js";

// docs/chatbot/PROMPT-agente-assistente-config-no-perfil.md - estes testes
// cobrem a secao "Testes (Vitest)" do prompt, parte "ModalPerfilWorkspace".
vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

vi.mock("../../lib/chatbotApi.js", () => ({
  obterConfiguracaoChatbot: vi.fn(),
  atualizarConfiguracaoChatbot: vi.fn(),
  obterUsoChatbot: vi.fn()
}));

function renderModal(sobrescritas = {}) {
  return render(
    <ToastProvider>
      <ModalPerfilWorkspace
        itensCursos={[]}
        fatos={[]}
        destaques={[]}
        ehAluno={false}
        abaInicial="configuracoes"
        aoFechar={vi.fn()}
        perfil="Admin"
        nomeUsuario="Admin Teste"
        usuario={{ id: 1, nome: "Admin Teste" }}
        onSessionExpired={vi.fn()}
        onUsuarioAtualizado={vi.fn()}
        {...sobrescritas}
      />
    </ToastProvider>
  );
}

describe("ModalPerfilWorkspace - Configuracoes do Assistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({});
    obterConfiguracaoChatbot.mockResolvedValue({ ativo: true, tetoMensalUsd: 20 });
    obterUsoChatbot.mockResolvedValue({ gastoMesUsd: 4.2, tetoMensalUsd: 20, quantidadePerguntasMes: 128 });
  });

  test("Admin ve 'Assistente CodeRyse', o switch, o teto, 'Salvar teto', o gasto e as perguntas", async () => {
    renderModal({ perfil: "Admin" });

    expect(await screen.findByText("Assistente CodeRyse")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Desligar assistente" })).toBeInTheDocument();
    expect(screen.getByLabelText("Teto mensal (US$)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar teto/ })).toBeInTheDocument();
    expect(screen.getByText(/Gasto do mês/)).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  test.each(["Professor", "Coordenador", "Aluno"])("%s nao ve 'Assistente CodeRyse' na aba Configuracoes", async (perfil) => {
    renderModal({ perfil, ehAluno: perfil === "Aluno" });

    await screen.findByRole("heading", { name: "Configuracoes" });
    expect(screen.queryByText("Assistente CodeRyse")).not.toBeInTheDocument();
    expect(obterConfiguracaoChatbot).not.toHaveBeenCalled();
  });

  test("'Salvar teto' chama atualizarConfiguracaoChatbot com o novo teto e mantem o ativo", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderModal();

    await screen.findByRole("switch", { name: "Desligar assistente" });
    const usuario = userEvent.setup();
    const campoTeto = screen.getByLabelText("Teto mensal (US$)");
    await usuario.clear(campoTeto);
    await usuario.type(campoTeto, "25");
    await usuario.click(screen.getByRole("button", { name: /Salvar teto/ }));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: true, tetoMensalUsd: 25 }));
  });

  test("o switch chama atualizarConfiguracaoChatbot com o ativo invertido", async () => {
    atualizarConfiguracaoChatbot.mockResolvedValue();
    renderModal();

    await userEvent.click(await screen.findByRole("switch", { name: "Desligar assistente" }));

    await waitFor(() => expect(atualizarConfiguracaoChatbot).toHaveBeenCalledWith({ ativo: false, tetoMensalUsd: 20 }));
  });

  // "Salvar" do rodape (form="form-perfil-senha") nunca deve acionar nada do
  // Assistente - os dois formularios vivem na mesma aba, mas sao
  // independentes (o botao proprio "Salvar teto" e que cuida do assistente).
  test("'Salvar' do rodape continua so enviando o formulario de senha", async () => {
    renderModal();

    await screen.findByRole("switch", { name: "Desligar assistente" });
    await userEvent.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(await screen.findByText("A nova senha precisa ter pelo menos 6 caracteres.")).toBeInTheDocument();
    expect(atualizarConfiguracaoChatbot).not.toHaveBeenCalled();
  });
});
