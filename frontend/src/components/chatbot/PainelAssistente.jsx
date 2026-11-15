import { useEffect, useRef, useState } from "react";
import { TbAlertTriangle, TbSend2, TbThumbDown, TbThumbDownFilled, TbThumbUp, TbThumbUpFilled, TbX } from "react-icons/tb";
import Botao from "../Botao.jsx";
import { enviarFeedbackMensagemChatbot, enviarMensagemChatbotStream, obterConversaAtualChatbot } from "../../lib/chatbotApi.js";

const LIMITE_CARACTERES_PERGUNTA = 1000;

// PapelMensagemChatbot (backend): 1 = Usuario, 2 = Assistente. A API nao
// serializa esse enum como string (sem JsonStringEnumConverter configurado),
// mesmo padrao numerico ja usado em outras telas pra enums do backend.
const PAPEL_USUARIO = 1;
const PAPEL_ASSISTENTE = 2;

const CODIGOS_INDISPONIBILIDADE = new Set(["desligado", "teto_atingido", "limite_diario", "limite_hora"]);

/**
 * Divide o texto em negrito markdown (**assim**) sem precisar de lib de
 * markdown - a base de conhecimento/prompt do assistente usa só esse
 * recurso (e quebras de linha, já preservadas via white-space: pre-wrap).
 */
function renderizarTextoComNegrito(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, indice) =>
    parte.startsWith("**") && parte.endsWith("**")
      ? <strong key={indice}>{parte.slice(2, -2)}</strong>
      : <span key={indice}>{parte}</span>
  );
}

export default function PainelAssistente({ aberto, onFechar, contexto, onNavigate, perguntaInicial = null }) {
  const [mensagens, setMensagens] = useState([]);
  const [conversaId, setConversaId] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [jaCarregouHistorico, setJaCarregouHistorico] = useState(false);
  const [textoInput, setTextoInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [indisponibilidade, setIndisponibilidade] = useState(null);
  const refListaMensagens = useRef(null);
  const refUltimaPerguntaComErro = useRef("");
  const refUltimaChaveAutoEnviada = useRef(null);

  useEffect(() => {
    if (!aberto || jaCarregouHistorico) return;

    let efeitoAtivo = true;
    setCarregandoHistorico(true);

    obterConversaAtualChatbot()
      .then((conversa) => {
        if (!efeitoAtivo) return;
        if (conversa) {
          setConversaId(conversa.id);
          setMensagens(conversa.mensagens);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (efeitoAtivo) {
          setJaCarregouHistorico(true);
          setCarregandoHistorico(false);
        }
      });

    return () => {
      efeitoAtivo = false;
    };
  }, [aberto, jaCarregouHistorico]);

  // Atalhos "Por quê? Pergunte ao assistente" (SecoesAluno/SecaoCertificados/
  // SecaoMatriculas) abrem o painel com uma pergunta ja pronta e enviam na
  // hora - espera o historico carregar primeiro pra nao perder o conversaId
  // de uma conversa ja existente.
  useEffect(() => {
    if (!perguntaInicial || !jaCarregouHistorico) return;
    if (refUltimaChaveAutoEnviada.current === perguntaInicial.chave) return;

    refUltimaChaveAutoEnviada.current = perguntaInicial.chave;
    enviarPergunta(perguntaInicial.texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaInicial, jaCarregouHistorico]);

  useEffect(() => {
    if (!aberto) return;

    function fecharComEsc(evento) {
      if (evento.key === "Escape") onFechar();
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [aberto, onFechar]);

  useEffect(() => {
    if (refListaMensagens.current) {
      refListaMensagens.current.scrollTop = refListaMensagens.current.scrollHeight;
    }
  }, [mensagens]);

  async function enviarPergunta(textoForcado) {
    const texto = (textoForcado ?? textoInput).trim();
    if (!texto || texto.length > LIMITE_CARACTERES_PERGUNTA || enviando) return;

    setErroEnvio(null);
    setIndisponibilidade(null);
    setTextoInput("");
    setEnviando(true);

    const idTemporarioUsuario = `temp-usuario-${Date.now()}`;
    const idTemporarioAssistente = `temp-assistente-${Date.now()}`;

    setMensagens((atual) => [
      ...atual,
      { id: idTemporarioUsuario, papel: PAPEL_USUARIO, texto, acoes: [] },
      { id: idTemporarioAssistente, papel: PAPEL_ASSISTENTE, texto: "", acoes: [], aguardandoResposta: true }
    ]);

    await enviarMensagemChatbotStream(
      { texto, conversaId, contexto },
      {
        onTexto: (trecho) => {
          setMensagens((atual) => atual.map((mensagem) =>
            mensagem.id === idTemporarioAssistente
              ? { ...mensagem, texto: mensagem.texto + trecho, aguardandoResposta: false }
              : mensagem
          ));
        },
        onAcoes: (acoes) => {
          setMensagens((atual) => atual.map((mensagem) =>
            mensagem.id === idTemporarioAssistente ? { ...mensagem, acoes } : mensagem
          ));
        },
        onFim: ({ conversaId: novaConversaId, mensagemId }) => {
          setConversaId(novaConversaId);
          setMensagens((atual) => atual.map((mensagem) =>
            mensagem.id === idTemporarioAssistente ? { ...mensagem, id: mensagemId } : mensagem
          ));
        },
        onErro: ({ codigo, mensagem }) => {
          setMensagens((atual) => atual.filter((mensagem) => mensagem.id !== idTemporarioAssistente));

          if (CODIGOS_INDISPONIBILIDADE.has(codigo)) {
            setIndisponibilidade({ codigo, mensagem });
          } else {
            refUltimaPerguntaComErro.current = texto;
            setErroEnvio(mensagem || "Nao foi possivel falar com o assistente agora.");
          }
        }
      }
    );

    setEnviando(false);
  }

  function tentarDeNovo() {
    const texto = refUltimaPerguntaComErro.current;
    setErroEnvio(null);
    if (texto) enviarPergunta(texto);
  }

  async function registrarFeedback(mensagemId, util) {
    setMensagens((atual) => atual.map((mensagem) =>
      mensagem.id === mensagemId ? { ...mensagem, util } : mensagem
    ));

    try {
      await enviarFeedbackMensagemChatbot(mensagemId, util);
    } catch {
      // Falha silenciosa: o feedback e so telemetria, nao vale interromper
      // a conversa com um erro por isso.
    }
  }

  if (!aberto) return null;

  const mostrarBoasVindas = !carregandoHistorico && !conversaId && mensagens.length === 0;
  const restamCaracteres = LIMITE_CARACTERES_PERGUNTA - textoInput.length;

  return (
    <aside className="assistente-painel" role="dialog" aria-label="Assistente CodeRyse">
      <header className="assistente-painel__cabecalho">
        <h2>Assistente CodeRyse</h2>
        <button
          type="button"
          className="assistente-painel__fechar"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <TbX aria-hidden="true" size={20} />
        </button>
      </header>

      <div className="assistente-painel__mensagens" ref={refListaMensagens} aria-live="polite">
        {carregandoHistorico ? (
          <p className="assistente-painel__estado">Carregando conversa...</p>
        ) : (
          <>
            {mostrarBoasVindas ? (
              <div className="assistente-mensagem assistente-mensagem--assistente">
                <p>
                  Oi! Eu sou o Assistente CodeRyse. Posso ajudar com dúvidas sobre seus cursos,
                  avaliações, certificados e pagamentos.
                </p>
                <p className="assistente-painel__aviso-retencao">
                  As conversas são registradas por 90 dias para melhorar o atendimento.
                </p>
              </div>
            ) : null}

            {mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`assistente-mensagem assistente-mensagem--${mensagem.papel === PAPEL_USUARIO ? "usuario" : "assistente"}`}
              >
                {mensagem.aguardandoResposta ? (
                  <p className="assistente-painel__digitando" aria-label="Assistente digitando">
                    <span /><span /><span />
                  </p>
                ) : (
                  <p>{renderizarTextoComNegrito(mensagem.texto)}</p>
                )}

                {mensagem.acoes?.length > 0 ? (
                  <div className="assistente-mensagem__acoes">
                    {mensagem.acoes.map((acao) => (
                      <Botao
                        key={acao.rota}
                        tamanho="pequeno"
                        variante="secundario"
                        onClick={() => onNavigate(`/app/${acao.rota}`)}
                      >
                        {acao.rotulo}
                      </Botao>
                    ))}
                  </div>
                ) : null}

                {mensagem.papel === PAPEL_ASSISTENTE && !mensagem.aguardandoResposta && typeof mensagem.id === "number" ? (
                  <div className="assistente-mensagem__feedback">
                    <button
                      type="button"
                      aria-label="Resposta util"
                      aria-pressed={mensagem.util === true}
                      onClick={() => registrarFeedback(mensagem.id, true)}
                    >
                      {mensagem.util === true ? <TbThumbUpFilled aria-hidden="true" size={16} /> : <TbThumbUp aria-hidden="true" size={16} />}
                    </button>
                    <button
                      type="button"
                      aria-label="Resposta nao util"
                      aria-pressed={mensagem.util === false}
                      onClick={() => registrarFeedback(mensagem.id, false)}
                    >
                      {mensagem.util === false ? <TbThumbDownFilled aria-hidden="true" size={16} /> : <TbThumbDown aria-hidden="true" size={16} />}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </>
        )}

        {erroEnvio ? (
          <div className="assistente-painel__erro" role="alert">
            <TbAlertTriangle aria-hidden="true" size={16} />
            <span>{erroEnvio}</span>
            <button type="button" onClick={tentarDeNovo}>Tentar de novo</button>
          </div>
        ) : null}

        {indisponibilidade ? (
          <div className="assistente-painel__erro assistente-painel__erro--indisponivel" role="alert">
            <TbAlertTriangle aria-hidden="true" size={16} />
            <span>{indisponibilidade.mensagem}</span>
          </div>
        ) : null}
      </div>

      <form
        className="assistente-painel__form"
        onSubmit={(evento) => {
          evento.preventDefault();
          enviarPergunta();
        }}
      >
        <label htmlFor="assistente-input" className="visualmente-oculto">Pergunta para o Assistente CodeRyse</label>
        <textarea
          id="assistente-input"
          value={textoInput}
          onChange={(evento) => setTextoInput(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              enviarPergunta();
            }
          }}
          placeholder="Digite sua pergunta..."
          maxLength={LIMITE_CARACTERES_PERGUNTA}
          disabled={enviando || Boolean(indisponibilidade)}
          rows={1}
        />
        <span
          className={`assistente-painel__contador${restamCaracteres <= 50 ? " assistente-painel__contador--limite" : ""}`}
        >
          {restamCaracteres}
        </span>
        <button
          type="submit"
          className="assistente-painel__enviar"
          disabled={enviando || !textoInput.trim() || Boolean(indisponibilidade)}
          aria-label="Enviar pergunta"
        >
          <TbSend2 aria-hidden="true" size={18} />
        </button>
      </form>
    </aside>
  );
}
