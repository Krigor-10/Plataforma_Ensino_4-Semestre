import { useMemo } from "react";
import {
  TbCheck,
  TbExternalLink,
  TbFile,
  TbFileText,
  TbPhoto,
  TbPlayerPlay,
  TbTrophy,
  TbX
} from "react-icons/tb";
import Botao from "./Botao.jsx";
import Insignia from "./Insignia.jsx";
import Modal from "./Modal.jsx";
import { InlineMessage } from "./Primitives.jsx";
import { resolverUrlArquivo } from "../lib/api.js";
import { normalizeContentType } from "../lib/format.js";
import { tituloQuizEhGenerico } from "../lib/trilhaConteudos.js";

const STATUS_PUBLICADO = 2;

const ICONE_TIPO_CONTEUDO_LINHA = {
  1: <TbFileText aria-hidden="true" size="1.75rem" />,
  2: <TbFile aria-hidden="true" size="1.75rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.75rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.75rem" />,
  5: <TbPhoto aria-hidden="true" size="1.75rem" />
};

// Mesma regra de SecoesAluno.jsx (obterAcaoConteudoAluno): so ganha link quem
// tem arquivo/link de verdade. Aqui so abre em nova aba (sem o visualizador
// inline do aluno) - suficiente pro Coordenador conferir o material.
function obterLinkArquivoConteudo(conteudo) {
  const tipo = Number(conteudo.tipoConteudo);

  if ((tipo === 2 || tipo === 3 || tipo === 5) && conteudo.arquivoUrl) {
    return resolverUrlArquivo(conteudo.arquivoUrl);
  }

  if (tipo === 4 && conteudo.linkUrl) {
    return conteudo.linkUrl;
  }

  return null;
}

function GabaritoQuestoes({ questoes }) {
  return (
    <div className="revisao-avaliacao revisao-avaliacao--gabarito">
      {questoes.map((questao, indice) => (
        <section className="revisao-questao" key={questao.id}>
          <header className="revisao-questao__cabecalho">
            <span className="revisao-questao__numero">Questão {indice + 1}</span>
          </header>

          <p className="revisao-questao__enunciado">{questao.enunciado}</p>

          {questao.afirmativas?.length > 0 ? (
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
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {questao.alternativas?.length > 0 ? (
            <div className="revisao-questao__bloco">
              <p className="revisao-questao__rotulo">Alternativas</p>
              <ul className="revisao-alternativas" role="list">
                {questao.alternativas.map((alternativa) => (
                  <li
                    className={`revisao-alternativas__item${alternativa.ehCorreta ? " revisao-alternativas__item--correta" : ""}`}
                    key={alternativa.id}
                  >
                    <div className="revisao-alternativas__cabecalho">
                      <strong>{alternativa.letra}</strong> {alternativa.texto}
                      {alternativa.ehCorreta ? (
                        <span className="revisao-alternativas__marca revisao-alternativas__marca--certo">
                          <TbCheck aria-hidden="true" size={13} /> Correta
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {questao.explicacao ? (
            <div className="revisao-questao__bloco">
              <p className="revisao-questao__rotulo">Explicação</p>
              <p className="revisao-questao__explicacao">{questao.explicacao}</p>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

/* Pre-visualizacao estrutural de como o aluno ve a trilha: reaproveita as MESMAS classes
   CSS atividades-curso__ / conteudos-modulo__ pra ficar visualmente identica ao que o
   aluno realmente ve, mas sem tocar no componente SlideConteudosCurso (SecoesAluno.jsx) -
   evita qualquer risco de regressao na experiencia real do aluno. Deliberadamente sem
   progresso/bloqueio de modulo e sem acoes (Concluir/Fazer quiz), so a estrutura de
   modulos/conteudos/quizzes JA PUBLICADOS (rascunho fica de fora, igual o aluno ve).

   Extraido de SecaoConteudosProfessor.jsx (fluxo-coordenador Parte 3/3) - props
   abaixo de "permitirAbrirArquivo" em diante sao OPCIONAIS e so existem pro
   Coordenador em PainelCursoGestao.jsx ("Ver conteudo"); o uso no Professor
   ("Visualizar como aluno") continua sem passa-las, comportamento inalterado. */
export default function PreviaTrilhaAluno({
  conteudosPorModuloId,
  cursoTitulo,
  modulosDoCurso,
  onFechar,
  quizPorConteudoId,
  quizzesPorModuloId,
  permitirAbrirArquivo = false,
  questoesPorAvaliacaoId = null,
  seloSomenteLeitura = false
}) {
  const modulosVisiveis = useMemo(() => {
    return modulosDoCurso
      .map((modulo, indice) => {
        const itens = (conteudosPorModuloId.get(modulo.id) || []).filter(
          (conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO
        );
        const quizzesDoModulo = (quizzesPorModuloId.get(modulo.id) || []).filter(
          (quiz) => Number(quiz.statusPublicacao) === STATUS_PUBLICADO
        );
        return { indice, itens, modulo, quizzesDoModulo };
      })
      .filter(({ itens, quizzesDoModulo }) => itens.length > 0 || quizzesDoModulo.length > 0);
  }, [conteudosPorModuloId, modulosDoCurso, quizzesPorModuloId]);

  function renderizarGabaritoDoQuiz(quizId) {
    const questoes = questoesPorAvaliacaoId?.get(quizId);
    if (!questoes || questoes.length === 0) {
      return null;
    }

    return <GabaritoQuestoes questoes={questoes} />;
  }

  return (
    <Modal
      className="modal-caixa--avaliacao"
      onFechar={onFechar}
      titulo="Visualizar como aluno"
      rodape={
        <footer className="modal-rodape">
          <Botao onClick={onFechar} variante="perigo">
            <TbX aria-hidden="true" size={15} /> Fechar
          </Botao>
        </footer>
      }
    >
      <div className="conteudos-aluno trilha-conteudos">
        <InlineMessage tone="info">
          Pré-visualização estrutural: mostra só o conteúdo publicado, sem dados de progresso de nenhum aluno.
        </InlineMessage>

        <header className="atividades-curso__cabecalho">
          <h2 className="atividades-curso__titulo">{cursoTitulo}</h2>
          {seloSomenteLeitura ? <Insignia texto="Somente leitura" variante="info" /> : null}
        </header>

        {modulosVisiveis.length === 0 ? (
          <p className="texto-vazio" role="status">Nenhum material publicado neste curso ainda.</p>
        ) : (
          <div className="atividades-curso__lista-modulos">
            {modulosVisiveis.map(({ indice, itens, modulo, quizzesDoModulo }) => (
              <section className="conteudos-modulo conteudos-modulo--cartao" key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <div className="conteudos-modulo__cabecalho-wrapper">
                    <div className="conteudos-modulo__info">
                      <span className="conteudos-modulo__icone conteudos-modulo__numero">
                        <span className="visualmente-oculto">Módulo</span>{" "}
                        <span>{String(indice + 1).padStart(2, "0")}</span>
                      </span>
                      <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                      <span className="conteudos-modulo__contagem">{itens.length} conteúdo{itens.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </header>

                <ul aria-label={`Conteúdos de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                  {itens.map((conteudo) => {
                    const quizVinculado = quizPorConteudoId.get(conteudo.id) || null;
                    const tituloQuizVinculado =
                      quizVinculado && tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo)
                        ? "Quiz do conteúdo"
                        : quizVinculado?.titulo;
                    const linkArquivo = permitirAbrirArquivo ? obterLinkArquivoConteudo(conteudo) : null;

                    return (
                      <li className="atividades-curso__item" key={conteudo.id}>
                        <div className="atividades-curso__item-aberto">
                          <div className="atividades-curso__linha">
                            <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--conteudo">
                              {ICONE_TIPO_CONTEUDO_LINHA[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
                            </span>
                            <div className="atividades-curso__corpo">
                              <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                              <p className="atividades-curso__meta">
                                <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                              </p>
                            </div>
                            {linkArquivo ? (
                              <span className="atividades-curso__acao-coluna">
                                <a
                                  className="atividades-curso__link"
                                  href={linkArquivo}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Abrir arquivo
                                </a>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {quizVinculado ? (
                          <ul aria-label={`Quiz de ${conteudo.titulo}`} className="atividades-curso__quizzes" role="list">
                            <li className="atividades-curso__item atividades-curso__item--quiz">
                              <div className="atividades-curso__linha">
                                <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                  <TbTrophy aria-hidden="true" size="1.75rem" />
                                </span>
                                <div className="atividades-curso__corpo">
                                  <strong className="atividades-curso__item-titulo" title={quizVinculado.titulo}>
                                    {tituloQuizVinculado}
                                  </strong>
                                </div>
                              </div>
                              {renderizarGabaritoDoQuiz(quizVinculado.id)}
                            </li>
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                {quizzesDoModulo.length > 0 ? (
                  <div className="atividades-curso__quizzes-modulo">
                    <h4 className="atividades-curso__quizzes-modulo-titulo">
                      <TbTrophy aria-hidden="true" size="1rem" /> Quizzes do módulo
                    </h4>
                    <ul aria-label={`Quizzes de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                      {quizzesDoModulo.map((quiz) => (
                        <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-modulo-${quiz.id}`}>
                          <div className="atividades-curso__linha">
                            <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                              <TbTrophy aria-hidden="true" size="1.75rem" />
                            </span>
                            <div className="atividades-curso__corpo">
                              <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                              <p className="atividades-curso__meta">
                                <span>{quiz.totalQuestoes || 0} questão{quiz.totalQuestoes === 1 ? "" : "ões"}</span>
                              </p>
                            </div>
                          </div>
                          {renderizarGabaritoDoQuiz(quiz.id)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
