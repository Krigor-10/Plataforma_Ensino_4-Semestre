import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { enviarMensagemChatbotStream } from "./chatbotApi.js";

function montarRespostaSse(blocosTexto) {
  const codificador = new TextEncoder();
  let indice = 0;

  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read() {
            if (indice >= blocosTexto.length) {
              return Promise.resolve({ done: true, value: undefined });
            }
            const valor = codificador.encode(blocosTexto[indice]);
            indice += 1;
            return Promise.resolve({ done: false, value: valor });
          }
        };
      }
    }
  };
}

describe("enviarMensagemChatbotStream", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("repassa os eventos texto, acoes e fim pros callbacks na ordem certa", async () => {
    fetch.mockResolvedValue(
      montarRespostaSse([
        'event: texto\ndata: {"texto":"Ola"}\n\n',
        'event: texto\ndata: {"texto":", tudo bem?"}\n\n',
        'event: acoes\ndata: {"acoes":[{"rota":"certificados","rotulo":"Ir para Certificados"}]}\n\n',
        'event: fim\ndata: {"conversaId":5,"mensagemId":42}\n\n'
      ])
    );

    const trechos = [];
    const acoesRecebidas = [];
    const fimRecebido = vi.fn();

    await enviarMensagemChatbotStream(
      { texto: "oi", conversaId: null, contexto: null },
      {
        onTexto: (trecho) => trechos.push(trecho),
        onAcoes: (acoes) => acoesRecebidas.push(acoes),
        onFim: fimRecebido
      }
    );

    expect(trechos).toEqual(["Ola", ", tudo bem?"]);
    expect(acoesRecebidas).toEqual([[{ rota: "certificados", rotulo: "Ir para Certificados" }]]);
    expect(fimRecebido).toHaveBeenCalledWith({ conversaId: 5, mensagemId: 42 });
  });

  test("blocos SSE fragmentados em pedacos de rede diferentes ainda sao interpretados corretamente", async () => {
    fetch.mockResolvedValue(
      montarRespostaSse(['event: texto\nda', 'ta: {"texto":"frag', 'mentado"}\n\n'])
    );

    const trechos = [];
    await enviarMensagemChatbotStream({ texto: "oi", conversaId: null, contexto: null }, {
      onTexto: (trecho) => trechos.push(trecho)
    });

    expect(trechos).toEqual(["fragmentado"]);
  });

  test("evento erro chama onErro com o codigo e a mensagem do backend", async () => {
    fetch.mockResolvedValue(
      montarRespostaSse(['event: erro\ndata: {"codigo":"teto_atingido","mensagem":"Limite do mes atingido."}\n\n'])
    );

    const onErro = vi.fn();
    await enviarMensagemChatbotStream({ texto: "oi", conversaId: null, contexto: null }, { onErro });

    expect(onErro).toHaveBeenCalledWith({ codigo: "teto_atingido", mensagem: "Limite do mes atingido." });
  });

  test("HTTP 429 (RateLimiter, sem corpo) vira erro de codigo limite_hora", async () => {
    fetch.mockResolvedValue({ ok: false, status: 429, body: null });

    const onErro = vi.fn();
    await enviarMensagemChatbotStream({ texto: "oi", conversaId: null, contexto: null }, { onErro });

    expect(onErro).toHaveBeenCalledWith(expect.objectContaining({ codigo: "limite_hora" }));
  });

  test("falha de rede (fetch rejeita) vira erro de codigo rede", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const onErro = vi.fn();
    await enviarMensagemChatbotStream({ texto: "oi", conversaId: null, contexto: null }, { onErro });

    expect(onErro).toHaveBeenCalledWith(expect.objectContaining({ codigo: "rede" }));
  });
});
