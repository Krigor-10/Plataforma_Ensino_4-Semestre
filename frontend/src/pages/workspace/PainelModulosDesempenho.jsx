import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbChevronDown,
  TbExternalLink,
  TbFile,
  TbFileText,
  TbLayoutGrid,
  TbPhoto,
  TbPlayerPlay,
  TbTrophy
} from "react-icons/tb";
import Insignia from "../../components/Insignia.jsx";
import { EmptyState } from "../../components/Primitives.jsx";
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

/* Bloco de Modulos (accordion) + Avaliacoes sem modulo, compartilhado entre
   Progresso do Coordenador (SecaoDesempenhoCoordenador.jsx) e Progresso do
   Professor (SecaoTurmasProfessor.jsx) - os dois consomem o mesmo formato de
   dado (CursoDesempenhoResponseDto), so a fonte/escopo dos cursos difere por
   papel. So visualizacao/analise, sem nenhuma acao administrativa. */
export default function PainelModulosDesempenho({ curso }) {
  const [moduloAbertoId, setModuloAbertoId] = useState(null);

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

  return (
    <>
      {curso.avaliacoesSemModulo?.length > 0 ? (
        <section className="conteudos-modulo conteudos-modulo--sem-toggle" aria-label="Avaliacoes do curso">
          <header className="conteudos-modulo__cabecalho">
            <div className="conteudos-modulo__info">
              <span aria-hidden="true" className="conteudos-modulo__icone">
                <TbTrophy size="1.4rem" />
              </span>
              <span className="conteudos-modulo__titulo">Avaliacoes do curso</span>
              <span className="conteudos-modulo__contagem">
                {curso.avaliacoesSemModulo.length} avaliacao{curso.avaliacoesSemModulo.length === 1 ? "" : "oes"}
              </span>
            </div>
          </header>
          <p className="atividades-curso__meta conteudos-modulo__descricao">Provas e exercicios vinculados direto ao curso, sem modulo.</p>
          <ul aria-label="Avaliacoes vinculadas direto ao curso" className="atividades-curso__lista" role="list">
            {curso.avaliacoesSemModulo.map((avaliacao) => (
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

      {curso.modulos.length === 0 ? (
        <EmptyState message="Este curso ainda nao tem modulos cadastrados." />
      ) : (
        <div className="atividades-curso__lista-modulos">
          {curso.modulos.map((modulo, indice) => {
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
                          {modulo.totalMateriais} {modulo.totalMateriais === 1 ? "material" : "materiais"}
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
  );
}
