import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbRefresh, TbSend2 } from "react-icons/tb";
import Insignia from "../Insignia.jsx";
import { listarMeusChamados, reabrirChamado, responderChamado } from "../../lib/chamadosApi.js";

const LIMITE_CARACTERES_RESPOSTA = 1000;
const PRAZO_REABERTURA_DIAS = 7;

// StatusChamadoSuporte (backend): 1 = Aberto, 2 = Respondido, 3 = Resolvido.
// Mesmo padrao numerico sem JsonStringEnumConverter ja usado no
// PapelMensagemChatbot (PainelAssistente.jsx).
const STATUS_RESOLVIDO = 3;
const ROTULO_POR_STATUS = { 1: "Aberto", 2: "Respondido", 3: "Resolvido" };

function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dentroDoPrazoDeReabertura(chamado) {
  if (chamado.status !== STATUS_RESOLVIDO || !chamado.resolvidoEm) return false;
  const diasDesdeResolucao = (Date.now() - new Date(chamado.resolvidoEm).getTime()) / (1000 * 60 * 60 * 24);
  return diasDesdeResolucao <= PRAZO_REABERTURA_DIAS;
}

export default function AbaMeusChamados({ usuarioId, chamadoInicialId }) {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [chamadoSelecionadoId, setChamadoSelecionadoId] = useState(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [erroResposta, setErroResposta] = useState(null);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    let efeitoAtivo = true;
    setCarregando(true);

    listarMeusChamados()
      .then((lista) => {
        if (efeitoAtivo) setChamados(lista);
      })
      .catch(() => {
        if (efeitoAtivo) setErro("Nao foi possivel carregar seus chamados agora.");
      })
      .finally(() => {
        if (efeitoAtivo) setCarregando(false);
      });

    return () => {
      efeitoAtivo = false;
    };
  }, []);

  // Deep link (notificacao de chamado respondido/reaberto, ou chamado que
  // acabou de ser criado pelo formulario "Falar com o suporte") - so
  // seleciona depois que a lista carregar, pra garantir que o chamado exista.
  useEffect(() => {
    if (!chamadoInicialId) return;
    if (chamados.some((chamado) => chamado.id === chamadoInicialId)) {
      setChamadoSelecionadoId(chamadoInicialId);
    }
  }, [chamadoInicialId, chamados]);

  const chamadoSelecionado = useMemo(
    () => chamados.find((chamado) => chamado.id === chamadoSelecionadoId) || null,
    [chamados, chamadoSelecionadoId]
  );

  function atualizarChamadoNaLista(chamadoAtualizado) {
    setChamados((atual) => atual.map((chamado) => (chamado.id === chamadoAtualizado.id ? chamadoAtualizado : chamado)));
  }

  async function enviarResposta() {
    const texto = textoResposta.trim();
    if (!texto || enviandoResposta || !chamadoSelecionado) return;

    setErroResposta(null);
    setEnviandoResposta(true);

    try {
      const chamadoAtualizado = await responderChamado(chamadoSelecionado.id, texto);
      atualizarChamadoNaLista(chamadoAtualizado);
      setTextoResposta("");
    } catch {
      setErroResposta("Nao foi possivel enviar sua resposta agora.");
    } finally {
      setEnviandoResposta(false);
    }
  }

  async function reabrir() {
    if (!chamadoSelecionado || reabrindo) return;

    setErroResposta(null);
    setReabrindo(true);

    try {
      await reabrirChamado(chamadoSelecionado.id);
      const listaAtualizada = await listarMeusChamados();
      setChamados(listaAtualizada);
    } catch {
      setErroResposta("Nao foi possivel reabrir este chamado agora.");
    } finally {
      setReabrindo(false);
    }
  }

  if (carregando) {
    return <p className="assistente-painel__estado">Carregando seus chamados...</p>;
  }

  if (erro) {
    return <p className="assistente-painel__estado">{erro}</p>;
  }

  if (!chamadoSelecionado) {
    return (
      <div className="meus-chamados">
        {chamados.length === 0 ? (
          <p className="assistente-painel__estado">
            Você ainda não abriu nenhum chamado. Use "Falar com o suporte" na aba Conversa.
          </p>
        ) : (
          <ul className="meus-chamados__lista">
            {chamados.map((chamado) => (
              <li key={chamado.id}>
                <button
                  type="button"
                  className="meus-chamados__item"
                  onClick={() => setChamadoSelecionadoId(chamado.id)}
                >
                  <span className="meus-chamados__item-assunto">{chamado.resumo}</span>
                  <span className="meus-chamados__item-meta">
                    <span>{chamado.cursoTitulo || "Plataforma / conta"}</span>
                    <Insignia texto={ROTULO_POR_STATUS[chamado.status] || "Aberto"} />
                  </span>
                  <span className="meus-chamados__item-data">{formatarData(chamado.atualizadoEm)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const podeReabrir = dentroDoPrazoDeReabertura(chamadoSelecionado);
  const chamadoResolvidoForaDoPrazo = chamadoSelecionado.status === STATUS_RESOLVIDO && !podeReabrir;

  return (
    <div className="meus-chamados meus-chamados--detalhe">
      <button type="button" className="meus-chamados__voltar" onClick={() => setChamadoSelecionadoId(null)}>
        <TbArrowLeft aria-hidden="true" size={16} /> Meus chamados
      </button>

      <div className="meus-chamados__detalhe-cabecalho">
        <span>{chamadoSelecionado.cursoTitulo || "Plataforma / conta"}</span>
        <Insignia texto={ROTULO_POR_STATUS[chamadoSelecionado.status] || "Aberto"} />
      </div>

      <div className="meus-chamados__conversa">
        {chamadoSelecionado.mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={`chamado-mensagem${mensagem.autorId === usuarioId ? " chamado-mensagem--eu" : " chamado-mensagem--equipe"}`}
          >
            {mensagem.autorId !== usuarioId ? <span className="chamado-mensagem__autor">{mensagem.autorNome}</span> : null}
            <p>{mensagem.texto}</p>
          </div>
        ))}
      </div>

      {erroResposta ? <p className="formulario-chamado__erro" role="alert">{erroResposta}</p> : null}

      {chamadoResolvidoForaDoPrazo ? (
        <p className="meus-chamados__aviso-prazo">
          Chamado resolvido há mais de {PRAZO_REABERTURA_DIAS} dias. Para um novo problema, abra outro chamado.
        </p>
      ) : podeReabrir ? (
        <button type="button" className="meus-chamados__reabrir" onClick={reabrir} disabled={reabrindo}>
          <TbRefresh aria-hidden="true" size={16} /> {reabrindo ? "Reabrindo..." : "Reabrir"}
        </button>
      ) : (
        <form
          className="meus-chamados__responder"
          onSubmit={(evento) => {
            evento.preventDefault();
            enviarResposta();
          }}
        >
          <label htmlFor="meus-chamados-resposta" className="visualmente-oculto">Responder ao chamado</label>
          <textarea
            id="meus-chamados-resposta"
            value={textoResposta}
            onChange={(evento) => setTextoResposta(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" && !evento.shiftKey) {
                evento.preventDefault();
                enviarResposta();
              }
            }}
            maxLength={LIMITE_CARACTERES_RESPOSTA}
            placeholder="Escreva sua resposta..."
            rows={1}
            disabled={enviandoResposta}
          />
          <button
            type="submit"
            className="meus-chamados__enviar"
            disabled={enviandoResposta || !textoResposta.trim()}
            aria-label="Enviar resposta"
          >
            <TbSend2 aria-hidden="true" size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
