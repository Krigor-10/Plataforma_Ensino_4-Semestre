import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbArchive,
  TbCheck,
  TbChevronRight,
  TbExternalLink,
  TbEye,
  TbFile,
  TbFileText,
  TbPhoto,
  TbPlayerPlay,
  TbPlus,
  TbTrophy,
  TbX
} from "react-icons/tb";
import { MdSave } from "react-icons/md";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import MenuAcoes from "../../components/MenuAcoes.jsx";
import Modal from "../../components/Modal.jsx";
import ModaisModulo from "../../components/ModaisModulo.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import PreviaTrilhaAluno from "../../components/PreviaTrilhaAluno.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useModaisModulo } from "../../hooks/useModaisModulo.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { normalizeContentType } from "../../lib/format.js";
import {
  montarPayloadAvaliacao,
  montarPayloadConteudo,
  STATUS_ARQUIVADO,
  STATUS_PUBLICADO,
  STATUS_RASCUNHO
} from "../../lib/trilhaConteudos.js";
import { AssistenteGeracaoIA } from "./AssistenteGeracaoIA.jsx";
import { AssistenteQuizAvaliacao } from "./AssistenteQuizAvaliacao.jsx";
import TelaModuloGestaoProfessor from "./TelaModuloGestaoProfessor.jsx";

const OPCOES_TIPO_CONTEUDO = [
  { value: "1", label: "Texto" },
  { value: "2", label: "PDF" },
  { value: "3", label: "Vídeo" },
  { value: "4", label: "Link externo" },
  { value: "5", label: "Imagem" }
];

const OPCOES_STATUS_PUBLICACAO = [
  { value: "1", label: "Rascunho" },
  { value: "2", label: "Publicado" },
  { value: "3", label: "Arquivado" }
];

const ICONE_TIPO_CONTEUDO = {
  1: <TbFileText aria-hidden="true" size={22} />,
  2: <TbFile aria-hidden="true" size={22} />,
  3: <TbPlayerPlay aria-hidden="true" size={22} />,
  4: <TbExternalLink aria-hidden="true" size={22} />,
  5: <TbPhoto aria-hidden="true" size={22} />
};

const ICONE_TIPO_CONTEUDO_GRANDE = {
  1: <TbFileText aria-hidden="true" size={32} />,
  2: <TbFile aria-hidden="true" size={32} />,
  3: <TbPlayerPlay aria-hidden="true" size={32} />,
  4: <TbExternalLink aria-hidden="true" size={32} />,
  5: <TbPhoto aria-hidden="true" size={32} />
};

const ICONE_TIPO_CONTEUDO_LINHA = {
  1: <TbFileText aria-hidden="true" size="1.75rem" />,
  2: <TbFile aria-hidden="true" size="1.75rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.75rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.75rem" />,
  5: <TbPhoto aria-hidden="true" size="1.75rem" />
};

const ACEITA_ARQUIVO_POR_TIPO = {
  2: ".pdf,application/pdf",
  3: ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime",
  5: ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
};

const MODELO_GRATUITO = 1;
const MODELO_ACOMPANHADO = 3;

/* Trilha de Conteudos do professor: mesmo padrao Card do curso -> Modulos -> Conteudos
   usado na experiencia do aluno (SlideConteudosCurso em SecoesAluno.jsx), reaproveitando
   as classes CSS atividades-curso__* e conteudos-modulo__*, so trocando as acoes de
   "Concluir" por gerenciamento (editar, publicar/despublicar, excluir, reordenar). */
export function SecaoConteudosProfessor({
  avaliacoes = [],
  conteudos,
  cursoIdSelecionado = null,
  cursos,
  moduloIdSelecionado = null,
  modulos,
  onNavigate,
  onRefresh,
  onSessionExpired
}) {
  const { mostrarToast } = useToast();
  const [dadosFormulario, setDadosFormulario] = useState(() => criarEstadoInicialFormulario());
  const [conteudoEmEdicaoId, setConteudoEmEdicaoId] = useState(null);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [conteudoParaExcluir, setConteudoParaExcluir] = useState(null);
  const [mensagemExclusao, setMensagemExclusao] = useState("");
  const [quizParaExcluir, setQuizParaExcluir] = useState(null);
  const [mensagemExclusaoQuiz, setMensagemExclusaoQuiz] = useState("");
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [nomeArquivoSelecionado, setNomeArquivoSelecionado] = useState("");
  const [assistenteQuizAberto, setAssistenteQuizAberto] = useState(false);
  const [avaliacaoQuizParaEditar, setAvaliacaoQuizParaEditar] = useState(null);
  const [contextoNovoQuiz, setContextoNovoQuiz] = useState(null);
  const [moduloParaQuizComIa, setModuloParaQuizComIa] = useState(null);

  const modulosDoProfessor = useMemo(
    () => [...modulos].sort((left, right) => new Date(left.dataCriacao || 0).getTime() - new Date(right.dataCriacao || 0).getTime()),
    [modulos]
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

  /* "Meus cursos" vem direto do prop cursos (GET /Cursos/meus, escopado pelo
     vinculo ProfessorCurso) - nao depende mais de Turma, que podia deixar o
     professor sem ver o curso aqui quando vinculado so pela tela "Professores
     por curso" (ver pendencia_fase_b_remocao_turma na memoria). A contagem de
     "publicado" soma materiais + quizzes (nao so materiais) e ignora arquivados
     no denominador - mesma regra usada no topo/cabecalho da trilha
     (TrilhaConteudosProfessor), pra nao mostrar numero diferente em cada tela. */
  const cursosDoProfessor = useMemo(() => {
    return [...cursos]
      .map((curso) => {
        const conteudosDoCurso = conteudos.filter((conteudo) => conteudo.cursoId === curso.id);
        const quizzesDoCurso = avaliacoes.filter(
          (avaliacao) => avaliacao.cursoId === curso.id && Number(avaliacao.tipoAvaliacao) === 1
        );
        const itensNaoArquivados = [...conteudosDoCurso, ...quizzesDoCurso].filter(
          (item) => Number(item.statusPublicacao) !== STATUS_ARQUIVADO
        );
        const totalPublicados = itensNaoArquivados.filter((item) => Number(item.statusPublicacao) === STATUS_PUBLICADO).length;

        return {
          curso,
          totalModulos: (modulosPorCursoId.get(curso.id) || []).length,
          totalConteudos: conteudosDoCurso.length,
          totalItensNaoArquivados: itensNaoArquivados.length,
          totalPublicados
        };
      })
      .sort((left, right) => left.curso.titulo.localeCompare(right.curso.titulo, "pt-BR"));
  }, [avaliacoes, conteudos, cursos, modulosPorCursoId]);

  const cursoAtivo = useMemo(
    () => (cursoIdSelecionado ? cursosDoProfessor.find((entrada) => entrada.curso.id === cursoIdSelecionado) || null : null),
    [cursoIdSelecionado, cursosDoProfessor]
  );

  const modulosDisponiveis = useMemo(
    () => (cursoAtivo ? modulosPorCursoId.get(cursoAtivo.curso.id) || [] : []),
    [cursoAtivo, modulosPorCursoId]
  );

  // "Visualizar como aluno" (PreviaTrilhaAluno) subiu pra ca (docs/
  // TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item
  // 1) pra ficar disponivel tanto na lista de modulos (ListaModulosProfessor)
  // quanto dentro de um modulo so (TelaModuloGestaoProfessor, botao novo no
  // topo) - um unico estado/instancia, em vez de cada tela ter a sua.
  // ListaModulosProfessor continua com seu proprio quizPorConteudoId/
  // quizzesPorModuloId/conteudosPorModuloId (usados ali tambem pras contagens
  // dos cartoes de modulo) - os mapas abaixo sao so pra esta previa.
  const [previaAberta, setPreviaAberta] = useState(false);

  const conteudosDoCursoAtivo = useMemo(
    () => (cursoAtivo ? conteudos.filter((conteudo) => conteudo.cursoId === cursoAtivo.curso.id) : []),
    [conteudos, cursoAtivo]
  );
  const quizzesDoCursoAtivo = useMemo(
    () => (cursoAtivo ? avaliacoes.filter((avaliacao) => avaliacao.cursoId === cursoAtivo.curso.id && Number(avaliacao.tipoAvaliacao) === 1) : []),
    [avaliacoes, cursoAtivo]
  );
  const quizPorConteudoIdPrevia = useMemo(() => {
    const mapa = new Map();
    quizzesDoCursoAtivo.forEach((quiz) => {
      if (quiz.conteudoDidaticoId) {
        mapa.set(quiz.conteudoDidaticoId, quiz);
      }
    });
    return mapa;
  }, [quizzesDoCursoAtivo]);
  const quizzesPorModuloIdPrevia = useMemo(() => {
    const agrupados = new Map();
    quizzesDoCursoAtivo.forEach((quiz) => {
      if (quiz.conteudoDidaticoId || !quiz.moduloId) {
        return;
      }
      const atuais = agrupados.get(quiz.moduloId) || [];
      atuais.push(quiz);
      agrupados.set(quiz.moduloId, atuais);
    });
    return agrupados;
  }, [quizzesDoCursoAtivo]);
  const conteudosPorModuloIdPrevia = useMemo(() => {
    const agrupados = new Map();
    conteudosDoCursoAtivo.forEach((conteudo) => {
      const atuais = agrupados.get(conteudo.moduloId) || [];
      atuais.push(conteudo);
      agrupados.set(conteudo.moduloId, atuais);
    });
    agrupados.forEach((lista) =>
      lista.sort((left, right) => (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0) || (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"))
    );
    return agrupados;
  }, [conteudosDoCursoAtivo]);

  // Tela do modulo do professor (docs/TelaConteudosProfessor/PROMPT-agente-
  // fluxo-professor-igual-coordenador.md, etapas 2/3): mesmo padrao de
  // PainelCursoGestao/TelaModuloGestao (Coordenador/Admin) - moduloIdSelecionado
  // troca a lista de modulos (ListaModulosProfessor) pela tela de um modulo so
  // (TelaModuloGestaoProfessor). Um moduloId que nao pertence a este curso (ou
  // nao existe mais) volta pra lista.
  const moduloAtivo = useMemo(
    () => (moduloIdSelecionado ? modulosDisponiveis.find((modulo) => modulo.id === moduloIdSelecionado) || null : null),
    [moduloIdSelecionado, modulosDisponiveis]
  );

  useEffect(() => {
    if (!cursoAtivo || !moduloIdSelecionado || moduloAtivo) {
      return;
    }

    onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}`, { replace: true });
  }, [cursoAtivo, moduloAtivo, moduloIdSelecionado, onNavigate]);

  // Mesma regra do backend (Curso.AceitaEdicao/GarantirCursoAbertoParaEdicaoAsync),
  // compartilhada pela lista de modulos e pela tela do modulo - ver
  // ListaModulosProfessor (comentario original) pra detalhes da regra.
  const modeloCursoAtivo = cursoAtivo ? Number(cursoAtivo.curso.modeloCurso) : null;
  const cursoAceitaConclusao = modeloCursoAtivo === MODELO_GRATUITO || modeloCursoAtivo === MODELO_ACOMPANHADO;
  const cursoJaConcluido = Boolean(cursoAtivo?.curso.concluidoPeloProfessorEm);
  const cursoEncerrado = Boolean(cursoAtivo?.curso.encerradoEm);
  const edicaoTravada = cursoEncerrado || (cursoAceitaConclusao && cursoJaConcluido);

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/conteudos/${cursoId}`);
  }

  function voltarParaCursos() {
    onNavigate?.("/app/conteudos");
  }

  const tipoConteudoSelecionado = Number(dadosFormulario.tipoConteudo || OPCOES_TIPO_CONTEUDO[0].value);
  const exigeTexto = tipoConteudoSelecionado === 1;
  const exigeUpload = tipoConteudoSelecionado === 2 || tipoConteudoSelecionado === 3 || tipoConteudoSelecionado === 5;
  const exigeUrlRecurso = tipoConteudoSelecionado === 4;

  function limparFormulario() {
    setConteudoEmEdicaoId(null);
    setDadosFormulario(criarEstadoInicialFormulario());
    setMensagemFormulario({ tone: "", message: "" });
    setNomeArquivoSelecionado("");
  }

  function abrirFormularioNovoConteudo(moduloIdAlvo) {
    if (!cursoAtivo) {
      return;
    }

    const conteudosDoModuloAlvo = conteudos.filter((conteudo) => conteudo.moduloId === moduloIdAlvo);

    setConteudoEmEdicaoId(null);
    setDadosFormulario({
      ...criarEstadoInicialFormulario(),
      moduloId: String(moduloIdAlvo),
      ordemExibicao: String(conteudosDoModuloAlvo.length)
    });
    setMensagemFormulario({ tone: "", message: "" });
    setNomeArquivoSelecionado("");
    setFormularioAberto(true);
  }

  function abrirExclusaoConteudo(conteudo) {
    setConteudoParaExcluir(conteudo);
    setMensagemExclusao("");
  }

  function abrirExclusaoQuiz(quiz) {
    setQuizParaExcluir(quiz);
    setMensagemExclusaoQuiz("");
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    limparFormulario();
    setFormularioAberto(false);
  }

  function atualizarCampoFormulario(event) {
    const { name, value } = event.target;
    setDadosFormulario((current) => ({ ...current, [name]: value }));
  }

  function abrirEdicaoConteudo(conteudo) {
    setConteudoEmEdicaoId(conteudo.id);
    setDadosFormulario({
      moduloId: String(conteudo.moduloId),
      titulo: conteudo.titulo || "",
      descricao: conteudo.descricao || "",
      tipoConteudo: String(conteudo.tipoConteudo || 1),
      corpoTexto: conteudo.corpoTexto || "",
      arquivoUrl: conteudo.arquivoUrl || "",
      linkUrl: conteudo.linkUrl || "",
      statusPublicacao: String(conteudo.statusPublicacao || 1),
      ordemExibicao: String(conteudo.ordemExibicao ?? 0),
      pesoProgresso: String(conteudo.pesoProgresso ?? 1)
    });
    setMensagemFormulario({ tone: "", message: "" });
    setNomeArquivoSelecionado(conteudo.arquivoUrl ? nomeArquivoDaUrl(conteudo.arquivoUrl) : "");
    setFormularioAberto(true);
  }

  async function enviarArquivoConteudo(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("tipoConteudo", String(tipoConteudoSelecionado));

    setEnviandoArquivo(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      const resposta = await apiRequest("/ConteudosDidaticos/arquivo", { method: "POST", body: formData });
      setDadosFormulario((current) => ({ ...current, arquivoUrl: resposta.arquivoUrl }));
      setNomeArquivoSelecionado(arquivo.name);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Não foi possível enviar o arquivo agora." });
    } finally {
      setEnviandoArquivo(false);
      event.target.value = "";
    }
  }

  async function salvarConteudoDidatico(event) {
    event.preventDefault();

    const tituloNormalizado = dadosFormulario.titulo.trim();
    const dadosEnvio = {
      titulo: tituloNormalizado,
      descricao: dadosFormulario.descricao.trim(),
      tipoConteudo: Number(dadosFormulario.tipoConteudo),
      corpoTexto: exigeTexto ? dadosFormulario.corpoTexto.trim() : "",
      arquivoUrl: exigeUpload ? dadosFormulario.arquivoUrl.trim() : "",
      linkUrl: exigeUrlRecurso ? dadosFormulario.linkUrl.trim() : "",
      moduloId: Number(dadosFormulario.moduloId),
      statusPublicacao: Number(dadosFormulario.statusPublicacao),
      ordemExibicao: Number(dadosFormulario.ordemExibicao),
      pesoProgresso: Number(dadosFormulario.pesoProgresso)
    };

    if (!tituloNormalizado) {
      setMensagemFormulario({ tone: "error", message: "Informe o título do conteúdo antes de salvar." });
      return;
    }

    if (!dadosEnvio.moduloId) {
      setMensagemFormulario({ tone: "error", message: "Não foi possível identificar o módulo deste conteúdo." });
      return;
    }

    if (!Number.isInteger(dadosEnvio.ordemExibicao) || dadosEnvio.ordemExibicao < 0) {
      setMensagemFormulario({ tone: "error", message: "Use um número inteiro igual ou maior que zero para a ordem." });
      return;
    }

    if (!Number.isFinite(dadosEnvio.pesoProgresso) || dadosEnvio.pesoProgresso <= 0) {
      setMensagemFormulario({ tone: "error", message: "Informe um peso de progresso maior que zero." });
      return;
    }

    if (exigeTexto && !dadosEnvio.corpoTexto) {
      setMensagemFormulario({ tone: "error", message: "Preencha o texto principal do conteúdo." });
      return;
    }

    if (exigeUpload && !dadosEnvio.arquivoUrl) {
      setMensagemFormulario({ tone: "error", message: "Envie um arquivo antes de publicar." });
      return;
    }

    if (enviandoArquivo) {
      setMensagemFormulario({ tone: "error", message: "Aguarde o envio do arquivo terminar." });
      return;
    }

    if (exigeUrlRecurso && !dadosEnvio.linkUrl) {
      setMensagemFormulario({ tone: "error", message: "Informe a URL do recurso antes de publicar." });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      if (conteudoEmEdicaoId) {
        await apiRequest(`/ConteudosDidaticos/${conteudoEmEdicaoId}`, { method: "PUT", body: JSON.stringify(dadosEnvio) });
      } else {
        await apiRequest("/ConteudosDidaticos", { method: "POST", body: JSON.stringify(dadosEnvio) });
      }

      mostrarToast(conteudoEmEdicaoId ? "Conteúdo atualizado com sucesso." : "Conteúdo criado com sucesso.", "sucesso");
      limparFormulario();
      setFormularioAberto(false);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Não foi possível salvar o conteúdo agora." });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!conteudoParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusao("");

    try {
      const resultado = await apiRequest(`/ConteudosDidaticos/${conteudoParaExcluir.id}`, { method: "DELETE" });

      if (conteudoEmEdicaoId === conteudoParaExcluir.id) {
        limparFormulario();
      }

      setConteudoParaExcluir(null);
      if (resultado?.arquivado) {
        mostrarToast(
          "Este conteúdo já tem progresso registrado por aluno, por isso foi arquivado em vez de excluído definitivamente. Veja em \"Ver arquivados\" se quiser restaurar.",
          "sucesso",
          7000
        );
      } else {
        mostrarToast("Conteúdo excluído com sucesso.", "sucesso");
      }
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemExclusao(err.message || "Não foi possível excluir o conteúdo agora.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoQuiz() {
    if (!quizParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusaoQuiz("");

    try {
      const resultado = await apiRequest(`/Avaliacoes/${quizParaExcluir.id}`, { method: "DELETE" });

      setQuizParaExcluir(null);
      if (resultado?.arquivado) {
        mostrarToast(
          "Este quiz já tem tentativa de aluno registrada, por isso foi arquivado em vez de excluído definitivamente. Veja em \"Ver arquivados\" se quiser restaurar.",
          "sucesso",
          7000
        );
      } else {
        mostrarToast("Quiz excluído com sucesso.", "sucesso");
      }
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemExclusaoQuiz(err.message || "Não foi possível excluir o quiz agora.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPublicacao(conteudo) {
    const proximoStatus = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO ? STATUS_RASCUNHO : STATUS_PUBLICADO;

    setAcaoEmAndamentoId(conteudo.id);

    try {
      await apiRequest(`/ConteudosDidaticos/${conteudo.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadConteudo(conteudo, { statusPublicacao: proximoStatus }))
      });
      mostrarToast(
        proximoStatus === STATUS_PUBLICADO ? "Conteúdo publicado com sucesso." : "Conteúdo despublicado com sucesso.",
        "sucesso"
      );
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível atualizar o status agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  // Distinto de alternarPublicacao: usado so quando o material esta Arquivado e o
  // professor pede "Restaurar como rascunho" - forca Rascunho explicitamente, em vez
  // de alternar a partir do status atual (alternar levaria Arquivado -> Publicado).
  async function restaurarConteudoParaRascunho(conteudo) {
    setAcaoEmAndamentoId(conteudo.id);

    try {
      await apiRequest(`/ConteudosDidaticos/${conteudo.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadConteudo(conteudo, { statusPublicacao: STATUS_RASCUNHO }))
      });
      mostrarToast("Conteúdo restaurado como rascunho.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível restaurar o conteúdo agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function alternarPublicacaoQuiz(quiz) {
    const proximoStatus = Number(quiz.statusPublicacao) === STATUS_PUBLICADO ? STATUS_RASCUNHO : STATUS_PUBLICADO;

    setAcaoEmAndamentoId(quiz.id);

    try {
      await apiRequest(`/Avaliacoes/${quiz.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAvaliacao(quiz, { statusPublicacao: proximoStatus }))
      });
      mostrarToast(proximoStatus === STATUS_PUBLICADO ? "Quiz publicado com sucesso." : "Quiz voltou para rascunho.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível atualizar o status do quiz agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function restaurarQuizParaRascunho(quiz) {
    setAcaoEmAndamentoId(quiz.id);

    try {
      await apiRequest(`/Avaliacoes/${quiz.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAvaliacao(quiz, { statusPublicacao: STATUS_RASCUNHO }))
      });
      mostrarToast("Quiz restaurado como rascunho.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível restaurar o quiz agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function arquivarQuiz(quiz) {
    setAcaoEmAndamentoId(quiz.id);

    try {
      await apiRequest(`/Avaliacoes/${quiz.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAvaliacao(quiz, { statusPublicacao: STATUS_ARQUIVADO }))
      });
      mostrarToast("Quiz arquivado com sucesso.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível arquivar o quiz agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function reordenarConteudo(conteudo, listaDoModulo, direcao) {
    const indiceAtual = listaDoModulo.findIndex((item) => item.id === conteudo.id);
    const indiceAlvo = indiceAtual + direcao;

    if (indiceAtual === -1 || indiceAlvo < 0 || indiceAlvo >= listaDoModulo.length) {
      return;
    }

    const vizinho = listaDoModulo[indiceAlvo];

    setAcaoEmAndamentoId(conteudo.id);

    try {
      await apiRequest(`/ConteudosDidaticos/${conteudo.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadConteudo(conteudo, { ordemExibicao: vizinho.ordemExibicao }))
      });
      await apiRequest(`/ConteudosDidaticos/${vizinho.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadConteudo(vizinho, { ordemExibicao: conteudo.ordemExibicao }))
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      mostrarToast(err.message || "Não foi possível reordenar o conteúdo agora.", "erro", 6000);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  function gerenciarQuizModulo(modulo, quizExistente = null) {
    if (!cursoAtivo) {
      return;
    }

    if (quizExistente) {
      setAvaliacaoQuizParaEditar(quizExistente);
      setContextoNovoQuiz(null);
    } else {
      setAvaliacaoQuizParaEditar(null);
      setContextoNovoQuiz({ moduloId: modulo.id });
    }

    setAssistenteQuizAberto(true);
  }

  function fecharAssistenteQuiz() {
    setAssistenteQuizAberto(false);
    setAvaliacaoQuizParaEditar(null);
    setContextoNovoQuiz(null);
  }

  function abrirGeracaoQuizComIa(modulo) {
    if (!cursoAtivo) {
      return;
    }

    setModuloParaQuizComIa(modulo);
  }

  function fecharGeracaoQuizComIa() {
    setModuloParaQuizComIa(null);
  }

  const conteudosDoModuloParaIa = useMemo(
    () => (moduloParaQuizComIa ? conteudos.filter((conteudo) => conteudo.moduloId === moduloParaQuizComIa.id) : []),
    [conteudos, moduloParaQuizComIa]
  );

  return (
    <div className="tela-conteudos">
      {!cursoAtivo ? (
        <GradeCursosProfessor
          cursos={cursosDoProfessor.map(({ curso, totalConteudos, totalModulos, totalPublicados }) => ({
            curso,
            resumo: `${totalModulos} módulo${totalModulos === 1 ? "" : "s"} · ${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"}`,
            rodapeEsquerda: `${totalPublicados} publicado${totalPublicados === 1 ? "" : "s"}`
          }))}
          mensagemVazia="Você ainda não está vinculado a nenhum curso."
          onSelecionar={abrirCurso}
        />
      ) : moduloAtivo ? (
        <TelaModuloGestaoProfessor
          acaoEmAndamentoId={acaoEmAndamentoId}
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoAtivo={cursoAtivo}
          edicaoTravada={edicaoTravada}
          moduloId={moduloAtivo.id}
          modulosOrdenados={modulosDisponiveis}
          onAbrirEdicao={abrirEdicaoConteudo}
          onAlternarPublicacao={alternarPublicacao}
          onAlternarPublicacaoQuiz={alternarPublicacaoQuiz}
          onArquivarQuiz={arquivarQuiz}
          onExcluir={abrirExclusaoConteudo}
          onExcluirQuiz={abrirExclusaoQuiz}
          onGerarQuizComIaModulo={abrirGeracaoQuizComIa}
          onGerenciarQuizModulo={gerenciarQuizModulo}
          onNavigate={onNavigate}
          onNovoConteudo={abrirFormularioNovoConteudo}
          onReordenar={reordenarConteudo}
          onSessionExpired={onSessionExpired}
          onVisualizarComoAluno={() => setPreviaAberta(true)}
        />
      ) : (
        <ListaModulosProfessor
          acaoEmAndamentoId={acaoEmAndamentoId}
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoAceitaConclusao={cursoAceitaConclusao}
          cursoAtivo={cursoAtivo}
          cursoEncerrado={cursoEncerrado}
          cursoJaConcluido={cursoJaConcluido}
          edicaoTravada={edicaoTravada}
          modulosDoCurso={modulosDisponiveis}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
          onRestaurarRascunho={restaurarConteudoParaRascunho}
          onRestaurarRascunhoQuiz={restaurarQuizParaRascunho}
          onSessionExpired={onSessionExpired}
          onVisualizarComoAluno={() => setPreviaAberta(true)}
          onVoltar={onNavigate ? voltarParaCursos : null}
        />
      )}

      {previaAberta && cursoAtivo ? (
        <PreviaTrilhaAluno
          conteudosPorModuloId={conteudosPorModuloIdPrevia}
          cursoTitulo={cursoAtivo.curso.titulo}
          modulosDoCurso={modulosDisponiveis}
          onFechar={() => setPreviaAberta(false)}
          quizPorConteudoId={quizPorConteudoIdPrevia}
          quizzesPorModuloId={quizzesPorModuloIdPrevia}
        />
      ) : null}

      {assistenteQuizAberto ? (
        <AssistenteQuizAvaliacao
          avaliacaoParaEditar={avaliacaoQuizParaEditar}
          conteudos={conteudos}
          contextoNovoQuiz={contextoNovoQuiz}
          cursoAtivo={cursoAtivo}
          modoExclusivoQuiz
          modulosDisponiveis={modulosDisponiveis}
          onFechar={fecharAssistenteQuiz}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

      {moduloParaQuizComIa && cursoAtivo ? (
        <AssistenteGeracaoIA
          conteudosDisponiveis={conteudosDoModuloParaIa}
          cursoAtivo={cursoAtivo}
          modoExclusivoQuiz
          moduloContexto={moduloParaQuizComIa}
          onFechar={fecharGeracaoQuizComIa}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

      {conteudoParaExcluir ? (
        <Modal
          onFechar={() => setConteudoParaExcluir(null)}
          titulo="Excluir conteúdo"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setConteudoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusão"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir o conteúdo <strong>{conteudoParaExcluir.titulo}</strong>? Esta ação não pode ser desfeita.
          </p>
          {mensagemExclusao ? <InlineMessage tone="error">{mensagemExclusao}</InlineMessage> : null}
        </Modal>
      ) : null}

      {quizParaExcluir ? (
        <Modal
          onFechar={() => setQuizParaExcluir(null)}
          titulo="Excluir quiz"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setQuizParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusaoQuiz} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusão"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir o quiz <strong>{quizParaExcluir.titulo}</strong>? Esta ação não pode ser desfeita.
          </p>
          {mensagemExclusaoQuiz ? <InlineMessage tone="error">{mensagemExclusaoQuiz}</InlineMessage> : null}
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={fecharFormulario}
          titulo={conteudoEmEdicaoId ? "Editar conteúdo" : "Novo conteúdo"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando || enviandoArquivo} form="form-conteudo" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : conteudoEmEdicaoId ? "Salvar alterações" : "Criar conteúdo"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-conteudo" onSubmit={salvarConteudoDidatico}>
            {cursoAtivo ? (
              <p className="campo__ajuda" style={{ marginTop: 0 }}>
                Curso: <strong>{cursoAtivo.curso.titulo}</strong>
              </p>
            ) : null}

            <div className="campo">
              <label className="campo__rotulo" htmlFor="conteudo-modulo">Módulo *</label>
              <select
                className="campo__entrada"
                disabled={salvando}
                id="conteudo-modulo"
                name="moduloId"
                onChange={atualizarCampoFormulario}
                value={dadosFormulario.moduloId}
              >
                {modulosDisponiveis.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="novo-cont__preview">
              <AnimatePresence mode="wait">
                <motion.span
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className="novo-cont__icone"
                  exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                  initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                  key={dadosFormulario.tipoConteudo}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {ICONE_TIPO_CONTEUDO_GRANDE[Number(dadosFormulario.tipoConteudo)] || <TbFileText aria-hidden="true" size={32} />}
                </motion.span>
              </AnimatePresence>
              <p className="novo-cont__preview-label">
                {OPCOES_TIPO_CONTEUDO.find((opcao) => opcao.value === dadosFormulario.tipoConteudo)?.label || "Tipo"}
              </p>
            </div>

            <div className="campo">
              <span className="campo__rotulo">Tipo de conteúdo *</span>
              <div aria-label="Tipo de conteúdo" className="anexo-selector" role="group">
                {OPCOES_TIPO_CONTEUDO.map((opcao) => {
                  const ativo = dadosFormulario.tipoConteudo === opcao.value;
                  return (
                    <button
                      aria-pressed={ativo}
                      className={`anexo-clip${ativo ? " anexo-clip--ativo" : ""}`}
                      disabled={salvando}
                      key={opcao.value}
                      onClick={() => setDadosFormulario((current) => ({ ...current, tipoConteudo: opcao.value }))}
                      type="button"
                    >
                      <span className="anexo-clip__icone">{ICONE_TIPO_CONTEUDO[Number(opcao.value)]}</span>
                      <span className="anexo-clip__label">{opcao.label}</span>
                      {ativo ? <span aria-hidden="true" className="anexo-clip__check">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="conteudo-status">Status *</label>
              <select className="campo__entrada" disabled={salvando} id="conteudo-status" name="statusPublicacao" onChange={atualizarCampoFormulario} value={dadosFormulario.statusPublicacao}>
                {OPCOES_STATUS_PUBLICACAO.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="conteudo-titulo">Título *</label>
              <input
                className="campo__entrada"
                disabled={salvando}
                id="conteudo-titulo"
                maxLength={180}
                name="titulo"
                onChange={atualizarCampoFormulario}
                placeholder="Ex.: Aula 01 - Panorama do módulo"
                type="text"
                value={dadosFormulario.titulo}
              />
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="conteudo-descricao">Descrição curta</label>
              <textarea
                className="campo__entrada"
                disabled={salvando}
                id="conteudo-descricao"
                maxLength={500}
                name="descricao"
                onChange={atualizarCampoFormulario}
                placeholder="Explique rapidamente o objetivo desse material."
                value={dadosFormulario.descricao}
              />
            </div>

            {exigeTexto ? (
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-corpo">Corpo do texto *</label>
                <textarea
                  className="campo__entrada"
                  disabled={salvando}
                  id="conteudo-corpo"
                  name="corpoTexto"
                  onChange={atualizarCampoFormulario}
                  placeholder="Escreva aqui o material principal."
                  value={dadosFormulario.corpoTexto}
                />
              </div>
            ) : null}

            {exigeUpload ? (
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-arquivo">
                  {tipoConteudoSelecionado === 5 ? "Imagem *" : tipoConteudoSelecionado === 3 ? "Arquivo de vídeo *" : "Arquivo PDF *"}
                </label>
                <input
                  accept={ACEITA_ARQUIVO_POR_TIPO[tipoConteudoSelecionado]}
                  className="campo__entrada"
                  disabled={salvando || enviandoArquivo}
                  id="conteudo-arquivo"
                  onChange={enviarArquivoConteudo}
                  type="file"
                />
                {tipoConteudoSelecionado === 3 ? (
                  <p className="campo__ajuda">Use MP4 (H.264) para tocar em todos os navegadores e celulares.</p>
                ) : null}
                {enviandoArquivo ? (
                  <p className="campo__ajuda">Enviando arquivo...</p>
                ) : dadosFormulario.arquivoUrl ? (
                  <p className="campo__ajuda">
                    Arquivo atual: {nomeArquivoSelecionado || nomeArquivoDaUrl(dadosFormulario.arquivoUrl)}
                    {tipoConteudoSelecionado === 5 ? (
                      <img alt="" className="novo-cont__miniatura" src={resolverUrlArquivo(dadosFormulario.arquivoUrl)} />
                    ) : null}
                  </p>
                ) : null}
              </div>
            ) : null}

            {exigeUrlRecurso ? (
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-link">URL do recurso *</label>
                <input
                  className="campo__entrada"
                  disabled={salvando}
                  id="conteudo-link"
                  name="linkUrl"
                  onChange={atualizarCampoFormulario}
                  placeholder="https://..."
                  type="url"
                  value={dadosFormulario.linkUrl}
                />
              </div>
            ) : null}

            <div className="formulario-perfil__grade">
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-ordem">Ordem de exibição</label>
                <input
                  className="campo__entrada"
                  disabled={salvando}
                  id="conteudo-ordem"
                  min="0"
                  name="ordemExibicao"
                  onChange={atualizarCampoFormulario}
                  type="number"
                  value={dadosFormulario.ordemExibicao}
                />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-peso">Peso de progresso</label>
                <input
                  className="campo__entrada"
                  disabled={salvando}
                  id="conteudo-peso"
                  min="0.01"
                  name="pesoProgresso"
                  onChange={atualizarCampoFormulario}
                  step="0.01"
                  type="number"
                  value={dadosFormulario.pesoProgresso}
                />
              </div>
            </div>

            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

/* Lista de modulos do professor (um cartao por modulo, igual ao visual de
   PainelCursoGestao - docs/TelaConteudosProfessor/PROMPT-agente-fluxo-
   professor-igual-coordenador.md, etapa 3). Ja foi uma trilha em acordeao com
   todos os modulos abertos na mesma pagina (nome antigo TrilhaConteudosProfessor);
   clicar num cartao agora navega pra TelaModuloGestaoProfessor (etapa 2), que
   tem a lista de conteudos/quizzes desse modulo + a previa "como o aluno ve". */
function ListaModulosProfessor({
  acaoEmAndamentoId,
  avaliacoes,
  conteudos,
  cursoAceitaConclusao,
  cursoAtivo,
  cursoEncerrado,
  cursoJaConcluido,
  edicaoTravada,
  modulosDoCurso,
  onNavigate,
  onRefresh,
  onRestaurarRascunho,
  onRestaurarRascunhoQuiz,
  onSessionExpired,
  onVisualizarComoAluno,
  onVoltar
}) {
  const { mostrarToast } = useToast();
  const [modalArquivadosAberto, setModalArquivadosAberto] = useState(false);
  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false);
  const [concluindoCurso, setConcluindoCurso] = useState(false);
  const [mensagemConclusao, setMensagemConclusao] = useState("");
  // "Novo modulo" (rodada 2 "tela do curso do Coordenador", item 6): criar
  // modulo passou do Coordenador pro Professor - mesmo hook/modal
  // compartilhado com PainelCursoGestao.jsx (Admin/Coordenador).
  const modaisModulo = useModaisModulo({
    cursoFixoId: cursoAtivo.curso.id,
    mostrarToast,
    onSalvo: onRefresh,
    onSessionExpired
  });

  async function confirmarConclusaoCurso() {
    setConcluindoCurso(true);
    setMensagemConclusao("");

    try {
      await apiRequest(`/Cursos/${cursoAtivo.curso.id}/concluir`, { method: "POST" });
      setConfirmandoConclusao(false);
      mostrarToast("Curso marcado como concluído. O coordenador foi notificado.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemConclusao(err.message || "Não foi possível concluir o curso agora.");
    } finally {
      setConcluindoCurso(false);
    }
  }

  const conteudosDoCurso = useMemo(
    () => conteudos.filter((conteudo) => conteudo.cursoId === cursoAtivo.curso.id),
    [conteudos, cursoAtivo.curso.id]
  );

  const quizzesDoCurso = useMemo(
    () => avaliacoes.filter((avaliacao) => avaliacao.cursoId === cursoAtivo.curso.id && Number(avaliacao.tipoAvaliacao) === 1),
    [avaliacoes, cursoAtivo.curso.id]
  );

  // Todos os quizzes do modulo (vinculados a um material ou soltos), pra
  // listar como item editavel na trilha do professor — diferente de
  // quizzesPorModuloId acima, que so pega os "soltos" (usado na previa do aluno).
  const quizzesPorModuloIdCompleto = useMemo(() => {
    const agrupados = new Map();
    quizzesDoCurso.forEach((quiz) => {
      if (!quiz.moduloId) {
        return;
      }
      const atuais = agrupados.get(quiz.moduloId) || [];
      atuais.push(quiz);
      agrupados.set(quiz.moduloId, atuais);
    });
    return agrupados;
  }, [quizzesDoCurso]);

  const conteudosPorModuloId = useMemo(() => {
    const agrupados = new Map();
    conteudosDoCurso.forEach((conteudo) => {
      const atuais = agrupados.get(conteudo.moduloId) || [];
      atuais.push(conteudo);
      agrupados.set(conteudo.moduloId, atuais);
    });
    agrupados.forEach((lista) =>
      lista.sort((left, right) => (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0) || (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"))
    );
    return agrupados;
  }, [conteudosDoCurso]);

  // Painel central "Ver arquivados" (pendencia 05/11): substitui o toggle por modulo
  // por uma unica lista do curso inteiro, agrupada por modulo pra dar contexto.
  const itensArquivadosPorModulo = useMemo(() => {
    return modulosDoCurso
      .map((modulo) => {
        const materiaisArquivados = (conteudosPorModuloId.get(modulo.id) || [])
          .filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_ARQUIVADO)
          .map((conteudo) => ({ tipo: "material", id: conteudo.id, titulo: conteudo.titulo, dado: conteudo }));
        const quizzesArquivados = (quizzesPorModuloIdCompleto.get(modulo.id) || [])
          .filter((quiz) => Number(quiz.statusPublicacao) === STATUS_ARQUIVADO)
          .map((quiz) => ({ tipo: "quiz", id: quiz.id, titulo: quiz.titulo, dado: quiz }));

        return { modulo, itens: [...materiaisArquivados, ...quizzesArquivados] };
      })
      .filter((grupo) => grupo.itens.length > 0);
  }, [modulosDoCurso, conteudosPorModuloId, quizzesPorModuloIdCompleto]);

  const totalArquivadosCurso = itensArquivadosPorModulo.reduce((total, grupo) => total + grupo.itens.length, 0);


  // "Falta publicar: n" (item 3 do prompt de hierarquia): agora navega direto
  // pra tela do primeiro modulo com rascunho (etapa 2 do fluxo-professor-
  // igual-coordenador.md) - antes abria o modulo em acordeao nesta mesma
  // pagina e rolava ate o item.
  function irParaPrimeiroRascunho() {
    const moduloComRascunho = modulosDoCurso.find((modulo) => {
      const materiais = conteudosPorModuloId.get(modulo.id) || [];
      const quizzes = quizzesPorModuloIdCompleto.get(modulo.id) || [];
      return (
        materiais.some((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO) ||
        quizzes.some((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO)
      );
    });

    if (moduloComRascunho) {
      onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}/modulos/${moduloComRascunho.id}`);
    }
  }

  // Resumo honesto: conta materiais + quizzes, ignorando arquivados (nem entram
  // no denominador nem contam como pendencia) - antes so contava materiais, o
  // que podia mostrar "100% publicado" com quiz em rascunho.
  const itensCursoNaoArquivados = useMemo(
    () => [...conteudosDoCurso, ...quizzesDoCurso].filter((item) => Number(item.statusPublicacao) !== STATUS_ARQUIVADO),
    [conteudosDoCurso, quizzesDoCurso]
  );
  const totalPublicadosCurso = itensCursoNaoArquivados.filter((item) => Number(item.statusPublicacao) === STATUS_PUBLICADO).length;
  const totalRascunhosCurso = itensCursoNaoArquivados.length - totalPublicadosCurso;
  const percentualPublicado = itensCursoNaoArquivados.length
    ? Math.round((totalPublicadosCurso / itensCursoNaoArquivados.length) * 100)
    : 0;

  return (
    <div className="conteudos-aluno trilha-conteudos trilha-conteudos--editavel">
      {onVoltar ? <BotaoVoltar destino="Cursos" onClick={onVoltar} /> : null}

      <header className="atividades-curso__cabecalho">
        <div className="atividades-curso__cabecalho-principal">
          <h2 className="atividades-curso__titulo">{cursoAtivo.curso.titulo}</h2>
          <p className="atividades-curso__resumo-texto">
            <span className="atividades-curso__resumo-publicado">{percentualPublicado}% publicado</span>
            {totalRascunhosCurso > 0 ? (
              <button className="atividades-curso__falta-publicar" onClick={irParaPrimeiroRascunho} type="button">
                Falta publicar: {totalRascunhosCurso}
              </button>
            ) : null}
          </p>
        </div>
        <div className="atividades-curso__cabecalho-acoes">
          {totalArquivadosCurso > 0 ? (
            <Botao onClick={() => setModalArquivadosAberto(true)} tamanho="pequeno" variante="fantasma">
              <TbArchive aria-hidden="true" size={15} /> Ver arquivados ({totalArquivadosCurso})
            </Botao>
          ) : null}
          {!edicaoTravada ? (
            <Botao onClick={() => modaisModulo.abrirFormularioNovoModulo(cursoAtivo.curso.id)} tamanho="pequeno" variante="sucesso">
              <TbPlus aria-hidden="true" size={15} /> Novo modulo
            </Botao>
          ) : null}
          {cursoAceitaConclusao && !cursoJaConcluido && !cursoEncerrado ? (
            <Botao onClick={() => setConfirmandoConclusao(true)} tamanho="pequeno" variante="primario">
              <TbCheck aria-hidden="true" size={15} /> Concluir curso
            </Botao>
          ) : null}
          {cursoAceitaConclusao && cursoJaConcluido && !cursoEncerrado ? <Insignia texto="Concluído, aguardando o coordenador" /> : null}
          <Botao onClick={onVisualizarComoAluno} tamanho="pequeno" variante="fantasma">
            <TbEye aria-hidden="true" size={15} /> Visualizar como aluno
          </Botao>
        </div>
      </header>

      {edicaoTravada ? (
        <InlineMessage tone="warning">
          {cursoEncerrado
            ? "Curso encerrado. A edição está travada."
            : "Curso concluído — aguardando o encerramento pelo coordenador. A edição está travada."}
        </InlineMessage>
      ) : null}

      {confirmandoConclusao ? (
        <Modal
          onFechar={() => setConfirmandoConclusao(false)}
          titulo="Concluir curso"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={concluindoCurso} onClick={() => setConfirmandoConclusao(false)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={concluindoCurso} onClick={confirmarConclusaoCurso} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {concluindoCurso ? "Concluindo..." : "Confirmar conclusão"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja marcar o curso <strong>{cursoAtivo.curso.titulo}</strong> como concluído? O coordenador será notificado
            para revisar e encerrar o curso.
          </p>
          {mensagemConclusao ? <InlineMessage tone="error">{mensagemConclusao}</InlineMessage> : null}
        </Modal>
      ) : null}

      {modulosDoCurso.length === 0 ? (
        <p className="texto-vazio" role="status">Este curso ainda não tem módulos cadastrados.</p>
      ) : (
        <div className="atividades-curso__lista-modulos">
          {modulosDoCurso.map((modulo, indiceModulo) => {
            const itensDoModuloTodos = conteudosPorModuloId.get(modulo.id) || [];
            const quizzesDoModuloTodos = quizzesPorModuloIdCompleto.get(modulo.id) || [];

            // Arquivados ficam sempre escondidos da lista normal - ver "Ver arquivados"
            // no topo da tela.
            const itensDoModulo = itensDoModuloTodos.filter((conteudo) => Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO);
            const quizzesDoModulo = quizzesDoModuloTodos.filter((quiz) => Number(quiz.statusPublicacao) !== STATUS_ARQUIVADO);
            const itensNaoArquivadosDoModulo = [...itensDoModulo, ...quizzesDoModulo];

            const totalPublicadosModulo = itensNaoArquivadosDoModulo.filter(
              (item) => Number(item.statusPublicacao) === STATUS_PUBLICADO
            ).length;
            const totalRascunhosModulo = itensNaoArquivadosDoModulo.length - totalPublicadosModulo;
            const moduloVazio = itensNaoArquivadosDoModulo.length === 0;
            const percentualPublicadoModulo = itensNaoArquivadosDoModulo.length
              ? Math.round((totalPublicadosModulo / itensNaoArquivadosDoModulo.length) * 100)
              : 0;

            const itensMenuModulo = [
              {
                chave: "editar-modulo",
                rotulo: "Editar módulo",
                desabilitado: edicaoTravada,
                onSelecionar: () => modaisModulo.abrirEdicaoModulo(modulo)
              },
              {
                chave: "excluir-modulo",
                rotulo: "Excluir módulo",
                perigo: true,
                desabilitado: edicaoTravada,
                onSelecionar: () => modaisModulo.abrirExclusaoModulo(modulo)
              }
            ];

            return (
              <section className="conteudos-modulo conteudos-modulo--gestao conteudos-modulo--cartao" key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <h3 className="conteudos-modulo__cabecalho-wrapper">
                    <button
                      className="conteudos-modulo__toggle"
                      onClick={() => onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}/modulos/${modulo.id}`)}
                      type="button"
                    >
                      <div className="conteudos-modulo__info">
                        <NumeroModulo indice={indiceModulo} />
                        <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                        <span className="conteudos-modulo__contagem">
                          {moduloVazio ? (
                            "Vazio · não aparece para o aluno"
                          ) : (
                            <>
                              {itensDoModulo.length} conteúdo{itensDoModulo.length === 1 ? "" : "s"} ·{" "}
                              {quizzesDoModulo.length} quiz{quizzesDoModulo.length === 1 ? "" : "zes"}
                              {totalRascunhosModulo > 0 ? (
                                <span style={{ color: "var(--cor-aviso)", fontWeight: 600 }}>
                                  {" "}
                                  · {totalRascunhosModulo} rascunho{totalRascunhosModulo === 1 ? "" : "s"}
                                </span>
                              ) : (
                                <span style={{ color: "var(--cor-sucesso)", fontWeight: 600 }}> · tudo publicado</span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="conteudos-modulo__progresso-wrapper" style={{ minWidth: "8rem" }}>
                        {moduloVazio ? (
                          <span className="texto-vazio">—</span>
                        ) : (
                          <BarraProgresso
                            percentual={percentualPublicadoModulo}
                            rotuloAria={`${percentualPublicadoModulo}% publicado em ${modulo.titulo}`}
                          />
                        )}
                      </div>
                      <TbChevronRight aria-hidden="true" className="conteudos-modulo__chevron" size="1.1rem" />
                    </button>
                  </h3>

                  <MenuAcoes itens={itensMenuModulo} rotulo={`Opções de ${modulo.titulo}`} />
                </header>
              </section>
            );
          })}
        </div>
      )}

      {modalArquivadosAberto ? (
        <Modal onFechar={() => setModalArquivadosAberto(false)} titulo={`Arquivados (${totalArquivadosCurso})`}>
          {itensArquivadosPorModulo.length === 0 ? (
            <p className="texto-vazio" role="status">Nenhum item arquivado neste curso.</p>
          ) : (
            itensArquivadosPorModulo.map(({ modulo, itens }) => (
              <section className="modal-arquivados__modulo" key={modulo.id}>
                <h3 className="conteudos-modulo__titulo">{modulo.titulo}</h3>
                <ul aria-label={`Itens arquivados de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
                  {itens.map((item) => {
                    const processando = acaoEmAndamentoId === item.id;

                    return (
                      <li className="atividades-curso__item" key={`${item.tipo}-${item.id}`}>
                        <div className="atividades-curso__linha">
                          <span aria-hidden="true" className={`atividades-curso__icone${item.tipo === "quiz" ? " atividades-curso__icone--quiz" : " atividades-curso__icone--conteudo"}`}>
                            {item.tipo === "quiz" ? (
                              <TbTrophy aria-hidden="true" size="1.75rem" />
                            ) : (
                              ICONE_TIPO_CONTEUDO_LINHA[Number(item.dado.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />
                            )}
                          </span>
                          <div className="atividades-curso__corpo">
                            <span className="atividades-curso__item-titulo-linha">
                              <strong className="atividades-curso__item-titulo">{item.titulo}</strong>
                            </span>
                            <p className="atividades-curso__meta">
                              <span>{item.tipo === "quiz" ? "Quiz" : normalizeContentType(item.dado.tipoConteudo)}</span>
                            </p>
                          </div>
                          <div className="atividades-curso__acoes">
                            <Botao
                              disabled={processando}
                              onClick={() => (item.tipo === "quiz" ? onRestaurarRascunhoQuiz(item.dado) : onRestaurarRascunho(item.dado))}
                              tamanho="pequeno"
                              variante="secundario"
                            >
                              Restaurar como rascunho
                            </Botao>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </Modal>
      ) : null}

      <ModaisModulo
        bloqueioExclusao={modaisModulo.bloqueioExclusao}
        cursoFixo={{ titulo: cursoAtivo.curso.titulo }}
        dadosFormulario={modaisModulo.dadosFormulario}
        formularioAberto={modaisModulo.formularioAberto}
        mensagemExclusao={modaisModulo.mensagemExclusao}
        mensagemFormulario={modaisModulo.mensagemFormulario}
        moduloEmEdicaoId={modaisModulo.moduloEmEdicaoId}
        moduloParaExcluir={modaisModulo.moduloParaExcluir}
        onConfirmarExclusao={modaisModulo.confirmarExclusao}
        onFecharExclusao={modaisModulo.fecharExclusaoModulo}
        onFecharFormulario={modaisModulo.fecharFormulario}
        onSalvarModulo={modaisModulo.salvarModulo}
        onVerArquivados={() => {
          modaisModulo.fecharExclusaoModulo();
          setModalArquivadosAberto(true);
        }}
        salvando={modaisModulo.salvando}
        setDadosFormulario={modaisModulo.setDadosFormulario}
      />
    </div>
  );
}

function nomeArquivoDaUrl(url) {
  if (!url) {
    return "";
  }

  const partes = String(url).split("/");
  return partes[partes.length - 1] || url;
}

function criarEstadoInicialFormulario(overrides = {}) {
  return {
    moduloId: "",
    titulo: "",
    descricao: "",
    tipoConteudo: OPCOES_TIPO_CONTEUDO[0].value,
    corpoTexto: "",
    arquivoUrl: "",
    linkUrl: "",
    statusPublicacao: OPCOES_STATUS_PUBLICACAO[0].value,
    ordemExibicao: "0",
    pesoProgresso: "1",
    ...overrides
  };
}
