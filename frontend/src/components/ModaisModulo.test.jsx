import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import ModaisModulo from "./ModaisModulo.jsx";

const MODULO = { id: 3, titulo: "Módulo 3", cursoId: 1 };

function renderModais(props = {}) {
  return render(
    <ModaisModulo
      cursosOrdenados={[]}
      dadosFormulario={{ cursoId: "1", titulo: "" }}
      formularioAberto={false}
      mensagemExclusao=""
      mensagemFormulario={{ tone: "", message: "" }}
      moduloEmEdicaoId={null}
      moduloParaExcluir={MODULO}
      onConfirmarExclusao={vi.fn()}
      onFecharExclusao={vi.fn()}
      onFecharFormulario={vi.fn()}
      onSalvarModulo={vi.fn()}
      salvando={false}
      setDadosFormulario={vi.fn()}
      {...props}
    />
  );
}

describe("ModaisModulo - janela Excluir módulo", () => {
  test("textos aparecem com acento", () => {
    renderModais();

    expect(screen.getByText("Excluir módulo")).toBeInTheDocument();
    expect(screen.getByText(/Deseja excluir o módulo/)).toBeInTheDocument();
    expect(screen.getByText(/Esta ação não pode ser desfeita\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar exclusão/ })).toBeInTheDocument();
  });

  test("sem bloqueio: Confirmar exclusão chama onConfirmarExclusao", async () => {
    const onConfirmarExclusao = vi.fn();
    renderModais({ onConfirmarExclusao });

    await userEvent.click(screen.getByRole("button", { name: /Confirmar exclusão/ }));

    expect(onConfirmarExclusao).toHaveBeenCalledTimes(1);
  });

  test("com bloqueio por item arquivado: mostra o motivo, esconde Confirmar exclusão e mostra Ver arquivados", async () => {
    const onVerArquivados = vi.fn();
    renderModais({
      bloqueioExclusao: { podeExcluir: false, temItemArquivado: true },
      mensagemExclusao: "Não é possível excluir: o módulo tem 1 quiz arquivado. Exclua ou restaure o item em 'Ver arquivados' antes.",
      onVerArquivados
    });

    expect(screen.getByText(/o módulo tem 1 quiz arquivado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar exclusão/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();

    const botaoVerArquivados = screen.getByRole("button", { name: /Ver arquivados/ });
    await userEvent.click(botaoVerArquivados);
    expect(onVerArquivados).toHaveBeenCalledTimes(1);
  });

  test("com bloqueio sem item arquivado (ex.: notas lançadas): nao mostra Ver arquivados", () => {
    renderModais({
      bloqueioExclusao: { podeExcluir: false, temItemArquivado: false },
      mensagemExclusao: "Não é possível excluir: já existem notas lançadas neste módulo.",
      onVerArquivados: vi.fn()
    });

    expect(screen.getByText(/ja existem notas lancadas|já existem notas lançadas/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver arquivados/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar exclusão/ })).not.toBeInTheDocument();
  });
});
