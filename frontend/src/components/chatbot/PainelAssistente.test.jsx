import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import PainelAssistente from "./PainelAssistente.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { enviarFeedbackMensagemChatbot, enviarMensagemChatbotStream, obterConversaAtualChatbot } from "../../lib/chatbotApi.js";
import { abrirChamado, listarMeusChamados } from "../../lib/chamadosApi.js";

vi.mock("../../lib/chatbotApi.js", () => ({
  obterConversaAtualChatbot: vi.fn(),
  enviarMensagemChatbotStream: vi.fn(),
  enviarFeedbackMensagemChatbot: vi.fn()
}));

vi.mock("../../lib/chamadosApi.js", () => ({
  abrirChamado: vi.fn(),
  listarMeusChamados: vi.fn(),
  obterChamado: vi.fn(),
  responderChamado: vi.fn(),
  reabrirChamado: vi.fn()
}));

const CONTEXTO_PADRAO = { tela: "dashboard", cursoId: null, cursoTitulo: null };

function renderPainel(props = {}) {
  const onFechar = vi.fn();
  const onNavigate = vi.fn();
  const resultado = render(
    <ToastProvider>
      <PainelAssistente aberto contexto={CONTEXTO_PADRAO} onFechar={onFechar} onNavigate={onNavigate} {...props} />
    </ToastProvider>
  );
  return { ...resultado, onFechar, onNavigate };
}

describe("PainelAssistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterConversaAtualChatbot.mockResolvedValue(null);
    listarMeusChamados.mockResolvedValue([]);
  });

  test("nao renderiza nada quando aberto=false", () => {
    render(
      <ToastProvider>
        <PainelAssistente aberto={false} contexto={CONTEXTO_PADRAO} onFechar={vi.fn()} onNavigate={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.queryByRole("dialog", { name: "Assistente CodeRyse" })).not.toBeInTheDocument();
  });

  test("sem conversa existente, mostra a mensagem de boas-vindas e o aviso de retencao de 90 dias", async () => {
    renderPainel();

    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    expect(screen.getByText(/Oi! Eu sou o Assistente CodeRyse/)).toBeInTheDocument();
    expect(screen.getByText(/registradas por 90 dias/)).toBeInTheDocument();
  });

  test("com conversa existente, carrega e mostra o historico de mensagens", async () => {
    obterConversaAtualChatbot.mockResolvedValue({
      id: 7,
      mensagens: [
        { id: 1, papel: 1, texto: "Como faço pra tirar meu certificado?", acoes: [], util: null },
        { id: 2, papel: 2, texto: "Você precisa concluir o curso.", acoes: [], util: null }
      ]
    });

    renderPainel();

    await waitFor(() => expect(screen.getByText("Como faço pra tirar meu certificado?")).toBeInTheDocument());
    expect(screen.getByText("Você precisa concluir o curso.")).toBeInTheDocument();
    expect(screen.queryByText(/Oi! Eu sou o Assistente CodeRyse/)).not.toBeInTheDocument();
  });

  test("enviar uma pergunta mostra a bolha do usuario, o texto chegando aos poucos e os botoes de acao", async () => {
    enviarMensagemChatbotStream.mockImplementation(async (_payload, callbacks) => {
      callbacks.onTexto?.("Você precisa ");
      callbacks.onTexto?.("concluir o curso.");
      callbacks.onAcoes?.([{ rota: "certificados", rotulo: "Ir para Certificados" }]);
      callbacks.onFim?.({ conversaId: 9, mensagemId: 99 });
    });

    const { onNavigate } = renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Pergunta para o Assistente CodeRyse"), "Como tiro meu certificado?");
    await usuario.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    expect(screen.getByText("Como tiro meu certificado?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Você precisa concluir o curso.")).toBeInTheDocument());

    expect(enviarMensagemChatbotStream).toHaveBeenCalledWith(
      { texto: "Como tiro meu certificado?", conversaId: null, contexto: CONTEXTO_PADRAO },
      expect.anything()
    );

    const botaoAcao = screen.getByRole("button", { name: "Ir para Certificados" });
    await usuario.click(botaoAcao);
    expect(onNavigate).toHaveBeenCalledWith("/app/certificados");
  });

  test("👍/👎 so aparecem depois da resposta finalizar (id numerico) e chamam o feedback", async () => {
    enviarMensagemChatbotStream.mockImplementation(async (_payload, callbacks) => {
      callbacks.onTexto?.("Resposta.");
      callbacks.onFim?.({ conversaId: 1, mensagemId: 55 });
    });

    renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Pergunta para o Assistente CodeRyse"), "Pergunta");
    await usuario.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    const botaoUtil = await screen.findByRole("button", { name: "Resposta util" });
    await usuario.click(botaoUtil);

    expect(enviarFeedbackMensagemChatbot).toHaveBeenCalledWith(55, true);
  });

  test("erro de rede mostra 'Tentar de novo', que reenvia a mesma pergunta", async () => {
    enviarMensagemChatbotStream
      .mockImplementationOnce(async (_payload, callbacks) => {
        callbacks.onErro?.({ codigo: "rede", mensagem: "Nao foi possivel falar com o assistente agora." });
      })
      .mockImplementationOnce(async (_payload, callbacks) => {
        callbacks.onTexto?.("Agora funcionou.");
        callbacks.onFim?.({ conversaId: 1, mensagemId: 1 });
      });

    renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Pergunta para o Assistente CodeRyse"), "Pergunta");
    await usuario.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    const botaoTentarDeNovo = await screen.findByRole("button", { name: "Tentar de novo" });
    await usuario.click(botaoTentarDeNovo);

    await waitFor(() => expect(screen.getByText("Agora funcionou.")).toBeInTheDocument());
    expect(enviarMensagemChatbotStream).toHaveBeenCalledTimes(2);
  });

  test("teto de gasto atingido mostra mensagem amigavel, sem botao de tentar de novo", async () => {
    enviarMensagemChatbotStream.mockImplementation(async (_payload, callbacks) => {
      callbacks.onErro?.({ codigo: "teto_atingido", mensagem: "O Assistente CodeRyse atingiu o limite de uso deste mes." });
    });

    renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Pergunta para o Assistente CodeRyse"), "Pergunta");
    await usuario.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    await waitFor(() => expect(screen.getByText(/atingiu o limite de uso deste mes/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  test("tecla Escape fecha o painel", async () => {
    const { onFechar } = renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    await userEvent.setup().keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalled();
  });

  test("aba 'Meus chamados' troca a view, saindo da Conversa", async () => {
    renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    await userEvent.setup().click(screen.getByRole("tab", { name: "Meus chamados" }));

    expect(await screen.findByText(/ainda não abriu nenhum chamado/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Pergunta para o Assistente CodeRyse")).not.toBeInTheDocument();
  });

  test("'Falar com o suporte' abre o formulario pre-preenchido com a ultima pergunta", async () => {
    enviarMensagemChatbotStream.mockImplementation(async (_payload, callbacks) => {
      callbacks.onTexto?.("Resposta.");
      callbacks.onFim?.({ conversaId: 1, mensagemId: 1 });
    });

    renderPainel();
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Pergunta para o Assistente CodeRyse"), "Como tiro meu certificado?");
    await usuario.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    await waitFor(() => expect(screen.getByText("Resposta.")).toBeInTheDocument());

    await usuario.click(screen.getByRole("button", { name: "Falar com o suporte" }));

    expect(screen.getByLabelText("Descreva sua dúvida ou problema")).toHaveValue("Como tiro meu certificado?");
  });

  test("criar um chamado troca pra 'Meus chamados' e mostra o toast de confirmacao", async () => {
    abrirChamado.mockResolvedValue({ id: 5, resumo: "Duvida qualquer" });
    listarMeusChamados.mockResolvedValue([
      {
        id: 5,
        cursoId: null,
        cursoTitulo: null,
        status: 1,
        resumo: "Duvida qualquer",
        atualizadoEm: "2026-11-15T10:00:00Z",
        resolvidoEm: null,
        mensagens: [{ id: 1, autorId: 1, autorNome: "Aluno", texto: "Preciso de ajuda com uma duvida.", criadoEm: "2026-11-15T10:00:00Z" }]
      }
    ]);

    renderPainel({ usuarioId: 1 });
    await waitFor(() => expect(screen.queryByText(/Carregando conversa/)).not.toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole("button", { name: "Falar com o suporte" }));
    await usuario.type(screen.getByLabelText("Descreva sua dúvida ou problema"), "Duvida qualquer");
    await usuario.click(screen.getByRole("button", { name: "Abrir chamado" }));

    expect(await screen.findByText("Chamado aberto. A equipe responde em até 2 dias úteis, pelo sino de notificações.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Meus chamados", selected: true })).toBeInTheDocument();
    expect(await screen.findByText("Preciso de ajuda com uma duvida.")).toBeInTheDocument();
  });

  test("chamadoInicialId abre o painel ja na aba Meus chamados", async () => {
    listarMeusChamados.mockResolvedValue([
      {
        id: 8,
        cursoId: null,
        cursoTitulo: null,
        status: 1,
        resumo: "Chamado vindo de notificacao",
        atualizadoEm: "2026-11-15T10:00:00Z",
        resolvidoEm: null,
        mensagens: [{ id: 1, autorId: 1, autorNome: "Aluno", texto: "Texto original", criadoEm: "2026-11-15T10:00:00Z" }]
      }
    ]);

    renderPainel({ usuarioId: 1, chamadoInicialId: 8 });

    expect(await screen.findByText("Texto original")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Meus chamados", selected: true })).toBeInTheDocument();
  });
});
