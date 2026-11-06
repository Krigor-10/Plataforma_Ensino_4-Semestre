import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbArchive,
  TbArrowLeft,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbExternalLink,
  TbEye,
  TbFile,
  TbFileText,
  TbLayoutGrid,
  TbPencil,
  TbPhoto,
  TbPlayerPlay,
  TbPlus,
  TbSparkles,
  TbTrophy,
  TbX
} from "react-icons/tb";
import { MdSave } from "react-icons/md";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import MenuAcoes from "../../components/MenuAcoes.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { normalizeContentType, normalizePublicationStatus } from "../../lib/format.js";
import { AssistenteGeracaoIA } from "./AssistenteGeracaoIA.jsx";
import { AssistenteQuizAvaliacao } from "./AssistenteQuizAvaliacao.jsx";

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

const STATUS_RASCUNHO = 1;
const STATUS_PUBLICADO = 2;
const STATUS_ARQUIVADO = 3;

/* Trilha de Conteudos do professor: mesmo padrao Card do curso -> Modulos -> Conteudos
   usado na experiencia do aluno (SlideConteudosCurso em SecoesAluno.jsx), reaproveitando
   as classes CSS atividades-curso__* e conteudos-modulo__*, so trocando as acoes de
   "Concluir" por gerenciamento (editar, publicar/despublicar, excluir, reordenar). */
export function SecaoConteudosProfessor({
  avaliacoes = [],
  conteudos,
  cursoIdSelecionado = null,
  cursos,
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
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState(null);
  const [mensagemLista, setMensagemLista] = useState({ tone: "", message: "" });
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

  useEffect(() => {
    setMensagemLista({ tone: "", message: "" });
  }, [cursoIdSelecionado]);

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

  async function alternarPublicacao(conteudo) {
    const proximoStatus = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO ? STATUS_RASCUNHO : STATUS_PUBLICADO;

    setAcaoEmAndamentoId(conteudo.id);
    setMensagemLista({ tone: "", message: "" });

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

      setMensagemLista({ tone: "error", message: err.message || "Não foi possível atualizar o status agora." });
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  // Distinto de alternarPublicacao: usado so quando o material esta Arquivado e o
  // professor pede "Restaurar como rascunho" - forca Rascunho explicitamente, em vez
  // de alternar a partir do status atual (alternar levaria Arquivado -> Publicado).
  async function restaurarConteudoParaRascunho(conteudo) {
    setAcaoEmAndamentoId(conteudo.id);
    setMensagemLista({ tone: "", message: "" });

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

      setMensagemLista({ tone: "error", message: err.message || "Não foi possível restaurar o conteúdo agora." });
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function alternarPublicacaoQuiz(quiz) {
    const proximoStatus = Number(quiz.statusPublicacao) === STATUS_PUBLICADO ? STATUS_RASCUNHO : STATUS_PUBLICADO;

    setAcaoEmAndamentoId(quiz.id);
    setMensagemLista({ tone: "", message: "" });

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

      setMensagemLista({ tone: "error", message: err.message || "Não foi possível atualizar o status do quiz agora." });
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  async function restaurarQuizParaRascunho(quiz) {
    setAcaoEmAndamentoId(quiz.id);
    setMensagemLista({ tone: "", message: "" });

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

      setMensagemLista({ tone: "error", message: err.message || "Não foi possível restaurar o quiz agora." });
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
    setMensagemLista({ tone: "", message: "" });

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

      setMensagemLista({ tone: "error", message: err.message || "Não foi possível reordenar o conteúdo agora." });
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
          cursos={cursosDoProfessor.map(({ curso, totalConteudos, totalItensNaoArquivados, totalModulos, totalPublicados }) => ({
            curso,
            resumo: `${totalModulos} módulo${totalModulos === 1 ? "" : "s"} · ${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"}`,
            rodapeEsquerda: `${totalPublicados} publicado${totalPublicados === 1 ? "" : "s"}`,
            badge:
              totalPublicados === 0
                ? "Rascunho"
                : totalPublicados === totalItensNaoArquivados
                ? "Publicado"
                : "Parcialmente publicado"
          }))}
          mensagemVazia="Você ainda não está vinculado a nenhum curso."
          onSelecionar={abrirCurso}
        />
      ) : (
        <TrilhaConteudosProfessor
          acaoEmAndamentoId={acaoEmAndamentoId}
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoAtivo={cursoAtivo}
          mensagemLista={mensagemLista}
          modulosDoCurso={modulosDisponiveis}
          onAbrirEdicao={abrirEdicaoConteudo}
          onAlternarPublicacao={alternarPublicacao}
          onAlternarPublicacaoQuiz={alternarPublicacaoQuiz}
          onExcluir={abrirExclusaoConteudo}
          onGerarQuizComIaModulo={abrirGeracaoQuizComIa}
          onGerenciarQuizModulo={gerenciarQuizModulo}
          onNovoConteudo={abrirFormularioNovoConteudo}
          onReordenar={reordenarConteudo}
          onRestaurarRascunho={restaurarConteudoParaRascunho}
          onRestaurarRascunhoQuiz={restaurarQuizParaRascunho}
          onVoltar={onNavigate ? voltarParaCursos : null}
        />
      )}

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

function TrilhaConteudosProfessor({
  acaoEmAndamentoId,
  avaliacoes,
  conteudos,
  cursoAtivo,
  mensagemLista,
  modulosDoCurso,
  onAbrirEdicao,
  onAlternarPublicacao,
  onAlternarPublicacaoQuiz,
  onExcluir,
  onGerarQuizComIaModulo,
  onGerenciarQuizModulo,
  onNovoConteudo,
  onReordenar,
  onRestaurarRascunho,
  onRestaurarRascunhoQuiz,
  onVoltar
}) {
  const [previaAberta, setPreviaAberta] = useState(false);
  const [modalArquivadosAberto, setModalArquivadosAberto] = useState(false);

  const conteudosDoCurso = useMemo(
    () => conteudos.filter((conteudo) => conteudo.cursoId === cursoAtivo.curso.id),
    [conteudos, cursoAtivo.curso.id]
  );

  const quizzesDoCurso = useMemo(
    () => avaliacoes.filter((avaliacao) => avaliacao.cursoId === cursoAtivo.curso.id && Number(avaliacao.tipoAvaliacao) === 1),
    [avaliacoes, cursoAtivo.curso.id]
  );

  // Usado so pela previa do aluno (PreviaTrilhaAluno) - guarda so 1 quiz por
  // material. Nao tocar aqui pra nao arriscar regressao na previa; a trilha do
  // professor usa quizzesPorConteudoId abaixo (lista), que suporta mais de 1
  // quiz no mesmo material.
  const quizPorConteudoId = useMemo(() => {
    const mapa = new Map();
    quizzesDoCurso.forEach((quiz) => {
      if (quiz.conteudoDidaticoId) {
        mapa.set(quiz.conteudoDidaticoId, quiz);
      }
    });
    return mapa;
  }, [quizzesDoCurso]);

  const quizzesPorConteudoId = useMemo(() => {
    const agrupados = new Map();
    quizzesDoCurso.forEach((quiz) => {
      if (!quiz.conteudoDidaticoId) {
        return;
      }
      const atuais = agrupados.get(quiz.conteudoDidaticoId) || [];
      atuais.push(quiz);
      agrupados.set(quiz.conteudoDidaticoId, atuais);
    });
    return agrupados;
  }, [quizzesDoCurso]);

  const quizzesPorModuloId = useMemo(() => {
    const agrupados = new Map();
    quizzesDoCurso.forEach((quiz) => {
      if (quiz.conteudoDidaticoId || !quiz.moduloId) {
        return;
      }
      const atuais = agrupados.get(quiz.moduloId) || [];
      atuais.push(quiz);
      agrupados.set(quiz.moduloId, atuais);
    });
    return agrupados;
  }, [quizzesDoCurso]);

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

  // Abre o primeiro modulo que tem algum rascunho (o que precisa de acao do
  // professor); sem nenhum rascunho no curso, abre so o primeiro modulo.
  const [moduloAberto, setModuloAberto] = useState(() => {
    const moduloComRascunho = modulosDoCurso.find((modulo) => {
      const materiais = conteudosPorModuloId.get(modulo.id) || [];
      const quizzes = quizzesPorModuloIdCompleto.get(modulo.id) || [];
      return (
        materiais.some((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO) ||
        quizzes.some((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO)
      );
    });
    return (moduloComRascunho || modulosDoCurso[0])?.id ?? null;
  });
  const [conteudoSelecionadoId, setConteudoSelecionadoId] = useState(null);

  function alternarModulo(moduloId) {
    setModuloAberto((atual) => (atual === moduloId ? null : moduloId));
  }

  function alternarConteudo(conteudoId) {
    setConteudoSelecionadoId((atual) => (atual === conteudoId ? null : conteudoId));
  }

  // "Falta publicar: n" (item 3 do prompt de hierarquia): abre o primeiro
  // modulo com rascunho, rola ate o item e move o foco pra ele. O setTimeout
  // casa com a duracao da animacao de abertura do modulo (280ms acima, em
  // motion.div), pra rolar so depois que o conteudo ja estiver visivel.
  function irParaPrimeiroRascunho() {
    for (const modulo of modulosDoCurso) {
      const materiais = conteudosPorModuloId.get(modulo.id) || [];
      const quizzes = quizzesPorModuloIdCompleto.get(modulo.id) || [];
      const primeiroMaterialRascunho = materiais.find((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO);
      const primeiroQuizRascunho = quizzes.find((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO);
      const alvo = primeiroMaterialRascunho || primeiroQuizRascunho;

      if (!alvo) {
        continue;
      }

      setModuloAberto(modulo.id);
      const idAlvo = primeiroMaterialRascunho
        ? `conteudo-professor-linha-${alvo.id}`
        : `quiz-professor-linha-${alvo.id}`;
      window.setTimeout(() => {
        const elemento = document.getElementById(idAlvo);
        elemento?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        elemento?.focus();
      }, 320);
      return;
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
    <div className="conteudos-aluno">
      {onVoltar ? (
        <nav aria-label="Navegação da trilha de conteúdos" className="atividades-curso__navegacao">
          <button className="atividades-curso__voltar" onClick={onVoltar} type="button">
            <TbArrowLeft aria-hidden="true" size={22} />
            Voltar para Conteúdos
          </button>
        </nav>
      ) : null}

      <header className="atividades-curso__cabecalho">
        <h2 className="atividades-curso__titulo">{cursoAtivo.curso.titulo}</h2>
        <Botao onClick={() => setPreviaAberta(true)} tamanho="pequeno" variante="fantasma">
          <TbEye aria-hidden="true" size={15} /> Visualizar como aluno
        </Botao>
      </header>

      <div className="atividades-curso__progresso">
        <BarraProgresso
          mostrarTexto={false}
          percentual={percentualPublicado}
          rotuloAria={`${totalPublicadosCurso} de ${itensCursoNaoArquivados.length} publicados`}
        />
        <span aria-hidden="true" className="atividades-curso__progresso-texto">
          {totalPublicadosCurso} de {itensCursoNaoArquivados.length} publicados
        </span>
        {totalRascunhosCurso > 0 ? (
          <button className="atividades-curso__falta-publicar" onClick={irParaPrimeiroRascunho} type="button">
            Falta publicar: {totalRascunhosCurso}
          </button>
        ) : null}
        {totalArquivadosCurso > 0 ? (
          <button className="atividades-curso__ver-arquivados" onClick={() => setModalArquivadosAberto(true)} type="button">
            <TbArchive aria-hidden="true" size={14} /> Ver arquivados ({totalArquivadosCurso})
          </button>
        ) : null}
      </div>

      {mensagemLista.message ? <InlineMessage tone={mensagemLista.tone}>{mensagemLista.message}</InlineMessage> : null}

      {modulosDoCurso.length === 0 ? (
        <p className="texto-vazio" role="status">Este curso ainda não tem módulos cadastrados.</p>
      ) : (
        <div className="atividades-curso__lista-modulos">
          {modulosDoCurso.map((modulo, indiceModulo) => {
            const itensDoModuloTodos = conteudosPorModuloId.get(modulo.id) || [];
            const quizzesDoModuloTodos = quizzesPorModuloIdCompleto.get(modulo.id) || [];
            const quizzesSoltosDoModuloTodos = quizzesPorModuloId.get(modulo.id) || [];
            const estaAberto = moduloAberto === modulo.id;
            const idListaModulo = `conteudos-modulo-professor-lista-${modulo.id}`;

            // Arquivados ficam sempre escondidos da lista normal - ver "Ver arquivados"
            // no topo da tela (painel central, substitui o toggle por modulo).
            const itensDoModulo = itensDoModuloTodos.filter((conteudo) => Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO);
            const quizzesDoModulo = quizzesDoModuloTodos.filter((quiz) => Number(quiz.statusPublicacao) !== STATUS_ARQUIVADO);
            const quizzesSoltosDoModulo = quizzesSoltosDoModuloTodos.filter((quiz) => Number(quiz.statusPublicacao) !== STATUS_ARQUIVADO);

            // Resumo honesto do modulo: conta materiais + quizzes NAO ARQUIVADOS (bug
            // corrigido - antes contava itensDoModuloTodos/quizzesDoModuloTodos, que
            // incluiam arquivados, mostrando ex. "3 quizzes" com so 2 visiveis).
            const totalRascunhosModulo =
              itensDoModulo.filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_RASCUNHO).length +
              quizzesDoModulo.filter((quiz) => Number(quiz.statusPublicacao) === STATUS_RASCUNHO).length;
            const moduloVazio = itensDoModulo.length === 0 && quizzesDoModulo.length === 0;

            return (
              <section
                className={`conteudos-modulo conteudos-modulo--editavel${moduloVazio ? " conteudos-modulo--vazio" : ""}`}
                id={`conteudos-modulo-professor-${modulo.id}`}
                key={modulo.id}
              >
                <header className="conteudos-modulo__cabecalho">
                  <h3 className="conteudos-modulo__cabecalho-wrapper">
                    <button
                      aria-controls={idListaModulo}
                      aria-expanded={estaAberto}
                      className="conteudos-modulo__toggle"
                      onClick={() => alternarModulo(modulo.id)}
                      type="button"
                    >
                      <div className="conteudos-modulo__info">
                        <span className="conteudos-modulo__icone conteudos-modulo__numero">
                          <span className="visualmente-oculto">Módulo</span>{" "}
                          <span>{String(indiceModulo + 1).padStart(2, "0")}</span>
                        </span>
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
                              ) : null}
                            </>
                          )}
                        </span>
                      </div>
                      <TbChevronDown
                        aria-hidden="true"
                        className={`conteudos-modulo__chevron${estaAberto ? " conteudos-modulo__chevron--aberto" : ""}`}
                        size="1.1rem"
                      />
                    </button>
                  </h3>
                </header>

                <AnimatePresence initial={false}>
                  {estaAberto ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                      exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                      id={idListaModulo}
                      initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                      key={`lista-professor-${modulo.id}`}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                      {itensDoModulo.length === 0 && quizzesSoltosDoModulo.length === 0 ? (
                        <p className="texto-vazio" role="status">Nenhum conteúdo neste módulo ainda.</p>
                      ) : itensDoModulo.length === 0 ? null : (
                        <ul aria-label={`Conteúdos de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                          {itensDoModulo.map((conteudo, indiceConteudo) => {
                            const conteudoAtivo = conteudoSelecionadoId === conteudo.id;
                            const processando = acaoEmAndamentoId === conteudo.id;
                            const publicado = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO;
                            // itensDoModulo ja exclui arquivados (ver "Ver arquivados" no topo da tela),
                            // entao todo item que chega aqui esta sempre Rascunho ou Publicado.
                            const quizzesDoMaterial = (quizzesPorConteudoId.get(conteudo.id) || []).filter(
                              (quiz) => Number(quiz.statusPublicacao) !== STATUS_ARQUIVADO
                            );
                            const itensMenuMaterial = [
                              {
                                chave: "alternar-status",
                                rotulo: publicado ? "Voltar para rascunho" : "Publicar",
                                onSelecionar: () => onAlternarPublicacao(conteudo)
                              },
                              {
                                chave: "mover-cima",
                                rotulo: "Mover para cima",
                                desabilitado: processando || indiceConteudo === 0,
                                onSelecionar: () => onReordenar(conteudo, itensDoModulo, -1)
                              },
                              {
                                chave: "mover-baixo",
                                rotulo: "Mover para baixo",
                                desabilitado: processando || indiceConteudo === itensDoModulo.length - 1,
                                onSelecionar: () => onReordenar(conteudo, itensDoModulo, 1)
                              },
                              { chave: "excluir", rotulo: "Excluir", perigo: true, onSelecionar: () => onExcluir(conteudo) }
                            ];

                            const itensMenuQuizDoMaterial = (quiz) => {
                              const quizPublicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
                              return [
                                {
                                  chave: "alternar-status",
                                  rotulo: quizPublicado ? "Voltar para rascunho" : "Publicar",
                                  onSelecionar: () => onAlternarPublicacaoQuiz(quiz)
                                }
                              ];
                            };

                            const temDescricao = Boolean(conteudo.descricao);

                            return (
                              <li className="atividades-curso__item" key={conteudo.id}>
                                <div className="atividades-curso__item-aberto">
                                <div
                                  aria-expanded={temDescricao ? conteudoAtivo : undefined}
                                  aria-label={
                                    temDescricao
                                      ? `Ver detalhes de ${normalizeContentType(conteudo.tipoConteudo)}: ${conteudo.titulo}`
                                      : undefined
                                  }
                                  className={`atividades-curso__linha${temDescricao && conteudoAtivo ? " atividades-curso__linha--ativa" : ""}`}
                                  id={`conteudo-professor-linha-${conteudo.id}`}
                                  onClick={temDescricao ? () => alternarConteudo(conteudo.id) : undefined}
                                  onKeyDown={
                                    temDescricao
                                      ? (event) => {
                                          if (event.target !== event.currentTarget) {
                                            return;
                                          }
                                          if (event.key !== "Enter" && event.key !== " ") {
                                            return;
                                          }
                                          event.preventDefault();
                                          alternarConteudo(conteudo.id);
                                        }
                                      : undefined
                                  }
                                  role={temDescricao ? "button" : undefined}
                                  tabIndex={temDescricao ? 0 : -1}
                                >
                                  <span aria-hidden="true" className="atividades-curso__icone">
                                    {ICONE_TIPO_CONTEUDO_LINHA[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
                                  </span>
                                  <div className="atividades-curso__corpo">
                                    <span className="atividades-curso__item-titulo-linha">
                                      <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                                      {temDescricao ? (
                                        <TbChevronDown
                                          aria-hidden="true"
                                          className={`atividades-curso__chevron${conteudoAtivo ? " atividades-curso__chevron--aberto" : ""}`}
                                          size="1rem"
                                        />
                                      ) : null}
                                    </span>
                                    <p className="atividades-curso__meta">
                                      <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                                    </p>
                                  </div>
                                  <div className="atividades-curso__acoes" onClick={(event) => event.stopPropagation()}>
                                    <Insignia
                                      className={`atividades-curso__status-badge${publicado ? " atividades-curso__status-badge--oculto" : ""}`}
                                      texto={normalizePublicationStatus(conteudo.statusPublicacao)}
                                    />
                                    <Botao
                                      aria-label={`Editar ${conteudo.titulo}`}
                                      disabled={processando}
                                      onClick={() => onAbrirEdicao(conteudo)}
                                      tamanho="pequeno"
                                      variante="secundario"
                                    >
                                      <TbPencil aria-hidden="true" size={15} /> <span className="atividades-curso__editar-texto">Editar</span>
                                    </Botao>
                                    <MenuAcoes itens={itensMenuMaterial} rotulo={`Opções de ${conteudo.titulo}`} />
                                    <button
                                      aria-label={`Mover ${conteudo.titulo} para cima`}
                                      className="atividades-curso__reordenar"
                                      disabled={processando || indiceConteudo === 0}
                                      onClick={() => onReordenar(conteudo, itensDoModulo, -1)}
                                      type="button"
                                    >
                                      <TbChevronUp aria-hidden="true" size="1.1rem" />
                                    </button>
                                    <button
                                      aria-label={`Mover ${conteudo.titulo} para baixo`}
                                      className="atividades-curso__reordenar"
                                      disabled={processando || indiceConteudo === itensDoModulo.length - 1}
                                      onClick={() => onReordenar(conteudo, itensDoModulo, 1)}
                                      type="button"
                                    >
                                      <TbChevronDown aria-hidden="true" size="1.1rem" />
                                    </button>
                                  </div>
                                </div>

                                <AnimatePresence initial={false}>
                                  {conteudoAtivo ? (
                                    <motion.div
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      initial={{ height: 0, opacity: 0 }}
                                      key={`previa-conteudo-${conteudo.id}`}
                                      style={{ overflow: "hidden" }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                    >
                                      <div className="atividades-curso__previa">
                                        {conteudo.descricao ? <p>{conteudo.descricao}</p> : null}
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                                </div>

                                {quizzesDoMaterial.length > 0 ? (
                                  <ul aria-label={`Quizzes de ${conteudo.titulo}`} className="atividades-curso__quizzes" role="list">
                                    {quizzesDoMaterial.map((quiz) => {
                                      const processandoQuiz = acaoEmAndamentoId === quiz.id;
                                      const quizPublicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;

                                      return (
                                        <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-${quiz.id}`}>
                                          <div className="atividades-curso__linha" id={`quiz-professor-linha-${quiz.id}`} tabIndex={-1}>
                                            <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                              <TbTrophy aria-hidden="true" size="1.75rem" />
                                            </span>
                                            <div className="atividades-curso__corpo">
                                              <span className="atividades-curso__item-titulo-linha">
                                                <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                                              </span>
                                              <p className="atividades-curso__meta">
                                                <span>Quiz</span>
                                              </p>
                                            </div>
                                            <div className="atividades-curso__acoes">
                                              <Insignia
                                                className={`atividades-curso__status-badge${quizPublicado ? " atividades-curso__status-badge--oculto" : ""}`}
                                                texto={normalizePublicationStatus(quiz.statusPublicacao)}
                                              />
                                              <Botao
                                                aria-label={`Editar quiz ${quiz.titulo}`}
                                                disabled={processandoQuiz}
                                                onClick={() => onGerenciarQuizModulo(modulo, quiz)}
                                                tamanho="pequeno"
                                                variante="secundario"
                                              >
                                                <TbPencil aria-hidden="true" size={15} /> <span className="atividades-curso__editar-texto">Editar</span>
                                              </Botao>
                                              <MenuAcoes itens={itensMenuQuizDoMaterial(quiz)} rotulo={`Opções do quiz ${quiz.titulo}`} />
                                              <span aria-hidden="true" className="atividades-curso__reordenar-espaco" />
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
                        </ul>
                      )}

                      {quizzesSoltosDoModulo.length > 0 ? (
                        <div className="atividades-curso__quizzes-modulo">
                          <h4 className="atividades-curso__quizzes-modulo-titulo">Quizzes do módulo</h4>
                          <ul aria-label={`Quizzes de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                          {quizzesSoltosDoModulo.map((quiz) => {
                            const quizPublicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
                            const processandoQuiz = acaoEmAndamentoId === quiz.id;
                            const itensMenuQuiz = [
                              {
                                chave: "alternar-status",
                                rotulo: quizPublicado ? "Voltar para rascunho" : "Publicar",
                                onSelecionar: () => onAlternarPublicacaoQuiz(quiz)
                              }
                            ];

                            return (
                              <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-${quiz.id}`}>
                                <div className="atividades-curso__linha" id={`quiz-professor-linha-${quiz.id}`} tabIndex={-1}>
                                  <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                    <TbTrophy aria-hidden="true" size="1.75rem" />
                                  </span>
                                  <div className="atividades-curso__corpo">
                                    <span className="atividades-curso__item-titulo-linha">
                                      <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                                    </span>
                                    <p className="atividades-curso__meta">
                                      <span>Quiz</span>
                                    </p>
                                  </div>
                                  <div className="atividades-curso__acoes">
                                    <Insignia
                                      className={`atividades-curso__status-badge${quizPublicado ? " atividades-curso__status-badge--oculto" : ""}`}
                                      texto={normalizePublicationStatus(quiz.statusPublicacao)}
                                    />
                                    <Botao
                                      aria-label={`Editar quiz ${quiz.titulo}`}
                                      disabled={processandoQuiz}
                                      onClick={() => onGerenciarQuizModulo(modulo, quiz)}
                                      tamanho="pequeno"
                                      variante="secundario"
                                    >
                                      <TbPencil aria-hidden="true" size={15} /> <span className="atividades-curso__editar-texto">Editar</span>
                                    </Botao>
                                    <MenuAcoes itens={itensMenuQuiz} rotulo={`Opções do quiz ${quiz.titulo}`} />
                                    <span aria-hidden="true" className="atividades-curso__reordenar-espaco" />
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                          </ul>
                        </div>
                      ) : null}

                      <div className="atividades-curso__adicionar-grupo">
                        <MenuAcoes
                          classNameBotao="atividades-curso__adicionar"
                          iconeBotao={<TbPlus aria-hidden="true" size={13} />}
                          itens={[
                            { chave: "novo-conteudo", rotulo: "Conteúdo", onSelecionar: () => onNovoConteudo(modulo.id) },
                            { chave: "novo-quiz", rotulo: "Quiz", onSelecionar: () => onGerenciarQuizModulo(modulo) }
                          ]}
                          rotulo={`Adicionar em ${modulo.titulo}`}
                          textoBotao="Adicionar"
                        />
                        {itensDoModulo.some((conteudo) => [1, 2].includes(Number(conteudo.tipoConteudo))) ? (
                          <Botao className="atividades-curso__adicionar" onClick={() => onGerarQuizComIaModulo(modulo)} tamanho="pequeno" variante="fantasma">
                            <TbSparkles aria-hidden="true" size={13} /> Gerar quiz com IA
                          </Botao>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
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
                          <span aria-hidden="true" className={`atividades-curso__icone${item.tipo === "quiz" ? " atividades-curso__icone--quiz" : ""}`}>
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

      {previaAberta ? (
        <PreviaTrilhaAluno
          conteudosPorModuloId={conteudosPorModuloId}
          cursoTitulo={cursoAtivo.curso.titulo}
          modulosDoCurso={modulosDoCurso}
          onFechar={() => setPreviaAberta(false)}
          quizPorConteudoId={quizPorConteudoId}
          quizzesPorModuloId={quizzesPorModuloId}
        />
      ) : null}
    </div>
  );
}

/* Pre-visualizacao estrutural de como o aluno ve a trilha: reaproveita as MESMAS classes
   CSS atividades-curso__ / conteudos-modulo__ pra ficar visualmente identica ao que o
   aluno realmente ve, mas sem tocar no componente SlideConteudosCurso (SecoesAluno.jsx) -
   evita qualquer risco de regressao na experiencia real do aluno. Deliberadamente sem
   progresso/bloqueio de modulo e sem acoes (Concluir/Fazer quiz), so a estrutura de
   modulos/conteudos/quizzes JA PUBLICADOS (rascunho fica de fora, igual o aluno ve). */
function PreviaTrilhaAluno({ conteudosPorModuloId, cursoTitulo, modulosDoCurso, onFechar, quizPorConteudoId, quizzesPorModuloId }) {
  const modulosVisiveis = useMemo(() => {
    return modulosDoCurso
      .map((modulo, indice) => {
        const itens = (conteudosPorModuloId.get(modulo.id) || []).filter(
          (conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO
        );
        const quizzesDoModulo = (quizzesPorModuloId.get(modulo.id) || []).filter(
          (quiz) => Number(quiz.statusPublicacao) === STATUS_PUBLICADO
        );
        return { indice, itens, modulo, quizzesDoModulo };
      })
      .filter(({ itens, quizzesDoModulo }) => itens.length > 0 || quizzesDoModulo.length > 0);
  }, [conteudosPorModuloId, modulosDoCurso, quizzesPorModuloId]);

  return (
    <Modal
      className="modal-caixa--avaliacao"
      onFechar={onFechar}
      titulo="Visualizar como aluno"
      rodape={
        <footer className="modal-rodape">
          <Botao onClick={onFechar} variante="perigo">
            <TbX aria-hidden="true" size={15} /> Fechar
          </Botao>
        </footer>
      }
    >
      <div className="conteudos-aluno">
        <InlineMessage tone="info">
          Pré-visualização estrutural: mostra só o conteúdo publicado, sem dados de progresso de nenhum aluno.
        </InlineMessage>

        <header className="atividades-curso__cabecalho">
          <h2 className="atividades-curso__titulo">{cursoTitulo}</h2>
        </header>

        {modulosVisiveis.length === 0 ? (
          <p className="texto-vazio" role="status">Nenhum material publicado neste curso ainda.</p>
        ) : (
          <div className="atividades-curso__lista-modulos">
            {modulosVisiveis.map(({ indice, itens, modulo, quizzesDoModulo }) => (
              <section className="conteudos-modulo" key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <div className="conteudos-modulo__cabecalho-wrapper">
                    <div className="conteudos-modulo__info">
                      <span aria-hidden="true" className="conteudos-modulo__icone">
                        <TbLayoutGrid size="1.4rem" />
                      </span>
                      <span className="conteudos-modulo__eyebrow">Módulo {String(indice + 1).padStart(2, "0")}</span>
                      <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                      <span className="conteudos-modulo__contagem">{itens.length} conteúdo{itens.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </header>

                <ul aria-label={`Conteúdos de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                  {itens.map((conteudo) => {
                    const quizVinculado = quizPorConteudoId.get(conteudo.id) || null;

                    return (
                      <li className="atividades-curso__item" key={conteudo.id}>
                        <div className="atividades-curso__linha">
                          <span aria-hidden="true" className="atividades-curso__icone">
                            {ICONE_TIPO_CONTEUDO_LINHA[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
                          </span>
                          <div className="atividades-curso__corpo">
                            <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                            <p className="atividades-curso__meta">
                              <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                            </p>
                          </div>
                        </div>

                        {quizVinculado ? (
                          <ul aria-label={`Quiz de ${conteudo.titulo}`} className="atividades-curso__quizzes" role="list">
                            <li className="atividades-curso__item atividades-curso__item--quiz">
                              <div className="atividades-curso__linha">
                                <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                                  <TbTrophy aria-hidden="true" size="1.75rem" />
                                </span>
                                <div className="atividades-curso__corpo">
                                  <strong className="atividades-curso__item-titulo">{quizVinculado.titulo}</strong>
                                  <p className="atividades-curso__meta"><span>Quiz</span></p>
                                </div>
                              </div>
                            </li>
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                  {quizzesDoModulo.map((quiz) => (
                    <li className="atividades-curso__item atividades-curso__item--quiz" key={`quiz-modulo-${quiz.id}`}>
                      <div className="atividades-curso__linha">
                        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                          <TbTrophy aria-hidden="true" size="1.75rem" />
                        </span>
                        <div className="atividades-curso__corpo">
                          <strong className="atividades-curso__item-titulo">{quiz.titulo}</strong>
                          <p className="atividades-curso__meta"><span>Quiz</span></p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function nomeArquivoDaUrl(url) {
  if (!url) {
    return "";
  }

  const partes = String(url).split("/");
  return partes[partes.length - 1] || url;
}

function montarPayloadConteudo(conteudo, overrides = {}) {
  return {
    titulo: conteudo.titulo,
    descricao: conteudo.descricao || "",
    tipoConteudo: Number(conteudo.tipoConteudo),
    corpoTexto: conteudo.corpoTexto || "",
    arquivoUrl: conteudo.arquivoUrl || "",
    linkUrl: conteudo.linkUrl || "",
    moduloId: conteudo.moduloId,
    statusPublicacao: Number(conteudo.statusPublicacao),
    ordemExibicao: conteudo.ordemExibicao ?? 0,
    pesoProgresso: conteudo.pesoProgresso ?? 1,
    ...overrides
  };
}

// Espelha montarDadosEnvioAvaliacao (AssistenteQuizAvaliacao.jsx) - mesmos campos
// que o PUT /Avaliacoes/{id} exige, reaproveitando os dados que o quiz ja tem pra
// trocar so o status (publicar/voltar a rascunho/restaurar) sem abrir o modal
// inteiro. Nao e rota nova, e o mesmo PUT que o modal ja usa pra salvar.
function montarPayloadAvaliacao(quiz, overrides = {}) {
  return {
    titulo: quiz.titulo,
    descricao: quiz.descricao || "",
    cursoId: quiz.cursoId,
    moduloId: quiz.moduloId ?? null,
    conteudoDidaticoId: quiz.conteudoDidaticoId ?? null,
    tipoAvaliacao: Number(quiz.tipoAvaliacao),
    statusPublicacao: Number(quiz.statusPublicacao),
    dataAbertura: quiz.dataAbertura || null,
    dataFechamento: quiz.dataFechamento || null,
    tentativasPermitidas: quiz.tentativasPermitidas ?? 1,
    tempoLimiteMinutos: quiz.tempoLimiteMinutos ?? null,
    notaMaxima: quiz.notaMaxima ?? 10,
    pesoNota: quiz.pesoNota ?? 1,
    pesoProgresso: quiz.pesoProgresso ?? 1,
    ...overrides
  };
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
