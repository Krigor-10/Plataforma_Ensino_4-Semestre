import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbChevronDown, TbChevronRight, TbTrophy, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import PreviaItemAluno from "../../components/PreviaItemAluno.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useLarguraJanela } from "../../hooks/useLarguraJanela.js";
import { tituloQuizEhGenerico } from "../../lib/trilhaConteudos.js";

const TIPO_AVALIACAO_QUIZ = 1;
const STATUS_PUBLICADO = 2;

// Abaixo disso a leitura vira tela cheia (sem abrir o 1o item sozinha) -
// docs/fluxo-coordenador/PROMPT-agente-modulo-tela-melhorias.md, item 6.
const LARGURA_MINIMA_LEITURA_FIXA = 768;

function montarItensDoModulo(moduloRevisao) {
  if (!moduloRevisao) {
    return { conteudos: [], quizzes: [] };
  }

  const conteudosPublicados = moduloRevisao.conteudos.filter(
    (conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO
  );

  const quizPorConteudoId = new Map();
  const quizzesSoltos = [];

  moduloRevisao.avaliacoes.forEach(({ avaliacao, questoes }) => {
    if (Number(avaliacao.tipoAvaliacao) !== TIPO_AVALIACAO_QUIZ || Number(avaliacao.statusPublicacao) !== STATUS_PUBLICADO) {
      return;
    }

    const quizResumo = { id: avaliacao.id, titulo: avaliacao.titulo, totalQuestoes: avaliacao.totalQuestoes, questoes };

    if (avaliacao.conteudoDidaticoId) {
      quizPorConteudoId.set(avaliacao.conteudoDidaticoId, quizResumo);
    } else {
      quizzesSoltos.push(quizResumo);
    }
  });

  const conteudos = conteudosPublicados.map((conteudo) => ({
    id: `conteudo-${conteudo.id}`,
    tipo: "material",
    titulo: conteudo.titulo,
    conteudo
  }));

  const quizzes = [];
  conteudosPublicados.forEach((conteudo) => {
    const quizVinculado = quizPorConteudoId.get(conteudo.id);
    if (!quizVinculado) {
      return;
    }

    const titulo = tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo) ? "Quiz do conteúdo" : quizVinculado.titulo;
    quizzes.push({ id: `quiz-${quizVinculado.id}`, tipo: "quiz", titulo, quiz: quizVinculado, questoes: quizVinculado.questoes });
  });
  quizzesSoltos.forEach((quiz) => {
    quizzes.push({ id: `quiz-${quiz.id}`, tipo: "quiz", titulo: quiz.titulo, quiz, questoes: quiz.questoes });
  });

  return { conteudos, quizzes };
}

/* Tela do modulo (Admin/Coordenador) - versao B (docs/TelaConteudosProfessor/
   PROMPT-agente-tela-modulo-trilha-versao-b.md): mesma trilha do Professor
   (todos os modulos do curso a esquerda, o atual aberto com os itens
   dentro), so que so leitura - sem checkbox, sem menu de acoes, sem botoes
   de criar, sem o modo de selecao. Mostrada por PainelCursoGestao.jsx no
   lugar do conteudo normal do curso quando ha moduloIdSelecionado. A lista
   vem de GET /Cursos/{id}/revisao-conteudo (todos os modulos do curso, so o
   que esta Publicado, com questoes pro gabarito - carregada uma vez e
   reaproveitada enquanto o curso continuar aberto, mesmo trocando de
   modulo pela trilha). */
export default function TelaModuloGestao({
  curso,
  erroRevisaoConteudo,
  modulosOrdenados,
  moduloId,
  onNavigate,
  onTentarNovamenteRevisaoConteudo,
  revisaoConteudo,
  revisaoConteudoCarregando
}) {
  const [itemAbertoId, setItemAbertoId] = useState(null);
  const larguraJanela = useLarguraJanela();
  const leituraFixa = larguraJanela >= LARGURA_MINIMA_LEITURA_FIXA;

  useEffect(() => {
    setItemAbertoId(null);
  }, [moduloId]);

  useEffect(() => {
    if (!itemAbertoId || leituraFixa) {
      return undefined;
    }

    function fecharComEsc(evento) {
      if (evento.key === "Escape") {
        setItemAbertoId(null);
      }
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [itemAbertoId, leituraFixa]);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;

  const moduloRevisao = useMemo(
    () => revisaoConteudo?.modulos.find((modulo) => modulo.id === moduloId) || null,
    [revisaoConteudo, moduloId]
  );
  const { conteudos, quizzes } = useMemo(() => montarItensDoModulo(moduloRevisao), [moduloRevisao]);
  const itensOrdenados = useMemo(() => [...conteudos, ...quizzes], [conteudos, quizzes]);

  // No desktop/tablet a leitura nunca fica vazia: ao entrar no modulo (ou
  // trocar pra outro) o 1o item ja abre sozinho. No celular isso nao
  // acontece - o usuario escolhe o item na trilha.
  useEffect(() => {
    if (!leituraFixa || itemAbertoId || itensOrdenados.length === 0) {
      return;
    }

    setItemAbertoId(itensOrdenados[0].id);
  }, [itemAbertoId, itensOrdenados, leituraFixa]);

  const indiceItemAberto = itensOrdenados.findIndex((item) => item.id === itemAbertoId);
  const itemAberto = indiceItemAberto >= 0 ? itensOrdenados[indiceItemAberto] : null;
  const itemAnterior = indiceItemAberto > 0 ? itensOrdenados[indiceItemAberto - 1] : null;
  const itemProximo =
    indiceItemAberto >= 0 && indiceItemAberto < itensOrdenados.length - 1 ? itensOrdenados[indiceItemAberto + 1] : null;

  function voltarParaModulos() {
    onNavigate(`/app/cursos/${curso.id}`);
  }

  function irParaModulo(id) {
    onNavigate(`/app/cursos/${curso.id}/modulos/${id}`);
  }

  if (!moduloAtual) {
    return null;
  }

  const semConteudoPublicado = !revisaoConteudoCarregando && !erroRevisaoConteudo && conteudos.length === 0 && quizzes.length === 0;
  const totalConteudos = conteudos.length;
  const totalQuizzes = quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;

  return (
    <div className={`modulo-gestao modulo-gestao--trilha${itemAberto ? " modulo-gestao--item-aberto" : ""}`}>
      <aside aria-label="Módulos do curso" className="modulo-gestao__trilha">
        <button className="modulo-gestao__trilha-voltar" onClick={voltarParaModulos} type="button">
          <TbArrowLeft aria-hidden="true" size={16} /> {curso.titulo}
        </button>

        <nav aria-label="Módulos" className="modulo-gestao__trilha-lista">
          {modulosOrdenados.map((modulo, indice) => {
            if (modulo.id !== moduloId) {
              return (
                <button
                  className="modulo-gestao__trilha-modulo"
                  key={modulo.id}
                  onClick={() => irParaModulo(modulo.id)}
                  type="button"
                >
                  <NumeroModulo indice={indice} />
                  <span className="modulo-gestao__trilha-modulo-titulo" title={modulo.titulo}>
                    {modulo.titulo}
                  </span>
                  <TbChevronRight aria-hidden="true" className="modulo-gestao__trilha-modulo-seta" size="1.1rem" />
                </button>
              );
            }

            return (
              <section className="modulo-gestao__trilha-modulo modulo-gestao__trilha-modulo--aberto" key={modulo.id}>
                <div className="modulo-gestao__trilha-modulo-cabecalho">
                  <NumeroModulo indice={indice} />
                  <span className="modulo-gestao__trilha-modulo-titulo" title={modulo.titulo}>
                    {modulo.titulo}
                  </span>
                  <TbChevronDown aria-hidden="true" className="modulo-gestao__trilha-modulo-seta modulo-gestao__trilha-modulo-seta--aberta" size="1.1rem" />
                </div>

                {revisaoConteudoCarregando ? (
                  <p className="texto-vazio" role="status">Carregando módulo…</p>
                ) : semConteudoPublicado ? (
                  <p className="texto-vazio" role="status">Este módulo ainda não tem conteúdo publicado.</p>
                ) : (
                  <div className="modulo-gestao__trilha-itens">
                    <div className="modulo-gestao__trilha-itens-cabecalho">
                      <span className="modulo-gestao__trilha-itens-rotulo">Itens do módulo</span>
                    </div>

                    {conteudos.length > 0 ? (
                      <section aria-label={`Conteúdos (${conteudos.length})`}>
                        <h3 className="modulo-gestao__secao-titulo">
                          Conteúdos
                          <span className="modulo-gestao__secao-contagem">{conteudos.length}</span>
                        </h3>
                        <ul aria-label={`Conteúdos de ${modulo.titulo}`} role="list">
                          {conteudos.map((item) => (
                            <li className="modulo-gestao__trilha-item-wrap" key={item.id}>
                              <button
                                aria-current={itemAberto?.id === item.id ? "true" : undefined}
                                aria-label={`Ver ${item.titulo}`}
                                className="modulo-gestao__trilha-item"
                                onClick={() => setItemAbertoId(item.id)}
                                type="button"
                              >
                                <span aria-hidden="true" className="modulo-gestao__trilha-item-icone">
                                  {obterIconeTipoConteudo(item.conteudo.tipoConteudo, "1.1rem")}
                                </span>
                                <span className="modulo-gestao__trilha-item-titulo" title={item.titulo}>
                                  {item.titulo}
                                </span>
                                <span className="modulo-gestao__trilha-item-status">
                                  <span aria-hidden="true" className="modulo-gestao__status-ponto modulo-gestao__status-ponto--publicado" />
                                  Publicado
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {quizzes.length > 0 ? (
                      <section aria-label={`Quizzes (${quizzes.length})`}>
                        <h3 className="modulo-gestao__secao-titulo">
                          Quizzes do módulo
                          <span className="modulo-gestao__secao-contagem">{quizzes.length}</span>
                        </h3>
                        <ul aria-label={`Quizzes de ${modulo.titulo}`} role="list">
                          {quizzes.map((item) => (
                            <li className="modulo-gestao__trilha-item-wrap" key={item.id}>
                              <button
                                aria-current={itemAberto?.id === item.id ? "true" : undefined}
                                aria-label={`Ver quiz: ${item.titulo}`}
                                className="modulo-gestao__trilha-item"
                                onClick={() => setItemAbertoId(item.id)}
                                type="button"
                              >
                                <span aria-hidden="true" className="modulo-gestao__trilha-item-icone">
                                  <TbTrophy aria-hidden="true" size="1.1rem" />
                                </span>
                                <span className="modulo-gestao__trilha-item-titulo" title={item.titulo}>
                                  {item.titulo}
                                </span>
                                <span className="modulo-gestao__trilha-item-status">
                                  <span aria-hidden="true" className="modulo-gestao__status-ponto modulo-gestao__status-ponto--publicado" />
                                  Publicado
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
      </aside>

      <div className="modulo-gestao__conteudo">
        <header className="modulo-gestao__cabecalho">
          <div className="modulo-gestao__cabecalho-principal">
            <h2 className="modulo-gestao__titulo">
              <NumeroModulo indice={indiceModuloAtual} />
              <span className="modulo-gestao__titulo-texto" title={moduloAtual.titulo}>{moduloAtual.titulo}</span>
            </h2>
            <p className="modulo-gestao__resumo">{resumoModulo}</p>
          </div>
        </header>

        {erroRevisaoConteudo ? (
          <>
            <InlineMessage tone="error">{erroRevisaoConteudo}</InlineMessage>
            <Botao onClick={onTentarNovamenteRevisaoConteudo} tamanho="pequeno" variante="secundario">
              Tentar de novo
            </Botao>
          </>
        ) : null}

        <div aria-label="Prévia do item selecionado" className="modulo-gestao__painel">
          {itemAberto ? (
            <>
              <div className="modulo-gestao__painel-topo">
                <button className="modulo-gestao__voltar-painel" onClick={() => setItemAbertoId(null)} type="button">
                  <TbArrowLeft aria-hidden="true" size={16} /> Voltar ao módulo
                </button>
                <button aria-label="Fechar" className="modulo-gestao__fechar-painel" onClick={() => setItemAbertoId(null)} type="button">
                  <TbX aria-hidden="true" size={18} />
                </button>
              </div>

              <PreviaItemAluno
                item={itemAberto}
                questoes={itemAberto.questoes}
                rodape={
                  <footer className="modal-rodape modulo-gestao__painel-rodape">
                    <Botao
                      aria-label="Item anterior"
                      disabled={!itemAnterior}
                      onClick={() => itemAnterior && setItemAbertoId(itemAnterior.id)}
                      title={itemAnterior?.titulo}
                      type="button"
                      variante="secundario"
                    >
                      <TbArrowLeft aria-hidden="true" size={16} /> Anterior
                    </Botao>
                    <span className="modulo-gestao__painel-rodape-contador">
                      Item {indiceItemAberto + 1} de {itensOrdenados.length}
                    </span>
                    <Botao
                      aria-label="Próximo item"
                      disabled={!itemProximo}
                      onClick={() => itemProximo && setItemAbertoId(itemProximo.id)}
                      title={itemProximo?.titulo}
                      type="button"
                      variante="primario"
                    >
                      Próximo <TbArrowRight aria-hidden="true" size={16} />
                    </Botao>
                  </footer>
                }
                selo="Somente leitura"
              />
            </>
          ) : (
            <p className="texto-vazio" role="status">Escolha um conteúdo ou quiz para ver aqui.</p>
          )}
        </div>
      </div>
    </div>
  );
}
