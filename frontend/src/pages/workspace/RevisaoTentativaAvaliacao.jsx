import { useEffect, useState } from "react";
import { TbCheck, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";

function formatScore(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

/* Revisao pos-prova: so existe atras de uma acao explicita do aluno (botao
   "Ver revisao detalhada" na tela de resultado de SecoesAluno.jsx) — nunca e
   mostrada automaticamente. So funciona para tentativas ja corrigidas (o
   backend recusa com 422 caso contrario). */
export function RevisaoTentativaAvaliacao({ avaliacaoId, tentativaId, onFechar, onSessionExpired }) {
  const [revisao, setRevisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setMensagem({ tone: "", message: "" });

      try {
        const dados = await apiRequest(`/Avaliacoes/${avaliacaoId}/aluno/tentativas/${tentativaId}/revisao`);
        if (!cancelado) {
          setRevisao(dados);
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

  return (
    <Modal
      className="modal-caixa--revisao-avaliacao"
      onFechar={onFechar}
      titulo="Revisao detalhada"
      rodape={
        <footer className="modal-rodape">
          <Botao onClick={onFechar} type="button" variante="fantasma">
            Fechar
          </Botao>
        </footer>
      }
    >
      {carregando ? (
        <EmptyState message="Carregando revisao da avaliacao." />
      ) : mensagem.message ? (
        <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage>
      ) : (
        <div className="revisao-avaliacao">
          <header className="revisao-avaliacao__resumo">
            <span className="revisao-avaliacao__resumo-rotulo">Nota final</span>
            <strong className="revisao-avaliacao__resumo-valor">
              {formatScore(revisao.notaBruta)} / {formatScore(revisao.notaMaxima)}
            </strong>
          </header>

          {revisao.questoes.map((questao, indice) => {
            const alternativaEscolhida = questao.alternativas.find(
              (alternativa) => alternativa.id === questao.alternativaEscolhidaId
            );
            const alternativaCorreta = questao.alternativas.find((alternativa) => alternativa.ehCorreta);

            return (
              <section className="revisao-questao" key={questao.questaoId}>
                <header className="revisao-questao__cabecalho">
                  <span className="revisao-questao__numero">Questao {indice + 1}</span>
                  {questao.correta === null ? (
                    <span className="revisao-questao__status revisao-questao__status--pendente">Aguardando correcao</span>
                  ) : questao.correta ? (
                    <span className="revisao-questao__status revisao-questao__status--certo">
                      <TbCheck aria-hidden="true" size={15} /> Acertou
                    </span>
                  ) : (
                    <span className="revisao-questao__status revisao-questao__status--errado">
                      <TbX aria-hidden="true" size={15} /> Errou
                    </span>
                  )}
                </header>

                <p className="revisao-questao__enunciado">{questao.enunciado}</p>

                {questao.alternativas.length > 0 ? (
                  <p className="revisao-questao__resposta-resumo">
                    <span>
                      Sua resposta: <strong>{alternativaEscolhida ? alternativaEscolhida.letra : "—"}</strong>
                    </span>
                    {!questao.correta && alternativaCorreta ? (
                      <span>
                        Resposta correta: <strong>{alternativaCorreta.letra}</strong>
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {questao.afirmativas.length > 0 ? (
                  <div className="revisao-questao__bloco">
                    <p className="revisao-questao__rotulo">Afirmativas avaliadas</p>
                    <ol className="revisao-afirmativas">
                      {questao.afirmativas.map((afirmativa) => (
                        <li className="revisao-afirmativas__item" key={afirmativa.numero}>
                          <div className="revisao-afirmativas__cabecalho">
                            <strong>{afirmativa.numero}.</strong> {afirmativa.texto}
                            {afirmativa.ehCorreta ? (
                              <span className="revisao-afirmativas__marca revisao-afirmativas__marca--certo">
                                <TbCheck aria-hidden="true" size={13} /> Correta
                              </span>
                            ) : (
                              <span className="revisao-afirmativas__marca revisao-afirmativas__marca--errado">
                                <TbX aria-hidden="true" size={13} /> Incorreta
                              </span>
                            )}
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
                              <strong>{alternativa.letra}</strong> {alternativa.texto}
                              {alternativa.ehCorreta ? (
                                <span className="revisao-alternativas__marca revisao-alternativas__marca--certo">
                                  <TbCheck aria-hidden="true" size={13} /> Correta
                                </span>
                              ) : null}
                              {escolhida ? <span className="revisao-alternativas__marca">Sua resposta</span> : null}
                            </div>
                            {alternativa.justificativa ? (
                              <p className="revisao-alternativas__justificativa">{alternativa.justificativa}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : questao.respostaTexto ? (
                  <p className="revisao-questao__resposta-texto">{questao.respostaTexto}</p>
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
          })}
        </div>
      )}
    </Modal>
  );
}
