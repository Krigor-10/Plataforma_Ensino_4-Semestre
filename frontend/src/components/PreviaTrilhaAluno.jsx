import { useMemo } from "react";
import {
  TbExternalLink,
  TbFile,
  TbFileText,
  TbPhoto,
  TbPlayerPlay,
  TbTrophy,
  TbX
} from "react-icons/tb";
import Botao from "./Botao.jsx";
import GabaritoQuestoes from "./GabaritoQuestoes.jsx";
import Insignia from "./Insignia.jsx";
import Modal from "./Modal.jsx";
import { InlineMessage } from "./Primitives.jsx";
import { resolverUrlArquivo } from "../lib/api.js";
import { normalizeContentType } from "../lib/format.js";
import { montarModulosPublicados, tituloQuizEhGenerico } from "../lib/trilhaConteudos.js";

// Reaproveitado por RevisaoConteudoCurso.jsx (indice da tela "Revisar
// conteudo") - tamanho do icone fica a cargo de quem chama, ja que o indice
// usa um tamanho menor que o card desta previa.
export function obterIconeTipoConteudo(tipoConteudo, tamanho = "1.75rem") {
  switch (Number(tipoConteudo)) {
    case 2:
      return <TbFile aria-hidden="true" size={tamanho} />;
    case 3:
      return <TbPlayerPlay aria-hidden="true" size={tamanho} />;
    case 4:
      return <TbExternalLink aria-hidden="true" size={tamanho} />;
    case 5:
      return <TbPhoto aria-hidden="true" size={tamanho} />;
    default:
      return <TbFileText aria-hidden="true" size={tamanho} />;
  }
}

// Mesma regra de SecoesAluno.jsx (obterAcaoConteudoAluno): so ganha link quem
// tem arquivo/link de verdade. Aqui so abre em nova aba (sem o visualizador
// inline do aluno) - suficiente pro Coordenador conferir o material. Tambem
// reaproveitado por RevisaoConteudoCurso.jsx.
export function obterLinkArquivoConteudo(conteudo) {
  const tipo = Number(conteudo.tipoConteudo);

  if ((tipo === 2 || tipo === 3 || tipo === 5) && conteudo.arquivoUrl) {
    return resolverUrlArquivo(conteudo.arquivoUrl);
  }

  if (tipo === 4 && conteudo.linkUrl) {
    return conteudo.linkUrl;
  }

  return null;
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
  const modulosVisiveis = useMemo(
    () => montarModulosPublicados(modulosDoCurso, conteudosPorModuloId, quizzesPorModuloId),
    [conteudosPorModuloId, modulosDoCurso, quizzesPorModuloId]
  );

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
                              {obterIconeTipoConteudo(conteudo.tipoConteudo)}
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
                                <span>{quiz.totalQuestoes || 0} {quiz.totalQuestoes === 1 ? "questão" : "questões"}</span>
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
