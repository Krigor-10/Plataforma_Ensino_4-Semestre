import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoAlunos } from "./SecaoAlunos.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest } from "../../lib/api.js";

// docs/alunos-admin/PROMPT-agente-tabela-alunos-igual-professores.md e
// PROMPT-agente-editar-e-inativar-aluno.md - estes testes cobrem a secao
// "Testes" (Vitest) dos dois prompts.
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

async function abrirMenu(nome = "Maria Aluna") {
  await userEvent.click(screen.getByRole("button", { name: `Ações para ${nome}` }));
}

async function abrirDetalhe(nome = "Maria Aluna") {
  await abrirMenu(nome);
  await userEvent.click(await screen.findByRole("menuitem", { name: "Ver detalhes" }));
}

async function abrirEdicaoPeloMenu(nome = "Maria Aluna") {
  await abrirMenu(nome);
  await userEvent.click(await screen.findByRole("menuitem", { name: "Editar dados" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SecaoAlunos - abas e busca", () => {
  test("abas Ativos/Inativos filtram e mostram a contagem; nao existe mais o seletor 'Todos os status'", async () => {
    renderSecao({
      alunos: [alunoBase({ id: 10, nome: "Maria Ativa", ativo: true }), alunoBase({ id: 11, nome: "João Inativo", ativo: false })]
    });

    expect(screen.queryByLabelText("Filtrar alunos por status")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Ativos/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Inativos/ })).toHaveTextContent("1");
    expect(screen.getByText("Maria Ativa")).toBeInTheDocument();
    expect(screen.queryByText("João Inativo")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Inativos/ }));

    expect(screen.getByText("João Inativo")).toBeInTheDocument();
    expect(screen.queryByText("Maria Ativa")).not.toBeInTheDocument();
  });

  test("busca encontra pelo RA", async () => {
    renderSecao({
      alunos: [alunoBase({ id: 10, nome: "Maria Ativa", matricula: "RA-AAA" }), alunoBase({ id: 11, nome: "Outra Aluna", matricula: "RA-BBB" })]
    });

    await userEvent.type(screen.getByLabelText("Buscar aluno"), "RA-BBB");

    expect(screen.getByText("Outra Aluna")).toBeInTheDocument();
    expect(screen.queryByText("Maria Ativa")).not.toBeInTheDocument();
  });
});

describe("SecaoAlunos - linha e menu", () => {
  test("clicar na linha abre os detalhes; clicar no checkbox ou no ⋮ nao abre", async () => {
    renderSecao();

    await userEvent.click(screen.getByLabelText("Selecionar Maria Aluna"));
    expect(screen.queryByText("Detalhes do aluno")).not.toBeInTheDocument();

    await abrirMenu();
    expect(screen.queryByText("Detalhes do aluno")).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByText("Maria Aluna"));
    expect(await screen.findByText("Detalhes do aluno")).toBeInTheDocument();
  });

  test("menu do Admin mostra 'Ver detalhes', 'Editar dados' e 'Inativar acesso'", async () => {
    renderSecao({ alunos: [alunoBase({ ativo: true })] });

    await abrirMenu();

    expect(await screen.findByRole("menuitem", { name: "Ver detalhes" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Editar dados" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Inativar acesso" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Reativar acesso" })).not.toBeInTheDocument();
  });

  test("para aluno inativo, o menu mostra 'Reativar acesso' em vez de 'Inativar acesso'", async () => {
    renderSecao({ alunos: [alunoBase({ ativo: false })] });

    await userEvent.click(screen.getByRole("tab", { name: /Inativos/ }));
    await abrirMenu();

    expect(await screen.findByRole("menuitem", { name: "Reativar acesso" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Inativar acesso" })).not.toBeInTheDocument();
  });

  test("Coordenador: o menu so tem 'Ver detalhes' e nao ha checkboxes", async () => {
    renderSecao({ usuario: COORDENADOR });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await abrirMenu();

    expect(await screen.findByRole("menuitem", { name: "Ver detalhes" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Editar dados" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Inativar acesso" })).not.toBeInTheDocument();
  });
});

describe("SecaoAlunos - selecao em lote", () => {
  test("selecionar dois alunos mostra a barra, e 'Inativar selecionados' exige motivo e chama /inativar duas vezes", async () => {
    apiRequest.mockResolvedValue({});
    const onRefresh = vi.fn();
    renderSecao({
      alunos: [alunoBase({ id: 10, nome: "Aluno Um" }), alunoBase({ id: 11, nome: "Aluno Dois" })],
      onRefresh
    });

    await userEvent.click(screen.getByLabelText("Selecionar Aluno Um"));
    await userEvent.click(screen.getByLabelText("Selecionar Aluno Dois"));

    expect(screen.getByText("2 alunos selecionados")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Inativar selecionados"));

    const botaoConfirmar = screen.getByRole("button", { name: /Confirmar inativação/ });
    expect(botaoConfirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo *"), "Pagamento em atraso.");
    expect(botaoConfirmar).toBeEnabled();

    await userEvent.click(botaoConfirmar);

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenCalledWith("/Alunos/10/inativar", expect.objectContaining({ method: "POST" }));
    expect(apiRequest).toHaveBeenCalledWith("/Alunos/11/inativar", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByText("2 alunos inativados com sucesso.")).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });
});

describe("SecaoAlunos - aluno inativo", () => {
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
    await userEvent.click(screen.getByRole("tab", { name: /Inativos/ }));
    await abrirDetalhe();

    expect(await screen.findByText(/Acesso inativado em/)).toBeInTheDocument();
    expect(screen.getByText(/por Admin Teste/)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento recorrente em atraso\./)).toBeInTheDocument();
    expect(screen.getByText("Reativar acesso")).toBeInTheDocument();
    expect(screen.queryByText("Inativar acesso")).not.toBeInTheDocument();
  });
});

describe("SecaoAlunos - edicao", () => {
  test("mostra so nome/e-mail/telefone/RA editaveis, CPF e Cidade/UF so leitura, e nao mostra endereco", async () => {
    renderSecao();
    await abrirEdicaoPeloMenu();

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

  // Achado da auditoria de bugs/crashes (docs/auditorias/AUDITORIA-BUGS-
  // CRASH-WEB-MOBILE-2026-11-25.md): o telefone cru do banco aparecia sem
  // mascara ate o admin digitar algo.
  test("telefone ja aparece com mascara ao abrir a edicao", async () => {
    renderSecao();
    await abrirEdicaoPeloMenu();

    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 99999-9999");
  });

  test("trocar o e-mail mostra o aviso de desconexao", async () => {
    renderSecao();
    await abrirEdicaoPeloMenu();

    await userEvent.clear(screen.getByLabelText("E-mail *"));
    await userEvent.type(screen.getByLabelText("E-mail *"), "novo@teste.local");

    expect(await screen.findByText(/O aluno será desconectado e receberá um aviso/)).toBeInTheDocument();
  });

  test("e-mail mal formatado mostra mensagem e nao chama a API", async () => {
    renderSecao();
    await abrirEdicaoPeloMenu();

    // "aluno@semponto" passa pela validacao nativa do <input type="email">
    // (so exige um "@", sem exigir ponto no dominio) mas falha a validacao
    // mais estrita do regex do componente (e do [EmailAddress] do backend,
    // que exige um TLD) - exercita de fato o branch novo, em vez de barrar
    // na validacao nativa do proprio input antes de chegar no JS.
    await userEvent.clear(screen.getByLabelText("E-mail *"));
    await userEvent.type(screen.getByLabelText("E-mail *"), "aluno@semponto");
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(await screen.findByText("O e-mail fornecido não é válido.")).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  test("salvar chama PUT /Alunos/{id} e mostra toast de sucesso", async () => {
    apiRequest.mockResolvedValue({ avisoEmailEnviado: true });
    const onRefresh = vi.fn();
    renderSecao({ onRefresh });
    await abrirEdicaoPeloMenu();

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(apiRequest).toHaveBeenCalledWith("/Alunos/10", expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("Dados do aluno atualizados.")).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  test("avisoEmailEnviado false mostra o toast de falha no envio", async () => {
    apiRequest.mockResolvedValue({ avisoEmailEnviado: false });
    renderSecao();
    await abrirEdicaoPeloMenu();

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(await screen.findByText("Dados do aluno atualizados. Não foi possível enviar o aviso por e-mail.")).toBeInTheDocument();
  });
});

describe("SecaoAlunos - inativar/reativar direto pelo menu", () => {
  test("'Inativar acesso' pelo menu abre a confirmacao com motivo obrigatorio", async () => {
    apiRequest.mockResolvedValue({});
    renderSecao();

    await abrirMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Inativar acesso" }));

    const botaoInativar = await screen.findByRole("button", { name: "Inativar" });
    expect(botaoInativar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo *"), "Pagamento em atraso.");
    expect(botaoInativar).toBeEnabled();

    await userEvent.click(botaoInativar);

    expect(apiRequest).toHaveBeenCalledWith("/Alunos/10/inativar", expect.objectContaining({ method: "POST" }));
  });

  test("'Reativar acesso' pelo menu abre a confirmacao simples", async () => {
    apiRequest.mockResolvedValue({});
    renderSecao({ alunos: [alunoBase({ ativo: false })] });

    await userEvent.click(screen.getByRole("tab", { name: /Inativos/ }));
    await abrirMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reativar acesso" }));

    await userEvent.click(screen.getByRole("button", { name: /Reativar/ }));

    expect(apiRequest).toHaveBeenCalledWith("/Alunos/10/reativar", expect.objectContaining({ method: "POST" }));
  });
});
