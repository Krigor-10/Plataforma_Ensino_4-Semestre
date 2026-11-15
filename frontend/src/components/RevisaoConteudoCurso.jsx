import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbTrophy } from "react-icons/tb";
import Botao from "./Botao.jsx";
import GabaritoQuestoes from "./GabaritoQuestoes.jsx";
import Insignia from "./Insignia.jsx";
import Modal from "./Modal.jsx";
import { obterIconeTipoConteudo, obterLinkArquivoConteudo } from "./PreviaTrilhaAluno.jsx";
import { normalizeContentType } from "../lib/format.js";
import { montarModulosPublicados, tituloQuizEhGenerico } from "../lib/trilhaConteudos.js";

const TIPO_CONTEUDO_LINK = 4;

function montarEntradas(modulosVisiveis, quizPorConteudoId) {
  const entradas = [];

  modulosVisiveis.forEach(({ indice, itens, modulo, quizzesDoModulo }) => {
    itens.forEach((conteudo) => {
      entradas.push({
        id: `conteudo-${conteudo.id}`,
        tipo: "material",
        moduloIndice: indice,
        moduloTitulo: modulo.titulo,
        titulo: conteudo.titulo,
        conteudo
      });

      const quizVinculado = quizPorConteudoId.get(conteudo.id) || null;
      if (quizVinculado) {
        const tituloVinculado = tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo)
          ? "Quiz do conteúdo"
          : quizVinculado.titulo;

        entradas.push({
          id: `quiz-${quizVinculado.id}`,
          tipo: "quiz",
          moduloIndice: indice,
          moduloTitulo: modulo.titulo,
          titulo: tituloVinculado,
          quiz: quizVinculado
        });
      }
    });

    quizzesDoModulo.forEach((quiz) => {
      entradas.push({
        id: `quiz-${quiz.id}`,
        tipo: "quiz",
        moduloIndice: indice,
        moduloTitulo: modulo.titulo,
        titulo: quiz.titulo,
        quiz
      });
    });
  });

  return entradas;
}

function RevisaoMaterial({ conteudo }) {
  const linkArquivo = obterLinkArquivoConteudo(conteudo);
  const rotuloLink = Number(conteudo.tipoConteudo) === TIPO_CONTEUDO_LINK ? "Abrir link" : "Abrir arquivo";

  return (
    <div className="revisao-conteudo__material">
      <h3 className="revisao-conteudo__titulo-item">{conteudo.titulo}</h3>
      <p className="revisao-conteudo__material-tipo">{normalizeContentType(conteudo.tipoConteudo)}</p>
      {conteudo.descricao ? <p className="revisao-conteudo__material-descricao">{conteudo.descricao}</p> : null}
      {linkArquivo ? (
        <a className="revisao-conteudo__abrir-arquivo" href={linkArquivo} rel="noreferrer" target="_blank">
          {rotuloLink}
        </a>
      ) : null}
    </div>
  );
}

function RevisaoQuiz({ entrada, questoes }) {
  const totalQuestoes = entrada.quiz.totalQuestoes || 0;

  return (
    <div className="revisao-conteudo__quiz">
      <div className="revisao-conteudo__quiz-cabecalho">
        <h3 className="revisao-conteudo__titulo-item">{entrada.titulo}</h3>
        <span className="revisao-conteudo__quiz-contagem">
          {totalQuestoes} {totalQuestoes === 1 ? "questão" : "questões"}
        </span>
      </div>
      {questoes && questoes.length > 0 ? <GabaritoQuestoes questoes={questoes} /> : null}
    </div>
  );
}

/* Tela "Revisar conteúdo" (Admin/Coordenador) - Opcao B aprovada
   (docs/fluxo-coordenador/revisao-conteudo-opcao-b.png): indice fixo a
   esquerda, leitura de um item por vez a direita, em vez da rolagem unica
   antiga (que usava PreviaTrilhaAluno, ainda em uso intacto pro "Visualizar
   como aluno" do Professor). Consome os MESMOS dados de
   GET /Cursos/{id}/revisao-conteudo que PainelCursoGestao.jsx ja montava
   (estadoPreviaConteudo) - so mudou como sao exibidos. */
export default function RevisaoConteudoCurso({
  conteudosPorModuloId,
  cursoTitulo,
  modulosDoCurso,
  onFechar,
  quizPorConteudoId,
  quizzesPorModuloId,
  questoesPorAvaliacaoId
}) {
  const [apenasQuizzes, setApenasQuizzes] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const refsItensIndice = useRef(new Map());

  const modulosVisiveis = useMemo(
    () => montarModulosPublicados(modulosDoCurso, conteudosPorModuloId, quizzesPorModuloId),
    [conteudosPorModuloId, modulosDoCurso, quizzesPorModuloId]
  );

  const entradas = useMemo(
    () => montarEntradas(modulosVisiveis, quizPorConteudoId),
    [modulosVisiveis, quizPorConteudoId]
  );

  const resumo = useMemo(() => {
    const entradasDeQuiz = entradas.filter((entrada) => entrada.tipo === "quiz");
    return {
      modulos: modulosVisiveis.length,
      conteudos: entradas.length - entradasDeQuiz.length,
      quizzes: entradasDeQuiz.length,
      questoes: entradasDeQuiz.reduce((total, entrada) => total + (entrada.quiz.totalQuestoes || 0), 0)
    };
  }, [entradas, modulosVisiveis.length]);

  const listaExibida = useMemo(
    () => (apenasQuizzes ? entradas.filter((entrada) => entrada.tipo === "quiz") : entradas),
    [apenasQuizzes, entradas]
  );

  const entradasPorModuloIndice = useMemo(() => {
    const mapa = new Map();
    listaExibida.forEach((entrada) => {
      if (!mapa.has(entrada.moduloIndice)) {
        mapa.set(entrada.moduloIndice, []);
      }
      mapa.get(entrada.moduloIndice).push(entrada);
    });
    return mapa;
  }, [listaExibida]);

  // Ao abrir a janela (ou trocar "Mostrar so quizzes" e o item atual sair da
  // lista exibida), seleciona o primeiro item exibido sozinho.
  useEffect(() => {
    if (listaExibida.length === 0) {
      setIdSelecionado(null);
      return;
    }

    if (!listaExibida.some((entrada) => entrada.id === idSelecionado)) {
      setIdSelecionado(listaExibida[0].id);
    }
  }, [idSelecionado, listaExibida]);

  const indiceAtual = listaExibida.findIndex((entrada) => entrada.id === idSelecionado);
  const itemAtual = indiceAtual >= 0 ? listaExibida[indiceAtual] : null;
  const itemAnterior = indiceAtual > 0 ? listaExibida[indiceAtual - 1] : null;
  const itemProximo = indiceAtual >= 0 && indiceAtual < listaExibida.length - 1 ? listaExibida[indiceAtual + 1] : null;

  function registrarRefIndice(id, node) {
    if (node) {
      refsItensIndice.current.set(id, node);
    } else {
      refsItensIndice.current.delete(id);
    }
  }

  function navegarComSetas(evento) {
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") {
      return;
    }

    evento.preventDefault();

    const posicaoAtual = listaExibida.findIndex((entrada) => entrada.id === idSelecionado);
    const proximaPosicao =
      evento.key === "ArrowDown"
        ? Math.min(posicaoAtual + 1, listaExibida.length - 1)
        : Math.max(posicaoAtual - 1, 0);

    const proximaEntrada = listaExibida[proximaPosicao];
    if (!proximaEntrada) {
      return;
    }

    setIdSelecionado(proximaEntrada.id);
    refsItensIndice.current.get(proximaEntrada.id)?.focus();
  }

  const temConteudo = entradas.length > 0;

  return (
    <Modal
      className="modal-caixa--revisao-conteudo"
      onFechar={onFechar}
      titulo={`Revisar conteúdo · ${cursoTitulo}`}
      acoes={
        <>
          <Insignia texto="Somente leitura" variante="info" />
          {temConteudo ? (
            <>
              <span className="revisao-conteudo__resumo">
                {resumo.modulos} módulo{resumo.modulos === 1 ? "" : "s"} · {resumo.conteudos} conteúdo
                {resumo.conteudos === 1 ? "" : "s"} · {resumo.quizzes} quiz{resumo.quizzes === 1 ? "" : "zes"} ·{" "}
                {resumo.questoes} {resumo.questoes === 1 ? "questão" : "questões"}
              </span>
              <button
                aria-pressed={apenasQuizzes}
                className={`revisao-conteudo__filtro-quizzes${apenasQuizzes ? " revisao-conteudo__filtro-quizzes--ativo" : ""}`}
                onClick={() => setApenasQuizzes((atual) => !atual)}
                type="button"
              >
                <TbTrophy aria-hidden="true" size={14} /> Mostrar só quizzes
              </button>
            </>
          ) : null}
        </>
      }
      rodape={
        itemAtual ? (
          <footer className="modal-rodape revisao-conteudo__rodape">
            <Botao
              className="revisao-conteudo__botao-navegacao"
              disabled={!itemAnterior}
              onClick={() => itemAnterior && setIdSelecionado(itemAnterior.id)}
              type="button"
              variante="secundario"
            >
              <TbArrowLeft aria-hidden="true" size={16} />
              <span className="revisao-conteudo__botao-navegacao-texto">
                {itemAnterior ? `Anterior: ${itemAnterior.titulo}` : "Anterior"}
              </span>
            </Botao>
            <Botao
              className="revisao-conteudo__botao-navegacao"
              disabled={!itemProximo}
              onClick={() => itemProximo && setIdSelecionado(itemProximo.id)}
              type="button"
              variante="primario"
            >
              <span className="revisao-conteudo__botao-navegacao-texto">
                {itemProximo ? `Próximo: ${itemProximo.titulo}` : "Próximo"}
              </span>
              <TbArrowRight aria-hidden="true" size={16} />
            </Botao>
          </footer>
        ) : null
      }
    >
      {!temConteudo ? (
        <p className="texto-vazio" role="status">Este curso ainda não tem conteúdo publicado.</p>
      ) : (
        <div className="revisao-conteudo__corpo">
          <nav aria-label="Índice do conteúdo" className="revisao-conteudo__indice" onKeyDown={navegarComSetas}>
            {modulosVisiveis.map(({ indice, modulo }) => {
              const entradasDoModulo = entradasPorModuloIndice.get(indice) || [];
              if (entradasDoModulo.length === 0) {
                return null;
              }

              return (
                <div className="revisao-conteudo__grupo-modulo" key={modulo.id}>
                  <p className="revisao-conteudo__modulo-titulo">
                    <span className="revisao-conteudo__modulo-numero">{String(indice + 1).padStart(2, "0")}</span>
                    {modulo.titulo}
                  </p>

                  {entradasDoModulo.map((entrada) => {
                    const ativo = entrada.id === itemAtual?.id;

                    return (
                      <button
                        aria-current={ativo ? "true" : undefined}
                        className={`revisao-conteudo__item-indice${ativo ? " revisao-conteudo__item-indice--ativo" : ""}`}
                        key={entrada.id}
                        onClick={() => setIdSelecionado(entrada.id)}
                        ref={(node) => registrarRefIndice(entrada.id, node)}
                        type="button"
                      >
                        <span aria-hidden="true" className="revisao-conteudo__item-indice-icone">
                          {entrada.tipo === "quiz" ? (
                            <TbTrophy size={16} />
                          ) : (
                            obterIconeTipoConteudo(entrada.conteudo.tipoConteudo, 16)
                          )}
                        </span>
                        <span className="revisao-conteudo__item-indice-titulo">{entrada.titulo}</span>
                        {entrada.tipo === "quiz" ? (
                          <span className="revisao-conteudo__item-indice-contagem">{entrada.quiz.totalQuestoes || 0}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="revisao-conteudo__indice-mobile">
            <label className="visualmente-oculto" htmlFor="revisao-conteudo-select-item">Item</label>
            <select
              id="revisao-conteudo-select-item"
              onChange={(evento) => setIdSelecionado(evento.target.value)}
              value={itemAtual?.id || ""}
            >
              {listaExibida.map((entrada) => (
                <option key={entrada.id} value={entrada.id}>
                  {entrada.tipo === "quiz" ? `Quiz · ${entrada.moduloTitulo}` : `${entrada.titulo} · ${entrada.moduloTitulo}`}
                </option>
              ))}
            </select>
          </div>

          {itemAtual ? (
            <div className="revisao-conteudo__leitura">
              <p className="revisao-conteudo__trilha">
                Módulo {String(itemAtual.moduloIndice + 1).padStart(2, "0")} · {itemAtual.moduloTitulo} ›{" "}
                {itemAtual.tipo === "quiz" ? "Quiz" : "Material"}
              </p>

              {itemAtual.tipo === "material" ? (
                <RevisaoMaterial conteudo={itemAtual.conteudo} />
              ) : (
                <RevisaoQuiz entrada={itemAtual} questoes={questoesPorAvaliacaoId?.get(itemAtual.quiz.id)} />
              )}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
