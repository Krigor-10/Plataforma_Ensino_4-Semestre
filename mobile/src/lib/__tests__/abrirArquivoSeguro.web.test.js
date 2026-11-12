import { abrirArquivoSeguro } from "../abrirArquivoSeguro.web.js";

function criarElementoFalso() {
  return { click: jest.fn(), href: "", download: "", rel: "" };
}

describe("abrirArquivoSeguro (web)", () => {
  let elementoCriado;

  beforeEach(() => {
    elementoCriado = criarElementoFalso();
    global.fetch = jest.fn();
    global.document = {
      createElement: jest.fn(() => elementoCriado),
      body: { appendChild: jest.fn(), removeChild: jest.fn() }
    };
    global.URL.createObjectURL = jest.fn(() => "blob:fake-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  it("busca com o token no header Authorization e dispara o download via blob: URL", async () => {
    const blobFalso = { tipo: "blob" };
    global.fetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blobFalso) });

    await abrirArquivoSeguro({
      nomeArquivo: "arquivo.pdf",
      token: "abc123",
      urlAbsoluta: "http://127.0.0.1:4000/uploads/conteudos/arquivo.pdf"
    });

    expect(global.fetch).toHaveBeenCalledWith("http://127.0.0.1:4000/uploads/conteudos/arquivo.pdf", {
      headers: { Authorization: "Bearer abc123" }
    });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blobFalso);
    expect(elementoCriado.href).toBe("blob:fake-url");
    expect(elementoCriado.download).toBe("arquivo.pdf");
    expect(elementoCriado.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("nao manda header Authorization quando nao ha token", async () => {
    global.fetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve({}) });

    await abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: null, urlAbsoluta: "http://x/arquivo.pdf" });

    expect(global.fetch).toHaveBeenCalledWith("http://x/arquivo.pdf", { headers: undefined });
  });

  it("lanca erro quando a resposta nao e ok", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(
      abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: "abc", urlAbsoluta: "http://x/arquivo.pdf" })
    ).rejects.toThrow();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("revoga a blob: URL mesmo se o clique falhar", async () => {
    global.fetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve({}) });
    elementoCriado.click.mockImplementation(() => {
      throw new Error("falha inesperada");
    });

    await expect(
      abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: "abc", urlAbsoluta: "http://x/arquivo.pdf" })
    ).rejects.toThrow();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});
