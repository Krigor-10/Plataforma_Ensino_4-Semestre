import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbDotsVertical, TbExternalLink, TbFile, TbFileText, TbPhoto, TbPlayerPlay, TbPlus, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
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

const ACEITA_ARQUIVO_POR_TIPO = {
  2: ".pdf,application/pdf",
  3: ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime",
  5: ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
};

export function SecaoConteudosProfessor({ conteudos, solicitacaoNovoConteudo = 0, cursos, modulos, onRefresh, onSessionExpired, turmas, usuario }) {
  const [dadosFormulario, setDadosFormulario] = useState(() => criarEstadoInicialFormulario([], []));
  const [conteudoEmEdicaoId, setConteudoEmEdicaoId] = useState(null);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [conteudoParaExcluir, setConteudoParaExcluir] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [slideAtual, setSlideAtual] = useState(0);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [nomeArquivoSelecionado, setNomeArquivoSelecionado] = useState("");

  useEffect(() => {
    if (menuAbertoId === null) {
      return undefined;
    }

    function fechar() {
      setMenuAbertoId(null);
    }

    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
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
    if (conteudoEmEdicaoId || dadosFormulario.turmaId || !turmasDoProfessor.length) {
      return;
    }

    setDadosFormulario(criarEstadoInicialFormulario(turmasDoProfessor, modulosDoProfessor));
  }, [conteudoEmEdicaoId, dadosFormulario.turmaId, modulosDoProfessor, turmasDoProfessor]);

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
    if (!turmaSelecionadaFormulario || conteudoEmEdicaoId) {
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
  }, [modulosDisponiveis, conteudoEmEdicaoId, dadosFormulario.moduloId, turmaSelecionadaFormulario]);

  useEffect(() => {
    if (solicitacaoNovoConteudo > 0) {
      abrirFormularioNovoConteudo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacaoNovoConteudo]);

  const grupos = useMemo(
    () =>
      turmasDoProfessor.map((turma) => ({
        turma,
        curso: cursoPorId.get(turma.cursoId) || null,
        itens: [...conteudos]
          .filter((conteudo) => conteudo.turmaId === turma.id)
          .sort((left, right) => {
            const moduloComparison = (left.moduloTitulo || "").localeCompare(right.moduloTitulo || "", "pt-BR");
            if (moduloComparison !== 0) {
              return moduloComparison;
            }

            if ((left.ordemExibicao ?? 0) !== (right.ordemExibicao ?? 0)) {
              return (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0);
            }

            return (left.titulo || "").localeCompare(right.titulo || "", "pt-BR");
          })
      })),
    [conteudos, cursoPorId, turmasDoProfessor]
  );

  const total = grupos.length;
  const slide = Math.min(slideAtual, Math.max(0, total - 1));

  function irPara(indice) {
    setSlideAtual(Math.max(0, Math.min(indice, total - 1)));
  }

  const tipoConteudoSelecionado = Number(dadosFormulario.tipoConteudo || OPCOES_TIPO_CONTEUDO[0].value);
  const exigeTexto = tipoConteudoSelecionado === 1;
  const exigeUpload = tipoConteudoSelecionado === 2 || tipoConteudoSelecionado === 3 || tipoConteudoSelecionado === 5;
  const exigeUrlRecurso = tipoConteudoSelecionado === 4;

  function limparFormulario() {
    setConteudoEmEdicaoId(null);
    setDadosFormulario(criarEstadoInicialFormulario(turmasDoProfessor, modulosDoProfessor));
    setMensagemFormulario({ tone: "", message: "" });
    setNomeArquivoSelecionado("");
  }

  function abrirFormularioNovoConteudo() {
    limparFormulario();
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
    setMenuAbertoId(null);
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

    if (!turmasDoProfessor.length) {
      setMensagemFormulario({ tone: "error", message: "Seu perfil ainda nao possui turmas para publicacao." });
      return;
    }

    if (!modulosDisponiveis.length) {
      setMensagemFormulario({ tone: "error", message: "Nao existem modulos disponiveis para a turma selecionada." });
      return;
    }

    if (!tituloNormalizado) {
      setMensagemFormulario({ tone: "error", message: "Informe o titulo do conteudo antes de salvar." });
      return;
    }

    if (!dadosEnvio.turmaId) {
      setMensagemFormulario({ tone: "error", message: "Selecione a turma que vai receber o conteudo." });
      return;
    }

    if (!dadosEnvio.moduloId) {
      setMensagemFormulario({ tone: "error", message: "Selecione um modulo para organizar a publicacao." });
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

  return (
    <div className="tela-conteudos">
      <header className="cabecalho-pagina">
        <div style={{ flex: 1 }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-lg)" }}>
            <h2 className="cabecalho-pagina__titulo">Conteudos</h2>
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
                <Botao onClick={abrirFormularioNovoConteudo} variante="primario">
                  <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                    <TbPlus aria-hidden="true" size={18} />
                  </motion.span>{" "}
                  Novo conteudo
                </Botao>
              </>
            ) : null}
          </div>
          <p className="cabecalho-pagina__subtitulo">{conteudos.length} conteudo{conteudos.length === 1 ? "" : "s"} publicado{conteudos.length === 1 ? "" : "s"}</p>
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
            <SlideConteudos
              curso={grupos[slide].curso}
              itens={grupos[slide].itens}
              menuAbertoId={menuAbertoId}
              onEditar={abrirEdicaoConteudo}
              onExcluir={(conteudo) => {
                setConteudoParaExcluir(conteudo);
                setMenuAbertoId(null);
              }}
              onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
              turma={grupos[slide].turma}
            />
          </div>
        </div>
      )}

      {conteudoParaExcluir ? (
        <Modal onFechar={() => setConteudoParaExcluir(null)} titulo="Excluir conteudo">
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: "var(--espaco-xl)" }}>
            Deseja excluir o conteudo <strong>{conteudoParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
          <footer className="modal-rodape">
            <Botao disabled={salvando} onClick={() => setConteudoParaExcluir(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Cancelar
            </Botao>
            <Botao disabled={salvando} onClick={confirmarExclusao} variante="primario">
              {salvando ? "Excluindo..." : "Confirmar exclusao"}
            </Botao>
          </footer>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal onFechar={fecharFormulario} titulo={conteudoEmEdicaoId ? "Editar conteudo" : "Novo conteudo"}>
          {!turmasDoProfessor.length ? (
            <InlineMessage tone="info">Seu usuario ainda nao possui turmas atribuidas.</InlineMessage>
          ) : !modulosDoProfessor.length ? (
            <InlineMessage tone="info">Suas turmas ainda nao tem modulos cadastrados nos cursos correspondentes.</InlineMessage>
          ) : (
            <form className="formulario-modal" onSubmit={salvarConteudoDidatico}>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-turma">Turma *</label>
                <select
                  className="campo__entrada"
                  disabled={salvando}
                  id="conteudo-turma"
                  name="turmaId"
                  onChange={atualizarCampoFormulario}
                  value={dadosFormulario.turmaId}
                >
                  {turmasDoProfessor.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nomeTurma}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label className="campo__rotulo" htmlFor="conteudo-modulo">Modulo *</label>
                <select
                  className="campo__entrada"
                  disabled={salvando || !modulosDisponiveis.length}
                  id="conteudo-modulo"
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
                        <img alt="" className="novo-cont__miniatura" src={dadosFormulario.arquivoUrl} />
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

              <footer className="modal-rodape">
                <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                  <TbX aria-hidden="true" size={15} /> Cancelar
                </Botao>
                <Botao disabled={salvando || enviandoArquivo || !modulosDisponiveis.length} type="submit" variante="primario">
                  <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : conteudoEmEdicaoId ? "Salvar alteracoes" : "Criar conteudo"}
                </Botao>
              </footer>
            </form>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function SlideConteudos({ curso, itens, menuAbertoId, onEditar, onExcluir, onToggleMenu, turma }) {
  return (
    <div className="conteudos-aluno">
      <header className="conteudos-aluno__cabecalho">
        <div className="conteudos-aluno__curso-info">
          <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-md)" }}>
            <div aria-hidden="true" className="cartao-progresso-aluno__avatar conteudos-aluno__avatar-desktop">
              <TbFileText size={20} />
            </div>
            <h2 className="conteudos-aluno__curso-titulo">{turma.nomeTurma}</h2>
          </div>
          <div className="conteudos-aluno__meta-chips">
            <span className="conteudos-aluno__meta-chip conteudos-aluno__meta-chip--progresso">
              {itens.length} conteudo{itens.length !== 1 ? "s" : ""}
            </span>
            {curso ? <span className="conteudos-aluno__meta-chip">{curso.titulo}</span> : null}
          </div>
        </div>
      </header>

      {itens.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhum conteudo publicado para esta turma.</p>
      ) : (
        <ul aria-label={`Conteudos de ${turma.nomeTurma}`} className="lista-conteudos-completa" role="list">
          {itens.map((conteudo) => (
            <li className="cartao-conteudo" key={conteudo.id}>
              <span aria-hidden="true" className="cartao-conteudo__icone">
                {ICONE_TIPO_CONTEUDO[Number(conteudo.tipoConteudo)] || <TbFileText size={22} />}
              </span>
              <div className="cartao-conteudo__info">
                <strong className="cartao-conteudo__titulo">{conteudo.titulo}</strong>
                <p className="cartao-conteudo__modulo">{conteudo.moduloTitulo || "Sem modulo"}</p>
              </div>
              <div className="cartao-conteudo__meta">
                <Insignia texto={normalizePublicationStatus(conteudo.statusPublicacao)} />
                <span className="cartao-conteudo__duracao">{normalizeContentType(conteudo.tipoConteudo)}</span>
              </div>
              <div className="cartao-conteudo__acoes menu-contexto">
                <button
                  aria-expanded={menuAbertoId === conteudo.id}
                  aria-label={`Opcoes para ${conteudo.titulo}`}
                  className="menu-contexto__botao"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMenu(conteudo.id);
                  }}
                  type="button"
                >
                  <TbDotsVertical aria-hidden="true" size={18} />
                </button>
                {menuAbertoId === conteudo.id ? (
                  <ul className="menu-contexto__lista" role="menu">
                    <li>
                      <button onClick={() => onEditar(conteudo)} role="menuitem" type="button">
                        Editar
                      </button>
                    </li>
                    <li>
                      <button className="menu-item--perigo" onClick={() => onExcluir(conteudo)} role="menuitem" type="button">
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

function nomeArquivoDaUrl(url) {
  if (!url) {
    return "";
  }

  const partes = String(url).split("/");
  return partes[partes.length - 1] || url;
}

function criarEstadoInicialFormulario(turmas, modulos, overrides = {}) {
  const primeiraTurma = turmas[0] || null;
  const modulosDaPrimeiraTurma = primeiraTurma ? modulos.filter((modulo) => modulo.cursoId === primeiraTurma.cursoId) : [];

  return {
    turmaId: primeiraTurma ? String(primeiraTurma.id) : "",
    moduloId: modulosDaPrimeiraTurma[0] ? String(modulosDaPrimeiraTurma[0].id) : "",
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
