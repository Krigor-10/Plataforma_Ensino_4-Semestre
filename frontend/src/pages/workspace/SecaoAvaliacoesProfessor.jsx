import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbArrowLeft, TbCheck, TbDotsVertical, TbPencil, TbPlus, TbTrophy, TbX } from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";

const MOLA_ICONE = { type: "spring", stiffness: 400, damping: 18 };
import Botao from "../../components/Botao.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { formatGrade, normalizePublicationStatus, parseApiDate } from "../../lib/format.js";

const TIPO_QUIZ = "1";

const OPCOES_TIPO_AVALIACAO = [
  { value: "1", label: "Quiz" },
  { value: "2", label: "Prova" },
  { value: "3", label: "Exercicio" }
];

const OPCOES_STATUS_PUBLICACAO = [
  { value: "1", label: "Rascunho" },
  { value: "2", label: "Publicado" },
  { value: "3", label: "Arquivado" }
];

const OPCOES_TIPO_QUESTAO = [
  { value: "1", label: "Multipla escolha" },
  { value: "2", label: "Verdadeiro/Falso" },
  { value: "3", label: "Dissertativa" }
];

const ALTERNATIVAS_MULTIPLA_ESCOLHA = ["A", "B", "C", "D"];

function normalizeQuestionType(type) {
  const labels = { 1: "Multipla escolha", 2: "Verdadeiro/Falso", 3: "Dissertativa" };
  return typeof type === "number" ? labels[type] || "Desconhecido" : type || "Desconhecido";
}

function formatDecimal(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function toDatetimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const parsed = parseApiDate(value);
  if (!parsed) {
    return "";
  }

  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function SecaoAvaliacoesProfessor({ avaliacoes, conteudos = [], cursoIdSelecionado = null, cursos, modulos, onNavigate, onQuizIntentConsumido, onRefresh, onSessionExpired, quizIntent = null, turmas, usuario }) {
  const [dadosFormulario, setDadosFormulario] = useState(() => criarEstadoInicialFormulario());
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const [mensagemExclusaoAvaliacao, setMensagemExclusaoAvaliacao] = useState("");
  const [questaoParaExcluir, setQuestaoParaExcluir] = useState(null);
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

  // Assistente unificado (Dados Gerais + Questoes), fiel ao FormularioCriarAvaliacao do prototipo:
  // uma tela so com navegacao lateral por step, em vez de 2 modais separados.
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [avaliacaoAssistenteId, setAvaliacaoAssistenteId] = useState(null);
  const [etapaAtiva, setEtapaAtiva] = useState("dados");
  const [questoesAvaliacao, setQuestoesAvaliacao] = useState([]);
  const [dadosFormularioQuestao, setDadosFormularioQuestao] = useState(() => criarEstadoInicialFormularioQuestao());
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [salvandoQuestao, setSalvandoQuestao] = useState(false);
  const [mensagemQuestoes, setMensagemQuestoes] = useState({ tone: "", message: "" });

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


  useEffect(() => {
    if (avaliacaoAssistenteId || dadosFormulario.turmaId || !cursoAtivo) {
      return;
    }

    setDadosFormulario(criarEstadoInicialFormulario({ turmaId: String(cursoAtivo.turma.id) }));
  }, [avaliacaoAssistenteId, cursoAtivo, dadosFormulario.turmaId]);

  /* Vindo de "Adicionar/Editar quiz" na Trilha de Conteudos (SecaoConteudosProfessor) -
     abre o assistente ja preenchido pro modulo/material daquele conteudo, ou em modo
     edicao se ja existir um quiz vinculado. */
  useEffect(() => {
    if (!quizIntent || quizIntent.cursoId !== cursoIdSelecionado || !cursoAtivo || assistenteAberto) {
      return;
    }

    if (quizIntent.avaliacaoId) {
      const avaliacaoAlvo = avaliacoesDoCursoAtivo.find((avaliacao) => avaliacao.id === quizIntent.avaliacaoId);
      if (avaliacaoAlvo) {
        abrirEdicaoAvaliacao(avaliacaoAlvo);
      }
    } else {
      setAvaliacaoAssistenteId(null);
      setDadosFormulario(
        criarEstadoInicialFormulario({
          conteudoDidaticoId: String(quizIntent.conteudoDidaticoId),
          moduloId: String(quizIntent.moduloId),
          tipoAvaliacao: TIPO_QUIZ,
          turmaId: String(cursoAtivo.turma.id)
        })
      );
      setEtapaAtiva("dados");
      setAssistenteAberto(true);
    }

    onQuizIntentConsumido?.();
  }, [assistenteAberto, avaliacoesDoCursoAtivo, cursoAtivo, cursoIdSelecionado, onQuizIntentConsumido, quizIntent]);

  const turmaSelecionadaFormulario = useMemo(
    () => turmasDoProfessor.find((turma) => String(turma.id) === dadosFormulario.turmaId) || null,
    [dadosFormulario.turmaId, turmasDoProfessor]
  );

  const modulosDisponiveis = useMemo(() => {
    if (!turmaSelecionadaFormulario) {
      return [];
    }

    return modulosPorCursoId.get(turmaSelecionadaFormulario.cursoId) || [];
  }, [modulosPorCursoId, turmaSelecionadaFormulario]);

  const ehQuiz = dadosFormulario.tipoAvaliacao === TIPO_QUIZ;

  const materiaisDisponiveis = useMemo(
    () => materiaisPorModuloId.get(Number(dadosFormulario.moduloId)) || [],
    [dadosFormulario.moduloId, materiaisPorModuloId]
  );

  useEffect(() => {
    if (!turmaSelecionadaFormulario || avaliacaoAssistenteId || !ehQuiz) {
      return;
    }

    if (!modulosDisponiveis.length && dadosFormulario.moduloId) {
      setDadosFormulario((current) => ({ ...current, conteudoDidaticoId: "", moduloId: "" }));
      return;
    }

    const hasCurrentModule = modulosDisponiveis.some((modulo) => String(modulo.id) === dadosFormulario.moduloId);
    if (!hasCurrentModule && modulosDisponiveis[0]) {
      setDadosFormulario((current) => ({ ...current, conteudoDidaticoId: "", moduloId: String(modulosDisponiveis[0].id) }));
    }
  }, [avaliacaoAssistenteId, dadosFormulario.moduloId, ehQuiz, modulosDisponiveis, turmaSelecionadaFormulario]);

  useEffect(() => {
    if (!dadosFormulario.conteudoDidaticoId) {
      return;
    }

    const materialAindaValido = materiaisDisponiveis.some(
      (material) => String(material.id) === dadosFormulario.conteudoDidaticoId
    );

    if (!materialAindaValido) {
      setDadosFormulario((current) => ({ ...current, conteudoDidaticoId: "" }));
    }
  }, [dadosFormulario.conteudoDidaticoId, materiaisDisponiveis]);

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/avaliacoes/${cursoId}`);
  }

  function voltarParaCursos() {
    onNavigate?.("/app/avaliacoes");
  }

  function limparFormulario() {
    setAvaliacaoAssistenteId(null);
    setDadosFormulario(criarEstadoInicialFormulario({ turmaId: cursoAtivo ? String(cursoAtivo.turma.id) : "" }));
    setMensagemFormulario({ tone: "", message: "" });
    setQuestoesAvaliacao([]);
    setDadosFormularioQuestao(criarEstadoInicialFormularioQuestao());
    setMensagemQuestoes({ tone: "", message: "" });
  }

  function abrirFormularioNovaAvaliacao() {
    limparFormulario();
    setEtapaAtiva("dados");
    setAssistenteAberto(true);
  }

  function fecharAssistente() {
    if (salvando || salvandoQuestao) {
      return;
    }

    limparFormulario();
    setEtapaAtiva("dados");
    setAssistenteAberto(false);
  }

  function atualizarCampoFormulario(event) {
    const { name, value } = event.target;

    if (name === "tipoAvaliacao") {
      if (value !== TIPO_QUIZ) {
        // Prova/Exercicio ficam soltos direto no curso — sem modulo, sem material.
        setDadosFormulario((current) => ({ ...current, tipoAvaliacao: value, moduloId: "", conteudoDidaticoId: "" }));
        return;
      }

      const primeiroModulo = modulosDisponiveis[0];
      setDadosFormulario((current) => ({
        ...current,
        tipoAvaliacao: value,
        moduloId: primeiroModulo ? String(primeiroModulo.id) : ""
      }));
      return;
    }

    setDadosFormulario((current) => ({ ...current, [name]: value }));
  }

  async function abrirEdicaoAvaliacao(avaliacao) {
    setAvaliacaoAssistenteId(avaliacao.id);
    setDadosFormulario({
      turmaId: String(avaliacao.turmaId),
      moduloId: avaliacao.moduloId ? String(avaliacao.moduloId) : "",
      conteudoDidaticoId: avaliacao.conteudoDidaticoId ? String(avaliacao.conteudoDidaticoId) : "",
      titulo: avaliacao.titulo || "",
      descricao: avaliacao.descricao || "",
      tipoAvaliacao: String(avaliacao.tipoAvaliacao || 1),
      statusPublicacao: String(avaliacao.statusPublicacao || 1),
      dataAbertura: toDatetimeLocalValue(avaliacao.dataAbertura),
      dataFechamento: toDatetimeLocalValue(avaliacao.dataFechamento),
      tentativasPermitidas: String(avaliacao.tentativasPermitidas ?? 1),
      tempoLimiteMinutos: avaliacao.tempoLimiteMinutos ? String(avaliacao.tempoLimiteMinutos) : "",
      notaMaxima: String(avaliacao.notaMaxima ?? 10),
      pesoNota: String(avaliacao.pesoNota ?? 1),
      pesoProgresso: String(avaliacao.pesoProgresso ?? 1)
    });
    setMensagemFormulario({ tone: "", message: "" });
    setEtapaAtiva("dados");
    setMenuAbertoId(null);
    setAssistenteAberto(true);
    await carregarQuestoesAvaliacao(avaliacao.id);
  }

  function montarDadosEnvioAvaliacao() {
    return {
      titulo: dadosFormulario.titulo.trim(),
      descricao: dadosFormulario.descricao.trim(),
      turmaId: Number(dadosFormulario.turmaId),
      moduloId: ehQuiz && dadosFormulario.moduloId ? Number(dadosFormulario.moduloId) : null,
      conteudoDidaticoId: ehQuiz && dadosFormulario.conteudoDidaticoId ? Number(dadosFormulario.conteudoDidaticoId) : null,
      tipoAvaliacao: Number(dadosFormulario.tipoAvaliacao),
      statusPublicacao: Number(dadosFormulario.statusPublicacao),
      dataAbertura: toIsoOrNull(dadosFormulario.dataAbertura),
      dataFechamento: toIsoOrNull(dadosFormulario.dataFechamento),
      tentativasPermitidas: Number(dadosFormulario.tentativasPermitidas),
      tempoLimiteMinutos: dadosFormulario.tempoLimiteMinutos ? Number(dadosFormulario.tempoLimiteMinutos) : null,
      notaMaxima: Number(dadosFormulario.notaMaxima),
      pesoNota: Number(dadosFormulario.pesoNota),
      pesoProgresso: Number(dadosFormulario.pesoProgresso)
    };
  }

  function validarDadosGerais(dadosEnvio) {
    if (!cursoAtivo) {
      return "Selecione um curso antes de criar a avaliacao.";
    }

    if (!dadosEnvio.titulo) {
      return "Informe o titulo da avaliacao antes de salvar.";
    }

    if (!dadosEnvio.turmaId) {
      return "Nao foi possivel identificar a turma deste curso.";
    }

    if (ehQuiz && !modulosDisponiveis.length) {
      return "Este curso ainda nao tem modulos cadastrados para organizar o quiz.";
    }

    if (ehQuiz && !dadosEnvio.moduloId) {
      return "Selecione um modulo para organizar o quiz.";
    }

    if (!Number.isInteger(dadosEnvio.tentativasPermitidas) || dadosEnvio.tentativasPermitidas <= 0) {
      return "Informe pelo menos uma tentativa permitida.";
    }

    if (dadosEnvio.tempoLimiteMinutos !== null && (!Number.isInteger(dadosEnvio.tempoLimiteMinutos) || dadosEnvio.tempoLimiteMinutos <= 0)) {
      return "O tempo limite deve ser maior que zero.";
    }

    if (!Number.isFinite(dadosEnvio.notaMaxima) || dadosEnvio.notaMaxima <= 0) {
      return "A nota maxima deve ser maior que zero.";
    }

    if (!Number.isFinite(dadosEnvio.pesoNota) || dadosEnvio.pesoNota <= 0) {
      return "O peso de nota deve ser maior que zero.";
    }

    if (!Number.isFinite(dadosEnvio.pesoProgresso) || dadosEnvio.pesoProgresso <= 0) {
      return "O peso de progresso deve ser maior que zero.";
    }

    if (dadosEnvio.dataAbertura && dadosEnvio.dataFechamento && new Date(dadosEnvio.dataFechamento) <= new Date(dadosEnvio.dataAbertura)) {
      return "A data de fechamento deve ser posterior a abertura.";
    }

    return null;
  }

  async function salvarDadosGerais(event) {
    event.preventDefault();

    const dadosEnvio = montarDadosEnvioAvaliacao();
    const erro = validarDadosGerais(dadosEnvio);

    if (erro) {
      setMensagemFormulario({ tone: "error", message: erro });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      if (avaliacaoAssistenteId) {
        await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}`, { method: "PUT", body: JSON.stringify(dadosEnvio) });
        setMensagemFormulario({ tone: "success", message: "Dados gerais atualizados." });
      } else {
        const criada = await apiRequest("/Avaliacoes", { method: "POST", body: JSON.stringify(dadosEnvio) });
        setAvaliacaoAssistenteId(criada.id);
        setMensagemFormulario({ tone: "success", message: "Avaliacao criada. Agora adicione as questoes." });
      }

      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel salvar a avaliacao agora." });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoAvaliacao() {
    if (!avaliacaoParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusaoAvaliacao("");

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoParaExcluir.id}`, { method: "DELETE" });

      if (avaliacaoAssistenteId === avaliacaoParaExcluir.id) {
        fecharAssistente();
      }

      setAvaliacaoParaExcluir(null);
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
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setAvaliacaoDetalhe(avaliacaoDetalhe);
    }
  }

  function abrirNovaQuestao() {
    setDadosFormularioQuestao(criarEstadoInicialFormularioQuestao());
    setMensagemQuestoes({ tone: "", message: "" });
    setEtapaAtiva("nova-questao");
  }

  async function carregarQuestoesAvaliacao(avaliacaoId) {
    setCarregandoQuestoes(true);

    try {
      const questoes = await apiRequest(`/Avaliacoes/${avaliacaoId}/questoes`);
      setQuestoesAvaliacao(questoes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel carregar as questoes agora." });
    } finally {
      setCarregandoQuestoes(false);
    }
  }

  function atualizarCampoFormularioQuestao(event) {
    const { name, value } = event.target;

    if (name === "tipoQuestao") {
      setDadosFormularioQuestao((current) => ({
        ...current,
        tipoQuestao: value,
        alternativas: criarAlternativasPorTipo(value, current.alternativas)
      }));
      return;
    }

    setDadosFormularioQuestao((current) => ({ ...current, [name]: value }));
  }

  function atualizarAlternativaQuestao(index, value) {
    setDadosFormularioQuestao((current) => ({
      ...current,
      alternativas: current.alternativas.map((alternativa, alternativeIndex) =>
        alternativeIndex === index ? { ...alternativa, texto: value } : alternativa
      )
    }));
  }

  function selecionarAlternativaCorreta(index) {
    setDadosFormularioQuestao((current) => ({
      ...current,
      alternativas: current.alternativas.map((alternativa, alternativeIndex) => ({
        ...alternativa,
        ehCorreta: alternativeIndex === index
      }))
    }));
  }

  async function salvarQuestao(event) {
    event.preventDefault();

    if (!avaliacaoAssistenteId) {
      return;
    }

    const tipoQuestao = Number(dadosFormularioQuestao.tipoQuestao);
    const alternativas =
      tipoQuestao === 3
        ? []
        : dadosFormularioQuestao.alternativas.map((alternativa) => ({
            letra: alternativa.letra,
            texto: alternativa.texto.trim(),
            ehCorreta: alternativa.ehCorreta
          }));

    const payload = {
      tituloInterno: dadosFormularioQuestao.tituloInterno.trim(),
      contexto: dadosFormularioQuestao.contexto.trim(),
      enunciado: dadosFormularioQuestao.enunciado.trim(),
      tipoQuestao,
      tema: dadosFormularioQuestao.tema.trim(),
      subtema: dadosFormularioQuestao.subtema.trim(),
      dificuldade: Number(dadosFormularioQuestao.dificuldade),
      explicacaoPosResposta: dadosFormularioQuestao.explicacaoPosResposta.trim(),
      pontos: Number(dadosFormularioQuestao.pontos),
      alternativas
    };

    if (!payload.tituloInterno) {
      setMensagemQuestoes({ tone: "error", message: "Informe um titulo interno para a questao." });
      return;
    }

    if (!payload.enunciado) {
      setMensagemQuestoes({ tone: "error", message: "Informe o enunciado da questao." });
      return;
    }

    if (!Number.isFinite(payload.pontos) || payload.pontos <= 0) {
      setMensagemQuestoes({ tone: "error", message: "Informe uma pontuacao maior que zero." });
      return;
    }

    if (tipoQuestao !== 3 && alternativas.some((alternativa) => !alternativa.texto)) {
      setMensagemQuestoes({ tone: "error", message: "Preencha o texto de todas as alternativas." });
      return;
    }

    if (tipoQuestao !== 3 && alternativas.filter((alternativa) => alternativa.ehCorreta).length !== 1) {
      setMensagemQuestoes({ tone: "error", message: "Marque exatamente uma alternativa correta." });
      return;
    }

    setSalvandoQuestao(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes`, { method: "POST", body: JSON.stringify(payload) });

      setDadosFormularioQuestao(criarEstadoInicialFormularioQuestao());
      setMensagemQuestoes({ tone: "success", message: "Questao adicionada. Pode cadastrar a proxima." });
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel salvar a questao agora." });
    } finally {
      setSalvandoQuestao(false);
    }
  }

  async function confirmarExclusaoQuestao() {
    if (!avaliacaoAssistenteId || !questaoParaExcluir) {
      return;
    }

    const questao = questaoParaExcluir;
    setSalvandoQuestao(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes/${questao.id}`, { method: "DELETE" });
      setMensagemQuestoes({ tone: "success", message: "Questao removida da avaliacao." });
      if (etapaAtiva === questao.id) {
        setEtapaAtiva("dados");
      }
      setQuestaoParaExcluir(null);
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel excluir a questao agora." });
      setQuestaoParaExcluir(null);
    } finally {
      setSalvandoQuestao(false);
    }
  }

  return (
    <div className="tela-avaliacoes">
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
                  abrirMontagemQuestoes(alvo);
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
        <Modal
          className="modal-caixa--avaliacao"
          onFechar={fecharAssistente}
          titulo={avaliacaoAssistenteId ? "Editar avaliacao" : "Nova avaliacao"}
          rodape={
            !turmasDoProfessor.length || !modulosDoProfessor.length ? null : etapaAtiva === "dados" ? (
              <footer className="criar-avaliacao__rodape">
                <Botao disabled={salvando} onClick={fecharAssistente} type="button" variante="perigo">
                  <TbX aria-hidden="true" size={15} /> Cancelar
                </Botao>
                <div className="criar-avaliacao__rodape-direita">
                  <Botao disabled={salvando || !modulosDisponiveis.length} form="form-avaliacao-dados" type="submit" variante="primario">
                    <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : avaliacaoAssistenteId ? "Salvar alteracoes" : "Criar avaliacao e continuar"}
                  </Botao>
                </div>
              </footer>
            ) : etapaAtiva === "nova-questao" ? (
              <footer className="criar-avaliacao__rodape">
                <Botao disabled={salvandoQuestao} onClick={() => setEtapaAtiva("dados")} type="button" variante="perigo">
                  <TbX aria-hidden="true" size={15} /> Voltar
                </Botao>
                <div className="criar-avaliacao__rodape-direita">
                  <Botao disabled={salvandoQuestao} form="form-avaliacao-questao" type="submit" variante="primario">
                    <MdSave aria-hidden="true" size={17} /> {salvandoQuestao ? "Salvando..." : "Adicionar questao"}
                  </Botao>
                </div>
              </footer>
            ) : typeof etapaAtiva === "number" && questoesAvaliacao.some((item) => item.id === etapaAtiva) ? (
              <footer className="criar-avaliacao__rodape">
                <Botao
                  disabled={salvandoQuestao}
                  onClick={() => setQuestaoParaExcluir(questoesAvaliacao.find((item) => item.id === etapaAtiva))}
                  type="button"
                  variante="perigo"
                >
                  <MdDelete aria-hidden="true" size={17} /> Excluir questao
                </Botao>
              </footer>
            ) : null
          }
        >
          {!turmasDoProfessor.length ? (
            <InlineMessage tone="info">Seu usuario ainda nao possui turmas atribuidas.</InlineMessage>
          ) : !modulosDoProfessor.length ? (
            <InlineMessage tone="info">Suas turmas ainda nao tem modulos cadastrados nos cursos correspondentes.</InlineMessage>
          ) : (
            <div className="criar-avaliacao__layout">
              <aside className="criar-avaliacao__steps">
                <button
                  className={`criar-avaliacao__step${etapaAtiva === "dados" ? " criar-avaliacao__step--ativo" : ""}`}
                  onClick={() => setEtapaAtiva("dados")}
                  type="button"
                >
                  <span aria-hidden="true" className="criar-avaliacao__step-icone">{etapaAtiva === "dados" ? "●" : "○"}</span>
                  Dados Gerais
                </button>

                {avaliacaoAssistenteId ? (
                  <>
                    <div className="criar-avaliacao__step-divisor">
                      <span>Questoes</span>
                      <span className="criar-avaliacao__contagem">{carregandoQuestoes ? "..." : questoesAvaliacao.length}</span>
                    </div>

                    {questoesAvaliacao.map((questao, indice) => (
                      <button
                        aria-label={`Ir para questao ${indice + 1}`}
                        className={`criar-avaliacao__step criar-avaliacao__step--questao${etapaAtiva === questao.id ? " criar-avaliacao__step--ativo" : ""}`}
                        key={questao.id}
                        onClick={() => setEtapaAtiva(questao.id)}
                        type="button"
                      >
                        <span className="criar-avaliacao__step-num">{indice + 1}</span>
                        <span className="criar-avaliacao__step-label">Questao {indice + 1}</span>
                      </button>
                    ))}

                    <button className="criar-avaliacao__step criar-avaliacao__step--adicionar" onClick={abrirNovaQuestao} type="button">
                      <span aria-hidden="true" className="criar-avaliacao__step-num criar-avaliacao__step-num--mais">+</span>
                      Adicionar questao
                    </button>
                  </>
                ) : null}
              </aside>

              <div className="criar-avaliacao__painel">
                {etapaAtiva === "dados" ? (
                  <section className="criar-avaliacao__secao">
                    <h3 className="criar-avaliacao__secao-titulo">Dados gerais</h3>
                    <form className="criar-avaliacao__secao-corpo" id="form-avaliacao-dados" onSubmit={salvarDadosGerais}>
                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tipo">Tipo *</label>
                          <select className="campo__entrada" disabled={salvando} id="avaliacao-tipo" name="tipoAvaliacao" onChange={atualizarCampoFormulario} value={dadosFormulario.tipoAvaliacao}>
                            {OPCOES_TIPO_AVALIACAO.map((opcao) => (
                              <option key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {ehQuiz ? (
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor="avaliacao-modulo">Modulo *</label>
                            <select
                              className="campo__entrada"
                              disabled={salvando || !modulosDisponiveis.length}
                              id="avaliacao-modulo"
                              name="moduloId"
                              onChange={atualizarCampoFormulario}
                              value={dadosFormulario.moduloId}
                            >
                              {!modulosDisponiveis.length ? <option value="">Nenhum modulo disponivel</option> : null}
                              {modulosDisponiveis.map((modulo) => (
                                <option key={modulo.id} value={modulo.id}>
                                  {modulo.titulo}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>

                      {!ehQuiz ? (
                        <InlineMessage tone="info">
                          Esta avaliacao fica vinculada direto ao curso <strong>{cursoAtivo?.curso.titulo}</strong>, sem modulo — o aluno a ve na tela geral de Avaliacoes dele.
                        </InlineMessage>
                      ) : null}

                      {ehQuiz ? (
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-material">Material (opcional)</label>
                          <select
                            className="campo__entrada"
                            disabled={salvando || !materiaisDisponiveis.length}
                            id="avaliacao-material"
                            name="conteudoDidaticoId"
                            onChange={atualizarCampoFormulario}
                            value={dadosFormulario.conteudoDidaticoId}
                          >
                            <option value="">Nenhum - vale para o modulo inteiro</option>
                            {materiaisDisponiveis.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.titulo}
                              </option>
                            ))}
                          </select>
                          <p className="campo__ajuda">
                            Vincule o quiz a um material especifico pra ele aparecer dentro desse material em Conteudos, em vez de solto no modulo.
                          </p>
                        </div>
                      ) : null}

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="avaliacao-titulo">Titulo *</label>
                        <input
                          className="campo__entrada"
                          disabled={salvando}
                          id="avaliacao-titulo"
                          maxLength={180}
                          name="titulo"
                          onChange={atualizarCampoFormulario}
                          placeholder="Ex.: Avaliacao final do modulo"
                          type="text"
                          value={dadosFormulario.titulo}
                        />
                      </div>

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="avaliacao-descricao">Descricao curta</label>
                        <textarea
                          className="campo__entrada"
                          disabled={salvando}
                          id="avaliacao-descricao"
                          maxLength={500}
                          name="descricao"
                          onChange={atualizarCampoFormulario}
                          placeholder="Explique rapidamente o objetivo da avaliacao."
                          value={dadosFormulario.descricao}
                        />
                      </div>

                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-status">Status *</label>
                          <select className="campo__entrada" disabled={salvando} id="avaliacao-status" name="statusPublicacao" onChange={atualizarCampoFormulario} value={dadosFormulario.statusPublicacao}>
                            {OPCOES_STATUS_PUBLICACAO.map((opcao) => (
                              <option key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-abertura">Abertura</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-abertura" name="dataAbertura" onChange={atualizarCampoFormulario} type="datetime-local" value={dadosFormulario.dataAbertura} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-fechamento">Fechamento</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-fechamento" name="dataFechamento" onChange={atualizarCampoFormulario} type="datetime-local" value={dadosFormulario.dataFechamento} />
                        </div>
                      </div>

                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tentativas">Tentativas permitidas *</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-tentativas" min="1" name="tentativasPermitidas" onChange={atualizarCampoFormulario} type="number" value={dadosFormulario.tentativasPermitidas} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tempo">Tempo limite (min)</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-tempo" min="1" name="tempoLimiteMinutos" onChange={atualizarCampoFormulario} placeholder="Sem limite" type="number" value={dadosFormulario.tempoLimiteMinutos} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-nota">Nota maxima *</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-nota" min="0.01" name="notaMaxima" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.notaMaxima} />
                        </div>
                      </div>

                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-peso-nota">Peso da nota *</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-peso-nota" min="0.01" name="pesoNota" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.pesoNota} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-peso-progresso">Peso de progresso *</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-peso-progresso" min="0.01" name="pesoProgresso" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.pesoProgresso} />
                        </div>
                      </div>

                      {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
                    </form>
                  </section>
                ) : null}

                {etapaAtiva === "nova-questao" ? (
                  <section className="criar-avaliacao__secao">
                    <h3 className="criar-avaliacao__secao-titulo">Nova questao</h3>
                    <form className="criar-avaliacao__secao-corpo" id="form-avaliacao-questao" onSubmit={salvarQuestao}>
                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="questao-tipo">Tipo da questao</label>
                          <select className="campo__entrada" disabled={salvandoQuestao} id="questao-tipo" name="tipoQuestao" onChange={atualizarCampoFormularioQuestao} value={dadosFormularioQuestao.tipoQuestao}>
                            {OPCOES_TIPO_QUESTAO.map((opcao) => (
                              <option key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="questao-pontos">Pontos</label>
                          <input className="campo__entrada" disabled={salvandoQuestao} id="questao-pontos" min="0.01" name="pontos" onChange={atualizarCampoFormularioQuestao} step="0.01" type="number" value={dadosFormularioQuestao.pontos} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="questao-dificuldade">Dificuldade</label>
                          <select className="campo__entrada" disabled={salvandoQuestao} id="questao-dificuldade" name="dificuldade" onChange={atualizarCampoFormularioQuestao} value={dadosFormularioQuestao.dificuldade}>
                            {[1, 2, 3, 4, 5].map((nivel) => (
                              <option key={nivel} value={nivel}>
                                {nivel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-tema">Tema</label>
                        <input className="campo__entrada" disabled={salvandoQuestao} id="questao-tema" maxLength={120} name="tema" onChange={atualizarCampoFormularioQuestao} placeholder="Ex.: Logica" type="text" value={dadosFormularioQuestao.tema} />
                      </div>

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-titulo-interno">Titulo interno *</label>
                        <input
                          className="campo__entrada"
                          disabled={salvandoQuestao}
                          id="questao-titulo-interno"
                          maxLength={180}
                          name="tituloInterno"
                          onChange={atualizarCampoFormularioQuestao}
                          placeholder="Ex.: Questao 01 - conceitos iniciais"
                          type="text"
                          value={dadosFormularioQuestao.tituloInterno}
                        />
                      </div>

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-contexto">Contexto</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-contexto" name="contexto" onChange={atualizarCampoFormularioQuestao} placeholder="Texto de apoio opcional." value={dadosFormularioQuestao.contexto} />
                      </div>

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-enunciado">Enunciado *</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-enunciado" name="enunciado" onChange={atualizarCampoFormularioQuestao} placeholder="Digite a pergunta." value={dadosFormularioQuestao.enunciado} />
                      </div>

                      {Number(dadosFormularioQuestao.tipoQuestao) !== 3 ? (
                        <div className="campo">
                          <span className="campo__rotulo">Alternativas</span>
                          <ul className="detalhe-usuario__lista" role="list">
                            {dadosFormularioQuestao.alternativas.map((alternativa, index) => (
                              <li className="detalhe-usuario__item" key={alternativa.letra} style={{ fontWeight: 400 }}>
                                <strong>{alternativa.letra}</strong>
                                <input
                                  className="campo__entrada"
                                  disabled={salvandoQuestao || Number(dadosFormularioQuestao.tipoQuestao) === 2}
                                  onChange={(event) => atualizarAlternativaQuestao(index, event.target.value)}
                                  placeholder={`Alternativa ${alternativa.letra}`}
                                  style={{ flex: 1 }}
                                  type="text"
                                  value={alternativa.texto}
                                />
                                <input
                                  aria-label={`Marcar alternativa ${alternativa.letra} como correta`}
                                  checked={alternativa.ehCorreta}
                                  disabled={salvandoQuestao}
                                  name="alternativaCorreta"
                                  onChange={() => selecionarAlternativaCorreta(index)}
                                  type="radio"
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-explicacao">Explicacao pos-resposta</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-explicacao" name="explicacaoPosResposta" onChange={atualizarCampoFormularioQuestao} placeholder="Opcional: comentario para correcao." value={dadosFormularioQuestao.explicacaoPosResposta} />
                      </div>

                      {mensagemQuestoes.message ? <InlineMessage tone={mensagemQuestoes.tone}>{mensagemQuestoes.message}</InlineMessage> : null}
                    </form>
                  </section>
                ) : null}

                {typeof etapaAtiva === "number"
                  ? (() => {
                      const indiceQuestao = questoesAvaliacao.findIndex((item) => item.id === etapaAtiva);
                      const questao = questoesAvaliacao[indiceQuestao];

                      if (!questao) {
                        return null;
                      }

                      return (
                        <section className="criar-avaliacao__secao">
                          <h3 className="criar-avaliacao__secao-titulo">Questao {indiceQuestao + 1}</h3>
                          <div className="criar-avaliacao__secao-corpo">
                            <p style={{ color: "var(--cor-texto-suave)", margin: 0 }}>{questao.enunciado}</p>
                            <span style={{ color: "var(--cor-texto-mudo)", fontSize: "0.82rem" }}>
                              {normalizeQuestionType(questao.tipoQuestao)} - {formatDecimal(questao.pontos)} ponto(s)
                            </span>

                            {mensagemQuestoes.message ? <InlineMessage tone={mensagemQuestoes.tone}>{mensagemQuestoes.message}</InlineMessage> : null}
                          </div>
                        </section>
                      );
                    })()
                  : null}
              </div>
            </div>
          )}
        </Modal>
      ) : null}

      {questaoParaExcluir ? (
        <Modal
          onFechar={() => setQuestaoParaExcluir(null)}
          titulo="Excluir questao"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoQuestao} onClick={() => setQuestaoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoQuestao} onClick={confirmarExclusaoQuestao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvandoQuestao ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir a questao <strong>{questaoParaExcluir.ordem}</strong>? Esta acao nao pode ser desfeita.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

/* Avaliacoes pertencem diretamente ao curso (via TurmaId) - lista plana, sem
   passar por modulos/conteudos (avaliacoesDoCursoAtivo ja filtra por turma).
   O card do curso (GradeCursosProfessor) continua sendo a porta de entrada;
   isto so desenha o conteudo depois que um curso ja foi acessado, reaproveitando
   o padrao visual dos itens de conteudo dentro de um modulo (atividades-curso__*)
   - ver SecaoConteudosProfessor.jsx para o padrao original. */
function SlideAvaliacoes({ avaliacoes, mediaNotaPorAvaliacaoId, menuAbertoId, onEditar, onExcluir, onToggleMenu, onVerDetalhes }) {
  if (avaliacoes.length === 0) {
    return <p className="texto-vazio" role="status">Nenhuma avaliacao cadastrada para este curso ainda.</p>;
  }

  return (
    <ul aria-label="Avaliacoes do curso" className="conteudos-modulo__lista atividades-curso__lista" role="list">
      {avaliacoes.map((avaliacao) => (
        <li className="atividades-curso__item" key={avaliacao.id}>
          <div className="atividades-curso__linha">
            <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
              <TbTrophy aria-hidden="true" size="1.5rem" />
            </span>
            <div className="atividades-curso__corpo">
              <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
              <p className="atividades-curso__meta">
                <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
                <span aria-hidden="true" className="atividades-curso__separador">·</span>
                <span>Media {formatGrade(mediaNotaPorAvaliacaoId.get(avaliacao.id))}</span>
              </p>
            </div>
            <div className="atividades-curso__acoes menu-contexto">
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
          </div>
        </li>
      ))}
    </ul>
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
