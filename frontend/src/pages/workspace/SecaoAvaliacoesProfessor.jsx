import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbCheck, TbDotsVertical, TbPencil, TbPlus, TbX } from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";

const MOLA_ICONE = { type: "spring", stiffness: 400, damping: 18 };
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { normalizePublicationStatus, parseApiDate } from "../../lib/format.js";

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

export function SecaoAvaliacoesProfessor({ avaliacoes, cursos, modulos, onRefresh, onSessionExpired, solicitacaoNovaAvaliacao = 0, turmas, usuario }) {
  const [dadosFormulario, setDadosFormulario] = useState(() => criarEstadoInicialFormulario([], []));
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [slideAtual, setSlideAtual] = useState(0);

  const [avaliacaoDetalhe, setAvaliacaoDetalhe] = useState(null);
  const [campoEditando, setCampoEditando] = useState(null);
  const [valorEditando, setValorEditando] = useState("");

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

  useEffect(() => {
    if (avaliacaoAssistenteId || dadosFormulario.turmaId || !turmasDoProfessor.length) {
      return;
    }

    setDadosFormulario(criarEstadoInicialFormulario(turmasDoProfessor, modulosDoProfessor));
  }, [avaliacaoAssistenteId, dadosFormulario.turmaId, modulosDoProfessor, turmasDoProfessor]);

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

  useEffect(() => {
    if (!turmaSelecionadaFormulario || avaliacaoAssistenteId) {
      return;
    }

    if (!modulosDisponiveis.length && dadosFormulario.moduloId) {
      setDadosFormulario((current) => ({ ...current, moduloId: "" }));
      return;
    }

    const hasCurrentModule = modulosDisponiveis.some((modulo) => String(modulo.id) === dadosFormulario.moduloId);
    if (!hasCurrentModule && modulosDisponiveis[0]) {
      setDadosFormulario((current) => ({ ...current, moduloId: String(modulosDisponiveis[0].id) }));
    }
  }, [avaliacaoAssistenteId, dadosFormulario.moduloId, modulosDisponiveis, turmaSelecionadaFormulario]);

  useEffect(() => {
    if (solicitacaoNovaAvaliacao > 0) {
      abrirFormularioNovaAvaliacao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacaoNovaAvaliacao]);

  const grupos = useMemo(
    () =>
      turmasDoProfessor.map((turma) => ({
        turma,
        curso: cursoPorId.get(turma.cursoId) || null,
        itens: [...avaliacoes]
          .filter((avaliacao) => avaliacao.turmaId === turma.id)
          .sort((left, right) => {
            const moduloComparison = (left.moduloTitulo || "").localeCompare(right.moduloTitulo || "", "pt-BR");
            return moduloComparison !== 0 ? moduloComparison : (left.titulo || "").localeCompare(right.titulo || "", "pt-BR");
          })
      })),
    [avaliacoes, cursoPorId, turmasDoProfessor]
  );

  const total = grupos.length;
  const slide = Math.min(slideAtual, Math.max(0, total - 1));

  function irPara(indice) {
    setSlideAtual(Math.max(0, Math.min(indice, total - 1)));
  }

  function limparFormulario() {
    setAvaliacaoAssistenteId(null);
    setDadosFormulario(criarEstadoInicialFormulario(turmasDoProfessor, modulosDoProfessor));
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

    if (name === "turmaId") {
      const proximaTurma = turmasDoProfessor.find((turma) => String(turma.id) === value) || null;
      const proximosModulos = proximaTurma ? modulosPorCursoId.get(proximaTurma.cursoId) || [] : [];

      setDadosFormulario((current) => ({
        ...current,
        turmaId: value,
        moduloId: proximosModulos.some((modulo) => String(modulo.id) === current.moduloId)
          ? current.moduloId
          : proximosModulos[0]
            ? String(proximosModulos[0].id)
            : ""
      }));
      return;
    }

    setDadosFormulario((current) => ({ ...current, [name]: value }));
  }

  async function abrirEdicaoAvaliacao(avaliacao) {
    setAvaliacaoAssistenteId(avaliacao.id);
    setDadosFormulario({
      turmaId: String(avaliacao.turmaId),
      moduloId: String(avaliacao.moduloId),
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
      moduloId: Number(dadosFormulario.moduloId),
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
    if (!turmasDoProfessor.length) {
      return "Seu perfil ainda nao possui turmas para avaliacao.";
    }

    if (!modulosDisponiveis.length) {
      return "Nao existem modulos disponiveis para a turma selecionada.";
    }

    if (!dadosEnvio.titulo) {
      return "Informe o titulo da avaliacao antes de salvar.";
    }

    if (!dadosEnvio.turmaId) {
      return "Selecione a turma que vai receber a avaliacao.";
    }

    if (!dadosEnvio.moduloId) {
      return "Selecione um modulo para organizar a avaliacao.";
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

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel excluir a avaliacao agora." });
      setAvaliacaoParaExcluir(null);
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

  async function excluirQuestao(questao) {
    if (!avaliacaoAssistenteId) {
      return;
    }

    const exclusaoConfirmada = window.confirm(`Deseja excluir a questao ${questao.ordem}?`);
    if (!exclusaoConfirmada) {
      return;
    }

    setSalvandoQuestao(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes/${questao.id}`, { method: "DELETE" });
      setMensagemQuestoes({ tone: "success", message: "Questao removida da avaliacao." });
      if (etapaAtiva === questao.id) {
        setEtapaAtiva("dados");
      }
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel excluir a questao agora." });
    } finally {
      setSalvandoQuestao(false);
    }
  }

  return (
    <div className="tela-avaliacoes">
      <header className="cabecalho-pagina">
        <div style={{ flex: 1 }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-lg)" }}>
            <h2 className="cabecalho-pagina__titulo">Avaliacoes</h2>
            {total > 0 ? (
              <select
                aria-label="Navegar para turma"
                className="campo__entrada barra-filtros__select"
                onChange={(event) => irPara(Number(event.target.value))}
                style={{ marginLeft: "auto", maxWidth: "240px" }}
                value={slide}
              >
                {grupos.map(({ turma }, indice) => (
                  <option key={turma.id} value={indice}>
                    {turma.nomeTurma}
                  </option>
                ))}
              </select>
            ) : null}
            {turmasDoProfessor.length ? (
              <>
                <span aria-hidden="true" style={{ background: "var(--cor-borda)", flexShrink: 0, height: "24px", width: "1px" }} />
                <Botao onClick={abrirFormularioNovaAvaliacao} variante="primario">
                  <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                    <TbPlus aria-hidden="true" size={18} />
                  </motion.span>{" "}
                  Nova avaliacao
                </Botao>
              </>
            ) : null}
          </div>
          <p className="cabecalho-pagina__subtitulo">{avaliacoes.length} {avaliacoes.length === 1 ? "avaliacao" : "avaliacoes"} cadastrada{avaliacoes.length === 1 ? "" : "s"}</p>
        </div>
      </header>

      {total === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">
          Seu usuario ainda nao possui turmas atribuidas.
        </p>
      ) : (
        <div className="carrossel-cursos">
          {total > 1 ? (
            <nav aria-label="Navegacao entre turmas" className="carrossel-cursos__nav">
              <button aria-label="Turma anterior" className="carrossel-cursos__seta" disabled={slide === 0} onClick={() => irPara(slide - 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div aria-label="Turmas" className="carrossel-cursos__indicadores" role="tablist">
                {grupos.map(({ turma }, indice) => (
                  <button
                    aria-label={`Turma ${indice + 1}: ${turma.nomeTurma}`}
                    aria-selected={indice === slide}
                    className={`carrossel-cursos__bolinha${indice === slide ? " carrossel-cursos__bolinha--ativa" : ""}`}
                    key={turma.id}
                    onClick={() => irPara(indice)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>
              <button aria-label="Proxima turma" className="carrossel-cursos__seta" disabled={slide === total - 1} onClick={() => irPara(slide + 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </nav>
          ) : null}

          <div className="carrossel-cursos__janela">
            <SlideAvaliacoes
              curso={grupos[slide].curso}
              itens={grupos[slide].itens}
              menuAbertoId={menuAbertoId}
              onEditar={abrirEdicaoAvaliacao}
              onExcluir={(avaliacao) => {
                setAvaliacaoParaExcluir(avaliacao);
                setMenuAbertoId(null);
              }}
              onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
              onVerDetalhes={abrirDetalheAvaliacao}
              turma={grupos[slide].turma}
            />
          </div>
        </div>
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
              <dd>{avaliacaoDetalhe.moduloTitulo}</dd>
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
              <Botao disabled={salvando} onClick={confirmarExclusaoAvaliacao} variante="primario">
                {salvando ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir a avaliacao <strong>{avaliacaoParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
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
                  onClick={() => excluirQuestao(questoesAvaliacao.find((item) => item.id === etapaAtiva))}
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
                          <label className="campo__rotulo" htmlFor="avaliacao-turma">Turma *</label>
                          <select className="campo__entrada" disabled={salvando} id="avaliacao-turma" name="turmaId" onChange={atualizarCampoFormulario} value={dadosFormulario.turmaId}>
                            {turmasDoProfessor.map((turma) => (
                              <option key={turma.id} value={turma.id}>
                                {turma.nomeTurma}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-modulo">Modulo *</label>
                          <select
                            className="campo__entrada"
                            disabled={salvando || !modulosDisponiveis.length}
                            id="avaliacao-modulo"
                            key={dadosFormulario.turmaId || "sem-turma"}
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
                      </div>

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
    </div>
  );
}

function SlideAvaliacoes({ curso, itens, menuAbertoId, onEditar, onExcluir, onToggleMenu, onVerDetalhes, turma }) {
  return (
    <div className="conteudos-aluno">
      <header className="conteudos-aluno__cabecalho">
        <div className="conteudos-aluno__curso-info">
          <h2 className="conteudos-aluno__curso-titulo">{turma.nomeTurma}</h2>
          <div className="conteudos-aluno__meta-chips">
            <span className="conteudos-aluno__meta-chip conteudos-aluno__meta-chip--progresso">
              {itens.length} {itens.length === 1 ? "avaliacao" : "avaliacoes"}
            </span>
            {curso ? <span className="conteudos-aluno__meta-chip">{curso.titulo}</span> : null}
          </div>
        </div>
      </header>

      {itens.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhuma avaliacao cadastrada para esta turma.</p>
      ) : (
        <ul aria-label={`Avaliacoes de ${turma.nomeTurma}`} className="lista-conteudos-completa" role="list">
          {itens.map((avaliacao) => (
            <li className="cartao-conteudo" key={avaliacao.id}>
              <span aria-hidden="true" className="cartao-conteudo__icone">◈</span>
              <div className="cartao-conteudo__info">
                <strong className="cartao-conteudo__titulo">{avaliacao.titulo}</strong>
                <p className="cartao-conteudo__modulo">
                  {avaliacao.totalQuestoes || 0} questa{avaliacao.totalQuestoes === 1 ? "o" : "oes"}
                  {" - "}
                  {avaliacao.tempoLimiteMinutos ? `${avaliacao.tempoLimiteMinutos}min` : "sem tempo limite"}
                  {" - "}
                  nota max. {formatDecimal(avaliacao.notaMaxima)}
                </p>
              </div>
              <div className="cartao-conteudo__meta">
                <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
              </div>
              <div className="cartao-conteudo__acoes menu-contexto">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function criarEstadoInicialFormulario(turmas, modulos, overrides = {}) {
  const primeiraTurma = turmas[0] || null;
  const modulosDaPrimeiraTurma = primeiraTurma ? modulos.filter((modulo) => modulo.cursoId === primeiraTurma.cursoId) : [];

  return {
    turmaId: primeiraTurma ? String(primeiraTurma.id) : "",
    moduloId: modulosDaPrimeiraTurma[0] ? String(modulosDaPrimeiraTurma[0].id) : "",
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
