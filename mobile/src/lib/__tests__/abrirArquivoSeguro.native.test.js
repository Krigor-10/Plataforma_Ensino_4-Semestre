import { abrirArquivoSeguro } from "../abrirArquivoSeguro.native.js";

const mockDownloadFileAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();

jest.mock("expo-file-system", () => {
  class FileFalso {
    constructor(...partes) {
      this.uri = `file:///cache/${partes[partes.length - 1]}`;
    }
  }
  FileFalso.downloadFileAsync = (...args) => mockDownloadFileAsync(...args);
  return { File: FileFalso, Paths: { cache: "DIRETORIO_CACHE_FALSO" } };
});

jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args) => mockIsAvailableAsync(...args),
  shareAsync: (...args) => mockShareAsync(...args)
}));

describe("abrirArquivoSeguro (native)", () => {
  beforeEach(() => {
    mockDownloadFileAsync.mockReset();
    mockIsAvailableAsync.mockReset();
    mockShareAsync.mockReset();
  });

  it("baixa com o token no header Authorization e compartilha o arquivo local", async () => {
    mockDownloadFileAsync.mockResolvedValue({ uri: "file:///cache/arquivo.pdf" });
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);

    await abrirArquivoSeguro({
      nomeArquivo: "arquivo.pdf",
      token: "abc123",
      urlAbsoluta: "http://127.0.0.1:4000/uploads/conteudos/arquivo.pdf"
    });

    expect(mockDownloadFileAsync).toHaveBeenCalledTimes(1);
    const [urlChamada, destinoChamado, opcoesChamadas] = mockDownloadFileAsync.mock.calls[0];
    expect(urlChamada).toBe("http://127.0.0.1:4000/uploads/conteudos/arquivo.pdf");
    expect(destinoChamado.uri).toBe("file:///cache/arquivo.pdf");
    expect(opcoesChamadas).toEqual({ headers: { Authorization: "Bearer abc123" }, idempotent: true });
    expect(mockShareAsync).toHaveBeenCalledWith("file:///cache/arquivo.pdf");
  });

  it("nao manda header Authorization quando nao ha token", async () => {
    mockDownloadFileAsync.mockResolvedValue({ uri: "file:///cache/arquivo.pdf" });
    mockIsAvailableAsync.mockResolvedValue(true);

    await abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: null, urlAbsoluta: "http://x/arquivo.pdf" });

    const [, , opcoesChamadas] = mockDownloadFileAsync.mock.calls[0];
    expect(opcoesChamadas.headers).toBeUndefined();
  });

  it("propaga o erro quando o download falha", async () => {
    mockDownloadFileAsync.mockRejectedValue(new Error("UnableToDownload: status 401"));

    await expect(
      abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: "abc", urlAbsoluta: "http://x/arquivo.pdf" })
    ).rejects.toThrow();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it("lanca erro quando o dispositivo nao sabe compartilhar arquivos", async () => {
    mockDownloadFileAsync.mockResolvedValue({ uri: "file:///cache/arquivo.pdf" });
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(
      abrirArquivoSeguro({ nomeArquivo: "arquivo.pdf", token: "abc", urlAbsoluta: "http://x/arquivo.pdf" })
    ).rejects.toThrow();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
