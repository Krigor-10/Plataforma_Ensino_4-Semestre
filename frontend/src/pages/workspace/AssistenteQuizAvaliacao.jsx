import { useEffect, useMemo, useState } from "react";
import { TbCheck, TbChevronDown, TbChevronUp, TbClipboardList, TbPencil, TbX } from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { parseApiDate } from "../../lib/format.js";

const TIPO_QUIZ = "1";

const OPCOES_TIPO_AVALIACAO = [
  { value: "1", label: "Quiz" },
  { value: "2", label: "Prova" },
  { value: "3", label: "Exercicio" }
];

// Tela Avaliacoes (professor) e exclusiva pra Prova/Exercicio - quiz so se cria
// via Conteudos (modoExclusivoQuiz). Uma avaliacao tipo Quiz legada ainda pode
// ser editada aqui (o item continua aparecendo na lista), entao a opcao Quiz
// so reaparece no select se for exatamente o tipo ja selecionado no momento.
const OPCOES_TIPO_AVALIACAO_SEM_QUIZ = OPCOES_TIPO_AVALIACAO.filter((opcao) => opcao.value !== TIPO_QUIZ);

const OPCOES_STATUS_PUBLICACAO = [
  { value: "1", label: "Rascunho" },
  { value: "2", label: "Publicado" },
  { value: "3", label: "Arquivado" }
];

const OPCOES_TIPO_QUESTAO = [
  { value: "1", label: "Multipla escolha" },
  { value: "2", label: "Verdadeiro/Falso" },
  { value: "3", label: "Dissertativa" },
  { value: "4", label: "Afirmativas combinadas" }
];

const ALTERNATIVAS_MULTIPLA_ESCOLHA = ["A", "B", "C", "D", "E"];
const ALTERNATIVAS_AFIRMATIVAS_COMBINADAS = ["A", "B", "C", "D", "E"];
const NUMERACAO_AFIRMATIVAS_PADRAO = ["I", "II", "III", "IV", "V", "VI"];
const MINIMO_ALTERNATIVAS = 4;
const MAXIMO_ALTERNATIVAS = 5;

function normalizeQuestionType(type) {
  const labels = { 1: "Multipla escolha", 2: "Verdadeiro/Falso", 3: "Dissertativa", 4: "Afirmativas combinadas" };
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
    referenciasBibliograficas: "",
    pontos: "1",
    alternativas: criarAlternativasPorTipo(OPCOES_TIPO_QUESTAO[0].value),
    afirmativas: [],
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
      { letra: "V", texto: "Verdadeiro", ehCorreta: alternativasAtuais[0]?.ehCorreta ?? true, justificativa: alternativasAtuais[0]?.justificativa || "" },
      { letra: "F", texto: "Falso", ehCorreta: alternativasAtuais[1]?.ehCorreta ?? false, justificativa: alternativasAtuais[1]?.justificativa || "" }
    ];
  }

  const letrasBase = tipo === 4 ? ALTERNATIVAS_AFIRMATIVAS_COMBINADAS : ALTERNATIVAS_MULTIPLA_ESCOLHA;
  // Novas questoes nascem com o minimo (4 alternativas, A-D); se ja havia uma
  // quantidade valida (ao trocar o tipo da questao, ou editar uma existente
  // com 5), preserva — nunca forca de volta pro maximo.
  const quantidade =
    alternativasAtuais.length >= MINIMO_ALTERNATIVAS && alternativasAtuais.length <= MAXIMO_ALTERNATIVAS
      ? alternativasAtuais.length
      : MINIMO_ALTERNATIVAS;
  const letras = letrasBase.slice(0, quantidade);

  return letras.map((letra, index) => ({
    letra,
    texto: alternativasAtuais[index]?.texto || "",
    ehCorreta: alternativasAtuais[index]?.ehCorreta ?? index === 0,
    justificativa: alternativasAtuais[index]?.justificativa || ""
  }));
}

function sugerirProximoNumeroAfirmativa(afirmativasAtuais) {
  return NUMERACAO_AFIRMATIVAS_PADRAO[afirmativasAtuais.length] || String(afirmativasAtuais.length + 1);
}

function criarAfirmativaVazia(afirmativasAtuais) {
  return { numero: sugerirProximoNumeroAfirmativa(afirmativasAtuais), texto: "", ehCorreta: false, justificativa: "" };
}

// Converte a questao devolvida pela API (QuestaoAvaliacaoResponseDto) de volta
// pro formato editavel do formulario - usado ao abrir uma questao ja salva
// pra edicao.
function mapearQuestaoParaFormulario(questao) {
  return {
    tituloInterno: questao.tituloInterno || "",
    contexto: questao.contexto || "",
    enunciado: questao.enunciado || "",
    tipoQuestao: String(questao.tipoQuestao),
    tema: questao.tema || "",
    subtema: questao.subtema || "",
    dificuldade: String(questao.dificuldade || 1),
    explicacaoPosResposta: questao.explicacao || "",
    referenciasBibliograficas: questao.referenciasBibliograficas || "",
    pontos: String(questao.pontos ?? 1),
    alternativas: (questao.alternativas || []).map((alternativa) => ({
      letra: alternativa.letra,
      texto: alternativa.texto || "",
      ehCorreta: alternativa.ehCorreta,
      justificativa: alternativa.justificativa || ""
    })),
    afirmativas: (questao.afirmativas || []).map((afirmativa) => ({
      numero: afirmativa.numero,
      texto: afirmativa.texto || "",
      ehCorreta: afirmativa.ehCorreta,
      justificativa: afirmativa.justificativa || ""
    }))
  };
}

function estadoInicialDadosFormulario(cursoAtivo, avaliacaoParaEditar, contextoNovoQuiz, modoExclusivoQuiz) {
  if (avaliacaoParaEditar) {
    return {
      turmaId: String(avaliacaoParaEditar.turmaId),
      moduloId: avaliacaoParaEditar.moduloId ? String(avaliacaoParaEditar.moduloId) : "",
      conteudoDidaticoId: avaliacaoParaEditar.conteudoDidaticoId ? String(avaliacaoParaEditar.conteudoDidaticoId) : "",
      titulo: avaliacaoParaEditar.titulo || "",
      descricao: avaliacaoParaEditar.descricao || "",
      tipoAvaliacao: String(avaliacaoParaEditar.tipoAvaliacao || 1),
      statusPublicacao: String(avaliacaoParaEditar.statusPublicacao || 1),
      dataAbertura: toDatetimeLocalValue(avaliacaoParaEditar.dataAbertura),
      dataFechamento: toDatetimeLocalValue(avaliacaoParaEditar.dataFechamento),
      tentativasPermitidas: String(avaliacaoParaEditar.tentativasPermitidas ?? 1),
      tempoLimiteMinutos: avaliacaoParaEditar.tempoLimiteMinutos ? String(avaliacaoParaEditar.tempoLimiteMinutos) : "",
      notaMaxima: String(avaliacaoParaEditar.notaMaxima ?? 10),
      pesoNota: String(avaliacaoParaEditar.pesoNota ?? 1),
      pesoProgresso: String(avaliacaoParaEditar.pesoProgresso ?? 1)
    };
  }

  return criarEstadoInicialFormulario({
    turmaId: String(cursoAtivo.turma.id),
    moduloId: contextoNovoQuiz?.moduloId ? String(contextoNovoQuiz.moduloId) : "",
    conteudoDidaticoId: contextoNovoQuiz?.conteudoDidaticoId ? String(contextoNovoQuiz.conteudoDidaticoId) : "",
    tipoAvaliacao: modoExclusivoQuiz ? TIPO_QUIZ : OPCOES_TIPO_AVALIACAO_SEM_QUIZ[0].value
  });
}

/* Assistente unificado (Dados Gerais + Questoes) de criacao/edicao de
   avaliacao/quiz — extraido de SecaoAvaliacoesProfessor.jsx pra ser
   reaproveitado tambem pela Trilha de Conteudos (SecaoConteudosProfessor.jsx,
   botao "Adicionar/Editar quiz"), SEM navegar pra tela Avaliacoes: antes o
   unico jeito de abrir esse modal era navegando pra /app/avaliacoes/{cursoId}
   (a tela por tras do overlay ficava sendo Avaliacoes, mesmo abrindo a partir
   de Conteudos). Agora cada tela monta este componente diretamente, sem sair
   de si mesma — o fundo do popup sempre e a tela de origem.

   cursoAtivo, modulosDisponiveis e conteudos sao dados que ambas as telas ja
   calculam/recebem; avaliacaoParaEditar (objeto completo, ou null pra criar)
   e contextoNovoQuiz ({moduloId, conteudoDidaticoId}, so quando vem do botao
   de um material especifico em Conteudos) sao a unica coisa que muda entre
   os dois pontos de entrada. */
export function AssistenteQuizAvaliacao({
  contextoNovoQuiz = null,
  conteudos = [],
  cursoAtivo,
  avaliacaoParaEditar = null,
  modoExclusivoQuiz = false,
  modulosDisponiveis,
  onFechar,
  onRefresh,
  onSessionExpired
}) {
  const { mostrarToast } = useToast();
  const [avaliacaoAssistenteId, setAvaliacaoAssistenteId] = useState(() => avaliacaoParaEditar?.id ?? null);
  const [dadosFormulario, setDadosFormulario] = useState(() =>
    estadoInicialDadosFormulario(cursoAtivo, avaliacaoParaEditar, contextoNovoQuiz, modoExclusivoQuiz)
  );
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [etapaAtiva, setEtapaAtiva] = useState("dados");
  const [questoesAvaliacao, setQuestoesAvaliacao] = useState([]);
  const [dadosFormularioQuestao, setDadosFormularioQuestao] = useState(() => criarEstadoInicialFormularioQuestao());
  const [questaoEmEdicaoId, setQuestaoEmEdicaoId] = useState(null);
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [salvandoQuestao, setSalvandoQuestao] = useState(false);
  const [mensagemQuestoes, setMensagemQuestoes] = useState({ tone: "", message: "" });
  const [questaoParaExcluir, setQuestaoParaExcluir] = useState(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [anexoParaExcluir, setAnexoParaExcluir] = useState(null);
  const [excluindoAnexo, setExcluindoAnexo] = useState(false);

  async function carregarQuestoesAvaliacao(avaliacaoId) {
    setCarregandoQuestoes(true);

    try {
      const questoes = await apiRequest(`/Avaliacoes/${avaliacaoId}/questoes`);
      setQuestoesAvaliacao(questoes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel carregar as questoes agora." });
    } finally {
      setCarregandoQuestoes(false);
    }
  }

  // Mount unico: se abriu em modo edicao, busca as questoes ja cadastradas.
  useEffect(() => {
    if (avaliacaoParaEditar) {
      carregarQuestoesAvaliacao(avaliacaoParaEditar.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ehQuiz = modoExclusivoQuiz || dadosFormulario.tipoAvaliacao === TIPO_QUIZ;

  // Select de Tipo (fora do modoExclusivoQuiz) so oferece Quiz se for o tipo
  // ja selecionado no momento — cobre a edicao de uma avaliacao Quiz legada
  // sem reabrir a opcao de criar Quiz novo por aqui.
  const opcoesTipoDisponiveis = dadosFormulario.tipoAvaliacao === TIPO_QUIZ ? OPCOES_TIPO_AVALIACAO : OPCOES_TIPO_AVALIACAO_SEM_QUIZ;

  const moduloContexto = useMemo(
    () => modulosDisponiveis.find((modulo) => String(modulo.id) === dadosFormulario.moduloId) || null,
    [dadosFormulario.moduloId, modulosDisponiveis]
  );

  // Anexo de imagem exige uma QuestaoBanco ja existente (so uma questao salva
  // tem id/questaoBancoId) - por isso so aparece em modo edicao.
  const questaoEmEdicaoAtual = useMemo(
    () => questoesAvaliacao.find((questao) => questao.id === questaoEmEdicaoId) || null,
    [questoesAvaliacao, questaoEmEdicaoId]
  );
  const questaoBancoIdAtual = questaoEmEdicaoAtual?.questaoBancoId ?? null;
  const anexosQuestaoAtual = questaoEmEdicaoAtual?.anexos ?? [];

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

  const materiaisDisponiveis = useMemo(
    () => materiaisPorModuloId.get(Number(dadosFormulario.moduloId)) || [],
    [dadosFormulario.moduloId, materiaisPorModuloId]
  );

  useEffect(() => {
    if (avaliacaoAssistenteId || !ehQuiz) {
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
  }, [avaliacaoAssistenteId, dadosFormulario.moduloId, ehQuiz, modulosDisponiveis]);

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

  function fecharAssistente() {
    if (salvando || salvandoQuestao) {
      return;
    }

    onFechar?.();
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

  function montarDadosEnvioAvaliacao() {
    return {
      titulo: dadosFormulario.titulo.trim(),
      descricao: dadosFormulario.descricao.trim(),
      turmaId: Number(dadosFormulario.turmaId),
      moduloId: ehQuiz && dadosFormulario.moduloId ? Number(dadosFormulario.moduloId) : null,
      conteudoDidaticoId: ehQuiz && dadosFormulario.conteudoDidaticoId ? Number(dadosFormulario.conteudoDidaticoId) : null,
      tipoAvaliacao: modoExclusivoQuiz ? 1 : Number(dadosFormulario.tipoAvaliacao),
      statusPublicacao: Number(dadosFormulario.statusPublicacao),
      dataAbertura: modoExclusivoQuiz ? null : toIsoOrNull(dadosFormulario.dataAbertura),
      dataFechamento: modoExclusivoQuiz ? null : toIsoOrNull(dadosFormulario.dataFechamento),
      tentativasPermitidas: modoExclusivoQuiz ? 1 : Number(dadosFormulario.tentativasPermitidas),
      tempoLimiteMinutos: modoExclusivoQuiz ? null : dadosFormulario.tempoLimiteMinutos ? Number(dadosFormulario.tempoLimiteMinutos) : null,
      notaMaxima: Number(dadosFormulario.notaMaxima),
      pesoNota: Number(dadosFormulario.pesoNota),
      pesoProgresso: modoExclusivoQuiz ? 1 : Number(dadosFormulario.pesoProgresso)
    };
  }

  function validarDadosGerais(dadosEnvio) {
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
        mostrarToast("Dados gerais atualizados.", "sucesso");
      } else {
        const criada = await apiRequest("/Avaliacoes", { method: "POST", body: JSON.stringify(dadosEnvio) });
        setAvaliacaoAssistenteId(criada.id);
        mostrarToast(modoExclusivoQuiz ? "Quiz criado. Agora adicione as questoes." : "Avaliacao criada. Agora adicione as questoes.", "sucesso");
      }

      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel salvar a avaliacao agora." });
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovaQuestao() {
    setQuestaoEmEdicaoId(null);
    setDadosFormularioQuestao(criarEstadoInicialFormularioQuestao());
    setMensagemQuestoes({ tone: "", message: "" });
    setEtapaAtiva("nova-questao");
  }

  function abrirEdicaoQuestao(questao) {
    setQuestaoEmEdicaoId(questao.id);
    setDadosFormularioQuestao(mapearQuestaoParaFormulario(questao));
    setMensagemQuestoes({ tone: "", message: "" });
    setEtapaAtiva("nova-questao");
  }

  function voltarDaEdicaoQuestao() {
    setQuestaoEmEdicaoId(null);
    setEtapaAtiva(questoesAvaliacao.length > 0 ? "resumo" : "dados");
  }

  async function moverQuestao(indice, direcao) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= questoesAvaliacao.length || salvandoQuestao) {
      return;
    }

    const novaOrdem = [...questoesAvaliacao];
    [novaOrdem[indice], novaOrdem[destino]] = [novaOrdem[destino], novaOrdem[indice]];
    const posicoes = novaOrdem.map((questao, novoIndice) => ({ questaoId: questao.id, novaOrdem: novoIndice + 1 }));

    setSalvandoQuestao(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes/ordem`, { method: "PUT", body: JSON.stringify({ posicoes }) });
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel reordenar as questoes agora." });
    } finally {
      setSalvandoQuestao(false);
    }
  }

  function atualizarCampoFormularioQuestao(event) {
    const { name, value } = event.target;

    if (name === "tipoQuestao") {
      const novoTipo = Number(value);
      setDadosFormularioQuestao((current) => ({
        ...current,
        tipoQuestao: value,
        alternativas: criarAlternativasPorTipo(value, current.alternativas),
        afirmativas: novoTipo === 4 ? current.afirmativas : []
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

  function atualizarJustificativaAlternativa(index, value) {
    setDadosFormularioQuestao((current) => ({
      ...current,
      alternativas: current.alternativas.map((alternativa, alternativeIndex) =>
        alternativeIndex === index ? { ...alternativa, justificativa: value } : alternativa
      )
    }));
  }

  function adicionarAlternativa() {
    setDadosFormularioQuestao((current) => {
      if (current.alternativas.length >= MAXIMO_ALTERNATIVAS) {
        return current;
      }

      const proximaLetra = ALTERNATIVAS_MULTIPLA_ESCOLHA[current.alternativas.length];
      return {
        ...current,
        alternativas: [...current.alternativas, { letra: proximaLetra, texto: "", ehCorreta: false, justificativa: "" }]
      };
    });
  }

  function removerAlternativa(index) {
    setDadosFormularioQuestao((current) => {
      if (current.alternativas.length <= MINIMO_ALTERNATIVAS) {
        return current;
      }

      const removiaACorreta = current.alternativas[index]?.ehCorreta;
      const restantes = current.alternativas
        .filter((_, alternativeIndex) => alternativeIndex !== index)
        .map((alternativa, novoIndice) => ({ ...alternativa, letra: ALTERNATIVAS_MULTIPLA_ESCOLHA[novoIndice] }));

      if (removiaACorreta && restantes.length > 0 && !restantes.some((alternativa) => alternativa.ehCorreta)) {
        restantes[0] = { ...restantes[0], ehCorreta: true };
      }

      return { ...current, alternativas: restantes };
    });
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

  function adicionarAfirmativa() {
    setDadosFormularioQuestao((current) => ({
      ...current,
      afirmativas: [...current.afirmativas, criarAfirmativaVazia(current.afirmativas)]
    }));
  }

  function removerAfirmativa(index) {
    setDadosFormularioQuestao((current) => ({
      ...current,
      afirmativas: current.afirmativas.filter((_, afirmativaIndex) => afirmativaIndex !== index)
    }));
  }

  function atualizarAfirmativa(index, campo, valor) {
    setDadosFormularioQuestao((current) => ({
      ...current,
      afirmativas: current.afirmativas.map((afirmativa, afirmativaIndex) =>
        afirmativaIndex === index ? { ...afirmativa, [campo]: valor } : afirmativa
      )
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
            ehCorreta: alternativa.ehCorreta,
            justificativa: (alternativa.justificativa || "").trim()
          }));

    const afirmativas =
      tipoQuestao === 4
        ? dadosFormularioQuestao.afirmativas.map((afirmativa) => ({
            numero: afirmativa.numero.trim(),
            texto: afirmativa.texto.trim(),
            ehCorreta: afirmativa.ehCorreta,
            justificativa: (afirmativa.justificativa || "").trim()
          }))
        : [];

    const payload = {
      tituloInterno: dadosFormularioQuestao.tituloInterno.trim(),
      contexto: dadosFormularioQuestao.contexto.trim(),
      enunciado: dadosFormularioQuestao.enunciado.trim(),
      tipoQuestao,
      tema: dadosFormularioQuestao.tema.trim(),
      subtema: dadosFormularioQuestao.subtema.trim(),
      dificuldade: Number(dadosFormularioQuestao.dificuldade),
      explicacaoPosResposta: dadosFormularioQuestao.explicacaoPosResposta.trim(),
      referenciasBibliograficas: dadosFormularioQuestao.referenciasBibliograficas.trim(),
      pontos: Number(dadosFormularioQuestao.pontos),
      alternativas,
      afirmativas
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

    if (tipoQuestao === 4 && afirmativas.length < 2) {
      setMensagemQuestoes({ tone: "error", message: "Informe pelo menos duas afirmativas." });
      return;
    }

    if (tipoQuestao === 4 && afirmativas.some((afirmativa) => !afirmativa.numero || !afirmativa.texto)) {
      setMensagemQuestoes({ tone: "error", message: "Preencha numero e texto de todas as afirmativas." });
      return;
    }

    setSalvandoQuestao(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      if (questaoEmEdicaoId) {
        await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes/${questaoEmEdicaoId}`, { method: "PUT", body: JSON.stringify(payload) });
        setQuestaoEmEdicaoId(null);
        mostrarToast("Questao atualizada.", "sucesso");
        await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
        setEtapaAtiva("resumo");
      } else {
        await apiRequest(`/Avaliacoes/${avaliacaoAssistenteId}/questoes`, { method: "POST", body: JSON.stringify(payload) });
        setDadosFormularioQuestao(criarEstadoInicialFormularioQuestao());
        mostrarToast("Questao adicionada. Pode cadastrar a proxima.", "sucesso");
        await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
      }
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
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
      mostrarToast("Questao removida da avaliacao.", "sucesso");
      if (questaoEmEdicaoId === questao.id) {
        setQuestaoEmEdicaoId(null);
        setEtapaAtiva("resumo");
      }
      setQuestaoParaExcluir(null);
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel excluir a questao agora." });
      setQuestaoParaExcluir(null);
    } finally {
      setSalvandoQuestao(false);
    }
  }

  async function enviarAnexoQuestao(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !questaoBancoIdAtual) {
      return;
    }

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("titulo", arquivo.name);
    formData.append("tipoAnexo", "Imagem");

    setEnviandoAnexo(true);
    setMensagemQuestoes({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/questoes-banco/${questaoBancoIdAtual}/anexos`, { method: "POST", body: formData });
      mostrarToast("Imagem anexada a questao.", "sucesso");
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel anexar a imagem agora." });
    } finally {
      setEnviandoAnexo(false);
      event.target.value = "";
    }
  }

  async function confirmarExclusaoAnexo() {
    if (!anexoParaExcluir) {
      return;
    }

    const { questaoBancoId, anexo } = anexoParaExcluir;
    setExcluindoAnexo(true);

    try {
      await apiRequest(`/Avaliacoes/questoes-banco/${questaoBancoId}/anexos/${anexo.id}`, { method: "DELETE" });
      mostrarToast("Imagem removida da questao.", "sucesso");
      setAnexoParaExcluir(null);
      await carregarQuestoesAvaliacao(avaliacaoAssistenteId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemQuestoes({ tone: "error", message: err.message || "Nao foi possivel remover a imagem agora." });
      setAnexoParaExcluir(null);
    } finally {
      setExcluindoAnexo(false);
    }
  }

  return (
    <>
      <Modal
        className="modal-caixa--avaliacao"
        onFechar={fecharAssistente}
        titulo={
          modoExclusivoQuiz
            ? avaliacaoAssistenteId ? "Editar Quiz" : "Adicionar Quiz"
            : avaliacaoAssistenteId ? "Editar avaliacao" : "Nova avaliacao"
        }
        rodape={
          etapaAtiva === "dados" ? (
            <footer className="criar-avaliacao__rodape">
              <Botao disabled={salvando} onClick={fecharAssistente} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <div className="criar-avaliacao__rodape-direita">
                <Botao disabled={salvando || !modulosDisponiveis.length} form="form-avaliacao-dados" type="submit" variante="primario">
                  <MdSave aria-hidden="true" size={17} />{" "}
                  {salvando
                    ? "Salvando..."
                    : avaliacaoAssistenteId
                    ? "Salvar alteracoes"
                    : modoExclusivoQuiz
                    ? "Criar quiz e continuar"
                    : "Criar avaliacao e continuar"}
                </Botao>
              </div>
            </footer>
          ) : etapaAtiva === "nova-questao" ? (
            <footer className="criar-avaliacao__rodape">
              <Botao
                disabled={salvandoQuestao}
                onClick={questaoEmEdicaoId ? voltarDaEdicaoQuestao : () => setEtapaAtiva("dados")}
                type="button"
                variante="perigo"
              >
                <TbX aria-hidden="true" size={15} /> {questaoEmEdicaoId ? "Cancelar edicao" : "Voltar"}
              </Botao>
              <div className="criar-avaliacao__rodape-direita">
                {questaoEmEdicaoId ? (
                  <Botao
                    disabled={salvandoQuestao}
                    onClick={() => setQuestaoParaExcluir(questoesAvaliacao.find((item) => item.id === questaoEmEdicaoId))}
                    type="button"
                    variante="perigo"
                  >
                    <MdDelete aria-hidden="true" size={17} /> Excluir
                  </Botao>
                ) : null}
                <Botao disabled={salvandoQuestao} form="form-avaliacao-questao" type="submit" variante="primario">
                  <MdSave aria-hidden="true" size={17} />{" "}
                  {salvandoQuestao ? "Salvando..." : questaoEmEdicaoId ? "Salvar alteracoes" : "Adicionar questao"}
                </Botao>
              </div>
            </footer>
          ) : etapaAtiva === "resumo" ? (
            <footer className="criar-avaliacao__rodape">
              <Botao disabled={salvandoQuestao} onClick={fecharAssistente} type="button" variante="primario">
                <TbCheck aria-hidden="true" size={15} /> Fechar
              </Botao>
            </footer>
          ) : null
        }
      >
        {!modulosDisponiveis.length && ehQuiz ? (
          <InlineMessage tone="info">Este curso ainda nao tem modulos cadastrados.</InlineMessage>
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
                      aria-label={`Editar questao ${indice + 1}`}
                      className={`criar-avaliacao__step criar-avaliacao__step--questao${questaoEmEdicaoId === questao.id ? " criar-avaliacao__step--ativo" : ""}`}
                      key={questao.id}
                      onClick={() => abrirEdicaoQuestao(questao)}
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

                  {questoesAvaliacao.length > 0 ? (
                    <button
                      className={`criar-avaliacao__step${etapaAtiva === "resumo" ? " criar-avaliacao__step--ativo" : ""}`}
                      onClick={() => setEtapaAtiva("resumo")}
                      type="button"
                    >
                      <span aria-hidden="true" className="criar-avaliacao__step-icone"><TbClipboardList size={15} /></span>
                      Ver resumo
                    </button>
                  ) : null}
                </>
              ) : null}
            </aside>

            <div className="criar-avaliacao__painel">
              {etapaAtiva === "dados" ? (
                <section className="criar-avaliacao__secao">
                  <h3 className="criar-avaliacao__secao-titulo">Dados gerais</h3>
                  <form className="criar-avaliacao__secao-corpo" id="form-avaliacao-dados" onSubmit={salvarDadosGerais}>
                    {modoExclusivoQuiz ? (
                      <div className="campo">
                        <span className="campo__rotulo">Curso e modulo</span>
                        <p className="campo__ajuda" style={{ marginTop: 0 }}>
                          <strong>{cursoAtivo.curso.titulo}</strong>
                          {moduloContexto ? (
                            <>
                              {" "}· Modulo: <strong>{moduloContexto.titulo}</strong>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ) : (
                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tipo">Tipo *</label>
                          <select className="campo__entrada" disabled={salvando} id="avaliacao-tipo" name="tipoAvaliacao" onChange={atualizarCampoFormulario} value={dadosFormulario.tipoAvaliacao}>
                            {opcoesTipoDisponiveis.map((opcao) => (
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
                    )}

                    {!ehQuiz ? (
                      <InlineMessage tone="info">
                        Esta avaliacao fica vinculada direto ao curso <strong>{cursoAtivo.curso.titulo}</strong>, sem modulo — o aluno a ve na tela geral de Avaliacoes dele.
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

                    {modoExclusivoQuiz ? (
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
                    ) : (
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
                    )}

                    {!modoExclusivoQuiz ? (
                      <div className="grade-3">
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tentativas">Tentativas permitidas *</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-tentativas" min="1" name="tentativasPermitidas" onChange={atualizarCampoFormulario} type="number" value={dadosFormulario.tentativasPermitidas} />
                        </div>
                        <div className="campo">
                          <label className="campo__rotulo" htmlFor="avaliacao-tempo">Tempo limite (min)</label>
                          <input className="campo__entrada" disabled={salvando} id="avaliacao-tempo" min="1" name="tempoLimiteMinutos" onChange={atualizarCampoFormulario} placeholder="Sem limite" type="number" value={dadosFormulario.tempoLimiteMinutos} />
                        </div>
                        {!ehQuiz ? (
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor="avaliacao-nota">Nota maxima *</label>
                            <input className="campo__entrada" disabled={salvando} id="avaliacao-nota" min="0.01" name="notaMaxima" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.notaMaxima} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {ehQuiz ? (
                      <InlineMessage tone="info">
                        Quiz e uma atividade formativa: conta pro progresso do aluno no modulo/curso, mas nao gera nota academica.
                      </InlineMessage>
                    ) : null}

                    {!modoExclusivoQuiz ? (
                      <div className="grade-3">
                        {!ehQuiz ? (
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor="avaliacao-peso-nota">Peso da nota *</label>
                            <input className="campo__entrada" disabled={salvando} id="avaliacao-peso-nota" min="0.01" name="pesoNota" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.pesoNota} />
                          </div>
                        ) : null}
                        {ehQuiz ? (
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor="avaliacao-peso-progresso">Peso de progresso *</label>
                            <input className="campo__entrada" disabled={salvando} id="avaliacao-peso-progresso" min="0.01" name="pesoProgresso" onChange={atualizarCampoFormulario} step="0.01" type="number" value={dadosFormulario.pesoProgresso} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
                  </form>
                </section>
              ) : null}

              {etapaAtiva === "nova-questao" ? (
                <section className="criar-avaliacao__secao">
                  <h3 className="criar-avaliacao__secao-titulo">{questaoEmEdicaoId ? "Editar questao" : "Nova questao"}</h3>
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

                    {!ehQuiz ? (
                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-contexto">Contexto</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-contexto" name="contexto" onChange={atualizarCampoFormularioQuestao} placeholder="Texto de apoio opcional." value={dadosFormularioQuestao.contexto} />
                      </div>
                    ) : null}

                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="questao-enunciado">Enunciado *</label>
                      <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-enunciado" name="enunciado" onChange={atualizarCampoFormularioQuestao} placeholder="Digite a pergunta." value={dadosFormularioQuestao.enunciado} />
                    </div>

                    <div className="campo">
                      <span className="campo__rotulo">Imagem da questao</span>
                      {questaoBancoIdAtual ? (
                        <>
                          {anexosQuestaoAtual.length > 0 ? (
                            <ul className="questao-anexos-lista" role="list">
                              {anexosQuestaoAtual.map((anexo) => (
                                <li className="questao-anexo-item" key={anexo.id}>
                                  {anexo.tipoAnexo === "Imagem" ? (
                                    <img alt={anexo.titulo} className="questao-anexo-item__imagem" src={resolverUrlArquivo(anexo.arquivoUrl)} />
                                  ) : (
                                    <span className="questao-anexo-item__arquivo">{anexo.titulo}</span>
                                  )}
                                  <Botao
                                    aria-label={`Remover imagem ${anexo.titulo}`}
                                    disabled={excluindoAnexo}
                                    onClick={() => setAnexoParaExcluir({ questaoBancoId: questaoBancoIdAtual, anexo })}
                                    tamanho="pequeno"
                                    type="button"
                                    variante="perigo"
                                  >
                                    <MdDelete aria-hidden="true" size={15} />
                                  </Botao>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <input
                            accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                            className="campo__entrada"
                            disabled={enviandoAnexo}
                            onChange={enviarAnexoQuestao}
                            type="file"
                          />
                          <p className="campo__ajuda">{enviandoAnexo ? "Enviando imagem..." : "PNG, JPG, WEBP ou GIF - ate 5MB."}</p>
                        </>
                      ) : (
                        <p className="campo__ajuda" style={{ marginTop: 0 }}>
                          Salve a questao para poder anexar uma imagem.
                        </p>
                      )}
                    </div>

                    {Number(dadosFormularioQuestao.tipoQuestao) === 4 ? (
                      <div className="campo">
                        <span className="campo__rotulo">Afirmativas</span>
                        <p className="campo__ajuda" style={{ marginTop: 0 }}>
                          Cada afirmativa e avaliada individualmente (certa ou errada), com sua propria justificativa. As alternativas abaixo combinam essas afirmativas (ex.: "I e II").
                        </p>
                        <ul className="detalhe-usuario__lista" role="list">
                          {dadosFormularioQuestao.afirmativas.map((afirmativa, index) => (
                            <li
                              className="detalhe-usuario__item"
                              key={index}
                              style={{ alignItems: "stretch", flexDirection: "column", fontWeight: 400, gap: "0.5rem" }}
                            >
                              <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                                <input
                                  aria-label={`Numero da afirmativa ${index + 1}`}
                                  className="campo__entrada"
                                  disabled={salvandoQuestao}
                                  onChange={(event) => atualizarAfirmativa(index, "numero", event.target.value)}
                                  placeholder="I"
                                  style={{ width: "4rem" }}
                                  type="text"
                                  value={afirmativa.numero}
                                />
                                <input
                                  aria-label={`Texto da afirmativa ${index + 1}`}
                                  className="campo__entrada"
                                  disabled={salvandoQuestao}
                                  onChange={(event) => atualizarAfirmativa(index, "texto", event.target.value)}
                                  placeholder="Texto da afirmativa"
                                  style={{ flex: 1 }}
                                  type="text"
                                  value={afirmativa.texto}
                                />
                                <label style={{ alignItems: "center", display: "flex", gap: "0.3rem", whiteSpace: "nowrap" }}>
                                  <input
                                    checked={afirmativa.ehCorreta}
                                    disabled={salvandoQuestao}
                                    onChange={(event) => atualizarAfirmativa(index, "ehCorreta", event.target.checked)}
                                    type="checkbox"
                                  />
                                  Correta
                                </label>
                                <Botao
                                  aria-label={`Remover afirmativa ${index + 1}`}
                                  disabled={salvandoQuestao}
                                  onClick={() => removerAfirmativa(index)}
                                  tamanho="pequeno"
                                  type="button"
                                  variante="perigo"
                                >
                                  <MdDelete aria-hidden="true" size={15} />
                                </Botao>
                              </div>
                              {!ehQuiz ? (
                                <textarea
                                  aria-label={`Justificativa da afirmativa ${index + 1}`}
                                  className="campo__entrada"
                                  disabled={salvandoQuestao}
                                  onChange={(event) => atualizarAfirmativa(index, "justificativa", event.target.value)}
                                  placeholder="Justificativa (por que a afirmativa esta certa ou errada)"
                                  value={afirmativa.justificativa}
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <Botao disabled={salvandoQuestao} onClick={adicionarAfirmativa} type="button" variante="secundario">
                          + Adicionar afirmativa
                        </Botao>
                      </div>
                    ) : null}

                    {Number(dadosFormularioQuestao.tipoQuestao) !== 3 ? (
                      <div className="campo">
                        <span className="campo__rotulo">Alternativas</span>
                        <ul className="detalhe-usuario__lista" role="list">
                          {dadosFormularioQuestao.alternativas.map((alternativa, index) => (
                            <li
                              className="detalhe-usuario__item"
                              key={alternativa.letra}
                              style={{ alignItems: "stretch", flexDirection: "column", fontWeight: 400, gap: "0.5rem" }}
                            >
                              <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
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
                                {Number(dadosFormularioQuestao.tipoQuestao) !== 2 &&
                                dadosFormularioQuestao.alternativas.length > MINIMO_ALTERNATIVAS ? (
                                  <Botao
                                    aria-label={`Remover alternativa ${alternativa.letra}`}
                                    disabled={salvandoQuestao}
                                    onClick={() => removerAlternativa(index)}
                                    tamanho="pequeno"
                                    type="button"
                                    variante="perigo"
                                  >
                                    <MdDelete aria-hidden="true" size={15} />
                                  </Botao>
                                ) : null}
                              </div>
                              {!ehQuiz ? (
                                <textarea
                                  aria-label={`Justificativa da alternativa ${alternativa.letra}`}
                                  className="campo__entrada"
                                  disabled={salvandoQuestao}
                                  onChange={(event) => atualizarJustificativaAlternativa(index, event.target.value)}
                                  placeholder="Justificativa (opcional)"
                                  value={alternativa.justificativa}
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {Number(dadosFormularioQuestao.tipoQuestao) !== 2 &&
                        dadosFormularioQuestao.alternativas.length < MAXIMO_ALTERNATIVAS ? (
                          <Botao disabled={salvandoQuestao} onClick={adicionarAlternativa} type="button" variante="secundario">
                            + Adicionar alternativa
                          </Botao>
                        ) : null}
                      </div>
                    ) : null}

                    {!ehQuiz ? (
                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-explicacao">Explicacao pos-resposta</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-explicacao" name="explicacaoPosResposta" onChange={atualizarCampoFormularioQuestao} placeholder="Opcional: comentario para correcao." value={dadosFormularioQuestao.explicacaoPosResposta} />
                      </div>
                    ) : null}

                    {!ehQuiz ? (
                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="questao-bibliografia">Referencias bibliograficas</label>
                        <textarea className="campo__entrada" disabled={salvandoQuestao} id="questao-bibliografia" name="referenciasBibliograficas" onChange={atualizarCampoFormularioQuestao} placeholder="Opcional: uma referencia por linha." value={dadosFormularioQuestao.referenciasBibliograficas} />
                      </div>
                    ) : null}

                    {mensagemQuestoes.message ? <InlineMessage tone={mensagemQuestoes.tone}>{mensagemQuestoes.message}</InlineMessage> : null}
                  </form>
                </section>
              ) : null}

              {etapaAtiva === "resumo" ? (
                <section className="criar-avaliacao__secao">
                  <h3 className="criar-avaliacao__secao-titulo">Resumo da avaliacao</h3>
                  <div className="criar-avaliacao__secao-corpo">
                    <p className="campo__ajuda" style={{ marginTop: 0 }}>
                      {questoesAvaliacao.length} questao(oes) cadastrada(s). Revise, edite, reordene ou remova antes de fechar.
                    </p>

                    <ul className="detalhe-usuario__lista" role="list">
                      {questoesAvaliacao.map((questao, indice) => (
                        <li className="detalhe-usuario__item" key={questao.id} style={{ alignItems: "center", fontWeight: 400, gap: "0.75rem" }}>
                          <span className="criar-avaliacao__step-num">{indice + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{questao.enunciado}</p>
                            <span style={{ color: "var(--cor-texto-mudo)", fontSize: "0.82rem" }}>
                              {normalizeQuestionType(questao.tipoQuestao)} - {formatDecimal(questao.pontos)} ponto(s)
                            </span>
                          </div>
                          <div style={{ display: "flex", flexShrink: 0, gap: "0.3rem" }}>
                            <Botao
                              aria-label={`Mover questao ${indice + 1} para cima`}
                              disabled={salvandoQuestao || indice === 0}
                              onClick={() => moverQuestao(indice, -1)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbChevronUp aria-hidden="true" size={15} />
                            </Botao>
                            <Botao
                              aria-label={`Mover questao ${indice + 1} para baixo`}
                              disabled={salvandoQuestao || indice === questoesAvaliacao.length - 1}
                              onClick={() => moverQuestao(indice, 1)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbChevronDown aria-hidden="true" size={15} />
                            </Botao>
                            <Botao
                              aria-label={`Editar questao ${indice + 1}`}
                              disabled={salvandoQuestao}
                              onClick={() => abrirEdicaoQuestao(questao)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbPencil aria-hidden="true" size={15} />
                            </Botao>
                            <Botao
                              aria-label={`Excluir questao ${indice + 1}`}
                              disabled={salvandoQuestao}
                              onClick={() => setQuestaoParaExcluir(questao)}
                              tamanho="pequeno"
                              type="button"
                              variante="perigo"
                            >
                              <MdDelete aria-hidden="true" size={15} />
                            </Botao>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {mensagemQuestoes.message ? <InlineMessage tone={mensagemQuestoes.tone}>{mensagemQuestoes.message}</InlineMessage> : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

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
            Deseja excluir a questao <strong>&ldquo;{questaoParaExcluir.enunciado}&rdquo;</strong>? Esta acao nao pode ser desfeita.
          </p>
        </Modal>
      ) : null}

      {anexoParaExcluir ? (
        <Modal
          onFechar={() => setAnexoParaExcluir(null)}
          titulo="Remover imagem"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={excluindoAnexo} onClick={() => setAnexoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={excluindoAnexo} onClick={confirmarExclusaoAnexo} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {excluindoAnexo ? "Removendo..." : "Confirmar remocao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja remover a imagem <strong>&ldquo;{anexoParaExcluir.anexo.titulo}&rdquo;</strong> desta questao? Esta acao nao pode ser desfeita.
          </p>
        </Modal>
      ) : null}
    </>
  );
}
