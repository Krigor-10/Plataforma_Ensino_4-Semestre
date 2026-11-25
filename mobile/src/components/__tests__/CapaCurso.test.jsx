import { render, screen } from "@testing-library/react-native";
import CapaCurso from "../CapaCurso.jsx";

// docs/redesign-mobile/PROMPT-agente-catalogo-vitrine.md, item 4: curso sem
// imagem e sem titulo mapeado em courseCovers.js nao tem capa (resolver
// Imagem Curso retorna null) - reservaIniciais troca o quadrado vazio com
// icone de livro por um degrade com as iniciais do titulo.
const CURSO_SEM_CAPA = { id: 7, titulo: "Curso Teste Header Cursos" };

describe("CapaCurso", () => {
  test("com reservaIniciais e sem imagem, mostra as iniciais do titulo", async () => {
    await render(<CapaCurso curso={CURSO_SEM_CAPA} reservaIniciais />);

    expect(screen.getByText("CT")).toBeTruthy();
  });

  test("sem a prop reservaIniciais, mantem o icone de livro (sem as iniciais)", async () => {
    await render(<CapaCurso curso={CURSO_SEM_CAPA} />);

    expect(screen.queryByText("CT")).toBeNull();
  });
});
