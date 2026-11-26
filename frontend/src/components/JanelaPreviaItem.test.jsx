import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import JanelaPreviaItem from "./JanelaPreviaItem.jsx";

function criarItemMaterial(tipoConteudo) {
  return {
    id: "conteudo-1",
    tipo: "material",
    titulo: "Item de teste",
    // tipoConteudo 1 (texto) e 5 (imagem) renderizam sincrono - 2 (PDF) usa
    // react-pdf, que suspende de verdade (pede o worker) e exigiria mock
    // separado, fora do escopo deste teste (o que importa aqui e o selo).
    conteudo: { id: 1, titulo: "Item de teste", tipoConteudo, corpoTexto: "Texto", arquivoUrl: "/uploads/conteudos/arquivo-teste" }
  };
}

function renderJanela(item) {
  return render(
    <JanelaPreviaItem
      indiceAtual={1}
      item={item}
      itemAnterior={null}
      itemProximo={null}
      numeroModuloTexto="Módulo 01"
      onAnterior={vi.fn()}
      onFechar={vi.fn()}
      onProximo={vi.fn()}
      publicado
      somenteLeitura
      totalItens={1}
    />
  );
}

describe("JanelaPreviaItem - selo Somente leitura", () => {
  test("video: nao mostra 'Somente leitura'", () => {
    renderJanela(criarItemMaterial(3));

    expect(screen.queryByText("Somente leitura")).not.toBeInTheDocument();
  });

  test("texto: continua mostrando 'Somente leitura'", () => {
    renderJanela(criarItemMaterial(1));

    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
  });

  test("imagem: continua mostrando 'Somente leitura'", () => {
    renderJanela(criarItemMaterial(5));

    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
  });
});
