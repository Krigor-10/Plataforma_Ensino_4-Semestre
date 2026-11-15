import { apiRequest, API_BASE_URL } from "./api.js";
import { TOKEN_KEY } from "../../../shared/sessionKeys.js";
import { webStorage } from "./webStorage.js";

export async function obterConversaAtualChatbot() {
  return apiRequest("/Chatbot/conversas/atual");
}

export async function enviarFeedbackMensagemChatbot(mensagemId, util) {
  return apiRequest(`/Chatbot/mensagens/${mensagemId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ util })
  });
}

// Cartao "Assistente" (Admin, topo da tela de Chamados).
export async function obterConfiguracaoChatbot() {
  return apiRequest("/Chatbot/configuracao");
}

export async function atualizarConfiguracaoChatbot({ ativo, tetoMensalUsd }) {
  return apiRequest("/Chatbot/configuracao", {
    method: "PUT",
    body: JSON.stringify({ ativo, tetoMensalUsd })
  });
}

export async function obterUsoChatbot() {
  return apiRequest("/Chatbot/uso");
}

/**
 * Envia uma pergunta ao Assistente CodeRyse em streaming (SSE). apiRequest
 * normal nao serve aqui porque le a resposta inteira como JSON de uma vez;
 * o chat precisa dos pedacos de texto chegando aos poucos. Mesmo padrao de
 * token manual que baixarArquivo (api.js) ja usa, sem a renovacao automatica
 * do apiRequest - uma pergunta e bem mais rapida que os 20min de validade
 * do token.
 */
export async function enviarMensagemChatbotStream({ texto, conversaId, contexto }, callbacks = {}, signal) {
  const { onTexto, onAcoes, onFim, onErro } = callbacks;
  const token = webStorage.getItem(TOKEN_KEY);

  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}/Chatbot/mensagens?stream=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ texto, conversaId: conversaId ?? null, contexto: contexto ?? null }),
      signal
    });
  } catch {
    onErro?.({ codigo: "rede", mensagem: "Nao foi possivel falar com o assistente agora." });
    return;
  }

  if (resposta.status === 429) {
    // O RateLimiter (policy "chatbot", 30/hora por aluno) corta a requisicao
    // ANTES do controller/SSE - nunca chega um evento "erro" nesse caso, so
    // um 429 puro sem corpo.
    onErro?.({ codigo: "limite_hora", mensagem: "Voce atingiu o limite de perguntas por hora. Tente de novo em alguns minutos." });
    return;
  }

  if (!resposta.ok || !resposta.body) {
    onErro?.({ codigo: "rede", mensagem: "Nao foi possivel falar com o assistente agora." });
    return;
  }

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let bufer = "";

  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;

    bufer += decodificador.decode(value, { stream: true });

    let indiceSeparador = bufer.indexOf("\n\n");
    while (indiceSeparador !== -1) {
      processarBlocoSse(bufer.slice(0, indiceSeparador), { onTexto, onAcoes, onFim, onErro });
      bufer = bufer.slice(indiceSeparador + 2);
      indiceSeparador = bufer.indexOf("\n\n");
    }
  }
}

function processarBlocoSse(bloco, { onTexto, onAcoes, onFim, onErro }) {
  let evento = null;
  let dadosBruto = "";

  for (const linha of bloco.split("\n")) {
    if (linha.startsWith("event:")) {
      evento = linha.slice(6).trim();
    } else if (linha.startsWith("data:")) {
      dadosBruto += linha.slice(5).trim();
    }
  }

  if (!evento) return;

  let dados;
  try {
    dados = dadosBruto ? JSON.parse(dadosBruto) : {};
  } catch {
    return;
  }

  if (evento === "texto") onTexto?.(dados.texto || "");
  else if (evento === "acoes") onAcoes?.(dados.acoes || []);
  else if (evento === "fim") onFim?.({ conversaId: dados.conversaId, mensagemId: dados.mensagemId });
  else if (evento === "erro") onErro?.({ codigo: dados.codigo, mensagem: dados.mensagem });
}
