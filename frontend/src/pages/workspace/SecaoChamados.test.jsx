import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoChamados } from "./SecaoChamados.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { ApiError } from "../../lib/api.js";
import { listarChamadosParaStaff, obterChamado, resolverChamado, responderChamado } from "../../lib/chamadosApi.js";

vi.mock("../../lib/chamadosApi.js", () => ({
  listarChamadosParaStaff: vi.fn(),
  obterChamado: vi.fn(),
  responderChamado: vi.fn(),
  resolverChamado: vi.fn()
}));

const ADMIN = { id: 1, nome: "Admin Teste", tipoUsuario: "Admin" };
const COORDENADOR = { id: 2, nome: "Coordenador Teste", tipoUsuario: "Coordenador" };

function chamadoBase(sobrescritas = {}) {
  return {
    id: 10,
    alunoId: 5,
    alunoNome: "Maria Aluna",
    cursoId: 3,
    cursoTitulo: "Desenvolvimento Web",
    coordenadorDestinoId: 2,
    status: 1,
    resumo: "Nao consigo acessar a prova final.",
    criadoEm: "2026-11-14T10:00:00Z",
    atualizadoEm: "2026-11-14T10:00:00Z",
    resolvidoEm: null,
    mensagens: [{ id: 1, autorId: 5, autorNome: "Maria Aluna", texto: "Nao consigo acessar a prova.", criadoEm: "2026-11-14T10:00:00Z" }],
    ...sobrescritas
  };
}

function renderSecao(props = {}) {
  return render(
    <ToastProvider>
      <SecaoChamados usuario={ADMIN} ehAdmin coordenadores={[{ id: 2, nome: "Coordenador Teste" }]} {...props} />
    </ToastProvider>
  );
}

describe("SecaoChamados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarChamadosParaStaff.mockResolvedValue([]);
  });

  // docs/chatbot/PROMPT-agente-assistente-config-no-perfil.md: a config do
  // assistente saiu de Chamados e foi pra Meu perfil > Configuracoes - aqui
  // so fica um atalho discreto que abre o modal la, pro Admin.
  test("nao mostra mais 'Teto mensal' nem 'Gasto do mes'; so o atalho discreto, so pro Admin", async () => {
    const onAbrirConfiguracaoAssistente = vi.fn();
    renderSecao({ onAbrirConfiguracaoAssistente });
    await waitFor(() => expect(listarChamadosParaStaff).toHaveBeenCalled());

    expect(screen.queryByText("Teto mensal (US$)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Gasto do mês/)).not.toBeInTheDocument();

    const atalho = screen.getByRole("button", { name: /Configurar assistente/ });
    await userEvent.setup().click(atalho);
    expect(onAbrirConfiguracaoAssistente).toHaveBeenCalled();

    render(
      <ToastProvider>
        <SecaoChamados usuario={COORDENADOR} ehAdmin={false} coordenadores={[]} />
      </ToastProvider>
    );
    await waitFor(() => expect(listarChamadosParaStaff).toHaveBeenCalledTimes(2));
    // Os dois renders ficam montados (mesmo padrao do teste de "cartao
    // Assistente" que isto substitui) - so o render do Admin acrescenta o
    // atalho, entao a contagem continua 1 em vez de virar 2.
    expect(screen.queryAllByRole("button", { name: /Configurar assistente/ })).toHaveLength(1);
  });

  test("carrega a aba Abertos por padrao e lista assunto/curso/aluno", async () => {
    listarChamadosParaStaff.mockResolvedValue([chamadoBase()]);

    renderSecao();

    expect(await screen.findByText("Nao consigo acessar a prova final.")).toBeInTheDocument();
    expect(screen.getByText("Maria Aluna")).toBeInTheDocument();
    expect(screen.getByText("Desenvolvimento Web")).toBeInTheDocument();
    expect(listarChamadosParaStaff).toHaveBeenCalledWith(1);
  });

  test("lista vazia mostra mensagem de 'nenhum chamado'", async () => {
    renderSecao();
    expect(await screen.findByText(/Nenhum chamado abertos/)).toBeInTheDocument();
  });

  test("clicar num chamado abre o detalhe com resumo, conversa e destino (Admin)", async () => {
    listarChamadosParaStaff.mockResolvedValue([chamadoBase()]);
    renderSecao();

    await userEvent.setup().click(await screen.findByText("Nao consigo acessar a prova final."));

    expect(screen.getByText("Resumo da conversa com o assistente")).toBeInTheDocument();
    expect(screen.getByText("Nao consigo acessar a prova.")).toBeInTheDocument();
    expect(screen.getByText(/Encaminhado para Coordenador Teste/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marcar como resolvido/ })).toBeInTheDocument();
  });

  test("Coordenador nao ve a linha de destino (so Admin)", async () => {
    listarChamadosParaStaff.mockResolvedValue([chamadoBase()]);
    render(
      <ToastProvider>
        <SecaoChamados usuario={COORDENADOR} ehAdmin={false} coordenadores={[]} />
      </ToastProvider>
    );

    await userEvent.setup().click(await screen.findByText("Nao consigo acessar a prova final."));
    expect(screen.queryByText(/Encaminhado/)).not.toBeInTheDocument();
  });

  test("responder envia a mensagem; se o status mudar, troca pra aba certa sozinho", async () => {
    listarChamadosParaStaff.mockResolvedValueOnce([chamadoBase()]).mockResolvedValueOnce([chamadoBase({ status: 2 })]);
    responderChamado.mockResolvedValue(chamadoBase({ status: 2 }));

    renderSecao();
    await userEvent.setup().click(await screen.findByText("Nao consigo acessar a prova final."));

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText("Responder ao chamado"), "Vou verificar isso.");
    await usuario.click(screen.getByRole("button", { name: "Responder" }));

    await waitFor(() => expect(responderChamado).toHaveBeenCalledWith(10, "Vou verificar isso."));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Respondidos", selected: true })).toBeInTheDocument());
  });

  test("marcar como resolvido chama resolverChamado e volta pra lista", async () => {
    listarChamadosParaStaff.mockResolvedValueOnce([chamadoBase()]).mockResolvedValueOnce([]);
    resolverChamado.mockResolvedValue();

    renderSecao();
    await userEvent.setup().click(await screen.findByText("Nao consigo acessar a prova final."));
    await userEvent.setup().click(screen.getByRole("button", { name: /Marcar como resolvido/ }));

    await waitFor(() => expect(resolverChamado).toHaveBeenCalledWith(10));
    expect(await screen.findByText("Chamado marcado como resolvido.")).toBeInTheDocument();
    expect(screen.queryByText("Resumo da conversa com o assistente")).not.toBeInTheDocument();
  });

  test("resolvido nao mostra o botao 'Marcar como resolvido'", async () => {
    listarChamadosParaStaff.mockResolvedValue([chamadoBase({ status: 3, resolvidoEm: "2026-11-14T12:00:00Z" })]);
    renderSecao();

    await userEvent.setup().click(await screen.findByText("Nao consigo acessar a prova final."));
    expect(screen.queryByRole("button", { name: /Marcar como resolvido/ })).not.toBeInTheDocument();
  });

  test("chamadoIdSelecionado (link de notificacao) busca o chamado e abre a aba certa", async () => {
    obterChamado.mockResolvedValue(chamadoBase({ status: 2 }));
    listarChamadosParaStaff.mockResolvedValue([chamadoBase({ status: 2 })]);

    renderSecao({ chamadoIdSelecionado: 10 });

    await waitFor(() => expect(obterChamado).toHaveBeenCalledWith(10));
    expect(await screen.findByText("Resumo da conversa com o assistente")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Respondidos", selected: true })).toBeInTheDocument();
  });

  test("erro 401 ao carregar chama onSessionExpired", async () => {
    listarChamadosParaStaff.mockRejectedValue(new ApiError("sessao expirada", 401));
    const onSessionExpired = vi.fn();

    renderSecao({ onSessionExpired });

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });
});
