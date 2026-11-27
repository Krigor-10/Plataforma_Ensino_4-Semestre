import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AssistenteQuizAvaliacao } from "./AssistenteQuizAvaliacao.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const CURSO_ID = 10;
const MODULO_ID = 100;

function quizExistente(extras = {}) {
  return {
    id: 300,
    cursoId: CURSO_ID,
    moduloId: MODULO_ID,
    conteudoDidaticoId: null,
    tipoAvaliacao: 1,
    titulo: "Quiz do modulo",
    descricao: "",
    statusPublicacao: 1,
    tentativasPermitidas: 3,
    tempoLimiteMinutos: null,
    notaMaxima: 10,
    pesoNota: 1,
    pesoProgresso: 1,
    ...extras
  };
}

function renderizarQuiz(avaliacaoParaEditar = quizExistente()) {
  render(
    <ToastProvider>
      <AssistenteQuizAvaliacao
        avaliacaoParaEditar={avaliacaoParaEditar}
        cursoAtivo={{ curso: { id: CURSO_ID, titulo: "Curso Teste" } }}
        modoExclusivoQuiz
        modulosDisponiveis={[{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1" }]}
        onFechar={vi.fn()}
        onRefresh={vi.fn()}
        onSessionExpired={vi.fn()}
      />
    </ToastProvider>
  );
}

function chamadasPut() {
  return apiRequest.mock.calls.filter(([, opcoes]) => opcoes?.method === "PUT");
}

// docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md, decisao E3: o
// professor escolhe de 1 a 10 tentativas no quiz, e editar nao zera mais.
describe("AssistenteQuizAvaliacao - tentativas do quiz", () => {
  beforeEach(() => {
    apiRequest.mockImplementation((url) => Promise.resolve(url.endsWith("/questoes") ? [] : {}));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("editar um quiz mostra as tentativas salvas e salva o mesmo valor", async () => {
    const usuario = userEvent.setup();
    renderizarQuiz();

    const campo = await screen.findByLabelText("Tentativas permitidas *");
    expect(campo).toHaveValue(3);

    await usuario.click(screen.getByRole("button", { name: /Salvar/ }));

    await waitFor(() => expect(chamadasPut()).toHaveLength(1));
    expect(JSON.parse(chamadasPut()[0][1].body).tentativasPermitidas).toBe(3);
  });

  test("mais de 10 tentativas mostra a mensagem e nao envia", async () => {
    const usuario = userEvent.setup();
    renderizarQuiz();

    const campo = await screen.findByLabelText("Tentativas permitidas *");
    await usuario.clear(campo);
    await usuario.type(campo, "11");
    await usuario.click(screen.getByRole("button", { name: /Salvar/ }));

    expect(await screen.findByText("O quiz pode ter de 1 a 10 tentativas.")).toBeInTheDocument();
    expect(chamadasPut()).toHaveLength(0);
  });
});
