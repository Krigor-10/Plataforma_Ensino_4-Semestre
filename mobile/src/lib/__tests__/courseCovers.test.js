import { getCourseCover, resolverImagemCurso } from "../courseCovers.js";

describe("resolverImagemCurso", () => {
  it("prioriza curso.imagemUrl quando presente, resolvendo pro gateway", () => {
    const curso = { titulo: "Curso sem mapa estatico", imagemUrl: "/uploads/cursos/capa.jpg" };
    expect(resolverImagemCurso(curso)).toEqual({ uri: "http://127.0.0.1:4000/uploads/cursos/capa.jpg" });
  });

  it("cai no mapa estatico por titulo quando nao ha imagemUrl", () => {
    const curso = { titulo: "Python para Automacao e Dados" };
    expect(resolverImagemCurso(curso)).toBe(getCourseCover(curso));
    expect(resolverImagemCurso(curso)).not.toBeNull();
  });

  it("retorna null quando nao ha imagemUrl nem titulo mapeado", () => {
    const curso = { titulo: "Curso de teste sem capa" };
    expect(resolverImagemCurso(curso)).toBeNull();
  });
});
