import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
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
  TbTrophy,
  TbX
} from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { normalizeContentType, normalizePublicationStatus } from "../../lib/format.js";

const OPCOES_TIPO_CONTEUDO = [
  { value: "1", label: "Texto" },
  { value: "2", label: "PDF" },
  { value: "3", label: "Video" },
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
  1: <TbFileText aria-hidden="true" size="1.5rem" />,
  2: <TbFile aria-hidden="true" size="1.5rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.5rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.5rem" />,
  5: <TbPhoto aria-hidden="true" size="1.5rem" />
};

const ACEITA_ARQUIVO_POR_TIPO = {
  2: ".pdf,application/pdf",
  3: ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime",
  5: ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
};

const STATUS_PUBLICADO = 2;
const STATUS_RASCUNHO = 1;

/* Trilha de Conteudos do professor: mesmo padrao Card do curso -> Modulos -> Conteudos
   usado na experiencia do aluno (SlideConteudosCurso em SecoesAluno.jsx), reaproveitando
   as classes CSS atividades-curso__* e conteudos-modulo__*, so trocando as acoes de
   "Concluir" por gerenciamento (editar, publicar/despublicar, excluir, reordenar). */
export function SecaoConteudosProfessor({ avaliacoes = [], conteudos, cursoIdSelecionado = null, cursos, modulos, onGerenciarQuiz, onNavigate, onRefresh, onSessionExpired, turmas, usuario }) {
  const [dadosFormulario, setDadosFormulario] = useState(() => criarEstadoInicialFormulario());
  const [conteudoEmEdicaoId, setConteudoEmEdicaoId] = useState(null);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [conteudoParaExcluir, setConteudoParaExcluir] = useState(null);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState(null);
  const [mensagemLista, setMensagemLista] = useState({ tone: "", message: "" });
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [nomeArquivoSelecionado, setNomeArquivoSelecionado] = useState("");

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
        .sort((left, right) => new Date(left.dataCriacao || 0).getTime() - new Date(right.dataCriacao || 0).getTime()),
    [modulos, turmasDoProfessor]
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

  /* Um professor tem no maximo 1 turma por curso - a turma resolvida aqui e a fonte
     unica usada pra montar o card do curso e pra pre-preencher turmaId no formulario. */
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

      const conteudosDaTurma = conteudos.filter((conteudo) => conteudo.turmaId === turma.id);

      porCursoId.set(turma.cursoId, {
        curso,
        turma,
        totalModulos: (modulosPorCursoId.get(turma.cursoId) || []).length,
        totalConteudos: conteudosDaTurma.length,
        totalPublicados: conteudosDaTurma.filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO).length
      });
    });

    return [...porCursoId.values()].sort((left, right) => left.curso.titulo.localeCompare(right.curso.titulo, "pt-BR"));
  }, [conteudos, cursoPorId, modulosPorCursoId, turmasDoProfessor]);

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
      turmaId: String(cursoAtivo.turma.id),
      moduloId: String(moduloIdAlvo),
      ordemExibicao: String(conteudosDoModuloAlvo.length)
    });
    setMensagemFormulario({ tone: "", message: "" });
    setNomeArquivoSelecionado("");
    setFormularioAberto(true);
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
      turmaId: String(conteudo.turmaId),
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

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel enviar o arquivo agora." });
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
      turmaId: Number(dadosFormulario.turmaId),
      moduloId: Number(dadosFormulario.moduloId),
      statusPublicacao: Number(dadosFormulario.statusPublicacao),
      ordemExibicao: Number(dadosFormulario.ordemExibicao),
      pesoProgresso: Number(dadosFormulario.pesoProgresso)
    };

    if (!tituloNormalizado) {
      setMensagemFormulario({ tone: "error", message: "Informe o titulo do conteudo antes de salvar." });
      return;
    }

    if (!dadosEnvio.turmaId || !dadosEnvio.moduloId) {
      setMensagemFormulario({ tone: "error", message: "Nao foi possivel identificar a turma ou o modulo deste conteudo." });
      return;
    }

    if (!Number.isInteger(dadosEnvio.ordemExibicao) || dadosEnvio.ordemExibicao < 0) {
      setMensagemFormulario({ tone: "error", message: "Use um numero inteiro igual ou maior que zero para a ordem." });
      return;
    }

    if (!Number.isFinite(dadosEnvio.pesoProgresso) || dadosEnvio.pesoProgresso <= 0) {
      setMensagemFormulario({ tone: "error", message: "Informe um peso de progresso maior que zero." });
      return;
    }

    if (exigeTexto && !dadosEnvio.corpoTexto) {
      setMensagemFormulario({ tone: "error", message: "Preencha o texto principal do conteudo." });
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

      limparFormulario();
      setFormularioAberto(false);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel salvar o conteudo agora." });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!conteudoParaExcluir) {
      return;
    }

    setSalvando(true);

    try {
      await apiRequest(`/ConteudosDidaticos/${conteudoParaExcluir.id}`, { method: "DELETE" });

      if (conteudoEmEdicaoId === conteudoParaExcluir.id) {
        limparFormulario();
      }

      setConteudoParaExcluir(null);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel excluir o conteudo agora." });
      setConteudoParaExcluir(null);
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
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemLista({ tone: "error", message: err.message || "Nao foi possivel atualizar o status agora." });
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

      setMensagemLista({ tone: "error", message: err.message || "Nao foi possivel reordenar o conteudo agora." });
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  function gerenciarQuizConteudo(conteudo, quizVinculado) {
    if (!cursoAtivo) {
      return;
    }

    onGerenciarQuiz?.({
      avaliacaoId: quizVinculado?.id ?? null,
      conteudoDidaticoId: conteudo.id,
      cursoId: cursoAtivo.curso.id,
      moduloId: conteudo.moduloId,
      turmaId: cursoAtivo.turma.id
    });
  }

  return (
    <div className="tela-conteudos">
      {!cursoAtivo ? (
        <GradeCursosProfessor
          cursos={cursosDoProfessor.map(({ curso, totalConteudos, totalModulos, totalPublicados }) => ({
            curso,
            resumo: `${totalModulos} modulo${totalModulos === 1 ? "" : "s"} · ${totalConteudos} conteudo${totalConteudos === 1 ? "" : "s"}`,
            rodapeEsquerda: `${totalPublicados} publicado${totalPublicados === 1 ? "" : "s"}`,
            badge: totalConteudos > 0 && totalPublicados === totalConteudos ? "Publicado" : "Rascunho"
          }))}
          mensagemVazia="Voce ainda nao tem turmas atribuidas a nenhum curso."
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
          onExcluir={(conteudo) => setConteudoParaExcluir(conteudo)}
          onGerenciarQuiz={gerenciarQuizConteudo}
          onNovoConteudo={abrirFormularioNovoConteudo}
          onReordenar={reordenarConteudo}
          onVoltar={onNavigate ? voltarParaCursos : null}
        />
      )}

      {conteudoParaExcluir ? (
        <Modal
          onFechar={() => setConteudoParaExcluir(null)}
          titulo="Excluir conteudo"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setConteudoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir o conteudo <strong>{conteudoParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={fecharFormulario}
          titulo={conteudoEmEdicaoId ? "Editar conteudo" : "Novo conteudo"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando || enviandoArquivo} form="form-conteudo" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : conteudoEmEdicaoId ? "Salvar alteracoes" : "Criar conteudo"}
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
              <label className="campo__rotulo" htmlFor="conteudo-modulo">Modulo *</label>
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
              <span className="campo__rotulo">Tipo de conteudo *</span>
              <div aria-label="Tipo de conteudo" className="anexo-selector" role="group">
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
              <label className="campo__rotulo" htmlFor="conteudo-titulo">Titulo *</label>
              <input
                className="campo__entrada"
                disabled={salvando}
                id="conteudo-titulo"
                maxLength={180}
                name="titulo"
                onChange={atualizarCampoFormulario}
                placeholder="Ex.: Aula 01 - Panorama do modulo"
                type="text"
                value={dadosFormulario.titulo}
              />
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="conteudo-descricao">Descricao curta</label>
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
                  {tipoConteudoSelecionado === 5 ? "Imagem *" : tipoConteudoSelecionado === 3 ? "Arquivo de video *" : "Arquivo PDF *"}
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
                <label className="campo__rotulo" htmlFor="conteudo-ordem">Ordem de exibicao</label>
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
  onExcluir,
  onGerenciarQuiz,
  onNovoConteudo,
  onReordenar,
  onVoltar
}) {
  const [previaAberta, setPreviaAberta] = useState(false);

  const conteudosDoCurso = useMemo(
    () => conteudos.filter((conteudo) => conteudo.turmaId === cursoAtivo.turma.id),
    [conteudos, cursoAtivo.turma.id]
  );

  const quizzesDoCurso = useMemo(
    () => avaliacoes.filter((avaliacao) => avaliacao.turmaId === cursoAtivo.turma.id && Number(avaliacao.tipoAvaliacao) === 1),
    [avaliacoes, cursoAtivo.turma.id]
  );

  const quizPorConteudoId = useMemo(() => {
    const mapa = new Map();
    quizzesDoCurso.forEach((quiz) => {
      if (quiz.conteudoDidaticoId) {
        mapa.set(quiz.conteudoDidaticoId, quiz);
      }
    });
    return mapa;
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

  const [moduloAberto, setModuloAberto] = useState(() => modulosDoCurso[0]?.id ?? null);
  const [conteudoSelecionadoId, setConteudoSelecionadoId] = useState(null);

  function alternarModulo(moduloId) {
    setModuloAberto((atual) => (atual === moduloId ? null : moduloId));
  }

  function alternarConteudo(conteudoId) {
    setConteudoSelecionadoId((atual) => (atual === conteudoId ? null : conteudoId));
  }

  const percentualPublicado = conteudosDoCurso.length
    ? Math.round((conteudosDoCurso.filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO).length / conteudosDoCurso.length) * 100)
    : 0;

  return (
    <div className="conteudos-aluno">
      {onVoltar ? (
        <nav aria-label="Navegacao da trilha de conteudos" className="atividades-curso__navegacao">
          <button className="atividades-curso__voltar" onClick={onVoltar} type="button">
            <TbArrowLeft aria-hidden="true" size={22} />
            Voltar para Conteudos
          </button>
        </nav>
      ) : null}

      <header className="atividades-curso__cabecalho">
        <h2 className="atividades-curso__titulo">{cursoAtivo.curso.titulo}</h2>
        <div className="atividades-curso__progresso">
          <span className="atividades-curso__progresso-texto">{percentualPublicado}% publicado</span>
          <Botao onClick={() => setPreviaAberta(true)} tamanho="pequeno" variante="fantasma">
            <TbEye aria-hidden="true" size={15} /> Visualizar como aluno
          </Botao>
        </div>
      </header>

      {mensagemLista.message ? <InlineMessage tone={mensagemLista.tone}>{mensagemLista.message}</InlineMessage> : null}

      {modulosDoCurso.length === 0 ? (
        <p className="texto-vazio" role="status">Este curso ainda nao tem modulos cadastrados.</p>
      ) : (
        <div className="atividades-curso__lista-modulos">
          {modulosDoCurso.map((modulo, indiceModulo) => {
            const itensDoModulo = conteudosPorModuloId.get(modulo.id) || [];
            const estaAberto = moduloAberto === modulo.id;
            const idListaModulo = `conteudos-modulo-professor-lista-${modulo.id}`;
            const totalPublicadosModulo = itensDoModulo.filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO).length;

            return (
              <section className="conteudos-modulo" id={`conteudos-modulo-professor-${modulo.id}`} key={modulo.id}>
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
                        <span aria-hidden="true" className="conteudos-modulo__icone">
                          <TbLayoutGrid size="1.15rem" />
                        </span>
                        <span className="conteudos-modulo__eyebrow">Modulo {String(indiceModulo + 1).padStart(2, "0")}</span>
                        <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                        <span className="conteudos-modulo__contagem">
                          {itensDoModulo.length} conteudo{itensDoModulo.length === 1 ? "" : "s"} · {totalPublicadosModulo} publicado{totalPublicadosModulo === 1 ? "" : "s"}
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
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      id={idListaModulo}
                      initial={{ height: 0, opacity: 0 }}
                      key={`lista-professor-${modulo.id}`}
                      style={{ overflow: "hidden" }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                      {itensDoModulo.length === 0 ? (
                        <p className="texto-vazio" role="status">Nenhum conteudo neste modulo ainda.</p>
                      ) : (
                        <ul aria-label={`Conteudos de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                          {itensDoModulo.map((conteudo, indiceConteudo) => {
                            const conteudoAtivo = conteudoSelecionadoId === conteudo.id;
                            const processando = acaoEmAndamentoId === conteudo.id;
                            const publicado = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO;
                            const quizVinculado = quizPorConteudoId.get(conteudo.id) || null;

                            return (
                              <li className="atividades-curso__item" key={conteudo.id}>
                                <div
                                  aria-expanded={conteudoAtivo}
                                  aria-label={`Gerenciar ${normalizeContentType(conteudo.tipoConteudo)}: ${conteudo.titulo}`}
                                  className={`atividades-curso__linha${conteudoAtivo ? " atividades-curso__linha--ativa" : ""}`}
                                  onClick={() => alternarConteudo(conteudo.id)}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter" && event.key !== " ") {
                                      return;
                                    }
                                    event.preventDefault();
                                    alternarConteudo(conteudo.id);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <span aria-hidden="true" className="atividades-curso__icone">
                                    {ICONE_TIPO_CONTEUDO_LINHA[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.5rem" />}
                                  </span>
                                  <div className="atividades-curso__corpo">
                                    <span className="atividades-curso__item-titulo-linha">
                                      <strong className="atividades-curso__item-titulo">{conteudo.titulo}</strong>
                                      <TbChevronDown
                                        aria-hidden="true"
                                        className={`atividades-curso__chevron${conteudoAtivo ? " atividades-curso__chevron--aberto" : ""}`}
                                        size="1rem"
                                      />
                                    </span>
                                    <p className="atividades-curso__meta">
                                      <span>{normalizeContentType(conteudo.tipoConteudo)}</span>
                                      <span aria-hidden="true" className="atividades-curso__separador">·</span>
                                      <Insignia texto={normalizePublicationStatus(conteudo.statusPublicacao)} />
                                    </p>
                                  </div>
                                  <div className="atividades-curso__acoes" onClick={(event) => event.stopPropagation()}>
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
                                      key={`acoes-conteudo-${conteudo.id}`}
                                      style={{ overflow: "hidden" }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                    >
                                      <div className="atividades-curso__previa atividades-curso__previa--acoes">
                                        {conteudo.descricao ? <p>{conteudo.descricao}</p> : null}
                                        <div className="atividades-curso__painel-acoes">
                                          <Botao onClick={() => onAbrirEdicao(conteudo)} tamanho="pequeno" variante="fantasma">
                                            <TbPencil aria-hidden="true" size={15} /> Editar conteudo
                                          </Botao>
                                          <Botao onClick={() => onGerenciarQuiz(conteudo, quizVinculado)} tamanho="pequeno" variante="fantasma">
                                            <TbTrophy aria-hidden="true" size={15} /> {quizVinculado ? "Editar quiz" : "Adicionar quiz"}
                                          </Botao>
                                          <div className="atividades-curso__publicar">
                                            <span className="atividades-curso__publicar-rotulo">{publicado ? "Publicado" : "Rascunho"}</span>
                                            <button
                                              aria-checked={publicado}
                                              aria-label={publicado ? "Publicado - clique para voltar a rascunho" : "Rascunho - clique para publicar"}
                                              className={`switch-ativo${publicado ? " switch-ativo--ativo" : ""}`}
                                              disabled={processando}
                                              onClick={() => onAlternarPublicacao(conteudo)}
                                              role="switch"
                                              type="button"
                                            >
                                              <TbX aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--esq" size={10} />
                                              <span aria-hidden="true" className="switch-ativo__thumb" />
                                              <TbCheck aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--dir" size={10} />
                                            </button>
                                          </div>
                                          <Botao onClick={() => onExcluir(conteudo)} tamanho="pequeno" variante="perigo">
                                            <MdDelete aria-hidden="true" size={15} /> Excluir
                                          </Botao>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <Botao className="atividades-curso__adicionar" onClick={() => onNovoConteudo(modulo.id)} tamanho="pequeno" variante="sucesso">
                        <TbPlus aria-hidden="true" size={13} /> Adicionar conteudo
                      </Botao>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}

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
          Pre-visualizacao estrutural: mostra so o conteudo publicado, sem dados de progresso de nenhum aluno.
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
                        <TbLayoutGrid size="1.15rem" />
                      </span>
                      <span className="conteudos-modulo__eyebrow">Modulo {String(indice + 1).padStart(2, "0")}</span>
                      <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                      <span className="conteudos-modulo__contagem">{itens.length} conteudo{itens.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </header>

                <ul aria-label={`Conteudos de ${modulo.titulo}`} className="conteudos-modulo__lista atividades-curso__lista" role="list">
                  {itens.map((conteudo) => {
                    const quizVinculado = quizPorConteudoId.get(conteudo.id) || null;

                    return (
                      <li className="atividades-curso__item" key={conteudo.id}>
                        <div className="atividades-curso__linha">
                          <span aria-hidden="true" className="atividades-curso__icone">
                            {ICONE_TIPO_CONTEUDO_LINHA[Number(conteudo.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.5rem" />}
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
                                  <TbTrophy aria-hidden="true" size="1.5rem" />
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
                          <TbTrophy aria-hidden="true" size="1.5rem" />
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
    turmaId: conteudo.turmaId,
    moduloId: conteudo.moduloId,
    statusPublicacao: Number(conteudo.statusPublicacao),
    ordemExibicao: conteudo.ordemExibicao ?? 0,
    pesoProgresso: conteudo.pesoProgresso ?? 1,
    ...overrides
  };
}

function criarEstadoInicialFormulario(overrides = {}) {
  return {
    turmaId: "",
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
