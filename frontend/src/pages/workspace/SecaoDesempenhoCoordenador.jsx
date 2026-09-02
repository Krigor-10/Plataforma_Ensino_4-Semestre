import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbArrowLeft,
  TbAward,
  TbChartBar,
  TbChevronDown,
  TbCircleCheck,
  TbExternalLink,
  TbFile,
  TbFileText,
  TbLayoutGrid,
  TbPhoto,
  TbPlayerPlay,
  TbTrophy,
  TbUserCheck,
  TbUsers
} from "react-icons/tb";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatGrade, formatPercent, normalizeContentType, normalizePublicationStatus } from "../../lib/format.js";

const ROTULO_TIPO_AVALIACAO = { 1: "Quiz", 2: "Prova", 3: "Exercicio" };

function normalizeTipoAvaliacao(tipo) {
  return ROTULO_TIPO_AVALIACAO[tipo] || "Avaliacao";
}

const ICONE_TIPO_MATERIAL = {
  1: <TbFileText aria-hidden="true" size="1.75rem" />,
  2: <TbFile aria-hidden="true" size="1.75rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.75rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.75rem" />,
  5: <TbPhoto aria-hidden="true" size="1.75rem" />
};

/* PROGRESSO DA COORDENACAO — navegacao por Curso -> Modulos -> Materiais/
   Avaliacoes, so visualizacao/analise (sem acoes administrativas de Professor
   como Editar/Excluir/Publicar). Busca os dados agregados direto do backend
   (GET /Cursos/desempenho), que ja escopa por coordenador autenticado.
   "Turma" nao aparece em lugar nenhum desta tela — e so uma abstracao interna
   do backend, 1:1 com o curso na pratica. */
export function SecaoDesempenhoCoordenador({ cursoEmFoco, cursoPorId, onCursoEmFocoAplicado, onSessionExpired }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [cursosDesempenho, setCursosDesempenho] = useState([]);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [moduloAbertoId, setModuloAbertoId] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        setCarregando(true);
        setErro("");
        const dados = await apiRequest("/Cursos/desempenho");

        if (!ativo) {
          return;
        }

        setCursosDesempenho(dados);
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar o progresso dos cursos agora.");
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDesempenho();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId || carregando) {
      return;
    }

    const cursoAlvo = cursosDesempenho.find((curso) => curso.cursoId === cursoEmFocoId);
    if (cursoAlvo) {
      setCursoSelecionadoId(cursoEmFocoId);
    }

    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId, carregando]);

  const cursoSelecionado = useMemo(
    () => cursosDesempenho.find((curso) => curso.cursoId === cursoSelecionadoId) || null,
    [cursoSelecionadoId, cursosDesempenho]
  );

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(cursoId);
    setModuloAbertoId(null);
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
  }

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

  return (
    <div className="tela-progresso-coordenador">
      {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}

      {carregando ? (
        <p className="texto-vazio texto-vazio--central" role="status">Carregando progresso dos cursos...</p>
      ) : !cursoSelecionado ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Progresso</h2>
              <p className="cabecalho-pagina__subtitulo">Analise de progresso e desempenho dos cursos, modulos e materiais.</p>
            </div>
          </header>

          <GradeCursosProfessor
            cursos={cursosDesempenho.map((curso) => ({
              curso: cursoPorId.get(curso.cursoId) || { id: curso.cursoId, titulo: curso.cursoTitulo, descricao: "" },
              resumo: `${curso.totalAlunos} aluno${curso.totalAlunos === 1 ? "" : "s"} - ${curso.modulos.length} modulo${curso.modulos.length === 1 ? "" : "s"}`,
              rodapeEsquerda: curso.professorNome || "Sem professor",
              badge: `Media ${formatGrade(curso.desempenhoMedio)}`
            }))}
            mensagemVazia="Voce ainda nao tem cursos sob coordenacao."
            onSelecionar={selecionarCurso}
          />
        </>
      ) : (
        <>
          <nav aria-label="Navegacao do progresso" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaLista} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Progresso
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{cursoSelecionado.cursoTitulo}</h2>
              {cursoSelecionado.professorNome ? (
                <p className="atividades-curso__subtitulo">Professor responsavel: {cursoSelecionado.professorNome}</p>
              ) : null}
            </div>
          </header>

          <div className="grade-estatisticas">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Alunos" valor={cursoSelecionado.totalAlunos} />
            <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbUserCheck size={22} />} rotulo="Ativos" valor={cursoSelecionado.alunosAtivos} />
            <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio" valor={formatPercent(cursoSelecionado.progressoMedio)} />
            <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Taxa de conclusao" valor={formatPercent(cursoSelecionado.percentualConclusao)} />
            <CartaoEstatistica icone={<TbAward size={22} />} rotulo="Desempenho medio" valor={formatGrade(cursoSelecionado.desempenhoMedio)} />
          </div>

          {cursoSelecionado.avaliacoesSemModulo?.length > 0 ? (
            <section className="conteudos-modulo conteudos-modulo--sem-toggle" aria-label="Avaliacoes do curso">
              <header className="conteudos-modulo__cabecalho">
                <div className="conteudos-modulo__info">
                  <span aria-hidden="true" className="conteudos-modulo__icone">
                    <TbTrophy size="1.4rem" />
                  </span>
                  <span className="conteudos-modulo__titulo">Avaliacoes do curso</span>
                  <span className="conteudos-modulo__contagem">
                    {cursoSelecionado.avaliacoesSemModulo.length} avaliacao{cursoSelecionado.avaliacoesSemModulo.length === 1 ? "" : "oes"}
                  </span>
                </div>
              </header>
              <p className="atividades-curso__meta conteudos-modulo__descricao">Provas e exercicios vinculados direto ao curso, sem modulo.</p>
              <ul aria-label="Avaliacoes vinculadas direto ao curso" className="atividades-curso__lista" role="list">
                {cursoSelecionado.avaliacoesSemModulo.map((avaliacao) => (
                  <li className="atividades-curso__item atividades-curso__item--quiz" key={`avaliacao-curso-${avaliacao.avaliacaoId}`}>
                    <div className="atividades-curso__linha">
                      <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                        <TbTrophy aria-hidden="true" size="1.75rem" />
                      </span>
                      <div className="atividades-curso__corpo">
                        <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
                        <p className="atividades-curso__meta">
                          <span>{normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)}</span>
                          <span aria-hidden="true" className="atividades-curso__separador">·</span>
                          <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
                        </p>
                      </div>
                      <div className="atividades-curso__metrica">
                        {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"} · Media {formatGrade(avaliacao.mediaNota)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {cursoSelecionado.modulos.length === 0 ? (
            <EmptyState message="Este curso ainda nao tem modulos cadastrados." />
          ) : (
            <div className="atividades-curso__lista-modulos">
              {cursoSelecionado.modulos.map((modulo, indice) => {
                const aberto = moduloAbertoId === modulo.moduloId;
                const idDetalhe = `modulo-progresso-detalhe-${modulo.moduloId}`;
                const semItens = modulo.materiais.length === 0 && modulo.avaliacoes.length === 0;

                return (
                  <section className="conteudos-modulo" key={modulo.moduloId}>
                    <header className="conteudos-modulo__cabecalho">
                      <h3 className="conteudos-modulo__cabecalho-wrapper">
                        <button
                          aria-controls={idDetalhe}
                          aria-expanded={aberto}
                          className="conteudos-modulo__toggle"
                          onClick={() => alternarModulo(modulo.moduloId)}
                          type="button"
                        >
                          <div className="conteudos-modulo__info">
                            <span aria-hidden="true" className="conteudos-modulo__icone">
                              <TbLayoutGrid size="1.4rem" />
                            </span>
                            <span className="conteudos-modulo__eyebrow">Modulo {String(indice + 1).padStart(2, "0")}</span>
                            <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                            <span className="conteudos-modulo__contagem">
                              {modulo.totalMateriais} material{modulo.totalMateriais === 1 ? "" : "is"}
                            </span>
                          </div>
                          <TbChevronDown
                            aria-hidden="true"
                            className={`conteudos-modulo__chevron${aberto ? " conteudos-modulo__chevron--aberto" : ""}`}
                            size="1.1rem"
                          />
                        </button>
                      </h3>
                    </header>

                    <AnimatePresence initial={false}>
                      {aberto ? (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          id={idDetalhe}
                          initial={{ height: 0, opacity: 0 }}
                          key={`detalhe-modulo-progresso-${modulo.moduloId}`}
                          style={{ overflow: "hidden" }}
                          transition={{ duration: 0.24, ease: "easeInOut" }}
                        >
                          <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
                            <div className="lista-detalhes__item">
                              <dt>Progresso</dt>
                              <dd>{formatPercent(modulo.progressoMedio)}</dd>
                            </div>
                            <div className="lista-detalhes__item">
                              <dt>Conclusao</dt>
                              <dd>{formatPercent(modulo.percentualConclusao)}</dd>
                            </div>
                            <div className="lista-detalhes__item">
                              <dt>Desempenho medio</dt>
                              <dd>{formatGrade(modulo.desempenhoMedio)}</dd>
                            </div>
                          </dl>

                          {semItens ? (
                            <p className="texto-vazio" role="status">Nenhum material ou avaliacao cadastrado neste modulo ainda.</p>
                          ) : (
                            <ul aria-label={`Materiais e avaliacoes de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
                              {modulo.materiais.map((material) => (
                                <li className="atividades-curso__item" key={`material-${material.conteudoDidaticoId}`}>
                                  <div className="atividades-curso__linha">
                                    <span aria-hidden="true" className="atividades-curso__icone">
                                      {ICONE_TIPO_MATERIAL[Number(material.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
                                    </span>
                                    <div className="atividades-curso__corpo">
                                      <strong className="atividades-curso__item-titulo">{material.titulo}</strong>
                                      <p className="atividades-curso__meta">
                                        <span>{normalizeContentType(material.tipoConteudo)}</span>
                                        <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                        <Insignia texto={normalizePublicationStatus(material.statusPublicacao)} />
                                      </p>
                                    </div>
                                    <div className="atividades-curso__metrica">
                                      {formatPercent(material.percentualConclusao)} concluido
                                    </div>
                                  </div>
                                </li>
                              ))}
                              {modulo.avaliacoes.map((avaliacao) => (
                                <li className="atividades-curso__item atividades-curso__item--quiz" key={`avaliacao-${avaliacao.avaliacaoId}`}>
                                  <div className="atividades-curso__linha">
                                    <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                      <TbTrophy aria-hidden="true" size="1.75rem" />
                                    </span>
                                    <div className="atividades-curso__corpo">
                                      <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
                                      <p className="atividades-curso__meta">
                                        <span>{normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)}</span>
                                        <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                        <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
                                      </p>
                                    </div>
                                    <div className="atividades-curso__metrica">
                                      {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"} · Media {formatGrade(avaliacao.mediaNota)}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
