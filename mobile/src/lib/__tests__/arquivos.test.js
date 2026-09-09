import { resolverUrlArquivo } from "../arquivos.js";

describe("resolverUrlArquivo", () => {
  it("retorna o proprio valor quando a url e vazia", () => {
    expect(resolverUrlArquivo(null, "token")).toBeNull();
    expect(resolverUrlArquivo(undefined, "token")).toBeUndefined();
  });

  it("resolve caminho relativo /uploads/ para o gateway e anexa o token", () => {
    const resultado = resolverUrlArquivo("/uploads/questoes/arquivo.pdf", "abc123");
    expect(resultado).toBe("http://127.0.0.1:4000/uploads/questoes/arquivo.pdf?access_token=abc123");
  });

  it("resolve /uploads/ sem token quando nao ha sessao", () => {
    const resultado = resolverUrlArquivo("/uploads/questoes/arquivo.pdf", null);
    expect(resultado).toBe("http://127.0.0.1:4000/uploads/questoes/arquivo.pdf");
  });

  it("nao mexe em urls externas (nao /uploads/), mesmo com token", () => {
    const externa = "https://exemplo.com/arquivo.pdf";
    expect(resolverUrlArquivo(externa, "abc123")).toBe(externa);
  });
});
