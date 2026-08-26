import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbChevronDown, TbChevronUp, TbFile, TbFileText, TbPlayerPlay, TbExternalLink } from "react-icons/tb";
import { DataTable, EmptyState, InlineMessage, PanelCard, RouteLink, StatusPill } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
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

export function SecaoCursosAluno({ avaliacoes = [], conteudos, cursos, matriculas, modulos = [], onNavigate, progressos = {}, turmas }) {
  const [matriculaEmDetalheId, setMatriculaEmDetalheId] = useState(null);
  const [modulosAbertos, setModulosAbertos] = useState({});
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

  useEffect(() => {
    if (!linhasMatriculasAprovadas.length) {
      setMatriculaEmDetalheId(null);
      return;
    }

    if (!linhasMatriculasAprovadas.some((linha) => linha.id === matriculaEmDetalheId)) {
      setMatriculaEmDetalheId(linhasMatriculasAprovadas[0].id);
    }
  }, [linhasMatriculasAprovadas, matriculaEmDetalheId]);

  const detalheCursoSelecionado = useMemo(() => {
    const linha = linhasMatriculasAprovadas.find((item) => item.id === matriculaEmDetalheId);
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
    linhasMatriculasAprovadas,
    matriculaEmDetalheId,
    modulosPorCursoId,
    progressoConteudoPorConteudoId,
    progressoModuloPorChave
  ]);

  useEffect(() => {
    if (!detalheCursoSelecionado?.modulos.length) {
      return;
    }

    const moduloPadrao = detalheCursoSelecionado.proximaAcao?.moduloId || detalheCursoSelecionado.modulos[0].id;

    setModulosAbertos((atuais) => {
      if (atuais[moduloPadrao]) {
        return atuais;
      }

      return {
        ...atuais,
        [moduloPadrao]: true
      };
    });
  }, [detalheCursoSelecionado?.modulos, detalheCursoSelecionado?.proximaAcao?.moduloId]);

  function alternarModuloJornada(moduloId) {
    setModulosAbertos((atuais) => ({
      ...atuais,
      [moduloId]: !atuais[moduloId]
    }));
  }

  return (
    <div className="content-section content-section--student">
      <div className={`module-management-layout${detalheCursoSelecionado ? " module-management-layout--with-detail" : ""}`}>
        <PanelCard
          description="Cursos com matricula aprovada, materiais publicados e progresso consolidado por turma."
          title="Minha jornada ativa"
        >
          <DataTable
            columns={[
              { key: "curso", label: "Curso" },
              { key: "turma", label: "Turma" },
              { key: "materiais", label: "Materiais" },
              { key: "modulos", label: "Modulos" },
              { key: "progresso", label: "Progresso", render: (row) => formatPercent(row.progresso) },
              { key: "ultimaPublicacao", label: "Ultima publicacao", render: (row) => formatDate(row.ultimaPublicacao) },
              { key: "notaFinal", label: "Nota atual", render: (row) => formatGrade(row.notaFinal) },
              {
                key: "detalhe",
                label: "",
                render: (row) => (
                  <button
                    aria-label={`Abrir modulos de ${row.curso}`}
                    className="table-row-arrow"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMatriculaEmDetalheId(row.id);
                    }}
                    type="button"
                  >
                    &gt;
                  </button>
                )
              }
            ]}
            emptyMessage="Assim que uma matricula for aprovada, os seus cursos ativos vao aparecer aqui."
            getRowAriaLabel={(row) => `Abrir modulos de ${row.curso}`}
            getRowClassName={(row) =>
              `table-row--clickable${row.id === matriculaEmDetalheId ? " table-row--selected" : ""}`
            }
            onRowClick={(row) => setMatriculaEmDetalheId(row.id)}
            rows={linhasMatriculasAprovadas}
          />
        </PanelCard>

        {detalheCursoSelecionado ? (
          <aside className="module-detail-column student-course-detail" aria-label="Detalhes do curso selecionado">
            <PanelCard
              description={`${detalheCursoSelecionado.turma} - ${detalheCursoSelecionado.materiais} material(is) publicado(s)`}
              title={detalheCursoSelecionado.curso}
            >
              <div className="student-course-detail__summary">
                <span className="chip">{formatPercent(detalheCursoSelecionado.progresso)} de progresso</span>
                <span className="chip">{detalheCursoSelecionado.modulos.length} modulo(s)</span>
                <span className="chip">{formatGrade(detalheCursoSelecionado.notaFinal)} nota atual</span>
              </div>

              <div className="student-course-detail__next">
                <span>Proxima acao</span>
                <strong>{detalheCursoSelecionado.proximaAcao.titulo}</strong>
                <p>{detalheCursoSelecionado.proximaAcao.descricao}</p>
                {detalheCursoSelecionado.proximaAcao.to ? (
                  <RouteLink className="table-action student-course-detail__action" onNavigate={onNavigate} to={detalheCursoSelecionado.proximaAcao.to}>
                    {detalheCursoSelecionado.proximaAcao.label}
                  </RouteLink>
                ) : (
                  <StatusPill tone={detalheCursoSelecionado.proximaAcao.tone || "success"}>
                    {detalheCursoSelecionado.proximaAcao.label}
                  </StatusPill>
                )}
              </div>

              {detalheCursoSelecionado.modulos.length ? (
                <div className="student-course-detail__journey">
                  {detalheCursoSelecionado.modulos.map((modulo) => {
                    const moduloSemConteudo = modulo.conteudos.length === 0;

                    return (
                      <article className="module-detail-card student-course-detail__module" key={modulo.id}>
                        <button
                          aria-expanded={Boolean(modulosAbertos[modulo.id])}
                          className="student-course-detail__module-toggle"
                          onClick={() => alternarModuloJornada(modulo.id)}
                          type="button"
                        >
                          <div>
                            <span>Modulo</span>
                            <strong>{modulo.titulo}</strong>
                          </div>
                          <div className="student-course-detail__module-status">
                            <StatusPill tone={moduloSemConteudo ? "info" : progressStatusTone(modulo.status)}>
                              {moduloSemConteudo ? "Aguardando conteudos" : normalizeProgressStatus(modulo.status)}
                            </StatusPill>
                            <span aria-hidden="true">{modulosAbertos[modulo.id] ? "-" : "+"}</span>
                          </div>
                        </button>

                        {modulosAbertos[modulo.id] ? (
                          <div className="student-course-detail__module-body">
                            <div className="student-content-card__progress">
                              <StatusPill tone={moduloSemConteudo ? "info" : progressStatusTone(modulo.status)}>
                                {moduloSemConteudo ? "Sem conteudos publicados" : `${modulo.concluidos}/${modulo.conteudos.length} conteudo(s)`}
                              </StatusPill>
                              <div className="student-progress-bar" aria-hidden="true">
                                <span style={{ width: `${Math.max(0, Math.min(modulo.progresso, 100))}%` }} />
                              </div>
                            </div>

                            {modulo.conteudos.length ? (
                              <ul className="student-course-detail__content-list">
                                {modulo.conteudos.map((conteudo) => (
                                  <li key={conteudo.id}>
                                    <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                                    <strong>{conteudo.titulo}</strong>
                                    <StatusPill tone={conteudo.concluido ? "success" : progressStatusTone(conteudo.statusProgresso)}>
                                      {conteudo.concluido ? "Concluido" : normalizeProgressStatus(conteudo.statusProgresso)}
                                    </StatusPill>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="student-course-note">Nenhum conteudo publicado neste modulo.</p>
                            )}

                            {modulo.avaliacoes.length ? (
                              <div className="student-course-detail__evaluation-list">
                                <span>Avaliacoes do modulo</span>
                                {modulo.avaliacoes.map((avaliacao) => {
                                  const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);

                                  return (
                                    <article key={avaliacao.id}>
                                      <div>
                                        <strong>{avaliacao.titulo}</strong>
                                        <p>{normalizeEvaluationType(avaliacao.tipoAvaliacao)} - {avaliacao.totalQuestoes || 0} questao(oes)</p>
                                      </div>
                                      <StatusPill tone={disponibilidade.tone}>{disponibilidade.label}</StatusPill>
                                    </article>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Este curso ainda nao possui modulos publicados para a sua turma." />
              )}

              {detalheCursoSelecionado.materiais ? (
                <RouteLink className="table-action student-course-detail__action" onNavigate={onNavigate} to="/app/conteudos">
                  Abrir materiais
                </RouteLink>
              ) : null}
            </PanelCard>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function SecaoAvaliacoesAluno({ avaliacoes, onRefresh, onSessionExpired }) {
  const [avaliacaoEmExecucao, setAvaliacaoEmExecucao] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [enviandoRespostas, setEnviandoRespostas] = useState(false);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [apoioAberto, setApoioAberto] = useState(true);

  const avaliacoesOrdenadas = useMemo(
    () =>
      [...avaliacoes].sort((avaliacaoA, avaliacaoB) => {
        const cursoA = avaliacaoA.cursoTitulo || "";
        const cursoB = avaliacaoB.cursoTitulo || "";
        const comparacaoCurso = cursoA.localeCompare(cursoB, "pt-BR");

        if (comparacaoCurso !== 0) {
          return comparacaoCurso;
        }

        const aberturaA = timestampFromApiDate(avaliacaoA.dataAbertura || avaliacaoA.publicadoEm);
        const aberturaB = timestampFromApiDate(avaliacaoB.dataAbertura || avaliacaoB.publicadoEm);
        return aberturaA - aberturaB;
      }),
    [avaliacoes]
  );

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

  async function abrirExecucaoAvaliacao(avaliacao) {
    const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);
    if (!disponibilidade.podeRealizar) {
      setMensagem({ tone: "warning", message: disponibilidade.mensagem });
      return;
    }

    setAvaliacaoEmExecucao(avaliacao);
    setQuestoes([]);
    setRespostas({});
    setMensagem({ tone: "", message: "" });
    setIndiceAtual(0);
    setApoioAberto(true);
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

  async function enviarRespostas(event) {
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
    setMensagem({ tone: "", message: "" });

    try {
      const tentativa = await apiRequest(`/Avaliacoes/${avaliacaoEmExecucao.id}/aluno/respostas`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const nota =
        Number(tentativa.statusTentativa) === 3
          ? ` Nota: ${formatScore(tentativa.notaBruta)} de ${formatScore(tentativa.notaMaxima)}.`
          : " Respostas discursivas aguardam correcao do professor.";

      setMensagem({ tone: "success", message: `Avaliacao enviada com sucesso.${nota}` });
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

  return (
    <div className="tela-avaliacoes-aluno">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Realizar avaliacao</h1>
          <p className="cabecalho-pagina__subtitulo">Somente avaliacoes publicadas para as suas turmas aprovadas aparecem aqui.</p>
        </div>
      </header>

      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

      {avaliacoesOrdenadas.length === 0 ? (
        <EmptyState message="Quando um professor publicar uma avaliacao para sua turma, ela aparecera aqui." />
      ) : (
        <ul aria-label="Avaliacoes disponiveis" className="grade-avaliacoes" role="list">
          {avaliacoesOrdenadas.map((avaliacao) => {
            const disponibilidade = obterDisponibilidadeAvaliacao(avaliacao);

            return (
              <li
                className={`cartao-avaliacao${disponibilidade.podeRealizar ? " cartao-avaliacao--disponivel" : " cartao-avaliacao--bloqueado"}`}
                key={avaliacao.id}
              >
                <div className="cartao-avaliacao__topo">
                  <span className="cartao-avaliacao__titulo">{avaliacao.titulo}</span>
                  <StatusPill tone={disponibilidade.tone}>{disponibilidade.label}</StatusPill>
                </div>
                <div className="cartao-avaliacao__corpo">
                  <dl className="cartao-avaliacao__meta">
                    <div className="cartao-avaliacao__meta-item">
                      <dt>Turma</dt>
                      <dd>{avaliacao.turmaNome || `Turma #${avaliacao.turmaId}`}</dd>
                    </div>
                    <div className="cartao-avaliacao__meta-item">
                      <dt>Modulo</dt>
                      <dd>{avaliacao.moduloTitulo || "-"}</dd>
                    </div>
                    <div className="cartao-avaliacao__meta-item">
                      <dt>Tipo</dt>
                      <dd>{normalizeEvaluationType(avaliacao.tipoAvaliacao)}</dd>
                    </div>
                    <div className="cartao-avaliacao__meta-item">
                      <dt>Tentativas</dt>
                      <dd>{avaliacao.tentativasRealizadas || 0}/{avaliacao.tentativasPermitidas || 1}</dd>
                    </div>
                    <div className="cartao-avaliacao__meta-item">
                      <dt>{avaliacao.ultimaNota !== null && avaliacao.ultimaNota !== undefined ? "Ultima nota" : "Questoes"}</dt>
                      <dd>{avaliacao.ultimaNota !== null && avaliacao.ultimaNota !== undefined ? formatScore(avaliacao.ultimaNota) : avaliacao.totalQuestoes || 0}</dd>
                    </div>
                  </dl>
                  <div className="cartao-avaliacao__rodape">
                    {disponibilidade.podeRealizar ? (
                      <Botao
                        disabled={carregandoQuestoes || enviandoRespostas}
                        onClick={() => abrirExecucaoAvaliacao(avaliacao)}
                        tamanho="pequeno"
                        variante="primario"
                      >
                        Realizar avaliacao
                      </Botao>
                    ) : (
                      <span className="cartao-avaliacao__bloqueado-info">{disponibilidade.mensagem}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {avaliacaoEmExecucao ? (
        <Modal onFechar={fecharExecucaoAvaliacao} titulo={avaliacaoEmExecucao.titulo}>
          {carregandoQuestoes ? (
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
      ) : null}
    </div>
  );
}

export function SecaoConteudosAluno({ conteudos, cursos = [], matriculas, modulos = [], onRefresh, onSessionExpired, progressos = {}, turmas = [] }) {
  const [mensagem, setMensagem] = useState({ tone: "info", message: "" });
  const [conteudoProcessando, setConteudoProcessando] = useState(null);
  const [conteudosConcluidosLocais, setConteudosConcluidosLocais] = useState(() => new Set());
  const [conteudoSelecionadoId, setConteudoSelecionadoId] = useState(null);
  const [slideAtual, setSlideAtual] = useState(0);
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
        concluidos: 0
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
        statusProgresso
      });

      curso.modulos.set(modulo.id, modulo);
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
      const conteudosDoCurso = modulos.flatMap((modulo) => modulo.conteudos);

      return {
        ...curso,
        turmas: [...curso.turmas].filter(Boolean).sort((left, right) => left.localeCompare(right, "pt-BR")),
        progresso: curso.totalConteudos ? (curso.concluidos / curso.totalConteudos) * 100 : 0,
        modulos,
        proximoConteudo: conteudosDoCurso.find((conteudo) => !conteudo.concluido) || conteudosDoCurso[0] || null
      };
    });
  }, [
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

  const total = gruposConteudosPorCurso.length;
  const slide = Math.min(slideAtual, Math.max(0, total - 1));

  function irPara(indice) {
    setSlideAtual(Math.max(0, Math.min(indice, total - 1)));
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

  const resumoSubtitulo = `${matriculasAprovadas.length} matricula(s) ativa(s) - ${gruposConteudosPorCurso.length} curso(s) em trilha - ${formatPercent(calcularMediaGruposConteudo(gruposConteudosPorCurso))} de progresso geral`;

  return (
    <div className="tela-conteudos-aluno">
      <header className="cabecalho-pagina">
        <div style={{ flex: 1 }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-lg)" }}>
            <h1 className="cabecalho-pagina__titulo">Conteudos</h1>
            {total > 0 ? (
              <select
                aria-label="Navegar para curso"
                className="campo__entrada barra-filtros__select"
                onChange={(event) => irPara(Number(event.target.value))}
                style={{ marginLeft: "auto", maxWidth: "240px" }}
                value={slide}
              >
                {gruposConteudosPorCurso.map((curso, indice) => (
                  <option key={curso.id} value={indice}>
                    {curso.titulo}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <p className="cabecalho-pagina__subtitulo">{resumoSubtitulo}</p>
        </div>
      </header>

      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

      {total === 0 ? (
        <EmptyState message="Quando uma matricula for aprovada, os cursos e modulos da sua trilha aparecerao aqui." />
      ) : (
        <div className="carrossel-cursos">
          {total > 1 ? (
            <nav aria-label="Navegacao entre cursos" className="carrossel-cursos__nav">
              <button aria-label="Curso anterior" className="carrossel-cursos__seta" disabled={slide === 0} onClick={() => irPara(slide - 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div aria-label="Cursos" className="carrossel-cursos__indicadores" role="tablist">
                {gruposConteudosPorCurso.map((curso, indice) => (
                  <button
                    aria-label={`Curso ${indice + 1}: ${curso.titulo}`}
                    aria-selected={indice === slide}
                    className={`carrossel-cursos__bolinha${indice === slide ? " carrossel-cursos__bolinha--ativa" : ""}`}
                    key={curso.id}
                    onClick={() => irPara(indice)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>
              <button aria-label="Proximo curso" className="carrossel-cursos__seta" disabled={slide === total - 1} onClick={() => irPara(slide + 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </nav>
          ) : null}

          <div className="carrossel-cursos__janela">
            <SlideConteudosCurso
              conteudoProcessando={conteudoProcessando}
              conteudoSelecionadoId={conteudoSelecionadoId}
              curso={gruposConteudosPorCurso[slide]}
              onConcluir={marcarConteudoConcluido}
              onSelecionar={selecionarConteudoAluno}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const ICONE_TIPO_CONTEUDO_ALUNO = {
  1: <TbFileText aria-hidden="true" size={22} />,
  2: <TbFile aria-hidden="true" size={22} />,
  3: <TbPlayerPlay aria-hidden="true" size={22} />,
  4: <TbExternalLink aria-hidden="true" size={22} />
};

function SlideConteudosCurso({ conteudoProcessando, conteudoSelecionadoId, curso, onConcluir, onSelecionar }) {
  const itens = curso.modulos.flatMap((modulo) => modulo.conteudos.map((conteudo) => ({ ...conteudo, moduloTitulo: modulo.titulo })));

  return (
    <div className="conteudos-aluno">
      <header className="conteudos-aluno__cabecalho">
        <div className="conteudos-aluno__curso-info">
          <h2 className="conteudos-aluno__curso-titulo">{curso.titulo}</h2>
          <div className="conteudos-aluno__meta-chips">
            <span className="conteudos-aluno__meta-chip conteudos-aluno__meta-chip--progresso">{formatPercent(curso.progresso)} de progresso</span>
            <span className="conteudos-aluno__meta-chip">{curso.modulos.length} modulo{curso.modulos.length === 1 ? "" : "s"}</span>
            <span className="conteudos-aluno__meta-chip">{curso.turmas.length ? curso.turmas.join(", ") : "Turma em definicao"}</span>
          </div>
        </div>
      </header>

      {curso.proximoConteudo ? (
        <div className="cartao-curso-ativo" style={{ marginBottom: "var(--espaco-md)" }}>
          <div className="cartao-curso-ativo__info">
            <strong className="cartao-curso-ativo__titulo">Continue de onde parou</strong>
            <p className="cartao-curso-ativo__meta">{curso.proximoConteudo.titulo}</p>
          </div>
          <Botao onClick={() => onSelecionar(curso.proximoConteudo.id)} tamanho="pequeno" variante="primario">
            Abrir
          </Botao>
        </div>
      ) : null}

      {itens.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhum material publicado neste curso ainda.</p>
      ) : (
        <ul aria-label={`Conteudos de ${curso.titulo}`} className="lista-conteudos-completa" role="list">
          {itens.map((conteudo) => {
            const acao = obterAcaoConteudoAluno(conteudo);
            const processando = conteudoProcessando === conteudo.id;
            const conteudoAtivo = conteudoSelecionadoId === conteudo.id;

            return (
              <li className="cartao-conteudo" key={conteudo.id} style={{ alignItems: "flex-start", flexDirection: "column" }}>
                <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-md)", width: "100%" }}>
                  <span aria-hidden="true" className="cartao-conteudo__icone">
                    {ICONE_TIPO_CONTEUDO_ALUNO[Number(conteudo.tipoConteudo)] || <TbFileText size={22} />}
                  </span>
                  <button
                    aria-expanded={conteudoAtivo}
                    className="cartao-conteudo__info"
                    onClick={() => onSelecionar(conteudo.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    type="button"
                  >
                    <strong className="cartao-conteudo__titulo">{conteudo.titulo}</strong>
                    <p className="cartao-conteudo__modulo">{conteudo.moduloTitulo}</p>
                  </button>
                  <div className="cartao-conteudo__meta">
                    <Insignia texto={conteudo.concluido ? "Concluido" : normalizeProgressStatus(conteudo.statusProgresso)} variante={conteudo.concluido ? "sucesso" : undefined} />
                  </div>
                  <div className="cartao-conteudo__acoes">
                    {acao ? (
                      <a href={acao.href} rel="noreferrer" style={{ color: "var(--cor-marca-clara)", fontSize: "0.82rem", fontWeight: 600 }} target="_blank">
                        {acao.label}
                      </a>
                    ) : null}
                    {!conteudo.concluido ? (
                      <Botao disabled={processando} onClick={() => onConcluir(conteudo.id)} tamanho="pequeno" variante="fantasma">
                        {processando ? "Salvando..." : "Concluir"}
                      </Botao>
                    ) : null}
                  </div>
                </div>

                {conteudoAtivo ? (
                  <div style={{ color: "var(--cor-texto-suave)", fontSize: "0.85rem", padding: "var(--espaco-sm) 0 0 calc(1.5rem + var(--espaco-md))" }}>
                    <p>{obterPreviaConteudoAluno(conteudo)}</p>
                    {conteudo.corpoTexto ? <p>{conteudo.corpoTexto}</p> : null}
                    <span>
                      {conteudo.publicadoEm ? `Publicado em ${formatDate(conteudo.publicadoEm)}` : `Atualizado em ${formatDate(conteudo.atualizadoEm || conteudo.criadoEm)}`}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
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
    3: "Discursiva"
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

function calcularMediaGruposConteudo(gruposConteudosPorCurso) {
  if (!gruposConteudosPorCurso.length) {
    return 0;
  }

  const total = gruposConteudosPorCurso.reduce((soma, curso) => soma + Number(curso.progresso || 0), 0);
  return total / gruposConteudosPorCurso.length;
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

  return compactText(
    conteudo.descricao || conteudo.linkUrl || conteudo.arquivoUrl || "Recurso externo liberado para complementar o modulo.",
    220
  );
}

function obterAcaoConteudoAluno(conteudo) {
  const tipo = Number(conteudo.tipoConteudo);

  if (tipo === 2 && conteudo.arquivoUrl) {
    return { href: conteudo.arquivoUrl, label: "Abrir PDF" };
  }

  if (tipo === 3 && conteudo.linkUrl) {
    return { href: conteudo.linkUrl, label: "Abrir video" };
  }

  if (tipo === 4 && conteudo.linkUrl) {
    return { href: conteudo.linkUrl, label: "Abrir recurso" };
  }

  return null;
}
