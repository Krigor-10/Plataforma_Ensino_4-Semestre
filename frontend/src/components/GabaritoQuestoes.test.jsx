import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import GabaritoQuestoes from "./GabaritoQuestoes.jsx";

const QUESTAO_ALTERNATIVAS = {
  id: 1,
  enunciado: "Pergunta de exemplo com um texto propositalmente comprido para testar a quebra de linha da letra",
  alternativas: [
    { id: 1, letra: "A", texto: "Alternativa errada", ehCorreta: false },
    { id: 2, letra: "B", texto: "Alternativa certa", ehCorreta: true }
  ],
  afirmativas: [],
  explicacao: "Porque a letra B está correta."
};

const QUESTAO_AFIRMATIVAS = {
  id: 2,
  enunciado: "Pergunta com afirmativas",
  alternativas: [],
  afirmativas: [
    { numero: 1, texto: "Primeira afirmativa", ehCorreta: true },
    { numero: 2, texto: "Segunda afirmativa", ehCorreta: false }
  ]
};

describe("GabaritoQuestoes - padrao (usado pela previa do Professor)", () => {
  test("mostra o rotulo 'Alternativas', numero simples da questao e letra/texto em elementos proprios", () => {
    render(<GabaritoQuestoes questoes={[QUESTAO_ALTERNATIVAS]} />);

    expect(screen.getByText("Questão 1")).toBeInTheDocument();
    expect(screen.getByText("Alternativas")).toBeInTheDocument();
    expect(screen.getByText("Explicação")).toBeInTheDocument();
    expect(screen.queryByText(/^Resposta:/)).not.toBeInTheDocument();

    const letra = screen.getByText("B");
    const texto = screen.getByText("Alternativa certa");
    expect(letra).toHaveClass("revisao-alternativas__letra");
    expect(texto).toHaveClass("revisao-alternativas__texto");
    expect(letra).not.toBe(texto);
  });

  // docs/TelaConteudosAlunos/PROMPT-agente-revisao-aluno-layout-professor.md,
  // item 4: letra em circulo com borda, cor verde quando correta - a classe
  // --correta do item (que colore o circulo via CSS) e o que garante isso.
  test("a letra da alternativa correta fica no circulo verde (classe item--correta no quiz do professor)", () => {
    render(<GabaritoQuestoes questoes={[QUESTAO_ALTERNATIVAS]} />);

    const itemCorreto = screen.getByText("Alternativa certa").closest(".revisao-alternativas__item");
    expect(itemCorreto).toHaveClass("revisao-alternativas__item--correta");
  });

  test("afirmativas tambem ficam com o numero e o texto em elementos proprios", () => {
    render(<GabaritoQuestoes questoes={[QUESTAO_AFIRMATIVAS]} />);

    const numero = screen.getByText("1.");
    const texto = screen.getByText("Primeira afirmativa");
    expect(numero).toHaveClass("revisao-afirmativas__letra");
    expect(texto).toHaveClass("revisao-afirmativas__texto");
  });
});

describe("GabaritoQuestoes - compacto (usado so pela leitura do modulo)", () => {
  test("cabecalho 'QUESTAO N' com a pilula 'Resposta: X' e sem os rotulos 'Alternativas'/'Explicação'", () => {
    render(<GabaritoQuestoes compacto questoes={[QUESTAO_ALTERNATIVAS]} />);

    expect(screen.getByText("QUESTÃO 1")).toBeInTheDocument();
    expect(screen.getByText("Resposta: B")).toBeInTheDocument();
    expect(screen.queryByText("Alternativas")).not.toBeInTheDocument();
    expect(screen.queryByText("Explicação")).not.toBeInTheDocument();
    expect(screen.getByText("Explicação:")).toBeInTheDocument();
    expect(screen.getByText(/Porque a letra B está correta\./)).toBeInTheDocument();
  });

  test("sem pilula de resposta quando nenhuma alternativa esta marcada como correta", () => {
    const questaoSemCorreta = {
      ...QUESTAO_ALTERNATIVAS,
      alternativas: QUESTAO_ALTERNATIVAS.alternativas.map((alternativa) => ({ ...alternativa, ehCorreta: false }))
    };

    render(<GabaritoQuestoes compacto questoes={[questaoSemCorreta]} />);

    expect(screen.queryByText(/^Resposta:/)).not.toBeInTheDocument();
  });

  test("sem pilula de resposta quando ha mais de uma alternativa marcada como correta", () => {
    const questaoComDuasCorretas = {
      ...QUESTAO_ALTERNATIVAS,
      alternativas: QUESTAO_ALTERNATIVAS.alternativas.map((alternativa) => ({ ...alternativa, ehCorreta: true }))
    };

    render(<GabaritoQuestoes compacto questoes={[questaoComDuasCorretas]} />);

    expect(screen.queryByText(/^Resposta:/)).not.toBeInTheDocument();
  });
});

// docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-propria.md +
// ...-avaliacao-tela-limpa.md + ...-avaliacao-figura-layout.md: pontos/
// dificuldade, contexto, anexos (imagem separada do arquivo, numa estrutura
// de 2 colunas quando ha figura) e as referencias bibliograficas num
// <details> recolhido - so usado pela tela da avaliacao.
describe("GabaritoQuestoes - mostrarFicha (usado so pela tela da avaliacao)", () => {
  const QUESTAO_COM_FIGURA = {
    id: 3,
    enunciado: "Pergunta com ficha completa",
    pontos: 2,
    dificuldade: 4,
    contexto: "Texto de apoio da questao.",
    referenciasBibliograficas: "AUTOR, A. Livro. 1. ed. 2024.",
    alternativas: [{ id: 1, letra: "A", texto: "Unica alternativa", ehCorreta: true }],
    afirmativas: [],
    anexos: [
      { id: 10, titulo: "Figura 1", tipoAnexo: "Imagem", arquivoUrl: "/uploads/figura1.png" },
      { id: 11, titulo: "Planilha de apoio", tipoAnexo: "Pdf", arquivoUrl: "/uploads/planilha.pdf" }
    ]
  };

  const QUESTAO_SEM_FIGURA = {
    ...QUESTAO_COM_FIGURA,
    id: 4,
    anexos: [{ id: 11, titulo: "Planilha de apoio", tipoAnexo: "Pdf", arquivoUrl: "/uploads/planilha.pdf" }]
  };

  test("cabecalho mostra pontos e dificuldade, e o contexto aparece (sem repetir a citacao)", () => {
    render(<GabaritoQuestoes compacto mostrarFicha questoes={[QUESTAO_COM_FIGURA]} />);

    expect(screen.getByText("QUESTÃO 1 · 2 pontos · difícil")).toBeInTheDocument();
    expect(screen.getByText("Texto de apoio da questao.")).toBeInTheDocument();
  });

  test("com anexo de imagem, monta as duas colunas (texto e figura) e separa o anexo de arquivo", () => {
    render(<GabaritoQuestoes compacto mostrarFicha questoes={[QUESTAO_COM_FIGURA]} />);

    const corpoFigura = document.querySelector(".revisao-questao__corpo-figura");
    expect(corpoFigura).not.toBeNull();

    const colunaTexto = corpoFigura.querySelector(".revisao-questao__coluna-texto");
    const colunaFigura = corpoFigura.querySelector(".revisao-questao__coluna-figura");
    expect(colunaTexto).not.toBeNull();
    expect(colunaFigura).not.toBeNull();

    // enunciado e anexo de arquivo ficam na coluna de texto
    expect(within(colunaTexto).getByText("Pergunta com ficha completa")).toBeInTheDocument();
    expect(within(colunaTexto).getByRole("link", { name: "Planilha de apoio" })).toHaveAttribute("href", "/uploads/planilha.pdf");

    // a figura fica na coluna da figura, clicavel, com a legenda fixa
    const link = within(colunaFigura).getByRole("link");
    expect(link).toHaveAttribute("href", "/uploads/figura1.png");
    expect(within(colunaFigura).getByText("Clique para ampliar")).toBeInTheDocument();
  });

  test("sem anexo de imagem, nao monta o corpo-figura (questao fica igual, so com o anexo de arquivo)", () => {
    render(<GabaritoQuestoes compacto mostrarFicha questoes={[QUESTAO_SEM_FIGURA]} />);

    expect(document.querySelector(".revisao-questao__corpo-figura")).toBeNull();
    expect(document.querySelector(".quiz-anexos--imagens")).toBeNull();
    expect(screen.getByRole("link", { name: "Planilha de apoio" })).toHaveAttribute("href", "/uploads/planilha.pdf");
  });

  test("as referencias bibliograficas ficam num <details> fechado no fim da questao, separadas do contexto", () => {
    render(<GabaritoQuestoes compacto mostrarFicha questoes={[QUESTAO_COM_FIGURA]} />);

    const referencias = document.querySelector(".revisao-questao__referencias");
    expect(referencias).not.toBeNull();
    expect(referencias.tagName).toBe("DETAILS");
    expect(referencias).not.toHaveAttribute("open");
    expect(within(referencias).getByText("Referências bibliográficas")).toBeInTheDocument();
    expect(within(referencias).getByText("AUTOR, A. Livro. 1. ed. 2024.")).toBeInTheDocument();

    // o contexto so tem o texto de apoio, a citacao nao se repete ali
    const contexto = document.querySelector(".revisao-questao__contexto");
    expect(within(contexto).queryByText("AUTOR, A. Livro. 1. ed. 2024.")).not.toBeInTheDocument();
  });

  test("sem mostrarFicha, contexto/pontos/dificuldade/referencias nao aparecem (previa do Professor e leitura do modulo)", () => {
    render(<GabaritoQuestoes compacto questoes={[QUESTAO_COM_FIGURA]} />);

    expect(screen.getByText("QUESTÃO 1")).toBeInTheDocument();
    expect(screen.queryByText(/pontos/)).not.toBeInTheDocument();
    expect(screen.queryByText("Texto de apoio da questao.")).not.toBeInTheDocument();
    expect(document.querySelector(".revisao-questao__referencias")).toBeNull();
    expect(document.querySelector(".quiz-anexos")).toBeNull();
  });
});
