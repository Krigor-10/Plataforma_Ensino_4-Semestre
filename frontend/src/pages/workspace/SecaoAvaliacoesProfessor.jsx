import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbArrowLeft, TbCheck, TbChevronDown, TbDotsVertical, TbPencil, TbPlus, TbTrophy, TbX } from "react-icons/tb";
import { MdDelete } from "react-icons/md";

const MOLA_ICONE = { type: "spring", stiffness: 400, damping: 18 };
import Botao from "../../components/Botao.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { formatGrade, normalizePublicationStatus } from "../../lib/format.js";
import { AssistenteQuizAvaliacao } from "./AssistenteQuizAvaliacao.jsx";

function formatDecimal(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

export function SecaoAvaliacoesProfessor({ avaliacoes, conteudos = [], cursoIdSelecionado = null, cursos, modulos, onNavigate, onRefresh, onSessionExpired, turmas, usuario }) {
  const { mostrarToast } = useToast();
  // Assistente de criacao/edicao de avaliacao/quiz — componente compartilhado
  // (AssistenteQuizAvaliacao.jsx), tambem montado direto por
  // SecaoConteudosProfessor.jsx no botao "Adicionar/Editar quiz" (sem
  // navegar pra esta tela, ver historico do arquivo).
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [avaliacaoParaEditar, setAvaliacaoParaEditar] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const [mensagemExclusaoAvaliacao, setMensagemExclusaoAvaliacao] = useState("");
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  const [avaliacaoDetalhe, setAvaliacaoDetalhe] = useState(null);
  const [campoEditando, setCampoEditando] = useState(null);
  const [valorEditando, setValorEditando] = useState("");

  /* Media de nota por avaliacao e informacao secundaria (nao existe no DTO de
     /Avaliacoes) - reaproveita o endpoint de desempenho por turma ja usado em
     SecaoTurmasProfessor.jsx em vez de criar uma nova agregacao no backend. */
  const [desempenhoAvaliacoes, setDesempenhoAvaliacoes] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        const turmasComDesempenho = await apiRequest("/Turmas/desempenho");
        if (ativo) {
          setDesempenhoAvaliacoes(turmasComDesempenho.flatMap((turma) => turma.avaliacoes));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
      }
    }

    carregarDesempenho();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const mediaNotaPorAvaliacaoId = useMemo(
    () => new Map(desempenhoAvaliacoes.map((item) => [item.avaliacaoId, item.mediaNota])),
    [desempenhoAvaliacoes]
  );

  useEffect(() => {
    if (menuAbertoId === null) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }

      setMenuAbertoId(null);
    }

    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [menuAbertoId]);

  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);

  const turmasDoProfessor = useMemo(
    () =>
      [...turmas]
        .filter((turma) => turma.professorId === usuario.id)
        .sort((left, right) => {
          const courseComparison = (cursoPorId.get(left.cursoId)?.titulo || "").localeCompare(cursoPorId.get(right.cursoId)?.titulo || "", "pt-BR");
          return courseComparison !== 0 ? courseComparison : left.nomeTurma.localeCompare(right.nomeTurma, "pt-BR");
        }),
    [cursoPorId, turmas, usuario.id]
  );

  const modulosDoProfessor = useMemo(
    () =>
      [...modulos]
        .filter((modulo) => turmasDoProfessor.some((turma) => turma.cursoId === modulo.cursoId))
        .sort((left, right) => {
          const courseComparison = (cursoPorId.get(left.cursoId)?.titulo || "").localeCompare(cursoPorId.get(right.cursoId)?.titulo || "", "pt-BR");
          return courseComparison !== 0 ? courseComparison : left.titulo.localeCompare(right.titulo, "pt-BR");
        }),
    [cursoPorId, modulos, turmasDoProfessor]
  );

  const modulosPorCursoId = useMemo(() => {
    const agrupados = new Map();
    modulosDoProfessor.forEach((modulo) => {
      const atuais = agrupados.get(modulo.cursoId) || [];
      atuais.push(modulo);
      agrupados.set(modulo.cursoId, atuais);
    });
    return agrupados;
  }, [modulosDoProfessor]);

  const materiaisPorModuloId = useMemo(() => {
    const agrupados = new Map();
    conteudos.forEach((material) => {
      const atuais = agrupados.get(material.moduloId) || [];
      atuais.push(material);
      agrupados.set(material.moduloId, atuais);
    });
    agrupados.forEach((lista) => lista.sort((left, right) => (left.titulo || "").localeCompare(right.titulo || "", "pt-BR")));
    return agrupados;
  }, [conteudos]);

  /* Um professor tem no maximo 1 turma por curso — mesma premissa usada na
     Trilha de Conteudos (ver SecaoConteudosProfessor.jsx). */
  const cursosDoProfessor = useMemo(() => {
    const porCursoId = new Map();

    turmasDoProfessor.forEach((turma) => {
      if (porCursoId.has(turma.cursoId)) {
        return;
      }

      const curso = cursoPorId.get(turma.cursoId);
      if (!curso) {
        return;
      }

      const avaliacoesDaTurma = avaliacoes.filter((avaliacao) => avaliacao.turmaId === turma.id);

      porCursoId.set(turma.cursoId, {
        curso,
        turma,
        totalAvaliacoes: avaliacoesDaTurma.length,
        totalPublicadas: avaliacoesDaTurma.filter((avaliacao) => Number(avaliacao.statusPublicacao) === 2).length
      });
    });

    return [...porCursoId.values()].sort((left, right) => left.curso.titulo.localeCompare(right.curso.titulo, "pt-BR"));
  }, [avaliacoes, cursoPorId, turmasDoProfessor]);

  const cursoAtivo = useMemo(
    () => (cursoIdSelecionado ? cursosDoProfessor.find((entrada) => entrada.curso.id === cursoIdSelecionado) || null : null),
    [cursoIdSelecionado, cursosDoProfessor]
  );

  const avaliacoesDoCursoAtivo = useMemo(
    () =>
      cursoAtivo
        ? [...avaliacoes]
            .filter((avaliacao) => avaliacao.turmaId === cursoAtivo.turma.id)
            .sort((left, right) => (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"))
        : [],
    [avaliacoes, cursoAtivo]
  );


  const modulosDoCursoAtivo = useMemo(
    () => (cursoAtivo ? modulosPorCursoId.get(cursoAtivo.curso.id) || [] : []),
    [cursoAtivo, modulosPorCursoId]
  );

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/avaliacoes/${cursoId}`);
  }

  function voltarParaCursos() {
    onNavigate?.("/app/avaliacoes");
  }

  function abrirFormularioNovaAvaliacao() {
    setAvaliacaoParaEditar(null);
    setAssistenteAberto(true);
  }

  function abrirEdicaoAvaliacao(avaliacao) {
    setMenuAbertoId(null);
    setAvaliacaoParaEditar(avaliacao);
    setAssistenteAberto(true);
  }

  function fecharAssistente() {
    setAssistenteAberto(false);
    setAvaliacaoParaEditar(null);
  }

  async function confirmarExclusaoAvaliacao() {
    if (!avaliacaoParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusaoAvaliacao("");

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoParaExcluir.id}`, { method: "DELETE" });

      if (avaliacaoParaEditar?.id === avaliacaoParaExcluir.id) {
        fecharAssistente();
      }

      setAvaliacaoParaExcluir(null);
      mostrarToast("Avaliacao excluida com sucesso.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemExclusaoAvaliacao(err.message || "Nao foi possivel excluir a avaliacao agora.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirDetalheAvaliacao(avaliacao) {
    setAvaliacaoDetalhe(avaliacao);
    setCampoEditando(null);
    setMenuAbertoId(null);
  }

  function fecharDetalheAvaliacao() {
    setAvaliacaoDetalhe(null);
    setCampoEditando(null);
  }

  function iniciarEdicaoCampoDetalhe(campo, valorAtual) {
    setCampoEditando(campo);
    setValorEditando(String(valorAtual));
  }

  function montarPayloadAtualizacao(avaliacao) {
    return {
      titulo: avaliacao.titulo,
      descricao: avaliacao.descricao || "",
      turmaId: avaliacao.turmaId,
      moduloId: avaliacao.moduloId,
      tipoAvaliacao: avaliacao.tipoAvaliacao,
      statusPublicacao: avaliacao.statusPublicacao,
      dataAbertura: avaliacao.dataAbertura || null,
      dataFechamento: avaliacao.dataFechamento || null,
      tentativasPermitidas: avaliacao.tentativasPermitidas,
      tempoLimiteMinutos: avaliacao.tempoLimiteMinutos || null,
      notaMaxima: avaliacao.notaMaxima,
      pesoNota: avaliacao.pesoNota,
      pesoProgresso: avaliacao.pesoProgresso
    };
  }

  async function salvarCampoDetalhe(campo, valorBruto) {
    if (campoEditando !== campo || !avaliacaoDetalhe) {
      return;
    }

    const valor = campo === "titulo" ? String(valorBruto).trim() : Number(valorBruto);
    const valorInvalido = campo === "titulo" ? !valor : !Number.isFinite(valor) || valor <= 0;

    if (valorInvalido) {
      setCampoEditando(null);
      return;
    }

    const avaliacaoAtualizada = { ...avaliacaoDetalhe, [campo]: valor };
    setCampoEditando(null);
    setAvaliacaoDetalhe(avaliacaoAtualizada);

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoDetalhe.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAtualizacao(avaliacaoAtualizada))
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setAvaliacaoDetalhe(avaliacaoDetalhe);
    }
  }

  async function alternarStatusDetalhe() {
    if (!avaliacaoDetalhe) {
      return;
    }

    const proximoStatus = avaliacaoDetalhe.statusPublicacao === 2 ? 3 : 2;
    const avaliacaoAtualizada = { ...avaliacaoDetalhe, statusPublicacao: proximoStatus };
    setAvaliacaoDetalhe(avaliacaoAtualizada);

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoDetalhe.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAtualizacao(avaliacaoAtualizada))
      });
      mostrarToast(proximoStatus === 2 ? "Avaliacao publicada com sucesso." : "Avaliacao despublicada com sucesso.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setAvaliacaoDetalhe(avaliacaoDetalhe);
    }
  }

  return (
    <div className="tela-avaliacoes tela-avaliacoes-professor">
      {!cursoAtivo ? (
        <GradeCursosProfessor
          cursos={cursosDoProfessor.map(({ curso, totalAvaliacoes, totalPublicadas }) => ({
            curso,
            resumo: `${totalAvaliacoes} avaliaca${totalAvaliacoes === 1 ? "o" : "oes"}`,
            rodapeEsquerda: `${totalPublicadas} publicada${totalPublicadas === 1 ? "" : "s"}`,
            badge: totalAvaliacoes > 0 && totalPublicadas === totalAvaliacoes ? "Publicado" : "Rascunho"
          }))}
          mensagemVazia="Voce ainda nao tem turmas atribuidas a nenhum curso."
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
            <h2 className="atividades-curso__titulo">{cursoAtivo.curso.titulo}</h2>
            <Botao onClick={abrirFormularioNovaAvaliacao} variante="primario">
              <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                <TbPlus aria-hidden="true" size={18} />
              </motion.span>{" "}
              Nova avaliacao
            </Botao>
          </header>

          <SlideAvaliacoes
            avaliacoes={avaliacoesDoCursoAtivo}
            mediaNotaPorAvaliacaoId={mediaNotaPorAvaliacaoId}
            menuAbertoId={menuAbertoId}
            onEditar={abrirEdicaoAvaliacao}
            onExcluir={(avaliacao) => {
              setAvaliacaoParaExcluir(avaliacao);
              setMensagemExclusaoAvaliacao("");
              setMenuAbertoId(null);
            }}
            onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
            onVerDetalhes={abrirDetalheAvaliacao}
          />
        </>
      )}

      {avaliacaoDetalhe ? (
        <Modal
          onFechar={fecharDetalheAvaliacao}
          titulo="Detalhes da avaliacao"
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={fecharDetalheAvaliacao} style={{ alignItems: "center", display: "flex", gap: "6px", marginRight: "auto" }} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Fechar
              </Botao>
              <Botao
                onClick={() => {
                  setAvaliacaoParaExcluir(avaliacaoDetalhe);
                  setMensagemExclusaoAvaliacao("");
                  fecharDetalheAvaliacao();
                }}
                style={{ alignItems: "center", display: "flex", gap: "6px" }}
                variante="perigo"
              >
                <MdDelete aria-hidden="true" size={19} /> Excluir
              </Botao>
            </footer>
          }
        >
          <dl className="lista-detalhes">
            <div className="lista-detalhes__item">
              <dt>Titulo</dt>
              {campoEditando === "titulo" ? (
                <input
                  autoFocus
                  className="campo__entrada campo__entrada--inline"
                  defaultValue={valorEditando}
                  onBlur={(event) => salvarCampoDetalhe("titulo", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.target.blur();
                    if (event.key === "Escape") setCampoEditando(null);
                  }}
                />
              ) : (
                <dd>{avaliacaoDetalhe.titulo}</dd>
              )}
              <button
                className="btn-editar-linha"
                onClick={() => iniciarEdicaoCampoDetalhe("titulo", avaliacaoDetalhe.titulo)}
                title="Editar titulo"
                type="button"
              >
                <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                  <TbPencil aria-hidden="true" size={18} />
                </motion.span>
              </button>
            </div>

            <div className="lista-detalhes__item">
              <dt>Turma</dt>
              <dd>{avaliacaoDetalhe.turmaNome}</dd>
            </div>

            <div className="lista-detalhes__item">
              <dt>Modulo</dt>
              <dd>{avaliacaoDetalhe.moduloTitulo || "Direto no curso"}</dd>
            </div>

            <div className="lista-detalhes__item lista-detalhes__item--com-acao">
              <div>
                <dt>Total de questoes</dt>
                <dd>{avaliacaoDetalhe.totalQuestoes || 0}</dd>
              </div>
              <button
                aria-label="Editar questoes desta avaliacao"
                className="btn-editar-questoes"
                data-tooltip="Editar questoes"
                onClick={() => {
                  const alvo = avaliacaoDetalhe;
                  fecharDetalheAvaliacao();
                  abrirEdicaoAvaliacao(alvo);
                }}
                type="button"
              >
                <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                  <TbPencil aria-hidden="true" size={18} />
                </motion.span>
              </button>
            </div>

            <div className="lista-detalhes__item">
              <dt>Tentativas permitidas</dt>
              {campoEditando === "tentativasPermitidas" ? (
                <input
                  autoFocus
                  className="campo__entrada campo__entrada--inline"
                  defaultValue={valorEditando}
                  max="10"
                  min="1"
                  onBlur={(event) => salvarCampoDetalhe("tentativasPermitidas", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.target.blur();
                    if (event.key === "Escape") setCampoEditando(null);
                  }}
                  type="number"
                />
              ) : (
                <dd>{avaliacaoDetalhe.tentativasPermitidas}</dd>
              )}
              <button
                className="btn-editar-linha"
                onClick={() => iniciarEdicaoCampoDetalhe("tentativasPermitidas", avaliacaoDetalhe.tentativasPermitidas)}
                title="Editar tentativas"
                type="button"
              >
                <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                  <TbPencil aria-hidden="true" size={18} />
                </motion.span>
              </button>
            </div>

            <div className="lista-detalhes__item">
              <dt>Tempo limite</dt>
              {campoEditando === "tempoLimiteMinutos" ? (
                <input
                  autoFocus
                  className="campo__entrada campo__entrada--inline"
                  defaultValue={valorEditando}
                  min="5"
                  onBlur={(event) => salvarCampoDetalhe("tempoLimiteMinutos", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.target.blur();
                    if (event.key === "Escape") setCampoEditando(null);
                  }}
                  type="number"
                />
              ) : (
                <dd>{avaliacaoDetalhe.tempoLimiteMinutos ? `${avaliacaoDetalhe.tempoLimiteMinutos} minutos` : "Sem limite"}</dd>
              )}
              <button
                className="btn-editar-linha"
                onClick={() => iniciarEdicaoCampoDetalhe("tempoLimiteMinutos", avaliacaoDetalhe.tempoLimiteMinutos || 30)}
                title="Editar tempo limite"
                type="button"
              >
                <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                  <TbPencil aria-hidden="true" size={18} />
                </motion.span>
              </button>
            </div>

            {Number(avaliacaoDetalhe.tipoAvaliacao) === 1 ? (
              <div className="lista-detalhes__item">
                <dt>Tipo</dt>
                <dd>Quiz - atividade formativa, conta pro progresso, nao gera nota</dd>
              </div>
            ) : (
              <div className="lista-detalhes__item">
                <dt>Nota maxima</dt>
                {campoEditando === "notaMaxima" ? (
                  <input
                    autoFocus
                    className="campo__entrada campo__entrada--inline"
                    defaultValue={valorEditando}
                    max="100"
                    min="1"
                    onBlur={(event) => salvarCampoDetalhe("notaMaxima", event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.target.blur();
                      if (event.key === "Escape") setCampoEditando(null);
                    }}
                    step="0.01"
                    type="number"
                  />
                ) : (
                  <dd>{formatDecimal(avaliacaoDetalhe.notaMaxima)}</dd>
                )}
                <button
                  className="btn-editar-linha"
                  onClick={() => iniciarEdicaoCampoDetalhe("notaMaxima", avaliacaoDetalhe.notaMaxima)}
                  title="Editar nota maxima"
                  type="button"
                >
                  <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                    <TbPencil aria-hidden="true" size={18} />
                  </motion.span>
                </button>
              </div>
            )}
          </dl>

          <div className="detalhe-status">
            <div>
              <strong className="detalhe-status__rotulo">Status da avaliacao</strong>
              <span className="detalhe-status__descricao">
                {avaliacaoDetalhe.statusPublicacao === 2
                  ? "Visivel e disponivel para os alunos"
                  : "Oculta - nao aparece para os alunos"}
              </span>
            </div>
            <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-sm)" }}>
              <Insignia texto={normalizePublicationStatus(avaliacaoDetalhe.statusPublicacao)} />
              <button
                aria-checked={avaliacaoDetalhe.statusPublicacao === 2}
                aria-label={avaliacaoDetalhe.statusPublicacao === 2 ? "Publicado - clique para arquivar" : "Arquivado - clique para publicar"}
                className={`switch-ativo${avaliacaoDetalhe.statusPublicacao === 2 ? " switch-ativo--ativo" : ""}`}
                onClick={alternarStatusDetalhe}
                role="switch"
                type="button"
              >
                <TbX aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--esq" size={10} />
                <span aria-hidden="true" className="switch-ativo__thumb" />
                <TbCheck aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--dir" size={10} />
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {avaliacaoParaExcluir ? (
        <Modal
          onFechar={() => setAvaliacaoParaExcluir(null)}
          titulo="Excluir avaliacao"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setAvaliacaoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusaoAvaliacao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: mensagemExclusaoAvaliacao ? "var(--espaco-md)" : 0 }}>
            Deseja excluir a avaliacao <strong>{avaliacaoParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
          {mensagemExclusaoAvaliacao ? <InlineMessage tone="error">{mensagemExclusaoAvaliacao}</InlineMessage> : null}
        </Modal>
      ) : null}

      {assistenteAberto ? (
        <AssistenteQuizAvaliacao
          avaliacaoParaEditar={avaliacaoParaEditar}
          conteudos={conteudos}
          cursoAtivo={cursoAtivo}
          modulosDisponiveis={modulosDoCursoAtivo}
          onFechar={fecharAssistente}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

    </div>
  );
}

/* Avaliacoes pertencem diretamente ao curso (via TurmaId) - avaliacoesDoCursoAtivo
   ja filtra por turma, sem passar por modulos/conteudos. O card do curso
   (GradeCursosProfessor) continua sendo a porta de entrada; isto so desenha o
   conteudo depois que um curso ja foi acessado. Cada avaliacao vira seu proprio
   accordion (mesmo padrao visual/interacao do cabecalho de modulo em
   SecaoConteudosProfessor.jsx), com so uma aberta por vez; o menu "..." (Ver
   detalhes/Editar/Excluir) fica ao lado do cabecalho, fora do botao de toggle. */
function SlideAvaliacoes({ avaliacoes, mediaNotaPorAvaliacaoId, menuAbertoId, onEditar, onExcluir, onToggleMenu, onVerDetalhes }) {
  const [avaliacaoAbertaId, setAvaliacaoAbertaId] = useState(null);

  if (avaliacoes.length === 0) {
    return <p className="texto-vazio" role="status">Nenhuma avaliacao cadastrada para este curso ainda.</p>;
  }

  function alternarAvaliacao(avaliacaoId) {
    setAvaliacaoAbertaId((atual) => (atual === avaliacaoId ? null : avaliacaoId));
  }

  return (
    <div className="atividades-curso__lista-modulos">
      {avaliacoes.map((avaliacao, indice) => {
        const aberta = avaliacaoAbertaId === avaliacao.id;
        const idDetalhe = `avaliacao-detalhe-${avaliacao.id}`;

        return (
          <section className="conteudos-modulo" key={avaliacao.id}>
            <header className="conteudos-modulo__cabecalho">
              <h3 className="conteudos-modulo__cabecalho-wrapper">
                <button
                  aria-controls={idDetalhe}
                  aria-expanded={aberta}
                  className="conteudos-modulo__toggle"
                  onClick={() => alternarAvaliacao(avaliacao.id)}
                  type="button"
                >
                  <div className="conteudos-modulo__info">
                    <span aria-hidden="true" className="conteudos-modulo__icone">
                      <TbTrophy size="1.4rem" />
                    </span>
                    <span className="conteudos-modulo__eyebrow">Avaliacao {String(indice + 1).padStart(2, "0")}</span>
                    <span className="conteudos-modulo__titulo">{avaliacao.titulo}</span>
                    <span className="conteudos-modulo__contagem">
                      {avaliacao.totalQuestoes || 0} questa{avaliacao.totalQuestoes === 1 ? "o" : "oes"} · {normalizePublicationStatus(avaliacao.statusPublicacao)}
                    </span>
                  </div>
                  <TbChevronDown
                    aria-hidden="true"
                    className={`conteudos-modulo__chevron${aberta ? " conteudos-modulo__chevron--aberto" : ""}`}
                    size="1.1rem"
                  />
                </button>
              </h3>

              <div className="menu-contexto">
                <button
                  aria-expanded={menuAbertoId === avaliacao.id}
                  aria-haspopup="true"
                  aria-label={`Opcoes para ${avaliacao.titulo}`}
                  className="menu-contexto__botao"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMenu(avaliacao.id);
                  }}
                  type="button"
                >
                  <TbDotsVertical aria-hidden="true" size={18} />
                </button>
                {menuAbertoId === avaliacao.id ? (
                  <ul className="menu-contexto__lista">
                    <li>
                      <button onClick={() => onVerDetalhes(avaliacao)} type="button">
                        Ver detalhes
                      </button>
                    </li>
                    <li>
                      <button onClick={() => onEditar(avaliacao)} type="button">
                        Editar
                      </button>
                    </li>
                    <li>
                      <button className="menu-item--perigo" onClick={() => onExcluir(avaliacao)} type="button">
                        Excluir
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            </header>

            <AnimatePresence initial={false}>
              {aberta ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  id={idDetalhe}
                  initial={{ height: 0, opacity: 0 }}
                  key={`detalhe-avaliacao-${avaliacao.id}`}
                  style={{ overflow: "hidden" }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                >
                  <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
                    <div className="lista-detalhes__item">
                      <dt>Status</dt>
                      <dd><Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} /></dd>
                    </div>
                    {Number(avaliacao.tipoAvaliacao) === 1 ? (
                      <div className="lista-detalhes__item">
                        <dt>Tipo</dt>
                        <dd>Quiz - formativo, sem nota</dd>
                      </div>
                    ) : (
                      <div className="lista-detalhes__item">
                        <dt>Nota media</dt>
                        <dd>{formatGrade(mediaNotaPorAvaliacaoId.get(avaliacao.id))}</dd>
                      </div>
                    )}
                    <div className="lista-detalhes__item">
                      <dt>Questoes</dt>
                      <dd>{avaliacao.totalQuestoes || 0}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt>Tentativas permitidas</dt>
                      <dd>{avaliacao.tentativasPermitidas}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt>Tempo limite</dt>
                      <dd>{avaliacao.tempoLimiteMinutos ? `${avaliacao.tempoLimiteMinutos} min` : "Sem limite"}</dd>
                    </div>
                    {Number(avaliacao.tipoAvaliacao) !== 1 ? (
                      <div className="lista-detalhes__item">
                        <dt>Nota maxima</dt>
                        <dd>{formatDecimal(avaliacao.notaMaxima)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

function criarEstadoInicialFormulario(overrides = {}) {
  return {
    turmaId: "",
    moduloId: "",
    conteudoDidaticoId: "",
    titulo: "",
    descricao: "",
    tipoAvaliacao: OPCOES_TIPO_AVALIACAO[0].value,
    statusPublicacao: OPCOES_STATUS_PUBLICACAO[0].value,
    dataAbertura: "",
    dataFechamento: "",
    tentativasPermitidas: "1",
    tempoLimiteMinutos: "",
    notaMaxima: "10",
    pesoNota: "1",
    pesoProgresso: "1",
    ...overrides
  };
}

function criarEstadoInicialFormularioQuestao(overrides = {}) {
  return {
    tituloInterno: "",
    contexto: "",
    enunciado: "",
    tipoQuestao: OPCOES_TIPO_QUESTAO[0].value,
    tema: "",
    subtema: "",
    dificuldade: "1",
    explicacaoPosResposta: "",
    pontos: "1",
    alternativas: criarAlternativasPorTipo(OPCOES_TIPO_QUESTAO[0].value),
    ...overrides
  };
}

function criarAlternativasPorTipo(tipoQuestao, alternativasAtuais = []) {
  const tipo = Number(tipoQuestao);

  if (tipo === 3) {
    return [];
  }

  if (tipo === 2) {
    return [
      { letra: "V", texto: "Verdadeiro", ehCorreta: alternativasAtuais[0]?.ehCorreta ?? true },
      { letra: "F", texto: "Falso", ehCorreta: alternativasAtuais[1]?.ehCorreta ?? false }
    ];
  }

  return ALTERNATIVAS_MULTIPLA_ESCOLHA.map((letra, index) => ({
    letra,
    texto: alternativasAtuais[index]?.texto || "",
    ehCorreta: alternativasAtuais[index]?.ehCorreta ?? index === 0
  }));
}
