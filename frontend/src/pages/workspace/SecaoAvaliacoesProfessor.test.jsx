import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoAvaliacoesProfessor } from "./SecaoAvaliacoesProfessor.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const CURSO_ID = 10;
const AVALIACAO_ID = 300;
const STATUS_PUBLICADO = 2;
const STATUS_ARQUIVADO = 3;

function avaliacaoProva(extras = {}) {
  return {
    id: AVALIACAO_ID,
    cursoId: CURSO_ID,
    moduloId: 100,
    moduloTitulo: "Módulo 1",
    conteudoDidaticoId: null,
    tipoAvaliacao: 2,
    titulo: "Prova final",
    descricao: "",
    statusPublicacao: STATUS_PUBLICADO,
    tentativasPermitidas: 2,
    tempoLimiteMinutos: 60,
    notaMaxima: 10,
    pesoNota: 1,
    pesoProgresso: 1,
    totalQuestoes: 4,
    ...extras
  };
}

function renderizarTela({ avaliacao = avaliacaoProva(), onRefresh = vi.fn() } = {}) {
  render(
    <ToastProvider>
      <SecaoAvaliacoesProfessor
        avaliacoes={[avaliacao]}
        cursoIdSelecionado={CURSO_ID}
        cursos={[{ id: CURSO_ID, titulo: "Curso Teste", modeloCurso: 2 }]}
        modulos={[{ id: 100, cursoId: CURSO_ID, titulo: "Módulo 1" }]}
        onNavigate={vi.fn()}
        onRefresh={onRefresh}
        onSessionExpired={vi.fn()}
      />
    </ToastProvider>
  );
  return { onRefresh };
}

async function abrirAjustesRapidos(usuario) {
  await usuario.click(screen.getByRole("button", { name: "Opcoes para Prova final" }));
  await usuario.click(screen.getByRole("button", { name: "Ajustes rapidos" }));
  return screen.getByRole("dialog", { name: "Ajustes rápidos da avaliação" });
}

function chamadasPut() {
  return apiRequest.mock.calls.filter(([, opcoes]) => opcoes?.method === "PUT");
}

// docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md, itens 6 e 7
// (decisoes E1/E2): o modal so grava no "Salvar"; Fechar/X nunca salvam.
describe("SecaoAvaliacoesProfessor - modal Ajustes rápidos", () => {
  beforeEach(() => {
    apiRequest.mockImplementation((url) => Promise.resolve(url === "/Cursos/desempenho" ? [] : {}));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("editar o título e clicar em Fechar não salva e pergunta se quer descartar", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    const titulo = screen.getByLabelText("Título");
    await usuario.clear(titulo);
    await usuario.type(titulo, "Prova final v2");
    expect(titulo).toHaveClass("campo__entrada--pendente");

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(chamadasPut()).toHaveLength(0);
    expect(screen.getByText("Descartar as alterações não salvas?")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Descartar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(chamadasPut()).toHaveLength(0);
  });

  test("o X do modal também não salva, e 'Continuar editando' mantém o que foi digitado", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    const tentativas = screen.getByLabelText("Tentativas permitidas");
    await usuario.clear(tentativas);
    await usuario.type(tentativas, "3");

    await usuario.click(screen.getByRole("button", { name: "Fechar modal" }));

    expect(chamadasPut()).toHaveLength(0);
    await usuario.click(screen.getByRole("button", { name: "Continuar editando" }));

    expect(screen.getByLabelText("Tentativas permitidas")).toHaveValue(3);
    expect(chamadasPut()).toHaveLength(0);
  });

  test("sem alteração, Fechar fecha direto e Salvar fica desabilitado", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("Salvar grava todos os campos num PUT só, mantendo o vínculo e o status", async () => {
    const usuario = userEvent.setup();
    const { onRefresh } = renderizarTela({ avaliacao: avaliacaoProva({ conteudoDidaticoId: 77 }) });
    await abrirAjustesRapidos(usuario);

    await usuario.clear(screen.getByLabelText("Título"));
    await usuario.type(screen.getByLabelText("Título"), "Prova final v2");
    await usuario.clear(screen.getByLabelText("Tempo limite (min)"));

    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(chamadasPut()).toHaveLength(1));
    const [url, opcoes] = chamadasPut()[0];
    const corpo = JSON.parse(opcoes.body);
    expect(url).toBe(`/Avaliacoes/${AVALIACAO_ID}`);
    expect(corpo).toMatchObject({
      titulo: "Prova final v2",
      tentativasPermitidas: 2,
      tempoLimiteMinutos: null,
      notaMaxima: 10,
      statusPublicacao: STATUS_PUBLICADO,
      conteudoDidaticoId: 77
    });
    expect(await screen.findByText("Avaliação atualizada.")).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  test("valor inválido mostra a mensagem e não envia nada", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    await usuario.clear(screen.getByLabelText("Tentativas permitidas"));
    await usuario.type(screen.getByLabelText("Tentativas permitidas"), "0");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText(/Tentativas permitidas: informe um número inteiro maior que zero/)).toBeInTheDocument();
    expect(chamadasPut()).toHaveLength(0);
  });

  test("erro do servidor aparece no modal, que continua aberto com o que foi digitado", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url, opcoes) => {
      if (opcoes?.method === "PUT") {
        return Promise.reject(new ApiError("Este curso foi encerrado e nao aceita mais alteracoes.", 422));
      }
      return Promise.resolve(url === "/Cursos/desempenho" ? [] : {});
    });
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    await usuario.clear(screen.getByLabelText("Título"));
    await usuario.type(screen.getByLabelText("Título"), "Outro título");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Este curso foi encerrado e nao aceita mais alteracoes.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Ajustes rápidos da avaliação" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Outro título");
  });

  test("toggle arquiva na hora, com a mensagem certa", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    await usuario.click(screen.getByRole("switch", { name: "Publicado - clique para arquivar" }));

    await waitFor(() => expect(chamadasPut()).toHaveLength(1));
    expect(JSON.parse(chamadasPut()[0][1].body).statusPublicacao).toBe(STATUS_ARQUIVADO);
    expect(await screen.findByText("Avaliação arquivada.")).toBeInTheDocument();
  });

  test("toggle com erro volta ao estado anterior e mostra o motivo", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((url, opcoes) => {
      if (opcoes?.method === "PUT") {
        return Promise.reject(new ApiError("Adicione ao menos uma questao antes de publicar o quiz.", 422));
      }
      return Promise.resolve(url === "/Cursos/desempenho" ? [] : {});
    });
    renderizarTela({ avaliacao: avaliacaoProva({ statusPublicacao: STATUS_ARQUIVADO, totalQuestoes: 0 }) });
    await abrirAjustesRapidos(usuario);

    await usuario.click(screen.getByRole("switch", { name: "Arquivado - clique para publicar" }));

    expect(await screen.findByText("Adicione ao menos uma questao antes de publicar o quiz.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Arquivado - clique para publicar" })).toHaveAttribute("aria-checked", "false");
  });

  test("toggle fica travado durante o envio (sem clique duplo)", async () => {
    const usuario = userEvent.setup();
    let concluirPut;
    apiRequest.mockImplementation((url, opcoes) => {
      if (opcoes?.method === "PUT") {
        return new Promise((resolve) => {
          concluirPut = resolve;
        });
      }
      return Promise.resolve(url === "/Cursos/desempenho" ? [] : {});
    });
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    const interruptor = screen.getByRole("switch", { name: "Publicado - clique para arquivar" });
    await usuario.click(interruptor);

    expect(screen.getByRole("switch")).toBeDisabled();
    await usuario.click(screen.getByRole("switch"));
    expect(chamadasPut()).toHaveLength(1);

    concluirPut({});
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeDisabled());
  });

  test("toggle com alteração pendente pede para salvar ou descartar antes", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    await usuario.type(screen.getByLabelText("Título"), " v2");
    await usuario.click(screen.getByRole("switch", { name: "Publicado - clique para arquivar" }));

    expect(screen.getByText("Salve ou descarte as alterações antes de publicar ou arquivar.")).toBeInTheDocument();
    expect(chamadasPut()).toHaveLength(0);
  });

  test("Excluir abre a confirmação de exclusão sem salvar o que estava pendente", async () => {
    const usuario = userEvent.setup();
    renderizarTela();
    await abrirAjustesRapidos(usuario);

    await usuario.type(screen.getByLabelText("Título"), " v2");
    await usuario.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByRole("dialog", { name: "Excluir avaliacao" })).toBeInTheDocument();
    expect(chamadasPut()).toHaveLength(0);
  });
});
