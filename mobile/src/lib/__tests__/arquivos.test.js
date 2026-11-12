import { ehArquivoProprio, extrairNomeArquivo, resolverUrlArquivo, resolverUrlArquivoAbsoluta } from "../arquivos.js";

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

describe("ehArquivoProprio", () => {
  it("true pra caminho /uploads/", () => {
    expect(ehArquivoProprio("/uploads/questoes/arquivo.pdf")).toBe(true);
  });

  it("false pra url externa, vazio ou nulo", () => {
    expect(ehArquivoProprio("https://exemplo.com/arquivo.pdf")).toBe(false);
    expect(ehArquivoProprio("")).toBe(false);
    expect(ehArquivoProprio(null)).toBe(false);
  });
});

describe("resolverUrlArquivoAbsoluta", () => {
  it("resolve /uploads/ pro gateway sem nenhum token na query", () => {
    expect(resolverUrlArquivoAbsoluta("/uploads/questoes/arquivo.pdf")).toBe(
      "http://127.0.0.1:4000/uploads/questoes/arquivo.pdf"
    );
  });

  it("nao mexe em url externa", () => {
    const externa = "https://exemplo.com/arquivo.pdf";
    expect(resolverUrlArquivoAbsoluta(externa)).toBe(externa);
  });

  it("retorna o proprio valor quando a url e vazia", () => {
    expect(resolverUrlArquivoAbsoluta(null)).toBeNull();
    expect(resolverUrlArquivoAbsoluta(undefined)).toBeUndefined();
  });
});

describe("extrairNomeArquivo", () => {
  it("extrai o ultimo segmento do caminho, sem query string", () => {
    expect(extrairNomeArquivo("/uploads/questoes/arquivo.pdf?access_token=abc")).toBe("arquivo.pdf");
  });

  it("decodifica caracteres de URL no nome", () => {
    expect(extrairNomeArquivo("/uploads/conteudos/prova%20final.pdf")).toBe("prova final.pdf");
  });

  it("usa o fallback quando a url e vazia ou termina sem nome", () => {
    expect(extrairNomeArquivo(null, "documento")).toBe("documento");
    expect(extrairNomeArquivo("/uploads/conteudos/", "documento")).toBe("documento");
  });
});
