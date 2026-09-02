import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbAlertTriangle,
  TbArrowLeft,
  TbArrowRight,
  TbAward,
  TbCertificate,
  TbChartBar,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbCircleCheck,
  TbClock,
  TbFile,
  TbFileText,
  TbLayoutGrid,
  TbLock,
  TbPhoto,
  TbPlayerPlay,
  TbExternalLink,
  TbRefresh,
  TbTrophy,
  TbX
} from "react-icons/tb";
import { EmptyState, InlineMessage, StatusPill } from "../../components/Primitives.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { CartaoCursoMatricula } from "./SecaoMatriculas.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import {
  compactText,
  formatDate,
  formatGrade,
  formatPercent,
  normalizeContentType,
  normalizeProgressStatus,
  normalizeStatus,
  parseApiDate,
  progressStatusTone,
  timestampFromApiDate
} from "../../lib/format.js";

const ACADEMIC_ACCENTS = [
  { solid: "#22c55e", border: "rgba(143, 179, 154, 0.34)", soft: "rgba(143, 179, 154, 0.07)" },
  { solid: "#38bdf8", border: "rgba(133, 174, 191, 0.34)", soft: "rgba(133, 174, 191, 0.07)" },
  { solid: "#f59e0b", border: "rgba(184, 160, 111, 0.34)", soft: "rgba(184, 160, 111, 0.07)" },
  { solid: "#a78bfa", border: "rgba(156, 145, 184, 0.34)", soft: "rgba(156, 145, 184, 0.07)" },
  { solid: "#fb7185", border: "rgba(181, 139, 150, 0.34)", soft: "rgba(181, 139, 150, 0.07)" },
  { solid: "#14b8a6", border: "rgba(130, 170, 163, 0.34)", soft: "rgba(130, 170, 163, 0.07)" },
  { solid: "#84cc16", border: "rgba(168, 184, 120, 0.34)", soft: "rgba(168, 184, 120, 0.07)" },
  { solid: "#f97316", border: "rgba(187, 146, 114, 0.34)", soft: "rgba(187, 146, 114, 0.07)" },
  { solid: "#6366f1", border: "rgba(134, 141, 183, 0.34)", soft: "rgba(134, 141, 183, 0.07)" },
  { solid: "#ef4444", border: "rgba(185, 135, 135, 0.34)", soft: "rgba(185, 135, 135, 0.07)" },
  { solid: "#06b6d4", border: "rgba(120, 170, 180, 0.34)", soft: "rgba(120, 170, 180, 0.07)" },
  { solid: "#d946ef", border: "rgba(173, 136, 180, 0.34)", soft: "rgba(173, 136, 180, 0.07)" }
];

const ICONE_TIPO_CONTEUDO_PROGRESSO = {
  1: <TbFileText aria-hidden="true" size="1.75rem" />,
  2: <TbFile aria-hidden="true" size="1.75rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.75rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.75rem" />,
  5: <TbPhoto aria-hidden="true" size="1.75rem" />
};

/* PROGRESSO DO ALUNO — mesmo layout/componentes da tela Progresso do
   Coordenador (SecaoDesempenhoCoordenador.jsx): grade de cards pra escolher
   o curso, depois atividades-curso__cabecalho + grade-estatisticas +
   accordion de modulos (conteudos-modulo), so que com KPIs e status na
   perspectiva do proprio aluno (progresso/nota) em vez de metricas
   agregadas de turma. Substitui o carrossel anterior. */
export function SecaoCursosAluno({ avaliacoes = [], conteudos, cursos, matriculas, modulos = [], onNavigate, progressos = {}, turmas }) {
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);
  const turmaPorId = useMemo(() => mapById(turmas), [turmas]);
  const modulosPorCursoId = useMemo(() => agruparModulosPorCurso(modulos), [modulos]);
  const progressoCursoPorMatricula = useMemo(
    () => new Map((progressos.cursos || []).map((progresso) => [progresso.matriculaId, progresso])),
    [progressos.cursos]
  );
  const progressoModuloPorChave = useMemo(
    () => new Map((progressos.modulos || []).map((progresso) => [`${progresso.matriculaId}-${progresso.moduloId}`, progresso])),
    [progressos.modulos]
  );
  const progressoConteudoPorConteudoId = useMemo(
    () => new Map((progressos.conteudos || []).map((progresso) => [progresso.conteudoDidaticoId, progresso])),
    [progressos.conteudos]
  );

  const resumoConteudosPorTurma = useMemo(() => {
    const resumo = new Map();

    conteudos.forEach((conteudo) => {
      const resumoAtual = resumo.get(conteudo.turmaId) || {
        total: 0,
        modulos: new Set(),
        ultimaPublicacao: null
      };

      resumoAtual.total += 1;
      resumoAtual.modulos.add(conteudo.moduloId);

      const dataCandidata = conteudo.publicadoEm || conteudo.atualizadoEm || conteudo.criadoEm || null;
      if (!resumoAtual.ultimaPublicacao || timestampFromApiDate(dataCandidata) > timestampFromApiDate(resumoAtual.ultimaPublicacao)) {
        resumoAtual.ultimaPublicacao = dataCandidata;
      }

      resumo.set(conteudo.turmaId, resumoAtual);
    });

    return resumo;
  }, [conteudos]);

  const linhasMatriculasAprovadas = useMemo(
    () =>
      [...matriculas]
        .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
        .sort((matriculaA, matriculaB) => {
          const tituloCursoA = cursoPorId.get(matriculaA.cursoId)?.titulo || "";
          const tituloCursoB = cursoPorId.get(matriculaB.cursoId)?.titulo || "";
          const comparacaoCurso = tituloCursoA.localeCompare(tituloCursoB, "pt-BR");

          if (comparacaoCurso !== 0) {
            return comparacaoCurso;
          }

          const nomeTurmaA = turmaPorId.get(matriculaA.turmaId)?.nomeTurma || "";
          const nomeTurmaB = turmaPorId.get(matriculaB.turmaId)?.nomeTurma || "";
          return nomeTurmaA.localeCompare(nomeTurmaB, "pt-BR");
        })
        .map((matricula) => {
          const resumoTurma = resumoConteudosPorTurma.get(matricula.turmaId) || null;
          const progressoCurso = progressoCursoPorMatricula.get(matricula.id);
          const modulosDoCurso = modulosPorCursoId.get(Number(matricula.cursoId)) || [];

          return {
            id: matricula.id,
            cursoId: matricula.cursoId,
            curso: cursoPorId.get(matricula.cursoId)?.titulo || `Curso #${matricula.cursoId}`,
            turmaId: matricula.turmaId,
            turma: turmaPorId.get(matricula.turmaId)?.nomeTurma || matricula.turma?.nomeTurma || "Turma em definicao",
            materiais: resumoTurma?.total || 0,
            modulos: modulosDoCurso.length || resumoTurma?.modulos.size || 0,
            progresso: progressoCurso?.percentualConclusao || 0,
            ultimaPublicacao: resumoTurma?.ultimaPublicacao || null,
            notaFinal: matricula.notaFinal ?? 0
          };
        }),
    [cursoPorId, matriculas, modulosPorCursoId, progressoCursoPorMatricula, resumoConteudosPorTurma, turmaPorId]
  );

  const linhaSelecionada = useMemo(
    () => linhasMatriculasAprovadas.find((linha) => Number(linha.cursoId) === cursoSelecionadoId) || null,
    [cursoSelecionadoId, linhasMatriculasAprovadas]
  );

  const detalheCursoSelecionado = useMemo(() => {
    const linha = linhaSelecionada;
    if (!linha) {
      return null;
    }

    const grupos = new Map();
    const avaliacoesDaTurma = avaliacoes.filter((avaliacao) => avaliacao.turmaId === linha.turmaId);

    function garantirGrupo(moduloId, tituloModulo) {
      const chave = moduloId || `sem-modulo-${tituloModulo || "geral"}`;
      const grupo = grupos.get(chave) || {
        id: chave,
        moduloId,
        titulo: tituloModulo || "Modulo sem titulo",
        conteudos: [],
        avaliacoes: []
      };

      grupos.set(chave, grupo);
      return grupo;
    }

    (modulosPorCursoId.get(Number(linha.cursoId)) || []).forEach((modulo) => {
      garantirGrupo(modulo.id, modulo.titulo);
    });

    conteudos
      .filter((conteudo) => conteudo.turmaId === linha.turmaId)
      .sort((conteudoA, conteudoB) => {
        const comparacaoModulo = (conteudoA.moduloTitulo || "").localeCompare(conteudoB.moduloTitulo || "", "pt-BR");
        if (comparacaoModulo !== 0) {
          return comparacaoModulo;
        }

        if ((conteudoA.ordemExibicao ?? 0) !== (conteudoB.ordemExibicao ?? 0)) {
          return (conteudoA.ordemExibicao ?? 0) - (conteudoB.ordemExibicao ?? 0);
        }

        return (conteudoA.titulo || "").localeCompare(conteudoB.titulo || "", "pt-BR");
      })
      .forEach((conteudo) => {
        const grupo = garantirGrupo(conteudo.moduloId, conteudo.moduloTitulo);
        grupo.conteudos.push(conteudo);
      });

    avaliacoesDaTurma.forEach((avaliacao) => {
      const grupo = garantirGrupo(avaliacao.moduloId, avaliacao.moduloTitulo);
      grupo.avaliacoes.push(avaliacao);
    });

    const modulos = [...grupos.values()].map((grupo) => {
      const progressoModulo = progressoModuloPorChave.get(`${linha.id}-${grupo.moduloId}`);
      const concluidos = progressoModulo?.conteudosConcluidos ?? grupo.conteudos.filter((conteudo) => estaConcluido(progressoConteudoPorConteudoId.get(conteudo.id))).length;
      const conteudosComProgresso = grupo.conteudos.map((conteudo) => {
        const progressoConteudo = progressoConteudoPorConteudoId.get(conteudo.id);

        return {
          ...conteudo,
          concluido: estaConcluido(progressoConteudo),
          progresso: progressoConteudo?.percentualConclusao || 0,
          statusProgresso: progressoConteudo?.statusProgresso || 1
        };
      });

      return {
        ...grupo,
        conteudos: conteudosComProgresso,
        avaliacoes: grupo.avaliacoes.sort((avaliacaoA, avaliacaoB) =>
          (avaliacaoA.titulo || "").localeCompare(avaliacaoB.titulo || "", "pt-BR")
        ),
        concluidos,
        progresso: progressoModulo?.percentualConclusao || calcularProgressoModulo(conteudosComProgresso),
        status: progressoModulo?.statusProgresso || 1
      };
    });

    const proximaAcao = obterProximaAcaoCurso(modulos);

    return {
      ...linha,
      modulos,
      proximaAcao
    };
  }, [
    avaliacoes,
    conteudos,
    linhaSelecionada,
    modulosPorCursoId,
    progressoConteudoPorConteudoId,
    progressoModuloPorChave
  ]);

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(Number(cursoId));
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
  }

  if (!linhasMatriculasAprovadas.length) {
    return (
      <div className="tela-progresso">
        <p className="texto-vazio texto-vazio--central" role="status">
          Assim que uma matricula for aprovada, os seus cursos ativos vao aparecer aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="tela-progresso">
      {!detalheCursoSelecionado ? (
        <GradeCursosProfessor
          cursos={linhasMatriculasAprovadas.map((linha) => ({
            curso: cursoPorId.get(linha.cursoId) || { id: linha.cursoId, titulo: linha.curso, descricao: "" },
            resumo: `${linha.modulos} modulo${linha.modulos === 1 ? "" : "s"}`,
            rodapeEsquerda: linha.turma,
            percentual: Math.round(Math.max(0, Math.min(linha.progresso, 100)))
          }))}
          mensagemVazia="Assim que uma matricula for aprovada, os seus cursos ativos vao aparecer aqui."
          onSelecionar={selecionarCurso}
        />
      ) : (
        <DetalheProgressoCurso detalhe={detalheCursoSelecionado} onNavigate={onNavigate} onVoltar={voltarParaLista} />
      )}
    </div>
  );
}

function DetalheProgressoCurso({ detalhe, onNavigate, onVoltar }) {
  const [moduloAbertoId, setModuloAbertoId] = useState(null);
  const percentual = Math.round(Math.max(0, Math.min(detalhe.progresso, 100)));
  const modulosComConteudo = detalhe.modulos.filter((modulo) => modulo.conteudos.length > 0);
  const modulosConcluidos = modulosComConteudo.filter((modulo) => modulo.progresso >= 100).length;
  const totalConteudos = detalhe.modulos.reduce((total, modulo) => total + modulo.conteudos.length, 0);
  const conteudosConcluidos = detalhe.modulos.reduce(
    (total, modulo) => total + modulo.conteudos.filter((conteudo) => conteudo.concluido).length,
    0
  );
  const certificadoDesbloqueado = percentual >= 100;

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

  return (
    <div className="conteudos-aluno">
      <nav aria-label="Navegacao entre cursos" className="atividades-curso__navegacao">
        <button className="atividades-curso__voltar" onClick={onVoltar} type="button">
          <TbArrowLeft aria-hidden="true" size={22} />
          Voltar para Progresso
        </button>
      </nav>

      <header className="atividades-curso__cabecalho">
        <div>
          <h2 className="atividades-curso__titulo">{detalhe.curso}</h2>
          <p className="atividades-curso__subtitulo">{detalhe.turma}</p>
        </div>
      </header>

      <div className="grade-estatisticas">
        <CartaoEstatistica icone={<TbChartBar size={22} />} rotulo="Progresso" valor={`${percentual}%`} />
        <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbLayoutGrid size={22} />} rotulo="Modulos concluidos" valor={`${modulosConcluidos}/${modulosComConteudo.length}`} />
        <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbCircleCheck size={22} />} rotulo="Conteudos concluidos" valor={`${conteudosConcluidos}/${totalConteudos}`} />
        <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbAward size={22} />} rotulo="Nota final" valor={formatGrade(detalhe.notaFinal)} />
      </div>

      {detalhe.modulos.length === 0 ? (
        <EmptyState message="Este curso ainda nao possui modulos publicados para a sua turma." />
      ) : (
        <div className="atividades-curso__lista-modulos">
          {detalhe.modulos.map((modulo, indice) => {
            const aberto = moduloAbertoId === modulo.id;
            const idDetalhe = `progresso-modulo-detalhe-${modulo.id}`;
            const moduloSemConteudo = modulo.conteudos.length === 0;
            const concluidoModulo = !moduloSemConteudo && modulo.progresso >= 100;
            const emAndamentoModulo = !moduloSemConteudo && modulo.progresso > 0 && !concluidoModulo;
            const statusModulo = moduloSemConteudo
              ? "Aguardando conteudos"
              : concluidoModulo
                ? "Concluido"
                : emAndamentoModulo
                  ? "Em andamento"
                  : "Nao iniciado";
            const totalItensModulo = modulo.conteudos.length + modulo.avaliacoes.length;
            const concluidosModulo = modulo.conteudos.filter((conteudo) => conteudo.concluido).length;

            return (
              <section className="conteudos-modulo" key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <h3 className="conteudos-modulo__cabecalho-wrapper">
                    <button
                      aria-controls={idDetalhe}
                      aria-expanded={aberto}
                      className="conteudos-modulo__toggle"
                      onClick={() => alternarModulo(modulo.id)}
                      type="button"
                    >
                      <div className="conteudos-modulo__info">
                        <span aria-hidden="true" className="conteudos-modulo__icone">
                          <TbLayoutGrid size="1.4rem" />
                        </span>
                        <span className="conteudos-modulo__eyebrow">Modulo {String(indice + 1).padStart(2, "0")}</span>
                        <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                        <span className="conteudos-modulo__contagem">
                          {totalItensModulo} item{totalItensModulo === 1 ? "" : "s"} · {statusModulo}
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
                      key={`detalhe-progresso-modulo-${modulo.id}`}
                      style={{ overflow: "hidden" }}
                      transition={{ duration: 0.24, ease: "easeInOut" }}
                    >
                      <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
                        <div className="lista-detalhes__item">
                          <dt>Progresso</dt>
                          <dd>{formatPercent(modulo.progresso)}</dd>
                        </div>
                        <div className="lista-detalhes__item">
                          <dt>Conteudos concluidos</dt>
                          <dd>{concluidosModulo}/{modulo.conteudos.length}</dd>
                        </div>
                        <div className="lista-detalhes__item">
                          <dt>Status</dt>
                          <dd>
                            <Insignia
                              texto={statusModulo}
                              variante={moduloSemConteudo ? "neutro" : concluidoModulo ? "sucesso" : emAndamentoModulo ? "info" : "neutro"}
                            />
                          </dd>
                        </div>
                      </dl>

                      {totalItensModulo === 0 ? (
                        <p className="texto-vazio" role="status">Nenhum conteudo publicado neste modulo.</p>
                      ) : (
                        <ul aria-label={`Conteudos de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
                          {modulo.conteudos.map((conteudo) => (
                            <li className="atividades-curso__item" key={`conteudo-${conteudo.id}`}>
                              <div className="atividades-curso__linha">
                                <span aria-hidden="true" className="atividades-curso__icone">
                                  {ICONE_TIPO_CONTEUDO_PROGRESSO[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
                                </span>
                                <div className="atividades-curso__corpo">
                                  <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                                  <p className="atividades-curso__meta">
                                    <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                                  </p>
                                </div>
                                <div className="atividades-curso__metrica">
                                  <Insignia texto={conteudo.concluido ? "Concluido" : "Pendente"} variante={conteudo.concluido ? "sucesso" : "neutro"} />
                                </div>
                              </div>
                            </li>
                          ))}
                          {modulo.avaliacoes.map((avaliacao) => {
                            const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);

                            return (
                              <li className="atividades-curso__item atividades-curso__item--quiz" key={`avaliacao-${avaliacao.id}`}>
                                <div className="atividades-curso__linha">
                                  <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                    <TbTrophy aria-hidden="true" size="1.75rem" />
                                  </span>
                                  <div className="atividades-curso__corpo">
                                    <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
                                    <p className="atividades-curso__meta">
                                      <span>Avaliacao</span>
                                    </p>
                                  </div>
                                  <div className="atividades-curso__metrica">{disponibilidade.label}</div>
                                </div>
                              </li>
                            );
                          })}
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

      {certificadoDesbloqueado ? (
        <div aria-label="Certificado disponivel" className="cartao-certificado-link cartao-certificado-link--desbloqueado" role="status">
          <span aria-hidden="true" className="cartao-certificado-link__trofeu">
            <TbTrophy size={28} />
          </span>
          <div className="cartao-certificado-link__info">
            <strong>Parabens! Certificado disponivel</strong>
            <p>Nota final <span className="cartao-certificado-link__nota-valor">{formatGrade(detalhe.notaFinal)}</span> - curso 100% concluido</p>
          </div>
          <Botao onClick={() => onNavigate("/app/certificados")} tamanho="pequeno" variante="primario">
            <TbCertificate aria-hidden="true" size={15} /> Ver meu certificado
          </Botao>
        </div>
      ) : (
        <div aria-label="Certificado bloqueado" className="cartao-certificado-link" role="status">
          <span aria-label="Bloqueado" aria-hidden="true" className="cartao-certificado-link__cadeado">
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="11" rx="2" width="18" x="3" y="11" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="cartao-certificado-link__info">
            <strong>Certificado de conclusao</strong>
            <p>{percentual}% concluido - {detalhe.proximaAcao.descricao}</p>
          </div>
          {detalhe.proximaAcao.to ? (
            <Botao onClick={() => onNavigate(detalhe.proximaAcao.to)} tamanho="pequeno" variante="secundario">
              {detalhe.proximaAcao.label}
            </Botao>
          ) : null}
        </div>
      )}
    </div>
  );
}

function useExecucaoAvaliacao({ onRefresh, onSessionExpired }) {
  const [avaliacaoParaConfirmar, setAvaliacaoParaConfirmar] = useState(null);
  const [avaliacaoEmExecucao, setAvaliacaoEmExecucao] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [enviandoRespostas, setEnviandoRespostas] = useState(false);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [apoioAberto, setApoioAberto] = useState(true);
  const [resultadoTentativa, setResultadoTentativa] = useState(null);
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState(null);

  useEffect(() => {
    if (!avaliacaoEmExecucao) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !enviandoRespostas) {
        fecharExecucaoAvaliacao();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [avaliacaoEmExecucao, enviandoRespostas]);

  useEffect(() => {
    if (!avaliacaoEmExecucao || resultadoTentativa || carregandoQuestoes || tempoRestanteSegundos === null) {
      return undefined;
    }

    if (tempoRestanteSegundos <= 0) {
      submeterRespostas(true);
      return undefined;
    }

    const temporizador = setTimeout(() => {
      setTempoRestanteSegundos((atual) => (atual === null ? null : atual - 1));
    }, 1000);

    return () => clearTimeout(temporizador);
  }, [avaliacaoEmExecucao, carregandoQuestoes, enviandoRespostas, resultadoTentativa, tempoRestanteSegundos]);

  function abrirConfirmacaoAvaliacao(avaliacao) {
    const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
    if (!disponibilidade.podeRealizar) {
      setMensagem({ tone: "warning", message: disponibilidade.mensagem });
      return;
    }

    setAvaliacaoParaConfirmar(avaliacao);
  }

  async function abrirExecucaoAvaliacao(avaliacao) {
    setAvaliacaoParaConfirmar(null);
    setAvaliacaoEmExecucao(avaliacao);
    setQuestoes([]);
    setRespostas({});
    setMensagem({ tone: "", message: "" });
    setIndiceAtual(0);
    setApoioAberto(true);
    setResultadoTentativa(null);
    setTempoRestanteSegundos(avaliacao.tempoLimiteMinutos > 0 ? avaliacao.tempoLimiteMinutos * 60 : null);
    setCarregandoQuestoes(true);

    try {
      const proximasQuestoes = await apiRequest(`/Avaliacoes/${avaliacao.id}/aluno/questoes`);
      setQuestoes(proximasQuestoes);
      setRespostas(criarRespostasIniciais(proximasQuestoes));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel carregar as questoes agora." });
    } finally {
      setCarregandoQuestoes(false);
    }
  }

  function fecharExecucaoAvaliacao() {
    if (enviandoRespostas) {
      return;
    }

    setAvaliacaoEmExecucao(null);
    setQuestoes([]);
    setRespostas({});
    setMensagem({ tone: "", message: "" });
    setIndiceAtual(0);
    setResultadoTentativa(null);
    setTempoRestanteSegundos(null);
  }

  function refazerAvaliacao() {
    if (avaliacaoEmExecucao) {
      abrirExecucaoAvaliacao(avaliacaoEmExecucao);
    }
  }

  function irParaQuestao(indice) {
    setIndiceAtual(Math.max(0, Math.min(indice, questoes.length - 1)));
    setApoioAberto(true);
  }

  function questaoRespondida(questao) {
    const resposta = respostas[questao.id];

    if (Number(questao.tipoQuestao) === 3) {
      return Boolean(String(resposta?.respostaTexto || "").trim());
    }

    return Boolean(resposta?.alternativaId);
  }

  function atualizarAlternativa(questaoId, alternativaId) {
    setRespostas((current) => ({
      ...current,
      [questaoId]: {
        ...(current[questaoId] || { questaoId }),
        alternativaId,
        respostaTexto: ""
      }
    }));
  }

  function atualizarRespostaTexto(questaoId, respostaTexto) {
    setRespostas((current) => ({
      ...current,
      [questaoId]: {
        ...(current[questaoId] || { questaoId }),
        alternativaId: null,
        respostaTexto
      }
    }));
  }

  function enviarRespostas(event) {
    event.preventDefault();

    if (!avaliacaoEmExecucao || !questoes.length) {
      return;
    }

    const pendente = questoes.find((questao) => {
      const resposta = respostas[questao.id];

      if (Number(questao.tipoQuestao) === 3) {
        return !String(resposta?.respostaTexto || "").trim();
      }

      return !resposta?.alternativaId;
    });

    if (pendente) {
      setMensagem({ tone: "error", message: `Responda a questao ${pendente.ordem} antes de enviar.` });
      return;
    }

    submeterRespostas();
  }

  async function submeterRespostas(porTempoEsgotado = false) {
    if (!avaliacaoEmExecucao || !questoes.length || enviandoRespostas) {
      return;
    }

    const payload = {
      respostas: questoes.map((questao) => {
        const resposta = respostas[questao.id];

        return {
          questaoId: questao.id,
          alternativaId: resposta?.alternativaId || null,
          respostaTexto: String(resposta?.respostaTexto || "").trim()
        };
      })
    };

    setEnviandoRespostas(true);
    setMensagem(
      porTempoEsgotado
        ? { tone: "warning", message: "Tempo esgotado. Enviando suas respostas automaticamente." }
        : { tone: "", message: "" }
    );

    try {
      const tentativa = await apiRequest(`/Avaliacoes/${avaliacaoEmExecucao.id}/aluno/respostas`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setResultadoTentativa(tentativa);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel enviar a avaliacao agora." });
    } finally {
      setEnviandoRespostas(false);
    }
  }

  const questaoAtual = questoes[indiceAtual] || null;
  const ehUltimaQuestao = indiceAtual === questoes.length - 1;

  const modais = (
    <>
      {avaliacaoParaConfirmar ? (
        <Modal
          onFechar={() => setAvaliacaoParaConfirmar(null)}
          titulo="Antes de comecar"
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setAvaliacaoParaConfirmar(null)} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao onClick={() => abrirExecucaoAvaliacao(avaliacaoParaConfirmar)} type="button" variante="sucesso">
                <TbPlayerPlay aria-hidden="true" size={15} /> Iniciar
              </Botao>
            </footer>
          }
        >
          <div className="quiz-confirmacao">
            <h3 className="quiz-confirmacao__titulo">{avaliacaoParaConfirmar.titulo}</h3>
            <p className="quiz-confirmacao__curso">
              {avaliacaoParaConfirmar.cursoTitulo || "Curso"} - {avaliacaoParaConfirmar.turmaNome || "Turma"}
            </p>

            <dl className="quiz-confirmacao__resumo">
              <div className="quiz-confirmacao__resumo-item">
                <dt>Questoes</dt>
                <dd>{avaliacaoParaConfirmar.totalQuestoes || 0}</dd>
              </div>
              <div className="quiz-confirmacao__resumo-item">
                <dt>Tempo limite</dt>
                <dd>
                  {avaliacaoParaConfirmar.tempoLimiteMinutos > 0
                    ? `${avaliacaoParaConfirmar.tempoLimiteMinutos} minutos`
                    : "Sem limite"}
                </dd>
              </div>
              <div className="quiz-confirmacao__resumo-item">
                <dt>Nota maxima</dt>
                <dd>{formatScore(avaliacaoParaConfirmar.notaMaxima)}</dd>
              </div>
              <div className="quiz-confirmacao__resumo-item">
                <dt>Tentativas</dt>
                <dd>
                  {(avaliacaoParaConfirmar.tentativasRealizadas || 0) + 1} de {avaliacaoParaConfirmar.tentativasPermitidas || 1}
                </dd>
              </div>
            </dl>

            {avaliacaoParaConfirmar.tempoLimiteMinutos > 0 ? (
              <div className="quiz-confirmacao__aviso">
                <TbAlertTriangle aria-hidden="true" size={18} />
                <p>O cronometro inicia assim que voce confirmar. Certifique-se de estar em um ambiente sem interrupcoes.</p>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {avaliacaoEmExecucao ? (() => {
        const corrigida = resultadoTentativa ? Number(resultadoTentativa.statusTentativa) === 3 : false;
        const porcentagem =
          resultadoTentativa && Number(resultadoTentativa.notaMaxima) > 0
            ? (Number(resultadoTentativa.notaBruta) / Number(resultadoTentativa.notaMaxima)) * 100
            : 0;
        const tentativasUsadas = (avaliacaoEmExecucao.tentativasRealizadas || 0) + 1;
        const tentativasPermitidas = avaliacaoEmExecucao.tentativasPermitidas || 1;
        const podeRefazer = tentativasUsadas < tentativasPermitidas;

        return (
        <Modal
          className={resultadoTentativa ? "modal-caixa--resultado-avaliacao" : "modal-caixa--avaliacao"}
          onFechar={fecharExecucaoAvaliacao}
          titulo={avaliacaoEmExecucao.titulo}
          rodape={
            resultadoTentativa ? (
              <footer className="modal-rodape">
                <Botao
                  onClick={fecharExecucaoAvaliacao}
                  style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "auto" }}
                  type="button"
                  variante="fantasma"
                >
                  <TbArrowLeft aria-hidden="true" size={16} /> Voltar as avaliacoes
                </Botao>
                {podeRefazer ? (
                  <Botao
                    onClick={refazerAvaliacao}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    type="button"
                    variante="secundario"
                  >
                    <TbRefresh aria-hidden="true" size={16} /> Refazer avaliacao
                  </Botao>
                ) : (
                  <span className="resultado-avaliacao__tentativas">Limite de tentativas atingido</span>
                )}
              </footer>
            ) : null
          }
        >
          {resultadoTentativa ? (
                <section
                  aria-labelledby="resultado-avaliacao-titulo"
                  className={`resultado-avaliacao resultado-avaliacao--${corrigida ? "sucesso" : "pendente"}`}
                >
                  <div aria-hidden="true" className="resultado-avaliacao__icone">
                    {corrigida ? <TbCheck size={30} /> : <TbFileText size={26} />}
                  </div>

                  <h3 className="resultado-avaliacao__titulo" id="resultado-avaliacao-titulo">
                    {corrigida ? "Avaliacao corrigida" : "Respostas enviadas"}
                  </h3>

                  <p className="resultado-avaliacao__descricao">
                    {corrigida
                      ? "A correcao automatica foi concluida e sua nota ja esta disponivel abaixo."
                      : "Suas respostas foram registradas. As questoes dissertativas aguardam correcao do professor — a nota abaixo considera apenas as questoes ja corrigidas automaticamente."}
                  </p>

                  <div
                    aria-label={`Aproveitamento: ${formatPercent(porcentagem)}`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(porcentagem)}
                    className="resultado-avaliacao__barra-wrap"
                    role="progressbar"
                  >
                    <div className="resultado-avaliacao__barra" style={{ width: `${Math.max(0, Math.min(porcentagem, 100))}%` }} />
                  </div>
                  <p className="resultado-avaliacao__porcentagem">{formatPercent(porcentagem)}</p>

                  <dl className="resultado-avaliacao__notas">
                    <div className="resultado-avaliacao__nota-item">
                      <dt>Nota obtida</dt>
                      <dd>
                        {formatScore(resultadoTentativa.notaBruta)} / {formatScore(resultadoTentativa.notaMaxima)}
                      </dd>
                    </div>
                    <div className="resultado-avaliacao__nota-item">
                      <dt>Aproveitamento</dt>
                      <dd>{formatPercent(porcentagem)}</dd>
                    </div>
                    <div className="resultado-avaliacao__nota-item">
                      <dt>Tentativas usadas</dt>
                      <dd>{tentativasUsadas} de {tentativasPermitidas}</dd>
                    </div>
                  </dl>
                </section>
          ) : carregandoQuestoes ? (
            <EmptyState message="Carregando questoes da avaliacao." />
          ) : (
            <>
              <header className="quiz-cabecalho">
                <div className="quiz-embutido__info">
                  <p className="quiz-embutido__curso">{avaliacaoEmExecucao.cursoTitulo || "Curso"} - {avaliacaoEmExecucao.turmaNome || "Turma"}</p>
                </div>
                <div className="quiz-cabecalho__steps">
                  <span className="quiz-cabecalho__contador">Questao {indiceAtual + 1} de {questoes.length}</span>
                  <nav aria-label="Progresso da avaliacao" className="quiz-steps">
                    {questoes.map((questao, indice) => (
                      <button
                        aria-current={indice === indiceAtual ? "step" : undefined}
                        aria-label={`Questao ${indice + 1}${questaoRespondida(questao) ? " - respondida" : ""}`}
                        className={`quiz-step${questaoRespondida(questao) ? " quiz-step--respondida" : ""}${indice === indiceAtual ? " quiz-step--ativo" : ""}`}
                        disabled={enviandoRespostas}
                        key={questao.id}
                        onClick={() => irParaQuestao(indice)}
                        type="button"
                      >
                        {indice + 1}
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="quiz-cabecalho__acoes">
                  {tempoRestanteSegundos !== null ? (
                    <span
                      className={`quiz-cronometro${tempoRestanteSegundos <= 60 ? " quiz-cronometro--urgente" : ""}`}
                      title="Tempo restante"
                    >
                      <TbClock aria-hidden="true" size={16} /> {formatarTempoRestante(tempoRestanteSegundos)}
                    </span>
                  ) : null}
                  <Botao
                    disabled={enviandoRespostas}
                    onClick={fecharExecucaoAvaliacao}
                    tamanho="pequeno"
                    type="button"
                    variante="perigo"
                  >
                    <TbX aria-hidden="true" size={15} /> Sair
                  </Botao>
                </div>
              </header>

              {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

              {questaoAtual ? (
                <form className="quiz-corpo" onSubmit={enviarRespostas}>
                  {questaoAtual.contexto ? (
                    <section className="quiz-apoio">
                      <button aria-expanded={apoioAberto} className="quiz-apoio__toggle" onClick={() => setApoioAberto((atual) => !atual)} type="button">
                        <span>Contexto de apoio</span>
                        <span aria-hidden="true">{apoioAberto ? <TbChevronUp size={14} /> : <TbChevronDown size={14} />}</span>
                      </button>
                      {apoioAberto ? (
                        <div className="quiz-apoio__conteudo">
                          <p>{questaoAtual.contexto}</p>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="quiz-enunciado">
                    <h3 className="quiz-enunciado__titulo">Questao {questaoAtual.ordem} - {normalizeQuestionType(questaoAtual.tipoQuestao)} - {formatScore(questaoAtual.pontos)} ponto(s)</h3>
                    <div className="quiz-enunciado__texto">
                      <p>{questaoAtual.enunciado}</p>
                    </div>
                  </section>

                  {Number(questaoAtual.tipoQuestao) === 3 ? (
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor={`resposta-${questaoAtual.id}`}>Resposta</label>
                      <textarea
                        className="campo__entrada"
                        disabled={enviandoRespostas}
                        id={`resposta-${questaoAtual.id}`}
                        onChange={(event) => atualizarRespostaTexto(questaoAtual.id, event.target.value)}
                        placeholder="Digite sua resposta."
                        value={respostas[questaoAtual.id]?.respostaTexto || ""}
                      />
                    </div>
                  ) : (
                    <fieldset className="quiz-alternativas" disabled={enviandoRespostas}>
                      <legend className="visualmente-oculto">Alternativas da questao {indiceAtual + 1}</legend>
                      {questaoAtual.alternativas.map((alternativa) => (
                        <button
                          aria-pressed={respostas[questaoAtual.id]?.alternativaId === alternativa.id}
                          className={`quiz-alternativa${respostas[questaoAtual.id]?.alternativaId === alternativa.id ? " quiz-alternativa--selecionada" : ""}`}
                          key={alternativa.id}
                          onClick={() => atualizarAlternativa(questaoAtual.id, alternativa.id)}
                          type="button"
                        >
                          <span aria-hidden="true" className="quiz-alternativa__letra">{alternativa.letra}</span>
                          <span className="quiz-alternativa__texto">{alternativa.texto}</span>
                        </button>
                      ))}
                    </fieldset>
                  )}

                  <div className="quiz-acoes">
                    {indiceAtual > 0 ? (
                      <Botao disabled={enviandoRespostas} onClick={() => irParaQuestao(indiceAtual - 1)} type="button" variante="fantasma">
                        <TbArrowLeft aria-hidden="true" size={16} /> Voltar
                      </Botao>
                    ) : (
                      <span />
                    )}

                    {ehUltimaQuestao ? (
                      <Botao disabled={enviandoRespostas} type="submit" variante="primario">
                        {enviandoRespostas ? "Enviando..." : "Enviar avaliacao"}
                      </Botao>
                    ) : (
                      <Botao disabled={enviandoRespostas} onClick={() => irParaQuestao(indiceAtual + 1)} type="button" variante="primario">
                        Proxima questao <TbArrowRight aria-hidden="true" size={16} />
                      </Botao>
                    )}
                  </div>
                </form>
              ) : null}
            </>
          )}
        </Modal>
        );
      })() : null}
    </>
  );

  return { abrirConfirmacaoAvaliacao, carregandoQuestoes, enviandoRespostas, mensagem, modaisExecucaoAvaliacao: modais, setMensagem };
}

/* Mesmo fluxo/padrao visual da tela de Avaliacoes do professor (cursos em
   card -> accordion de avaliacoes do curso, sem hierarquia de modulos), so que
   com as acoes do aluno (Realizar avaliacao) em vez das de gerenciamento. Ver
   SecaoAvaliacoesProfessor.jsx para o padrao original. Avaliacoes ja vem
   pre-filtradas pra turmas aprovadas do aluno (endpoint /Avaliacoes/aluno). */
export function SecaoAvaliacoesAluno({ avaliacoes, cursoIdSelecionado = null, cursos = [], onNavigate, onRefresh, onSessionExpired }) {
  const { abrirConfirmacaoAvaliacao, carregandoQuestoes, enviandoRespostas, mensagem, modaisExecucaoAvaliacao } = useExecucaoAvaliacao({
    onRefresh,
    onSessionExpired
  });
  const [avaliacaoAbertaId, setAvaliacaoAbertaId] = useState(null);

  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);

  const cursosComAvaliacao = useMemo(() => {
    const agrupados = new Map();
    avaliacoes.forEach((avaliacao) => {
      if (!avaliacao.cursoId) {
        return;
      }

      const atual = agrupados.get(avaliacao.cursoId) || {
        cursoId: avaliacao.cursoId,
        cursoTitulo: avaliacao.cursoTitulo || `Curso #${avaliacao.cursoId}`,
        total: 0,
        disponiveis: 0
      };

      atual.total += 1;
      if (obterDisponibilidadeAvaliacao(avaliacao).podeRealizar) {
        atual.disponiveis += 1;
      }

      agrupados.set(avaliacao.cursoId, atual);
    });

    return [...agrupados.values()].sort((left, right) => left.cursoTitulo.localeCompare(right.cursoTitulo, "pt-BR"));
  }, [avaliacoes]);

  const cursoAtivo = useMemo(
    () => (cursoIdSelecionado ? cursosComAvaliacao.find((entrada) => entrada.cursoId === cursoIdSelecionado) || null : null),
    [cursoIdSelecionado, cursosComAvaliacao]
  );

  const avaliacoesDoCursoAtivo = useMemo(
    () =>
      cursoAtivo
        ? [...avaliacoes]
            .filter((avaliacao) => avaliacao.cursoId === cursoAtivo.cursoId)
            .sort((left, right) => (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"))
        : [],
    [avaliacoes, cursoAtivo]
  );

  function abrirCurso(cursoId) {
    setAvaliacaoAbertaId(null);
    onNavigate?.(`/app/avaliacoes/${cursoId}`);
  }

  function voltarParaCursos() {
    onNavigate?.("/app/avaliacoes");
  }

  function alternarAvaliacao(avaliacaoId) {
    setAvaliacaoAbertaId((atual) => (atual === avaliacaoId ? null : avaliacaoId));
  }

  return (
    <div className="tela-avaliacoes tela-avaliacoes-aluno">
      {!cursoAtivo ? (
        <GradeCursosProfessor
          cursos={cursosComAvaliacao.map(({ cursoId, cursoTitulo, disponiveis, total }) => ({
            curso: cursoPorId.get(cursoId) || { id: cursoId, titulo: cursoTitulo, descricao: "" },
            resumo: `${total} avaliaca${total === 1 ? "o" : "oes"}`,
            rodapeEsquerda: `${disponiveis} disponivel${disponiveis === 1 ? "" : "eis"}`,
            badge: disponiveis > 0 ? "Disponivel" : "Sem pendencias"
          }))}
          mensagemVazia="Quando um professor publicar uma avaliacao para sua turma, ela aparecera aqui."
          onSelecionar={abrirCurso}
        />
      ) : (
        <>
          <nav aria-label="Navegacao das avaliacoes" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaCursos} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Avaliacoes
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">Avaliacoes</h2>
              <p className="atividades-curso__subtitulo">{cursoAtivo.cursoTitulo}</p>
            </div>
          </header>

          {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

          <ListaAvaliacoesAluno
            avaliacaoAbertaId={avaliacaoAbertaId}
            avaliacoes={avaliacoesDoCursoAtivo}
            onAlternar={alternarAvaliacao}
            onRealizarAvaliacao={abrirConfirmacaoAvaliacao}
            processando={carregandoQuestoes || enviandoRespostas}
          />
        </>
      )}

      {modaisExecucaoAvaliacao}
    </div>
  );
}

function ListaAvaliacoesAluno({ avaliacaoAbertaId, avaliacoes, onAlternar, onRealizarAvaliacao, processando }) {
  if (avaliacoes.length === 0) {
    return <p className="texto-vazio" role="status">Nenhuma avaliacao cadastrada para este curso ainda.</p>;
  }

  return (
    <div className="atividades-curso__lista-modulos">
      {avaliacoes.map((avaliacao, indice) => {
        const aberta = avaliacaoAbertaId === avaliacao.id;
        const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
        const idDetalhe = `avaliacao-aluno-detalhe-${avaliacao.id}`;
        const temNota = avaliacao.ultimaNota !== null && avaliacao.ultimaNota !== undefined;

        return (
          <section className="conteudos-modulo" key={avaliacao.id}>
            <header className="conteudos-modulo__cabecalho">
              <h3 className="conteudos-modulo__cabecalho-wrapper">
                <button
                  aria-controls={idDetalhe}
                  aria-expanded={aberta}
                  className="conteudos-modulo__toggle"
                  onClick={() => onAlternar(avaliacao.id)}
                  type="button"
                >
                  <div className="conteudos-modulo__info">
                    <span aria-hidden="true" className="conteudos-modulo__icone">
                      <TbTrophy size="1.4rem" />
                    </span>
                    <span className="conteudos-modulo__eyebrow">Avaliacao {String(indice + 1).padStart(2, "0")}</span>
                    <span className="conteudos-modulo__titulo">{avaliacao.titulo}</span>
                    <span className="conteudos-modulo__contagem">
                      {avaliacao.totalQuestoes || 0} questa{avaliacao.totalQuestoes === 1 ? "o" : "oes"} · {disponibilidade.label}
                    </span>
                  </div>
                  <TbChevronDown
                    aria-hidden="true"
                    className={`conteudos-modulo__chevron${aberta ? " conteudos-modulo__chevron--aberto" : ""}`}
                    size="1.1rem"
                  />
                </button>
              </h3>
            </header>

            <AnimatePresence initial={false}>
              {aberta ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  id={idDetalhe}
                  initial={{ height: 0, opacity: 0 }}
                  key={`detalhe-avaliacao-aluno-${avaliacao.id}`}
                  style={{ overflow: "hidden" }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                >
                  <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
                    <div className="lista-detalhes__item">
                      <dt>Status</dt>
                      <dd><StatusPill tone={disponibilidade.tone}>{disponibilidade.label}</StatusPill></dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt>Questoes</dt>
                      <dd>{avaliacao.totalQuestoes || 0}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt>Tentativas</dt>
                      <dd>{avaliacao.tentativasRealizadas || 0}/{avaliacao.tentativasPermitidas || 1}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt>{temNota ? "Ultima nota" : "Nota maxima"}</dt>
                      <dd>{temNota ? formatScore(avaliacao.ultimaNota) : formatGrade(avaliacao.notaMaxima)}</dd>
                    </div>
                  </dl>

                  <div className="atividades-curso__acoes-aluno">
                    {disponibilidade.podeRealizar ? (
                      <Botao
                        className="atividades-curso__botao-iniciar"
                        disabled={processando}
                        onClick={() => onRealizarAvaliacao(avaliacao)}
                        tamanho="pequeno"
                        variante="primario"
                      >
                        <TbPlayerPlay aria-hidden="true" size={14} />
                        Iniciar avaliacao
                      </Botao>
                    ) : (
                      <span className="cartao-avaliacao__bloqueado-info">{disponibilidade.mensagem}</span>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

export function SecaoConteudosAluno({
  avaliacoes = [],
  conteudos,
  cursoIdSelecionado = null,
  cursos = [],
  matriculas,
  modulos = [],
  onNavigate,
  onRefresh,
  onSessionExpired,
  progressos = {},
  turmas = []
}) {
  const [mensagem, setMensagem] = useState({ tone: "info", message: "" });
  const { abrirConfirmacaoAvaliacao, carregandoQuestoes, enviandoRespostas, mensagem: mensagemQuiz, modaisExecucaoAvaliacao } = useExecucaoAvaliacao({
    onRefresh,
    onSessionExpired
  });
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [conteudosConcluidosLocais, setConteudosConcluidosLocais] = useState(() => new Set());
  const [conteudoSelecionadoId, setConteudoSelecionadoId] = useState(null);
  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);
  const turmaPorId = useMemo(() => mapById(turmas), [turmas]);
  const moduloPorId = useMemo(() => mapById(modulos), [modulos]);
  const modulosPorCursoId = useMemo(() => agruparModulosPorCurso(modulos), [modulos]);

  const matriculasAprovadas = useMemo(
    () =>
      [...matriculas]
        .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
        .sort((matriculaA, matriculaB) => {
          const tituloCursoA = obterTituloCursoMatricula(matriculaA, cursoPorId);
          const tituloCursoB = obterTituloCursoMatricula(matriculaB, cursoPorId);
          const comparacaoCurso = tituloCursoA.localeCompare(tituloCursoB, "pt-BR");

          if (comparacaoCurso !== 0) {
            return comparacaoCurso;
          }

          return obterNomeTurmaMatricula(matriculaA, turmaPorId).localeCompare(obterNomeTurmaMatricula(matriculaB, turmaPorId), "pt-BR");
        }),
    [cursoPorId, matriculas, turmaPorId]
  );

  const progressosConteudos = progressos.conteudos || [];

  const progressoConteudoPorConteudoId = useMemo(
    () => new Map(progressosConteudos.map((progresso) => [progresso.conteudoDidaticoId, progresso])),
    [progressosConteudos]
  );

  useEffect(() => {
    const idsConteudosVisiveis = new Set(conteudos.map((conteudo) => conteudo.id));

    setConteudosConcluidosLocais((atuais) => {
      const proximos = new Set([...atuais].filter((conteudoId) => idsConteudosVisiveis.has(conteudoId)));
      return proximos.size === atuais.size ? atuais : proximos;
    });
  }, [conteudos]);

  const conteudosOrdenados = useMemo(
    () =>
      [...conteudos].sort((conteudoA, conteudoB) => {
        const tituloCursoA = conteudoA.cursoTitulo || "";
        const tituloCursoB = conteudoB.cursoTitulo || "";
        const comparacaoCurso = tituloCursoA.localeCompare(tituloCursoB, "pt-BR");

        if (comparacaoCurso !== 0) {
          return comparacaoCurso;
        }

        const comparacaoTurma = (conteudoA.turmaNome || "").localeCompare(conteudoB.turmaNome || "", "pt-BR");
        if (comparacaoTurma !== 0) {
          return comparacaoTurma;
        }

        const comparacaoModulo = (conteudoA.moduloTitulo || "").localeCompare(conteudoB.moduloTitulo || "", "pt-BR");
        if (comparacaoModulo !== 0) {
          return comparacaoModulo;
        }

        if ((conteudoA.ordemExibicao ?? 0) !== (conteudoB.ordemExibicao ?? 0)) {
          return (conteudoA.ordemExibicao ?? 0) - (conteudoB.ordemExibicao ?? 0);
        }

        return (conteudoA.titulo || "").localeCompare(conteudoB.titulo || "", "pt-BR");
      }),
    [conteudos]
  );
  const gruposConteudosPorCurso = useMemo(() => {
    const cursosMapeados = new Map();

    function garantirCurso(cursoId, tituloCurso, chaveAlternativa = "") {
      const chaveCurso = cursoId || `curso-${tituloCurso || chaveAlternativa || "sem-curso"}`;
      const acentoCurso = obterAcentoAcademico(chaveCurso);
      const curso = cursosMapeados.get(chaveCurso) || {
        id: chaveCurso,
        acento: acentoCurso,
        titulo: tituloCurso || (cursoId ? `Curso #${cursoId}` : "Curso sem titulo"),
        turmas: new Set(),
        modulos: new Map(),
        totalConteudos: 0,
        concluidos: 0
      };

      cursosMapeados.set(chaveCurso, curso);
      return curso;
    }

    function garantirModulo(curso, moduloId, tituloModulo, dataCriacao = null) {
      const chaveModulo = moduloId || `modulo-${tituloModulo || "sem-modulo"}`;
      const acentoModulo = obterAcentoAcademicoPorIndice(curso.acento.indice + curso.modulos.size + 1);
      const modulo = curso.modulos.get(chaveModulo) || {
        id: chaveModulo,
        acento: acentoModulo,
        titulo: tituloModulo || (moduloId ? `Modulo #${moduloId}` : "Modulo sem titulo"),
        dataCriacao,
        conteudos: [],
        concluidos: 0,
        quizzes: []
      };

      if (!modulo.dataCriacao && dataCriacao) {
        modulo.dataCriacao = dataCriacao;
      }

      curso.modulos.set(chaveModulo, modulo);
      return modulo;
    }

    matriculasAprovadas.forEach((matricula) => {
      const cursoId = Number(matricula.cursoId);
      const curso = garantirCurso(cursoId, obterTituloCursoMatricula(matricula, cursoPorId), `matricula-${matricula.id}`);
      curso.turmas.add(obterNomeTurmaMatricula(matricula, turmaPorId));

      (modulosPorCursoId.get(cursoId) || []).forEach((modulo) => {
        garantirModulo(curso, Number(modulo.id), modulo.titulo, modulo.dataCriacao);
      });
    });

    conteudosOrdenados.forEach((conteudo) => {
      const cursoId = Number(conteudo.cursoId);
      const curso = garantirCurso(cursoId, conteudo.cursoTitulo || cursoPorId.get(cursoId)?.titulo, conteudo.turmaNome);
      const moduloId = Number(conteudo.moduloId);
      const moduloReferencia = moduloPorId.get(moduloId);
      const modulo = garantirModulo(curso, moduloId, conteudo.moduloTitulo || moduloReferencia?.titulo, moduloReferencia?.dataCriacao);
      const progressoConteudo = progressoConteudoPorConteudoId.get(conteudo.id);
      const concluido = conteudosConcluidosLocais.has(conteudo.id) || estaConcluido(progressoConteudo);
      const progressoPercentual = concluido ? 100 : Number(progressoConteudo?.percentualConclusao || 0);
      const statusProgresso = concluido ? 3 : progressoConteudo?.statusProgresso || 1;

      curso.turmas.add(conteudo.turmaNome || turmaPorId.get(Number(conteudo.turmaId))?.nomeTurma || `Turma #${conteudo.turmaId}`);
      curso.totalConteudos += 1;
      curso.concluidos += concluido ? 1 : 0;

      modulo.concluidos += concluido ? 1 : 0;
      modulo.conteudos.push({
        ...conteudo,
        concluido,
        progressoConteudo,
        progressoPercentual,
        statusProgresso,
        quizzes: []
      });

      curso.modulos.set(modulo.id, modulo);
    });

    avaliacoes
      .filter((avaliacao) => Number(avaliacao.tipoAvaliacao) === 1)
      .forEach((avaliacao) => {
        const cursoId = Number(avaliacao.cursoId);
        const curso = cursosMapeados.get(cursoId);
        if (!curso) {
          return;
        }

        const moduloId = Number(avaliacao.moduloId);
        const modulo = curso.modulos.get(moduloId);
        if (!modulo) {
          return;
        }

        const material = avaliacao.conteudoDidaticoId
          ? modulo.conteudos.find((conteudo) => conteudo.id === avaliacao.conteudoDidaticoId)
          : null;

        if (material) {
          material.quizzes.push(avaliacao);
        } else {
          modulo.quizzes.push(avaliacao);
        }
      });

    return [...cursosMapeados.values()].map((curso) => {
      const modulos = [...curso.modulos.values()]
        .map((modulo) => ({
          ...modulo,
          progresso: modulo.conteudos.length ? (modulo.concluidos / modulo.conteudos.length) * 100 : 0
        }))
        .sort((moduloA, moduloB) => {
          const dataA = timestampFromApiDate(moduloA.dataCriacao);
          const dataB = timestampFromApiDate(moduloB.dataCriacao);

          if (dataA !== dataB) {
            return dataA - dataB;
          }

          return (moduloA.titulo || "").localeCompare(moduloB.titulo || "", "pt-BR");
        });

      return {
        ...curso,
        turmas: [...curso.turmas].filter(Boolean).sort((left, right) => left.localeCompare(right, "pt-BR")),
        progresso: curso.totalConteudos ? (curso.concluidos / curso.totalConteudos) * 100 : 0,
        modulos
      };
    });
  }, [
    avaliacoes,
    conteudosConcluidosLocais,
    conteudosOrdenados,
    cursoPorId,
    matriculasAprovadas,
    moduloPorId,
    modulosPorCursoId,
    progressoConteudoPorConteudoId,
    turmaPorId
  ]);

  const conteudosDaTrilha = useMemo(
    () =>
      gruposConteudosPorCurso.flatMap((curso) =>
        curso.modulos.flatMap((modulo) =>
          modulo.conteudos.map((conteudo) => ({
            ...conteudo,
            cursoAgrupadoId: curso.id,
            cursoTitulo: curso.titulo,
            cursoTurmas: curso.turmas,
            cursoAcento: curso.acento,
            moduloAgrupadoId: modulo.id,
            moduloChave: obterChaveModuloConteudo(curso.id, modulo.id),
            moduloTitulo: modulo.titulo
          }))
        )
      ),
    [gruposConteudosPorCurso]
  );

  const conteudoSelecionado = useMemo(
    () => conteudosDaTrilha.find((conteudo) => conteudo.id === conteudoSelecionadoId) || null,
    [conteudoSelecionadoId, conteudosDaTrilha]
  );

  useEffect(() => {
    if (!conteudosDaTrilha.length) {
      setConteudoSelecionadoId(null);
      return;
    }

    if (conteudoSelecionadoId !== null && !conteudosDaTrilha.some((conteudo) => conteudo.id === conteudoSelecionadoId)) {
      setConteudoSelecionadoId(null);
    }
  }, [conteudoSelecionadoId, conteudosDaTrilha]);

  const cursoAtivo = cursoIdSelecionado
    ? gruposConteudosPorCurso.find((curso) => curso.id === cursoIdSelecionado) || null
    : null;
  const cursoNaoEncontrado = Boolean(cursoIdSelecionado) && gruposConteudosPorCurso.length > 0 && !cursoAtivo;

  function abrirListaConteudos() {
    onNavigate?.("/app/conteudos");
  }

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/conteudos/${cursoId}`);
  }

  function selecionarConteudoAluno(conteudoId) {
    setConteudoSelecionadoId((atual) => (atual === conteudoId ? null : conteudoId));
  }

  async function marcarConteudoConcluido(conteudoId) {
    try {
      setMensagem({ tone: "info", message: "" });
      setConteudoProcessando(conteudoId);

      await apiRequest(`/Progressos/conteudos/${conteudoId}/concluir`, { method: "PUT" });
      setConteudosConcluidosLocais((atuais) => {
        const proximos = new Set(atuais);
        proximos.add(conteudoId);
        return proximos;
      });
      setMensagem({ tone: "success", message: "Conteudo marcado como concluido." });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel atualizar o progresso." });
    } finally {
      setConteudoProcessando(null);
    }
  }

  return (
    <div className="tela-conteudos-aluno">
      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
      {mensagemQuiz.message ? <InlineMessage tone={mensagemQuiz.tone}>{mensagemQuiz.message}</InlineMessage> : null}

      {gruposConteudosPorCurso.length === 0 ? (
        <EmptyState message="Quando uma matricula for aprovada, os cursos e modulos da sua trilha aparecerao aqui." />
      ) : cursoNaoEncontrado ? (
        <EmptyState message="Este curso nao foi encontrado na sua trilha. Volte para Conteudos e escolha outro." />
      ) : cursoAtivo ? (
        <SlideConteudosCurso
          conteudoProcessando={conteudoProcessando}
          conteudoSelecionadoId={conteudoSelecionadoId}
          curso={cursoAtivo}
          key={cursoAtivo.id}
          onConcluir={marcarConteudoConcluido}
          onIniciarQuiz={abrirConfirmacaoAvaliacao}
          onSelecionar={selecionarConteudoAluno}
          onVoltarConteudos={onNavigate ? abrirListaConteudos : null}
          quizIndisponivel={carregandoQuestoes || enviandoRespostas}
        />
      ) : (
        <ul aria-label="Cursos ativos" className="catalogo-grade" role="list">
          {gruposConteudosPorCurso.map((curso) => (
            <CartaoCursoMatricula
              compacto
              curso={curso}
              key={curso.id}
              matricula={{ status: "Aprovada", progresso: curso.progresso }}
              onEntrarNoCurso={onNavigate ? () => abrirCurso(curso.id) : null}
            />
          ))}
        </ul>
      )}

      {modaisExecucaoAvaliacao}
    </div>
  );
}

const ICONE_TIPO_CONTEUDO_ALUNO = {
  1: <TbFileText aria-hidden="true" size="1.5rem" />,
  2: <TbFile aria-hidden="true" size="1.5rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.5rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.5rem" />,
  5: <TbPhoto aria-hidden="true" size="1.5rem" />
};

function SlideConteudosCurso({ conteudoProcessando, conteudoSelecionadoId, curso, onConcluir, onIniciarQuiz, onSelecionar, onVoltarConteudos, quizIndisponivel }) {
  const modulosVisiveis = curso.modulos.filter((modulo) => modulo.conteudos.length > 0 || modulo.quizzes.length > 0);

  const [modulosAbertos, setModulosAbertos] = useState(() => {
    const primeiroIncompleto = modulosVisiveis.find((modulo) => modulo.concluidos < modulo.conteudos.length);
    const alvo = primeiroIncompleto || modulosVisiveis[0];
    return alvo ? new Set([alvo.id]) : new Set();
  });

  function alternarModulo(moduloId) {
    setModulosAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(moduloId)) {
        proximo.delete(moduloId);
      } else {
        proximo.add(moduloId);
      }
      return proximo;
    });
  }

  const percentualCurso = Math.round(Math.max(0, Math.min(curso.progresso, 100)));

  return (
    <div className="conteudos-aluno">
      {onVoltarConteudos ? (
        <nav aria-label="Navegacao da trilha de conteudos" className="atividades-curso__navegacao">
          <button className="atividades-curso__voltar" onClick={onVoltarConteudos} type="button">
            <TbArrowLeft aria-hidden="true" size={22} />
            Voltar para Conteudos
          </button>
        </nav>
      ) : null}

      <header className="atividades-curso__cabecalho">
        <h2 className="atividades-curso__titulo">{curso.titulo}</h2>
        <div className="atividades-curso__progresso">
          <span className="atividades-curso__progresso-texto">{percentualCurso}% concluido</span>
          <BarraProgresso mostrarTexto={false} percentual={percentualCurso} />
        </div>
      </header>

      {modulosVisiveis.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhum material publicado neste curso ainda.</p>
      ) : (
        <div className="atividades-curso__lista-modulos">
          {modulosVisiveis.map((modulo, indiceModulo) => {
            const moduloAnterior = modulosVisiveis[indiceModulo - 1];
            const bloqueado = Boolean(moduloAnterior) && moduloAnterior.concluidos < moduloAnterior.conteudos.length;
            const estaAberto = !bloqueado && modulosAbertos.has(modulo.id);
            const percentualModulo = modulo.conteudos.length ? Math.round((modulo.concluidos / modulo.conteudos.length) * 100) : 0;
            const moduloConcluido = !bloqueado && modulo.concluidos === modulo.conteudos.length;
            const idListaModulo = `conteudos-modulo-lista-${modulo.id}`;

            return (
              <section className={`conteudos-modulo${bloqueado ? " conteudos-modulo--bloqueado" : ""}`} id={`conteudos-modulo-${modulo.id}`} key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <h3 className="conteudos-modulo__cabecalho-wrapper">
                    <button
                      aria-controls={idListaModulo}
                      aria-disabled={bloqueado}
                      aria-expanded={estaAberto}
                      className={`conteudos-modulo__toggle${bloqueado ? " conteudos-modulo__toggle--bloqueado" : ""}`}
                      onClick={() => !bloqueado && alternarModulo(modulo.id)}
                      type="button"
                    >
                      <div className="conteudos-modulo__info">
                        <span className="conteudos-modulo__eyebrow">Modulo {String(indiceModulo + 1).padStart(2, "0")}</span>
                        <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                        {bloqueado ? (
                          <span className="conteudos-modulo__aviso-bloqueado">Conclua o modulo anterior para desbloquear</span>
                        ) : (
                          <span className="conteudos-modulo__contagem">{modulo.concluidos}/{modulo.conteudos.length} concluidos</span>
                        )}
                      </div>
                      {!bloqueado ? (
                        <div aria-hidden="true" className="conteudos-modulo__barra">
                          <BarraProgresso mostrarTexto={false} percentual={percentualModulo} />
                        </div>
                      ) : null}
                      {bloqueado ? (
                        <span aria-hidden="true" className="conteudos-modulo__cadeado">
                          <TbLock size={16} />
                        </span>
                      ) : moduloConcluido ? (
                        <motion.span
                          animate={{ scale: 1 }}
                          aria-label="Modulo concluido"
                          className="check-circular check-circular--concluido"
                          initial={{ scale: 0 }}
                          style={{ pointerEvents: "none", width: "18px", height: "18px", fontSize: "0.65rem" }}
                          transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        >
                          <TbCheck aria-hidden="true" size={11} />
                        </motion.span>
                      ) : (
                        <span aria-hidden="true" className={`conteudos-modulo__chevron${estaAberto ? " conteudos-modulo__chevron--aberto" : ""}`}>
                          ▾
                        </span>
                      )}
                    </button>
                  </h3>
                </header>

                <AnimatePresence initial={false}>
                  {estaAberto ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      id={idListaModulo}
                      initial={{ height: 0, opacity: 0 }}
                      key={`lista-${modulo.id}`}
                      style={{ overflow: "hidden" }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                      <ul aria-label={`Atividades de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                        {modulo.conteudos.map((conteudo, indiceConteudo) => {
                          const itemBloqueado = indiceConteudo > 0 && !modulo.conteudos[indiceConteudo - 1].concluido;
                          const conteudoAtivo = conteudoSelecionadoId === conteudo.id;
                          const processando = conteudoProcessando === conteudo.id;
                          const acao = obterAcaoConteudoAluno(conteudo);

                          function alternarConteudoPeloTeclado(event) {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }
                            event.preventDefault();
                            onSelecionar(conteudo.id);
                          }

                          return (
                            <li
                              className={`atividades-curso__item${conteudo.concluido ? " atividades-curso__item--concluido" : ""}${itemBloqueado ? " atividades-curso__item--bloqueado" : ""}`}
                              key={conteudo.id}
                            >
                              <div
                                aria-expanded={itemBloqueado ? undefined : conteudoAtivo}
                                aria-label={itemBloqueado ? undefined : `Ver ${normalizeContentType(conteudo.tipoConteudo)}: ${conteudo.titulo}`}
                                className={`atividades-curso__linha${conteudoAtivo ? " atividades-curso__linha--ativa" : ""}`}
                                onClick={itemBloqueado ? undefined : () => onSelecionar(conteudo.id)}
                                onKeyDown={itemBloqueado ? undefined : alternarConteudoPeloTeclado}
                                role={itemBloqueado ? undefined : "button"}
                                tabIndex={itemBloqueado ? undefined : 0}
                              >
                                {itemBloqueado ? (
                                  <span aria-label="Conteudo bloqueado" className="atividades-curso__icone atividades-curso__icone--bloqueado">
                                    <TbLock aria-hidden="true" size="1.5rem" />
                                  </span>
                                ) : (
                                  <span aria-hidden="true" className="atividades-curso__icone">
                                    {ICONE_TIPO_CONTEUDO_ALUNO[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.5rem" />}
                                  </span>
                                )}
                                <div className="atividades-curso__corpo">
                                  <span className="atividades-curso__item-titulo-linha">
                                    <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                                    {!itemBloqueado ? (
                                      <span
                                        aria-hidden="true"
                                        className={`atividades-curso__chevron${conteudoAtivo ? " atividades-curso__chevron--aberto" : ""}`}
                                      >
                                        ▾
                                      </span>
                                    ) : null}
                                  </span>
                                  <p className="atividades-curso__meta">
                                    <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                                    {!conteudo.concluido ? (
                                      <>
                                        <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                        <Insignia texto={normalizeProgressStatus(conteudo.statusProgresso)} />
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                                <div className="atividades-curso__acoes" onClick={(event) => event.stopPropagation()}>
                                  {acao ? (
                                    <a className="atividades-curso__link" href={acao.href} rel="noreferrer" target="_blank">
                                      {acao.label}
                                    </a>
                                  ) : null}
                                  {conteudo.concluido ? (
                                    <span aria-label="Conteudo concluido" className="atividades-curso__check">
                                      <TbCheck aria-hidden="true" size="1.1rem" />
                                    </span>
                                  ) : null}
                                  {!conteudo.concluido && !itemBloqueado ? (
                                    <Botao disabled={processando} onClick={() => onConcluir(conteudo.id)} tamanho="pequeno" variante="fantasma">
                                      {processando ? "Salvando..." : "Concluir"}
                                    </Botao>
                                  ) : null}
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {conteudoAtivo ? (
                                  <motion.div
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    initial={{ height: 0, opacity: 0 }}
                                    key={`previa-${conteudo.id}`}
                                    style={{ overflow: "hidden" }}
                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                  >
                                    <div className="atividades-curso__previa">
                                      <p>{obterPreviaConteudoAluno(conteudo)}</p>
                                      {conteudo.corpoTexto ? <p>{conteudo.corpoTexto}</p> : null}
                                      <span>
                                        {conteudo.publicadoEm ? `Publicado em ${formatDate(conteudo.publicadoEm)}` : `Atualizado em ${formatDate(conteudo.atualizadoEm || conteudo.criadoEm)}`}
                                      </span>
                                    </div>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>

                              {!itemBloqueado && conteudo.quizzes.length ? (
                                <ul aria-label={`Quiz de ${conteudo.titulo}`} className="atividades-curso__quizzes" role="list">
                                  {conteudo.quizzes.map((quiz) => {
                                    const disponibilidadeQuiz = obterDisponibilidadeAvaliacao(quiz);
                                    const quizConcluido = Number(quiz.tentativasRealizadas || 0) > 0;

                                    return (
                                      <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-material-${quiz.id}`}>
                                        <div className="atividades-curso__linha">
                                          <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                            <TbTrophy aria-hidden="true" size="1.5rem" />
                                          </span>
                                          <div className="atividades-curso__corpo">
                                            <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                                            <p className="atividades-curso__meta">
                                              <span>Quiz</span>
                                              <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                              <StatusPill tone={quizConcluido ? "success" : disponibilidadeQuiz.tone}>
                                                {quizConcluido ? "Concluido" : disponibilidadeQuiz.label}
                                              </StatusPill>
                                            </p>
                                          </div>
                                          <div className="atividades-curso__acoes">
                                            {disponibilidadeQuiz.podeRealizar || quizConcluido ? (
                                              <Botao
                                                disabled={quizIndisponivel || (!disponibilidadeQuiz.podeRealizar && !quizConcluido)}
                                                onClick={() => onIniciarQuiz(quiz)}
                                                tamanho="pequeno"
                                                variante={quizConcluido ? "fantasma" : "primario"}
                                              >
                                                {quizConcluido ? "Ver quiz" : "Fazer quiz"}
                                              </Botao>
                                            ) : null}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : null}
                            </li>
                          );
                        })}
                        {modulo.quizzes.map((quiz) => {
                          const disponibilidadeQuiz = obterDisponibilidadeAvaliacao(quiz);

                          return (
                            <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-${quiz.id}`}>
                              <div className="atividades-curso__linha">
                                <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                  <TbTrophy aria-hidden="true" size="1.5rem" />
                                </span>
                                <div className="atividades-curso__corpo">
                                  <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                                  <p className="atividades-curso__meta">
                                    <span>Quiz - {quiz.totalQuestoes || 0} questao(oes)</span>
                                    <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                    <StatusPill tone={disponibilidadeQuiz.tone}>{disponibilidadeQuiz.label}</StatusPill>
                                  </p>
                                </div>
                                <div className="atividades-curso__acoes">
                                  {disponibilidadeQuiz.podeRealizar ? (
                                    <Botao disabled={quizIndisponivel} onClick={() => onIniciarQuiz(quiz)} tamanho="pequeno" variante="fantasma">
                                      Iniciar quiz
                                    </Botao>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizeEvaluationType(type) {
  const labels = {
    1: "Quiz",
    2: "Prova",
    3: "Exercicio"
  };

  if (typeof type === "number") {
    return labels[type] || "Avaliacao";
  }

  return type || "Avaliacao";
}

function calcularProgressoModulo(conteudos) {
  if (!conteudos.length) {
    return 0;
  }

  const concluidos = conteudos.filter((conteudo) => conteudo.concluido).length;
  return (concluidos / conteudos.length) * 100;
}

function obterProximaAcaoCurso(modulos) {
  for (const modulo of modulos) {
    const conteudoPendente = modulo.conteudos.find((conteudo) => !conteudo.concluido);
    if (conteudoPendente) {
      return {
        moduloId: modulo.id,
        titulo: `Continuar ${modulo.titulo}`,
    descricao: `Proximo material: ${conteudoPendente.titulo}.`,
    label: "Abrir materiais",
    tone: "warning",
    to: "/app/conteudos"
  };
    }

    const avaliacaoDisponivel = modulo.avaliacoes.find((avaliacao) => obterDisponibilidadeAvaliacao(avaliacao).podeRealizar);
    if (avaliacaoDisponivel) {
      return {
        moduloId: modulo.id,
        titulo: "Realizar avaliacao",
    descricao: `${avaliacaoDisponivel.titulo} esta disponivel para este modulo.`,
    label: "Realizar avaliacao",
    tone: "warning",
    to: "/app/avaliacoes"
  };
    }
  }

  const totalPublicacoes = modulos.reduce((total, modulo) => total + modulo.conteudos.length + modulo.avaliacoes.length, 0);
  if (modulos.length && totalPublicacoes === 0) {
    return {
      moduloId: modulos[0]?.id || null,
      titulo: "Aguardando publicacoes",
      descricao: "Os modulos do curso ja estao definidos; os materiais aparecerao assim que forem publicados.",
      label: "Sem publicacoes",
      tone: "info",
      to: null
    };
  }

  return {
    moduloId: modulos[0]?.id || null,
    titulo: modulos.length ? "Curso em dia" : "Aguardando publicacoes",
    descricao: modulos.length
      ? "Todos os materiais e avaliacoes disponiveis ja foram encaminhados."
      : "Assim que houver modulo publicado, a proxima etapa aparecera aqui.",
    label: modulos.length ? "Jornada concluida" : "Sem publicacoes",
    tone: modulos.length ? "success" : "info",
    to: null
  };
}

function normalizeQuestionType(type) {
  const labels = {
    1: "Multipla escolha",
    2: "Verdadeiro/Falso",
    3: "Dissertativa"
  };

  if (typeof type === "number") {
    return labels[type] || "Questao";
  }

  return type || "Questao";
}

function criarRespostasIniciais(questoes) {
  return Object.fromEntries(
    questoes.map((questao) => [
      questao.id,
      {
        questaoId: questao.id,
        alternativaId: null,
        respostaTexto: ""
      }
    ])
  );
}

function formatScore(value) {
  return Number(value || 0).toFixed(1).replace(".", ",");
}

function formatarTempoRestante(segundosRestantes) {
  const segundosPositivos = Math.max(0, segundosRestantes);
  const minutos = Math.floor(segundosPositivos / 60);
  const segundos = segundosPositivos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function obterDisponibilidadeAvaliacao(avaliacao) {
  const agora = new Date();
  const abertura = parseApiDate(avaliacao.dataAbertura);
  const fechamento = parseApiDate(avaliacao.dataFechamento);

  if (!avaliacao.totalQuestoes) {
    return {
      podeRealizar: false,
      label: "Sem questoes",
      mensagem: "Esta avaliacao ainda nao possui questoes publicadas.",
      tone: "warning"
    };
  }

  if (Number(avaliacao.tentativasRestantes || 0) <= 0) {
    return {
      podeRealizar: false,
      label: "Concluida",
      mensagem: "Voce ja usou todas as tentativas desta avaliacao.",
      tone: "success"
    };
  }

  if (abertura && abertura > agora) {
    return {
      podeRealizar: false,
      label: "Agendada",
      mensagem: `Esta avaliacao abre em ${formatDate(avaliacao.dataAbertura)}.`,
      tone: "warning"
    };
  }

  if (fechamento && fechamento < agora) {
    return {
      podeRealizar: false,
      label: "Encerrada",
      mensagem: "O periodo para responder esta avaliacao ja foi encerrado.",
      tone: "danger"
    };
  }

  return {
    podeRealizar: true,
    label: "Disponivel",
    mensagem: "Avaliacao disponivel para resposta.",
    tone: "success"
  };
}

function obterChaveModuloConteudo(cursoId, moduloId) {
  return `${cursoId || "curso"}-${moduloId || "modulo"}`;
}

function agruparModulosPorCurso(modulos) {
  const grupos = new Map();

  modulos.forEach((modulo) => {
    const cursoId = Number(modulo.cursoId);
    if (!cursoId) {
      return;
    }

    if (!grupos.has(cursoId)) {
      grupos.set(cursoId, []);
    }

    grupos.get(cursoId).push(modulo);
  });

  grupos.forEach((itens) => {
    itens.sort((moduloA, moduloB) => {
      const dataA = timestampFromApiDate(moduloA.dataCriacao);
      const dataB = timestampFromApiDate(moduloB.dataCriacao);

      if (dataA !== dataB) {
        return dataA - dataB;
      }

      return (moduloA.titulo || "").localeCompare(moduloB.titulo || "", "pt-BR");
    });
  });

  return grupos;
}

function obterTituloCursoMatricula(matricula, cursoPorId) {
  const cursoId = Number(matricula.cursoId);
  const curso = cursoPorId.get(cursoId);
  const cursoDaMatricula = typeof matricula.curso === "string" ? matricula.curso : matricula.curso?.titulo;

  return curso?.titulo || cursoDaMatricula || matricula.cursoTitulo || (cursoId ? `Curso #${cursoId}` : "Curso sem titulo");
}

function obterNomeTurmaMatricula(matricula, turmaPorId) {
  const turmaId = Number(matricula.turmaId || matricula.turma?.id);
  const turma = turmaPorId.get(turmaId);
  const turmaDaMatricula = typeof matricula.turma === "string" ? matricula.turma : matricula.turma?.nomeTurma;

  return turma?.nomeTurma || turmaDaMatricula || matricula.nomeTurma || (turmaId ? `Turma #${turmaId}` : "Turma em definicao");
}

function obterIndiceAcentoAcademico(valor) {
  const texto = String(valor || "default");
  let hash = 0;

  for (let index = 0; index < texto.length; index += 1) {
    hash = (hash * 31 + texto.charCodeAt(index)) % ACADEMIC_ACCENTS.length;
  }

  return Math.abs(hash);
}

function obterAcentoAcademico(valor, offset = 0) {
  const indiceBase = obterIndiceAcentoAcademico(valor);
  const indice = (indiceBase + offset + ACADEMIC_ACCENTS.length) % ACADEMIC_ACCENTS.length;

  return obterAcentoAcademicoPorIndice(indice);
}

function obterAcentoAcademicoPorIndice(indice) {
  const indiceNormalizado = ((indice % ACADEMIC_ACCENTS.length) + ACADEMIC_ACCENTS.length) % ACADEMIC_ACCENTS.length;

  return {
    ...ACADEMIC_ACCENTS[indiceNormalizado],
    indice: indiceNormalizado
  };
}

function estaConcluido(progresso) {
  return Boolean(
    progresso &&
      (Number(progresso.percentualConclusao || 0) >= 100 ||
        normalizeProgressStatus(progresso.statusProgresso) === "Concluido")
  );
}

function obterPreviaConteudoAluno(conteudo) {
  const tipo = Number(conteudo.tipoConteudo);

  if (tipo === 1) {
    return compactText(conteudo.descricao || conteudo.corpoTexto || "Texto liberado para leitura nesta turma.", 260);
  }

  if (tipo === 2) {
    return compactText(conteudo.descricao || conteudo.arquivoUrl || "PDF publicado para consulta ou download.", 220);
  }

  if (tipo === 3) {
    return compactText(conteudo.descricao || conteudo.arquivoUrl || "Video publicado para esta turma.", 220);
  }

  if (tipo === 5) {
    return compactText(conteudo.descricao || conteudo.arquivoUrl || "Imagem publicada para esta turma.", 220);
  }

  return compactText(
    conteudo.descricao || conteudo.linkUrl || conteudo.arquivoUrl || "Recurso externo liberado para complementar o modulo.",
    220
  );
}

function obterAcaoConteudoAluno(conteudo) {
  const tipo = Number(conteudo.tipoConteudo);

  if (tipo === 2 && conteudo.arquivoUrl) {
    return { href: resolverUrlArquivo(conteudo.arquivoUrl), label: "Abrir PDF" };
  }

  if (tipo === 3 && conteudo.arquivoUrl) {
    return { href: resolverUrlArquivo(conteudo.arquivoUrl), label: "Abrir video" };
  }

  if (tipo === 4 && conteudo.linkUrl) {
    return { href: conteudo.linkUrl, label: "Abrir recurso" };
  }

  if (tipo === 5 && conteudo.arquivoUrl) {
    return { href: resolverUrlArquivo(conteudo.arquivoUrl), label: "Ver imagem" };
  }

  return null;
}
