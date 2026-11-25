import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbCheck, TbSend2, TbSettings } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";
import { listarChamadosParaStaff, obterChamado, resolverChamado, responderChamado } from "../../lib/chamadosApi.js";

const LIMITE_CARACTERES_RESPOSTA = 1000;

// StatusChamadoSuporte (backend): 1 = Aberto, 2 = Respondido, 3 = Resolvido -
// mesmo padrao numerico sem JsonStringEnumConverter ja usado em
// AbaMeusChamados.jsx (lado do Aluno).
const ABAS_STATUS = [
  { chave: "abertos", rotulo: "Abertos", status: 1 },
  { chave: "respondidos", rotulo: "Respondidos", status: 2 },
  { chave: "resolvidos", rotulo: "Resolvidos", status: 3 }
];
const ROTULO_POR_STATUS = { 1: "Aberto", 2: "Respondido", 3: "Resolvido" };

export function SecaoChamados({ usuario, ehAdmin, coordenadores = [], chamadoIdSelecionado = null, onAbrirConfiguracaoAssistente, onRefresh, onSessionExpired }) {
  const { mostrarToast } = useToast();
  const [abaStatus, setAbaStatus] = useState("abertos");
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [chamadoSelecionadoId, setChamadoSelecionadoId] = useState(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [resolvendo, setResolvendo] = useState(false);
  const refAbas = useRef(null);
  const abasTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbas);

  const nomeCoordenadorPorId = useMemo(() => {
    const mapa = new Map();
    coordenadores.forEach((coordenador) => mapa.set(coordenador.id, coordenador.nome));
    return mapa;
  }, [coordenadores]);

  async function carregar(chaveAba) {
    setCarregando(true);
    setErro("");

    try {
      const statusDaAba = ABAS_STATUS.find((aba) => aba.chave === chaveAba)?.status ?? null;
      const lista = await listarChamadosParaStaff(statusDaAba);
      setChamados(lista);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setErro(err.message || "Nao foi possivel carregar os chamados agora.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar(abaStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaStatus]);

  // Link da notificacao de chamado ("/app/chamados/:id") - o chamado pode
  // estar em qualquer status, entao busca ele direto pra descobrir em qual
  // aba mostrar (a troca de aba dispara o carregar() de cima sozinha).
  useEffect(() => {
    if (!chamadoIdSelecionado) return;

    let efeitoAtivo = true;
    obterChamado(chamadoIdSelecionado)
      .then((chamado) => {
        if (!efeitoAtivo) return;
        const abaDoChamado = ABAS_STATUS.find((aba) => aba.status === chamado.status)?.chave || "abertos";
        setAbaStatus(abaDoChamado);
        setChamadoSelecionadoId(chamado.id);
      })
      .catch(() => {});

    return () => {
      efeitoAtivo = false;
    };
  }, [chamadoIdSelecionado]);

  const chamadoSelecionado = chamados.find((chamado) => chamado.id === chamadoSelecionadoId) || null;

  async function enviarResposta() {
    const texto = textoResposta.trim();
    if (!texto || enviandoResposta || !chamadoSelecionado) return;

    setEnviandoResposta(true);

    try {
      const chamadoAtualizado = await responderChamado(chamadoSelecionado.id, texto);
      setTextoResposta("");
      mostrarToast("Resposta enviada.", "sucesso");
      onRefresh?.();

      const novaAba = ABAS_STATUS.find((aba) => aba.status === chamadoAtualizado.status)?.chave || abaStatus;
      if (novaAba !== abaStatus) {
        setChamadoSelecionadoId(chamadoAtualizado.id);
        setAbaStatus(novaAba);
      } else {
        await carregar(abaStatus);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel enviar a resposta agora.", "erro");
    } finally {
      setEnviandoResposta(false);
    }
  }

  async function marcarComoResolvido() {
    if (!chamadoSelecionado || resolvendo) return;

    setResolvendo(true);

    try {
      await resolverChamado(chamadoSelecionado.id);
      mostrarToast("Chamado marcado como resolvido.", "sucesso");
      setChamadoSelecionadoId(null);
      onRefresh?.();
      await carregar(abaStatus);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel resolver o chamado agora.", "erro");
    } finally {
      setResolvendo(false);
    }
  }

  function selecionarAba(chaveAba) {
    setAbaStatus(chaveAba);
    setChamadoSelecionadoId(null);
  }

  return (
    <div className="tela-chamados">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Chamados</h2>
          <p className="cabecalho-pagina__subtitulo">
            {ehAdmin
              ? "Todos os chamados abertos pelos alunos pelo Assistente CodeRyse."
              : "Chamados encaminhados para os cursos que voce coordena."}
          </p>
        </div>
        {ehAdmin ? (
          <button
            className="cabecalho-pagina__link-discreto"
            onClick={onAbrirConfiguracaoAssistente}
            type="button"
          >
            <TbSettings aria-hidden="true" size={14} /> Configurar assistente
          </button>
        ) : null}
      </header>

      <nav
        aria-label="Status dos chamados"
        className={`abas-matriculas${abasTemConteudoEscondido ? " abas-matriculas--mais-a-direita" : ""}`}
        ref={refAbas}
        role="tablist"
      >
        {ABAS_STATUS.map((aba) => (
          <button
            key={aba.chave}
            aria-selected={abaStatus === aba.chave}
            className={`abas-matriculas__aba${abaStatus === aba.chave ? " abas-matriculas__aba--ativa" : ""}`}
            onClick={() => selecionarAba(aba.chave)}
            role="tab"
            type="button"
          >
            {aba.rotulo}
          </button>
        ))}
      </nav>

      <div className={`tela-chamados__corpo painel-secao${chamadoSelecionado ? " tela-chamados__corpo--detalhe-ativa" : ""}`}>
        <div className="tela-chamados__lista">
          {carregando ? (
            <p className="texto-vazio">Carregando chamados...</p>
          ) : erro ? (
            <InlineMessage tone="error">{erro}</InlineMessage>
          ) : chamados.length === 0 ? (
            <p className="texto-vazio">Nenhum chamado {ABAS_STATUS.find((aba) => aba.chave === abaStatus)?.rotulo.toLowerCase()}.</p>
          ) : (
            <ul className="tela-chamados__itens" role="list">
              {chamados.map((chamado) => (
                <li key={chamado.id}>
                  <button
                    type="button"
                    className={`tela-chamados__item${chamadoSelecionadoId === chamado.id ? " tela-chamados__item--ativo" : ""}`}
                    onClick={() => setChamadoSelecionadoId(chamado.id)}
                  >
                    <span className="tela-chamados__item-topo">
                      <strong>{chamado.alunoNome}</strong>
                      <span className="tela-chamados__item-data">{formatDate(chamado.atualizadoEm)}</span>
                    </span>
                    <span className="tela-chamados__item-assunto">{chamado.resumo}</span>
                    <span className="tela-chamados__item-curso">{chamado.cursoTitulo || "Plataforma / conta"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tela-chamados__detalhe">
          {!chamadoSelecionado ? (
            <p className="texto-vazio tela-chamados__detalhe-vazio">Selecione um chamado para ver a conversa.</p>
          ) : (
            <>
              <button type="button" className="tela-chamados__voltar-mobile" onClick={() => setChamadoSelecionadoId(null)}>
                <TbArrowLeft aria-hidden="true" size={16} /> Voltar para a lista
              </button>

              <header className="tela-chamados__detalhe-cabecalho">
                <div>
                  <h3>{chamadoSelecionado.alunoNome}</h3>
                  <p>{chamadoSelecionado.cursoTitulo || "Plataforma / conta"}</p>
                </div>
                <Insignia texto={ROTULO_POR_STATUS[chamadoSelecionado.status] || "Aberto"} />
              </header>

              {ehAdmin ? (
                <p className="tela-chamados__destino">
                  {chamadoSelecionado.coordenadorDestinoId
                    ? `Encaminhado para ${nomeCoordenadorPorId.get(chamadoSelecionado.coordenadorDestinoId) || "o coordenador do curso"} · Admin acompanha`
                    : "Encaminhado para a administração da plataforma · Admin acompanha"}
                </p>
              ) : null}

              <section className="tela-chamados__resumo">
                <h4>Resumo da conversa com o assistente</h4>
                <p>{chamadoSelecionado.resumo}</p>
              </section>

              <section className="tela-chamados__conversa">
                <h4>Conversa do chamado</h4>
                <div className="tela-chamados__mensagens">
                  {chamadoSelecionado.mensagens.map((mensagem) => (
                    <div
                      key={mensagem.id}
                      className={`chamado-mensagem${mensagem.autorId === usuario.id ? " chamado-mensagem--eu" : " chamado-mensagem--equipe"}`}
                    >
                      <span className="chamado-mensagem__autor">
                        {mensagem.autorId === usuario.id ? "Você" : mensagem.autorNome}
                      </span>
                      <p>{mensagem.texto}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="tela-chamados__acoes">
                <form
                  className="tela-chamados__responder"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    enviarResposta();
                  }}
                >
                  <label htmlFor="chamado-staff-resposta" className="visualmente-oculto">Responder ao chamado</label>
                  <textarea
                    id="chamado-staff-resposta"
                    value={textoResposta}
                    onChange={(evento) => setTextoResposta(evento.target.value)}
                    maxLength={LIMITE_CARACTERES_RESPOSTA}
                    placeholder="Escreva sua resposta..."
                    rows={2}
                    disabled={enviandoResposta}
                  />
                  <Botao
                    type="submit"
                    variante="primario"
                    tamanho="pequeno"
                    disabled={enviandoResposta || !textoResposta.trim()}
                  >
                    <TbSend2 aria-hidden="true" size={16} /> Responder
                  </Botao>
                </form>

                {chamadoSelecionado.status !== 3 ? (
                  <Botao
                    type="button"
                    variante="secundario"
                    tamanho="pequeno"
                    onClick={marcarComoResolvido}
                    disabled={resolvendo}
                  >
                    <TbCheck aria-hidden="true" size={16} /> {resolvendo ? "Marcando..." : "Marcar como resolvido"}
                  </Botao>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
