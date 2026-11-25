import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoAlunos } from "./SecaoAlunos.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";

// docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md - estes testes
// cobrem a secao "Testes" (Vitest) do prompt.
vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

const ADMIN = { id: 1, nome: "Admin Teste", tipoUsuario: "Admin" };
const COORDENADOR = { id: 2, nome: "Coordenador Teste", tipoUsuario: "Coordenador" };

function alunoBase(sobrescritas = {}) {
  return {
    id: 10,
    nome: "Maria Aluna",
    email: "maria@teste.local",
    cpf: "12345678901",
    telefone: "11999999999",
    cep: "01001-000",
    rua: "Rua Teste",
    numero: "1",
    bairro: "Centro",
    cidade: "Sao Paulo",
    estado: "SP",
    tipoUsuario: "Aluno",
    dataCadastro: "2026-01-10T00:00:00Z",
    ativo: true,
    matricula: "RA-0001",
    turmaAtual: "",
    inativadoEm: null,
    inativadoPorNome: "",
    motivoInativacao: "",
    avisoEmailEnviado: true,
    ...sobrescritas
  };
}

function renderSecao({ alunos = [alunoBase()], usuario = ADMIN, ...props } = {}) {
  return render(
    <ToastProvider>
      <SecaoAlunos alunos={alunos} cursos={[]} matriculas={[]} onRefresh={vi.fn()} onSessionExpired={vi.fn()} usuario={usuario} {...props} />
    </ToastProvider>
  );
}

async function abrirDetalhe(nome = "Maria Aluna") {
  await userEvent.click(screen.getByRole("button", { name: `Ver detalhes de ${nome}` }));
}

describe("SecaoAlunos - acoes por papel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Admin ve 'Editar dados' e 'Inativar acesso'", async () => {
    renderSecao({ usuario: ADMIN });
    await abrirDetalhe();

    expect(await screen.findByText("Editar dados")).toBeInTheDocument();
    expect(screen.getByText("Inativar acesso")).toBeInTheDocument();
  });

  test("Coordenador nao ve os botoes novos, so 'Fechar'", async () => {
    renderSecao({ usuario: COORDENADOR });
    await abrirDetalhe();

    expect(await screen.findByText("Detalhes do aluno")).toBeInTheDocument();
    expect(screen.queryByText("Editar dados")).not.toBeInTheDocument();
    expect(screen.queryByText("Inativar acesso")).not.toBeInTheDocument();
    expect(screen.getByText("Fechar")).toBeInTheDocument();
  });
});

describe("SecaoAlunos - inativar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("'Inativar' fica desabilitado sem motivo e habilita com motivo valido", async () => {
    renderSecao();
    await abrirDetalhe();
    await userEvent.click(screen.getByText("Inativar acesso"));

    const botaoInativar = await screen.findByRole("button", { name: "Inativar" });
    expect(botaoInativar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo *"), "Pagamento em atraso.");

    expect(botaoInativar).toBeEnabled();
  });
});

describe("SecaoAlunos - aluno inativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("mostra o aviso com data, quem inativou e o motivo, e o botao 'Reativar acesso'", async () => {
    renderSecao({
      alunos: [
        alunoBase({
          ativo: false,
          inativadoEm: "2026-11-20T00:00:00Z",
          inativadoPorNome: "Admin Teste",
          motivoInativacao: "Pagamento recorrente em atraso."
        })
      ]
    });
    await abrirDetalhe();

    expect(await screen.findByText(/Acesso inativado em/)).toBeInTheDocument();
    expect(screen.getByText(/por Admin Teste/)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento recorrente em atraso\./)).toBeInTheDocument();
    expect(screen.getByText("Reativar acesso")).toBeInTheDocument();
    expect(screen.queryByText("Inativar acesso")).not.toBeInTheDocument();
  });
});

describe("SecaoAlunos - edicao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("mostra so nome/e-mail/telefone/RA editaveis, CPF e Cidade/UF so leitura, e nao mostra endereco", async () => {
    renderSecao();
    await abrirDetalhe();
    await userEvent.click(screen.getByText("Editar dados"));

    expect(await screen.findByLabelText("Nome completo *")).toBeEnabled();
    expect(screen.getByLabelText("E-mail *")).toBeEnabled();
    expect(screen.getByLabelText("Telefone")).toBeEnabled();
    expect(screen.getByLabelText("RA *")).toBeEnabled();

    expect(screen.getByLabelText("CPF")).toBeDisabled();
    expect(screen.getByLabelText("Cidade/UF")).toBeDisabled();

    expect(screen.queryByLabelText(/Rua/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Numero|Número/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Bairro/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/CEP/)).not.toBeInTheDocument();
  });

  test("trocar o e-mail mostra o aviso de desconexao", async () => {
    renderSecao();
    await abrirDetalhe();
    await userEvent.click(screen.getByText("Editar dados"));

    await userEvent.clear(screen.getByLabelText("E-mail *"));
    await userEvent.type(screen.getByLabelText("E-mail *"), "novo@teste.local");

    expect(await screen.findByText(/O aluno será desconectado e receberá um aviso/)).toBeInTheDocument();
  });

  test("salvar chama PUT /Alunos/{id} e mostra toast de sucesso", async () => {
    apiRequest.mockResolvedValue({ avisoEmailEnviado: true });
    const onRefresh = vi.fn();
    renderSecao({ onRefresh });
    await abrirDetalhe();
    await userEvent.click(screen.getByText("Editar dados"));

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(apiRequest).toHaveBeenCalledWith("/Alunos/10", expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("Dados do aluno atualizados.")).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  test("avisoEmailEnviado false mostra o toast de falha no envio", async () => {
    apiRequest.mockResolvedValue({ avisoEmailEnviado: false });
    renderSecao();
    await abrirDetalhe();
    await userEvent.click(screen.getByText("Editar dados"));

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(await screen.findByText("Dados do aluno atualizados. Não foi possível enviar o aviso por e-mail.")).toBeInTheDocument();
  });
});
