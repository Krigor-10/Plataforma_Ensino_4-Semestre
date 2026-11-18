import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import PreviaItemAluno from "./PreviaItemAluno.jsx";

vi.mock("react-pdf", () => ({
  Document: ({ children }) => <div data-testid="pdf-documento">{children}</div>,
  Page: () => <div data-testid="pdf-pagina" />,
  pdfjs: { GlobalWorkerOptions: {} }
}));

function materialItem(tipoConteudo, extra = {}) {
  return {
    tipo: "material",
    titulo: "Item de teste",
    conteudo: { id: 1, titulo: "Item de teste", tipoConteudo, descricao: "", arquivoUrl: "", linkUrl: "", ...extra }
  };
}

const QUESTAO = {
  id: 1,
  enunciado: "Qual a resposta certa?",
  alternativas: [
    { id: 1, letra: "A", texto: "Errada", ehCorreta: false },
    { id: 2, letra: "B", texto: "Certa", ehCorreta: true }
  ],
  afirmativas: []
};

describe("PreviaItemAluno - texto", () => {
  test("mostra a descricao formatada (corpoTexto) com quebras de linha preservadas via CSS", () => {
    render(<PreviaItemAluno item={materialItem(1, { corpoTexto: "Linha 1\nLinha 2" })} selo="Somente leitura" />);

    const texto = document.querySelector(".previa-item-aluno__texto");
    expect(texto).not.toBeNull();
    expect(texto).toHaveTextContent("Linha 1 Linha 2");
    expect(texto.textContent).toBe("Linha 1\nLinha 2");
  });

  test("sem corpoTexto nem descricao mostra mensagem curta", () => {
    render(<PreviaItemAluno item={materialItem(1)} selo="Somente leitura" />);

    expect(screen.getByText("Este item ainda não tem arquivo.")).toBeInTheDocument();
  });
});

describe("PreviaItemAluno - imagem", () => {
  test("mostra a imagem inteira e o botao Ampliar que abre o visualizador em tela cheia", async () => {
    render(<PreviaItemAluno item={materialItem(5, { arquivoUrl: "https://cdn.teste/imagem.png" })} selo="Somente leitura" />);

    const imagem = screen.getByAltText("Item de teste");
    expect(imagem).toHaveClass("previa-item-aluno__imagem-img");
    expect(imagem).toHaveAttribute("src", "https://cdn.teste/imagem.png");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const botaoAmpliar = screen.getByRole("button", { name: "Ampliar imagem" });
    expect(botaoAmpliar).toHaveTextContent("Ampliar");

    await userEvent.click(botaoAmpliar);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("sem arquivo mostra mensagem curta", () => {
    render(<PreviaItemAluno item={materialItem(5)} selo="Somente leitura" />);

    expect(screen.getByText("Este item ainda não tem arquivo.")).toBeInTheDocument();
  });
});

describe("PreviaItemAluno - PDF", () => {
  test("mostra a 1a pagina embutida e o botao Ampliar (mesmo padrao da imagem)", async () => {
    render(<PreviaItemAluno item={materialItem(2, { arquivoUrl: "https://cdn.teste/arquivo.pdf" })} selo="Somente leitura" />);

    expect(screen.getByTestId("pdf-documento")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-pagina")).toBeInTheDocument();

    const botaoAmpliar = screen.getByRole("button", { name: "Ampliar PDF" });
    expect(botaoAmpliar).toHaveTextContent("Ampliar");

    await userEvent.click(botaoAmpliar);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("PreviaItemAluno - video", () => {
  test("toca no proprio painel com controls", () => {
    render(<PreviaItemAluno item={materialItem(3, { arquivoUrl: "https://cdn.teste/video.mp4" })} selo="Somente leitura" />);

    const video = document.querySelector(".previa-item-aluno__video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", "https://cdn.teste/video.mp4");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("preload", "metadata");
  });
});

describe("PreviaItemAluno - link", () => {
  test("mostra o endereco e o botao Abrir link numa nova aba", () => {
    render(<PreviaItemAluno item={materialItem(4, { linkUrl: "https://exemplo.com/recurso" })} selo="Somente leitura" />);

    expect(screen.getByText("https://exemplo.com/recurso")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Abrir link" });
    expect(link).toHaveAttribute("href", "https://exemplo.com/recurso");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

describe("PreviaItemAluno - quiz", () => {
  test("mostra as questoes com a resposta certa marcada", () => {
    render(
      <PreviaItemAluno item={{ tipo: "quiz", titulo: "Quiz de teste", quiz: { id: 1 } }} questoes={[QUESTAO]} selo="Somente leitura" />
    );

    expect(screen.getByText("Qual a resposta certa?")).toBeInTheDocument();
    const itemCorreto = screen.getByText("Certa").closest("li");
    expect(itemCorreto).toHaveClass("revisao-alternativas__item--correta");
  });

  test("sem questoes mostra mensagem curta", () => {
    render(<PreviaItemAluno item={{ tipo: "quiz", titulo: "Quiz vazio", quiz: { id: 1 } }} questoes={[]} selo="Somente leitura" />);

    expect(screen.getByText("Este quiz ainda não tem questões.")).toBeInTheDocument();
  });
});

describe("PreviaItemAluno - cabecalho", () => {
  test("mostra titulo, tipo em maiusculo e o selo", () => {
    render(<PreviaItemAluno item={materialItem(5, { arquivoUrl: "https://cdn.teste/imagem.png" })} selo="Somente leitura" />);

    expect(screen.getByRole("heading", { name: "Item de teste" })).toBeInTheDocument();
    expect(screen.getByText("IMAGEM")).toBeInTheDocument();
    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
  });

  test("mostra o aviso de rascunho quando passado e o rodape quando passado", () => {
    render(
      <PreviaItemAluno
        aviso="Rascunho — os alunos ainda não veem este item."
        item={materialItem(1, { corpoTexto: "Texto" })}
        rodape={<button type="button">Publicar</button>}
        selo="Rascunho"
      />
    );

    expect(screen.getByText("Rascunho — os alunos ainda não veem este item.")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
  });
});
