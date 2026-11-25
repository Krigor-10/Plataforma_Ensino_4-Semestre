import { fireEvent, render, screen } from "@testing-library/react-native";
import GradeCursosConteudos from "../GradeCursosConteudos.jsx";

// Vitrine de "meus cursos" (docs/redesign-mobile/PROMPT-agente-cursos-
// vitrine.md) - estes testes cobrem exatamente a secao "Testes (jest)" do
// prompt.

function montarItem(overrides) {
  return {
    curso: { id: 1, imagemUrl: null, titulo: "Curso Padrão" },
    id: 1,
    matriculaId: 10,
    acessoLiberado: true,
    certificadoEmitidoEm: null,
    modulosConcluidos: 1,
    modulosTotal: 2,
    pagamentoPendente: false,
    pagamentoVenceEm: null,
    progresso: 40,
    valorPagamento: undefined,
    ...overrides
  };
}

function montarProps(itens, extra = {}) {
  return {
    accessibilityLabelPrefix: "Ver conteúdos de",
    itens,
    onAbrirDetalhe: jest.fn(),
    onConcluirCompra: jest.fn(),
    onDesistir: jest.fn(),
    onSelecionar: jest.fn(),
    ...extra
  };
}

describe("GradeCursosConteudos - chips e contagem", () => {
  test("chip sem nenhum curso nao renderiza, e 'Compra pendente' so aparece se houver", async () => {
    const itens = [
      montarItem({ id: 1, curso: { id: 1, titulo: "Andamento Curso" }, progresso: 40 }),
      montarItem({ id: 2, curso: { id: 2, titulo: "NaoIniciado Curso" }, progresso: 0 })
    ];

    await render(<GradeCursosConteudos {...montarProps(itens)} />);

    expect(screen.getByLabelText("Todos")).toBeTruthy();
    expect(screen.getByLabelText("Em andamento")).toBeTruthy();
    expect(screen.getByLabelText("Não iniciados")).toBeTruthy();
    expect(screen.queryByLabelText("Concluídos")).toBeNull();
    expect(screen.queryByLabelText("Compra pendente")).toBeNull();
  });

  test("os chips filtram por situacao e a contagem acompanha o filtro", async () => {
    const itens = [
      montarItem({ id: 1, curso: { id: 1, titulo: "Andamento Curso" }, progresso: 40 }),
      montarItem({ id: 2, curso: { id: 2, titulo: "NaoIniciado Curso" }, progresso: 0 }),
      montarItem({ id: 3, curso: { id: 3, titulo: "Concluido Curso" }, progresso: 100 })
    ];

    await render(<GradeCursosConteudos {...montarProps(itens)} />);

    expect(screen.getByText("3 cursos")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Em andamento"));
    expect(screen.getByText("1 curso")).toBeTruthy();
    expect(screen.getByText("Andamento Curso")).toBeTruthy();
    expect(screen.queryByText("NaoIniciado Curso")).toBeNull();
  });
});

describe("GradeCursosConteudos - ordem em 'Todos'", () => {
  test("em andamento, compra pendente, nao iniciados, concluidos", async () => {
    const itens = [
      montarItem({ id: 1, curso: { id: 1, titulo: "Concluido Curso" }, progresso: 100 }),
      montarItem({ id: 2, curso: { id: 2, titulo: "NaoIniciado Curso" }, progresso: 0 }),
      montarItem({ id: 3, curso: { id: 3, titulo: "Pendente Curso" }, pagamentoPendente: true, progresso: 10 }),
      montarItem({ id: 4, curso: { id: 4, titulo: "Andamento Curso" }, progresso: 40 })
    ];

    await render(<GradeCursosConteudos {...montarProps(itens)} />);

    const titulos = screen.getAllByText(/ Curso$/).map((elemento) => elemento.props.children);

    expect(titulos).toEqual(["Andamento Curso", "Pendente Curso", "NaoIniciado Curso", "Concluido Curso"]);
  });
});

describe("GradeCursosConteudos - cartao", () => {
  test("em andamento mostra a etiqueta, 'N de M modulos · N% concluido' e 'Continuar', que chama onSelecionar", async () => {
    const onSelecionar = jest.fn();
    const itens = [montarItem({ modulosConcluidos: 1, modulosTotal: 2, progresso: 40 })];

    await render(<GradeCursosConteudos {...montarProps(itens, { onSelecionar })} />);

    // "Em andamento" tambem e o rotulo do chip de filtro - getAllByText
    // evita a ambiguidade entre o chip e a etiqueta sobre a capa (mesmo
    // padrao de CatalogoScreen.test.jsx).
    expect(screen.getAllByText("Em andamento").length).toBeGreaterThan(0);
    expect(screen.getByText("1 de 2 módulos · 40% concluído")).toBeTruthy();

    await fireEvent.press(screen.getByText("▶ Continuar"));
    expect(onSelecionar).toHaveBeenCalledWith(1);
  });

  test("0% mostra 'Começar'", async () => {
    const itens = [montarItem({ progresso: 0 })];

    await render(<GradeCursosConteudos {...montarProps(itens)} />);

    expect(screen.getByText("▶ Começar")).toBeTruthy();
  });

  test("100% mostra '✓ Concluído', 'Revisar' e o selo 'Certificado' quando certificadoEmitidoEm existe", async () => {
    const itens = [montarItem({ certificadoEmitidoEm: "2026-08-28T00:00:00Z", progresso: 100 })];

    await render(<GradeCursosConteudos {...montarProps(itens)} />);

    expect(screen.getByText("✓ Concluído")).toBeTruthy();
    expect(screen.getByText("Revisar")).toBeTruthy();
    expect(screen.getByText("🏆 Certificado")).toBeTruthy();
  });

  test("compra pendente mostra a etiqueta âmbar, 'Concluir compra' e 'Desistir', chamando os mesmos callbacks", async () => {
    const onConcluirCompra = jest.fn();
    const onDesistir = jest.fn();
    const itens = [montarItem({ pagamentoPendente: true, pagamentoVenceEm: "2026-12-05T00:00:00Z" })];

    await render(<GradeCursosConteudos {...montarProps(itens, { onConcluirCompra, onDesistir })} />);

    // Idem: "Compra pendente" tambem e o rotulo do chip.
    expect(screen.getAllByText("Compra pendente").length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText("Concluir compra"));
    expect(onConcluirCompra).toHaveBeenCalledWith(itens[0]);

    await fireEvent.press(screen.getByText("Desistir"));
    expect(await screen.findByText(/Desistir da compra de Curso Padrão/)).toBeTruthy();

    await fireEvent.press(screen.getByText("Sim, desistir"));
    expect(onDesistir).toHaveBeenCalledWith(itens[0]);
  });

  test("'Comprar' (pagamento cancelado) mostra a etiqueta âmbar e so o botao 'Comprar'", async () => {
    const onConcluirCompra = jest.fn();
    const itens = [montarItem({ acessoLiberado: false, pagamentoPendente: false })];

    await render(<GradeCursosConteudos {...montarProps(itens, { onConcluirCompra })} />);

    // "Comprar" e tanto a etiqueta sobre a capa quanto o rotulo do botao.
    expect(screen.getAllByText("Comprar").length).toBe(2);
    expect(screen.getByText("Pagamento cancelado")).toBeTruthy();
    expect(screen.queryByText("Desistir")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Comprar Curso Padrão"));
    expect(onConcluirCompra).toHaveBeenCalledWith(itens[0]);
  });
});
