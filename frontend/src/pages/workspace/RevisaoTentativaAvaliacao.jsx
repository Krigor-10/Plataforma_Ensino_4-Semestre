import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbCheck, TbClock, TbMinus, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import ImagemComZoom from "../../components/ImagemComZoom.jsx";
import Modal from "../../components/Modal.jsx";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";

const TIPO_QUESTAO_DISSERTATIVA = 3;

const ROTULOS_TIPO_QUESTAO = {
  1: "Múltipla escolha",
  2: "Verdadeiro/Falso",
  3: "Dissertativa",
  4: "Afirmativas combinadas"
};

const ROTULOS_STATUS_QUESTAO = {
  certo: "Correta",
  errado: "Incorreta",
  pendente: "Aguardando correção",
  "sem-resposta": "Sem resposta"
};

function formatScore(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function normalizarTipoQuestao(tipo) {
  return ROTULOS_TIPO_QUESTAO[Number(tipo)] || "Questão";
}

function obterStatusQuestao(questao) {
  if (questao.correta === true) {
    return "certo";
  }
  if (questao.correta === false) {
    return "errado";
  }
  return Number(questao.tipoQuestao) === TIPO_QUESTAO_DISSERTATIVA ? "pendente" : "sem-resposta";
}

function IconeStatusQuestao({ status }) {
  if (status === "certo") {
    return <TbCheck aria-hidden="true" size={14} />;
  }
  if (status === "errado") {
    return <TbX aria-hidden="true" size={14} />;
  }
  if (status === "pendente") {
    return <TbClock aria-hidden="true" size={14} />;
  }
  return <TbMinus aria-hidden="true" size={14} />;
}

function QuestaoRevisao({ indice, onAmpliarImagem, questao, total }) {
  const status = obterStatusQuestao(questao);
  const imagens = (questao.anexos || []).filter((anexo) => anexo.tipoAnexo === "Imagem");
  const arquivos = (questao.anexos || []).filter((anexo) => anexo.tipoAnexo !== "Imagem");

  return (
    <section className="revisao-questao">
      <header className="revisao-questao__cabecalho">
        <span className="revisao-questao__numero">
          Questão {indice + 1} de {total} · {normalizarTipoQuestao(questao.tipoQuestao)} · {formatScore(questao.pontosObtidos)}/{formatScore(questao.pontos)} ponto{Number(questao.pontos) === 1 ? "" : "s"}
        </span>
        {status === "certo" ? (
          <span className="revisao-questao__status revisao-questao__status--certo">
            <TbCheck aria-hidden="true" size={15} /> Correta
          </span>
        ) : status === "errado" ? (
          <span className="revisao-questao__status revisao-questao__status--errado">
            <TbX aria-hidden="true" size={15} /> Incorreta
          </span>
        ) : status === "pendente" ? (
          <span className="revisao-questao__status revisao-questao__status--pendente">Aguardando correção</span>
        ) : null}
      </header>

      {questao.contexto ? (
        <div className="revisao-questao__contexto">
          <p>{questao.contexto}</p>
        </div>
      ) : null}

      {imagens.length > 0 ? (
        <div className="quiz-anexos quiz-anexos--imagens">
          {imagens.map((anexo) => (
            <figure className="quiz-anexo-imagem" key={anexo.id}>
              <button
                className="revisao-questao__anexo-imagem-botao"
                onClick={() => onAmpliarImagem(anexo)}
                type="button"
              >
                <img alt={anexo.titulo} src={resolverUrlArquivo(anexo.arquivoUrl)} />
              </button>
              <figcaption>Clique para ampliar</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {arquivos.length > 0 ? (
        <div className="quiz-anexos quiz-anexos--arquivos">
          {arquivos.map((anexo) => (
            <a className="quiz-anexo-arquivo" href={resolverUrlArquivo(anexo.arquivoUrl)} key={anexo.id} rel="noreferrer" target="_blank">
              {anexo.titulo}
            </a>
          ))}
        </div>
      ) : null}

      <p className="revisao-questao__enunciado">{questao.enunciado}</p>

      {questao.afirmativas.length > 0 ? (
        <div className="revisao-questao__bloco">
          <p className="revisao-questao__rotulo">Afirmativas avaliadas</p>
          <ol className="revisao-afirmativas" role="list">
            {questao.afirmativas.map((afirmativa) => (
              <li className="revisao-afirmativas__item" key={afirmativa.numero}>
                <div className="revisao-afirmativas__cabecalho">
                  <span
                    className={`revisao-afirmativas__letra${afirmativa.ehCorreta ? " revisao-afirmativas__letra--correta" : " revisao-afirmativas__letra--incorreta"}`}
                  >
                    {afirmativa.numero}
                  </span>
                  <span className="revisao-afirmativas__texto">{afirmativa.texto}</span>
                  <span className="revisao-afirmativas__marcas">
                    {afirmativa.ehCorreta ? (
                      <span className="revisao-afirmativas__marca revisao-afirmativas__marca--certo">
                        <TbCheck aria-hidden="true" size={13} /> Correta
                      </span>
                    ) : (
                      <span className="revisao-afirmativas__marca revisao-afirmativas__marca--errado">
                        <TbX aria-hidden="true" size={13} /> Incorreta
                      </span>
                    )}
                  </span>
                </div>
                {afirmativa.justificativa ? (
                  <p className="revisao-afirmativas__justificativa">{afirmativa.justificativa}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {questao.alternativas.length > 0 ? (
        <div className="revisao-questao__bloco">
          <p className="revisao-questao__rotulo">Análise das alternativas</p>
          <ul className="revisao-alternativas" role="list">
            {questao.alternativas.map((alternativa) => {
              const escolhida = alternativa.id === questao.alternativaEscolhidaId;
              return (
                <li
                  className={`revisao-alternativas__item${alternativa.ehCorreta ? " revisao-alternativas__item--correta" : ""}${
                    escolhida && !alternativa.ehCorreta ? " revisao-alternativas__item--escolhida-errada" : ""
                  }`}
                  key={alternativa.id}
                >
                  <div className="revisao-alternativas__cabecalho">
                    <span className="revisao-alternativas__letra">{alternativa.letra}</span>
                    <span className="revisao-alternativas__texto">{alternativa.texto}</span>
                    <span className="revisao-alternativas__marcas">
                      {alternativa.ehCorreta ? (
                        <span className="revisao-alternativas__marca revisao-alternativas__marca--certo">
                          <TbCheck aria-hidden="true" size={13} /> Correta
                        </span>
                      ) : null}
                      {escolhida ? <span className="revisao-alternativas__marca">Sua resposta</span> : null}
                    </span>
                  </div>
                  {alternativa.justificativa ? (
                    <p className="revisao-alternativas__justificativa">{alternativa.justificativa}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : Number(questao.tipoQuestao) === TIPO_QUESTAO_DISSERTATIVA ? (
        <div className="revisao-questao__bloco">
          <p className="revisao-questao__rotulo">Sua resposta</p>
          <p className="revisao-questao__resposta-texto">{questao.respostaTexto || "—"}</p>
        </div>
      ) : null}

      {questao.explicacao ? (
        <div className="revisao-questao__bloco">
          <p className="revisao-questao__rotulo">Explicação</p>
          <p className="revisao-questao__explicacao">{questao.explicacao}</p>
        </div>
      ) : null}

      {questao.referenciasBibliograficas ? (
        <div className="revisao-questao__bloco">
          <p className="revisao-questao__rotulo">Referências bibliográficas</p>
          <p className="revisao-questao__bibliografia">{questao.referenciasBibliograficas}</p>
        </div>
      ) : null}
    </section>
  );
}

/* Revisao pos-prova — so existe atras de uma acao explicita do aluno (botao
   "Ver revisao detalhada" na tela de resultado, ou "Revisao detalhada" na
   lista de quizzes de Conteudos, ambos em SecoesAluno.jsx) — nunca e
   mostrada automaticamente. So funciona para tentativas ja corrigidas (o
   backend recusa com 422 caso contrario).

   Layout igual ao quiz do professor (docs/TelaConteudosAlunos/PROMPT-
   agente-revisao-aluno-layout-professor.md): lista de questoes a esquerda
   (.janela-previa-item__quiz*, de JanelaPreviaItem.jsx) + uma questao por
   vez a direita, nav propria (indiceQuestao) independente da paginacao de
   itens do professor (aqui so existe esta janela, sem item anterior/
   proximo). */
export function RevisaoTentativaAvaliacao({ avaliacaoId, tentativaId, tituloAvaliacao, onFechar, onSessionExpired }) {
  const [revisao, setRevisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });
  const [indiceQuestao, setIndiceQuestao] = useState(0);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const refFecharLightbox = useRef(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setMensagem({ tone: "", message: "" });

      try {
        const dados = await apiRequest(`/Avaliacoes/${avaliacaoId}/aluno/tentativas/${tentativaId}/revisao`);
        if (!cancelado) {
          setRevisao(dados);
          setIndiceQuestao(0);
        }
      } catch (err) {
        if (cancelado) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setMensagem({ tone: "error", message: err.message || "Nao foi possivel carregar a revisao agora." });
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [avaliacaoId, tentativaId, onSessionExpired]);

  useEffect(() => {
    if (imagemAmpliada) {
      refFecharLightbox.current?.focus();
    }
  }, [imagemAmpliada]);

  const questoes = revisao?.questoes || [];
  const totalQuestoes = questoes.length;
  const totalCorretas = useMemo(
    () => (revisao?.questoes || []).filter((questao) => questao.correta === true).length,
    [revisao]
  );
  const totalPendentes = useMemo(
    () => (revisao?.questoes || []).filter((questao) => obterStatusQuestao(questao) === "pendente").length,
    [revisao]
  );
  const questaoAtual = questoes[indiceQuestao];
  const temAnterior = indiceQuestao > 0;
  const temProxima = indiceQuestao < totalQuestoes - 1;

  return (
    <Modal
      acoes={
        revisao ? (
          <div className="revisao-avaliacao__resumo-topo">
            <span className="revisao-avaliacao__resumo-item">
              <strong>{formatScore(revisao.notaBruta)}</strong> / {formatScore(revisao.notaMaxima)}
            </span>
            <span className="revisao-avaliacao__resumo-item">
              <strong>{totalCorretas}</strong> de {totalQuestoes} corretas
            </span>
            {totalPendentes > 0 ? (
              <span className="revisao-avaliacao__resumo-item">
                <strong>{totalPendentes}</strong> aguardando correção
              </span>
            ) : null}
          </div>
        ) : null
      }
      className="modal-caixa--revisao-avaliacao"
      onFechar={onFechar}
      titulo={`Revisão detalhada${tituloAvaliacao ? ` · ${tituloAvaliacao}` : ""}`}
      rodape={
        <footer className="modal-rodape janela-previa-item__rodape">
          <Botao
            disabled={!temAnterior}
            onClick={() => setIndiceQuestao((atual) => atual - 1)}
            type="button"
            variante="secundario"
          >
            <TbArrowLeft aria-hidden="true" size={16} /> Questão anterior
          </Botao>
          {totalQuestoes > 0 ? (
            <span className="janela-previa-item__rodape-contador">
              Questão {indiceQuestao + 1} de {totalQuestoes}
            </span>
          ) : null}
          <Botao
            disabled={!temProxima}
            onClick={() => setIndiceQuestao((atual) => atual + 1)}
            type="button"
            variante="primario"
          >
            Próxima questão <TbArrowRight aria-hidden="true" size={16} />
          </Botao>
          <Botao onClick={onFechar} type="button" variante="secundario">
            <TbX aria-hidden="true" size={15} /> Fechar
          </Botao>
        </footer>
      }
    >
      {carregando ? (
        <EmptyState message="Carregando revisao da avaliacao." />
      ) : mensagem.message ? (
        <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage>
      ) : !questaoAtual ? (
        <EmptyState message="Esta tentativa nao tem questoes." />
      ) : (
        <div className="janela-previa-item__quiz">
          <nav aria-label="Questões" className="janela-previa-item__quiz-lista">
            {questoes.map((questao, indice) => {
              const status = obterStatusQuestao(questao);
              return (
                <button
                  aria-current={indice === indiceQuestao ? "true" : undefined}
                  className="janela-previa-item__quiz-item-lista"
                  key={questao.questaoId}
                  onClick={() => setIndiceQuestao(indice)}
                  type="button"
                >
                  <span className="janela-previa-item__quiz-numero">{indice + 1}</span>
                  <span className="revisao-avaliacao__lista-texto">Questão {indice + 1}</span>
                  <span
                    aria-label={ROTULOS_STATUS_QUESTAO[status]}
                    className={`revisao-avaliacao__lista-status revisao-avaliacao__lista-status--${status}`}
                    title={ROTULOS_STATUS_QUESTAO[status]}
                  >
                    <IconeStatusQuestao status={status} />
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="janela-previa-item__quiz-corpo">
            <QuestaoRevisao indice={indiceQuestao} onAmpliarImagem={setImagemAmpliada} questao={questaoAtual} total={totalQuestoes} />
          </div>
        </div>
      )}

      {imagemAmpliada ? (
        <div
          className="revisao-avaliacao__lightbox"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) {
              setImagemAmpliada(null);
            }
          }}
          onKeyDown={(evento) => {
            if (evento.key === "Escape") {
              evento.stopPropagation();
              setImagemAmpliada(null);
            }
          }}
          role="presentation"
        >
          <div className="revisao-avaliacao__lightbox-caixa">
            <button
              aria-label="Fechar imagem ampliada"
              className="revisao-avaliacao__lightbox-fechar"
              onClick={() => setImagemAmpliada(null)}
              ref={refFecharLightbox}
              type="button"
            >
              <TbX aria-hidden="true" size={18} />
            </button>
            <ImagemComZoom alt={imagemAmpliada.titulo} url={resolverUrlArquivo(imagemAmpliada.arquivoUrl)} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
