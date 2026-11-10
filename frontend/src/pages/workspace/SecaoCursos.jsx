import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbPlus, TbSearch, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import { InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { mapById } from "../../lib/dashboard.js";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { formatGrade, normalizeStatus } from "../../lib/format.js";
import { getCourseCover } from "../../data/courseCovers.js";
import { resolverImagemCurso } from "../../lib/courseImage.js";
import PainelCursoGestao from "./PainelCursoGestao.jsx";

function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/* CURSOS — grade de cards (mesmo padrao catalogo-card/catalogo-grade usado em
   Progresso/Conteudos/Avaliacoes). Clicar num card abre a visao gerencial do
   curso (alunos matriculados, media geral, estrutura, acoes administrativas)
   em vez de um menu de contexto solto no card. */
export function SecaoCursos({
  coordenadores = [],
  cursoIdSelecionado = null,
  cursos,
  ehAdmin,
  ehCoordenador,
  matriculas = [],
  modulos = [],
  onNavigate,
  onRefresh,
  onSessionExpired,
  professores = []
}) {
  const { mostrarToast } = useToast();
  const [filtroCoordenador, setFiltroCoordenador] = useState("todos");
  const [buscaCurso, setBuscaCurso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [cursoParaCoordenador, setCursoParaCoordenador] = useState(null);
  const [coordenadorIdParaCurso, setCoordenadorIdParaCurso] = useState("");
  const [mensagemCoordenadorCurso, setMensagemCoordenadorCurso] = useState({ tone: "", message: "" });
  const [salvandoCoordenadorCurso, setSalvandoCoordenadorCurso] = useState(false);
  const [cursoParaImagem, setCursoParaImagem] = useState(null);
  const [arquivoImagemSelecionado, setArquivoImagemSelecionado] = useState(null);
  const [previewImagem, setPreviewImagem] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [mensagemImagem, setMensagemImagem] = useState({ tone: "", message: "" });
  const [cursoParaEditar, setCursoParaEditar] = useState(null);
  const [dadosEdicaoCurso, setDadosEdicaoCurso] = useState({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
  const [mensagemEdicao, setMensagemEdicao] = useState({ tone: "", message: "" });
  const [formularioCriacaoAberto, setFormularioCriacaoAberto] = useState(false);
  const [dadosCriacaoCurso, setDadosCriacaoCurso] = useState({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
  const [mensagemCriacao, setMensagemCriacao] = useState({ tone: "", message: "" });
  const [salvandoCriacao, setSalvandoCriacao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const coordenadoresOrdenados = useMemo(
    () => [...coordenadores].sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [coordenadores]
  );
  const coordenadorPorId = useMemo(() => mapById(coordenadoresOrdenados), [coordenadoresOrdenados]);

  const resumoPorCursoId = useMemo(() => {
    const resumoInicial = new Map(
      cursos.map((curso) => [curso.id, { modulos: 0, matriculas: 0, alunosMatriculados: 0, somaNotas: 0, notasContadas: 0 }])
    );

    modulos.forEach((modulo) => {
      const resumo = resumoInicial.get(modulo.cursoId);

      if (resumo) {
        resumo.modulos += 1;
      }
    });

    matriculas.forEach((matricula) => {
      const resumo = resumoInicial.get(matricula.cursoId);

      if (!resumo) {
        return;
      }

      resumo.matriculas += 1;

      if (normalizeStatus(matricula.status) === "Aprovada") {
        resumo.alunosMatriculados += 1;

        if (Number(matricula.notaFinal) > 0) {
          resumo.somaNotas += Number(matricula.notaFinal);
          resumo.notasContadas += 1;
        }
      }
    });

    return resumoInicial;
  }, [cursos, matriculas, modulos]);

  function mediaDoCurso(resumo) {
    return resumo.notasContadas > 0 ? resumo.somaNotas / resumo.notasContadas : 0;
  }

  const termoBusca = useMemo(() => normalizarBusca(buscaCurso), [buscaCurso]);
  const cursosFiltrados = useMemo(() => {
    let proximosCursos = cursos;

    if (ehAdmin && filtroCoordenador === "aguardando") {
      proximosCursos = proximosCursos.filter((curso) => !curso.coordenadorId);
    } else if (ehAdmin && filtroCoordenador !== "todos") {
      const coordenadorId = Number(filtroCoordenador);
      proximosCursos = proximosCursos.filter((curso) => Number(curso.coordenadorId) === coordenadorId);
    }

    if (!termoBusca) {
      return [...proximosCursos].sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR"));
    }

    return proximosCursos.filter((curso) => {
      const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;
      const coordenacao = coordenador?.nome || (curso.coordenadorId ? `Usuario #${curso.coordenadorId}` : "Nao atribuida");
      const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, matriculas: 0 };
      const campos = [
        curso.codigoRegistro,
        curso.titulo,
        curso.descricao,
        coordenacao,
        `${resumo.modulos} modulos`,
        `${resumo.matriculas} matriculas`
      ];

      return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
    }).sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR"));
  }, [coordenadorPorId, cursos, ehAdmin, filtroCoordenador, resumoPorCursoId, termoBusca]);
  const temFiltroAtivo = Boolean(termoBusca || (ehAdmin && filtroCoordenador !== "todos"));

  const cursoSelecionado = useMemo(
    () => cursos.find((curso) => curso.id === cursoIdSelecionado) || null,
    [cursoIdSelecionado, cursos]
  );

  // O curso aberto e controlado pela rota (/app/cursos/:id), pra Admin e pra
  // Coordenador - se o id nao bate com nenhum curso visivel depois dos dados
  // carregarem, volta pra lista.
  useEffect(() => {
    if (!cursoIdSelecionado) {
      return;
    }

    if (cursos.some((curso) => curso.id === cursoIdSelecionado)) {
      return;
    }

    onNavigate?.("/app/cursos", { replace: true });
  }, [cursoIdSelecionado, cursos, onNavigate]);

  function abrirDetalheCurso(curso) {
    onNavigate?.(`/app/cursos/${curso.id}`);
  }

  function voltarParaListaCursos() {
    onNavigate?.("/app/cursos");
  }

  function limparFiltros() {
    setBuscaCurso("");
    setFiltroCoordenador("todos");
  }

  function abrirModalCoordenadorCurso(curso) {
    setCursoParaCoordenador(curso);
    setCoordenadorIdParaCurso(curso.coordenadorId ? String(curso.coordenadorId) : "0");
    setMensagemCoordenadorCurso({ tone: "", message: "" });
  }

  function fecharModalCoordenadorCurso() {
    if (salvandoCoordenadorCurso) {
      return;
    }

    setCursoParaCoordenador(null);
  }

  async function salvarCoordenadorCurso() {
    const coordenadorId = Number(coordenadorIdParaCurso);

    setSalvandoCoordenadorCurso(true);
    setMensagemCoordenadorCurso({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaCoordenador.id}/coordenador`, {
        method: "PUT",
        body: JSON.stringify(coordenadorId)
      });

      const coordenador = coordenadorId ? coordenadorPorId.get(coordenadorId) : null;
      mostrarToast(
        coordenador ? `${coordenador.nome} atribuido como coordenador do curso.` : "Curso marcado como aguardando coordenador.",
        "sucesso"
      );
      setCursoParaCoordenador(null);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemCoordenadorCurso({ tone: "error", message: err.message || "Nao foi possivel atribuir o coordenador agora." });
    } finally {
      setSalvandoCoordenadorCurso(false);
    }
  }

  async function executarAcaoCurso(curso, acao, mensagemSucesso, mensagemErroPadrao) {
    setSalvando(true);
    try {
      await apiRequest(`/Cursos/${curso.id}/${acao}`, { method: "POST" });
      mostrarToast(mensagemSucesso, "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || mensagemErroPadrao, "erro");
    } finally {
      setSalvando(false);
    }
  }

  const encerrarCurso = (curso) =>
    executarAcaoCurso(curso, "encerrar", "Curso encerrado com sucesso.", "Nao foi possivel encerrar o curso agora.");

  const reabrirCurso = (curso) =>
    executarAcaoCurso(curso, "reabrir", "Curso reaberto com sucesso.", "Nao foi possivel reabrir o curso agora.");

  function abrirModalEdicao(curso) {
    setCursoParaEditar(curso);
    setDadosEdicaoCurso({
      titulo: curso.titulo || "",
      descricao: curso.descricao || "",
      preco: String(curso.preco ?? ""),
      modeloCurso: Number(curso.modeloCurso) || 2
    });
    setMensagemEdicao({ tone: "", message: "" });
  }

  function fecharModalEdicao() {
    if (salvandoEdicao) {
      return;
    }

    setCursoParaEditar(null);
  }

  function atualizarCampoEdicao(event) {
    const { name, value } = event.target;
    setDadosEdicaoCurso((atual) => ({ ...atual, [name]: value }));
  }

  async function salvarEdicaoCurso(event) {
    event.preventDefault();

    const preco = Number(dadosEdicaoCurso.preco);

    if (!dadosEdicaoCurso.titulo.trim()) {
      setMensagemEdicao({ tone: "error", message: "Informe o titulo do curso." });
      return;
    }

    if (ehAdmin && (!Number.isFinite(preco) || preco < 0)) {
      setMensagemEdicao({ tone: "error", message: "Informe um preco valido." });
      return;
    }

    setSalvandoEdicao(true);
    setMensagemEdicao({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaEditar.id}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: dadosEdicaoCurso.titulo.trim(),
          descricao: dadosEdicaoCurso.descricao.trim(),
          preco,
          ...(ehAdmin ? { modeloCurso: Number(dadosEdicaoCurso.modeloCurso) } : {})
        })
      });

      setCursoParaEditar(null);
      mostrarToast("Curso salvo com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemEdicao({ tone: "error", message: err.message || "Nao foi possivel salvar o curso agora." });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirFormularioCriacaoCurso() {
    setDadosCriacaoCurso({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
    setMensagemCriacao({ tone: "", message: "" });
    setFormularioCriacaoAberto(true);
  }

  function fecharFormularioCriacaoCurso() {
    if (salvandoCriacao) {
      return;
    }

    setFormularioCriacaoAberto(false);
  }

  function atualizarCampoCriacaoCurso(event) {
    const { name, value } = event.target;
    setDadosCriacaoCurso((atual) => ({ ...atual, [name]: value }));
  }

  async function salvarNovoCurso(event) {
    event.preventDefault();

    const preco = Number(dadosCriacaoCurso.preco || 0);

    if (!dadosCriacaoCurso.titulo.trim()) {
      setMensagemCriacao({ tone: "error", message: "Informe o titulo do curso." });
      return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
      setMensagemCriacao({ tone: "error", message: "Informe um preco valido." });
      return;
    }

    setSalvandoCriacao(true);
    setMensagemCriacao({ tone: "", message: "" });

    try {
      await apiRequest("/Cursos", {
        method: "POST",
        body: JSON.stringify({
          titulo: dadosCriacaoCurso.titulo.trim(),
          descricao: dadosCriacaoCurso.descricao.trim(),
          preco,
          modeloCurso: Number(dadosCriacaoCurso.modeloCurso)
        })
      });

      setFormularioCriacaoAberto(false);
      mostrarToast("Curso criado com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemCriacao({ tone: "error", message: err.message || "Nao foi possivel criar o curso agora." });
    } finally {
      setSalvandoCriacao(false);
    }
  }

  function abrirModalImagem(curso) {
    setCursoParaImagem(curso);
    setArquivoImagemSelecionado(null);
    setPreviewImagem(curso.imagemUrl || "");
    setMensagemImagem({ tone: "", message: "" });
  }

  function fecharModalImagem() {
    if (enviandoImagem) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setCursoParaImagem(null);
    setArquivoImagemSelecionado(null);
    setPreviewImagem("");
  }

  function selecionarArquivoImagem(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setArquivoImagemSelecionado(arquivo);
    setPreviewImagem(URL.createObjectURL(arquivo));
  }

  async function enviarImagemCurso() {
    if (!cursoParaImagem || !arquivoImagemSelecionado) {
      setMensagemImagem({ tone: "error", message: "Selecione uma imagem antes de salvar." });
      return;
    }

    const formData = new FormData();
    formData.append("imagem", arquivoImagemSelecionado);

    setEnviandoImagem(true);
    setMensagemImagem({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaImagem.id}/imagem`, { method: "POST", body: formData });
      fecharModalImagem();
      mostrarToast("Imagem do curso atualizada com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemImagem({ tone: "error", message: err.message || "Nao foi possivel enviar a imagem agora." });
    } finally {
      setEnviandoImagem(false);
    }
  }

  const modaisComuns = (
    <>
      {formularioCriacaoAberto ? (
        <Modal
          onFechar={fecharFormularioCriacaoCurso}
          titulo="Novo curso"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoCriacao} onClick={fecharFormularioCriacaoCurso} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoCriacao} form="form-novo-curso" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoCriacao ? "Salvando..." : "Criar curso"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-novo-curso" onSubmit={salvarNovoCurso}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-titulo">Titulo *</label>
              <input autoComplete="off" className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-titulo" maxLength={150} name="titulo" onChange={atualizarCampoCriacaoCurso} value={dadosCriacaoCurso.titulo} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-descricao">Descricao</label>
              <textarea className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-descricao" maxLength={1000} name="descricao" onChange={atualizarCampoCriacaoCurso} rows={4} value={dadosCriacaoCurso.descricao} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-preco">Preco (R$) *</label>
              <input className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-preco" inputMode="decimal" min={0} name="preco" onChange={atualizarCampoCriacaoCurso} step="0.01" type="number" value={dadosCriacaoCurso.preco} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-modelo">Modelo de curso *</label>
              <select className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-modelo" name="modeloCurso" onChange={atualizarCampoCriacaoCurso} value={dadosCriacaoCurso.modeloCurso}>
                <option value={1}>Gratuito (conteudo pronto)</option>
                <option value={2}>Pago (pacote pronto)</option>
                <option value={3}>Acompanhado (professor libera aos poucos)</option>
              </select>
              <p className="campo__ajuda">Acompanhado precisa ser concluido pelo professor e encerrado pelo coordenador antes de liberar certificados.</p>
            </div>

            {mensagemCriacao.message ? <InlineMessage tone={mensagemCriacao.tone}>{mensagemCriacao.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}

      {cursoParaEditar ? (
        <Modal
          onFechar={fecharModalEdicao}
          titulo={`Editar curso - ${cursoParaEditar.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoEdicao} onClick={fecharModalEdicao} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoEdicao} form="form-editar-curso" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoEdicao ? "Salvando..." : "Salvar alteracoes"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-editar-curso" onSubmit={salvarEdicaoCurso}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-titulo">Titulo *</label>
              <input className="campo__entrada" disabled={salvandoEdicao} id="curso-titulo" maxLength={150} name="titulo" onChange={atualizarCampoEdicao} value={dadosEdicaoCurso.titulo} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-descricao">Descricao</label>
              <textarea className="campo__entrada" disabled={salvandoEdicao} id="curso-descricao" maxLength={1000} name="descricao" onChange={atualizarCampoEdicao} rows={4} value={dadosEdicaoCurso.descricao} />
            </div>
            {ehAdmin ? (
              <div className="campo">
                <label className="campo__rotulo" htmlFor="curso-preco">Preco (R$) *</label>
                <input className="campo__entrada" disabled={salvandoEdicao} id="curso-preco" inputMode="decimal" min={0} name="preco" onChange={atualizarCampoEdicao} step="0.01" type="number" value={dadosEdicaoCurso.preco} />
              </div>
            ) : null}
            {ehAdmin ? (
              <div className="campo">
                <label className="campo__rotulo" htmlFor="curso-modelo">Modelo de curso *</label>
                <select className="campo__entrada" disabled={salvandoEdicao} id="curso-modelo" name="modeloCurso" onChange={atualizarCampoEdicao} value={dadosEdicaoCurso.modeloCurso}>
                  <option value={1}>Gratuito (conteudo pronto)</option>
                  <option value={2}>Pago (pacote pronto)</option>
                  <option value={3}>Acompanhado (professor libera aos poucos)</option>
                </select>
              </div>
            ) : null}

            {mensagemEdicao.message ? <InlineMessage tone={mensagemEdicao.tone}>{mensagemEdicao.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}

      {cursoParaImagem ? (
        <Modal
          onFechar={fecharModalImagem}
          titulo={`Foto de capa - ${cursoParaImagem.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={enviandoImagem} onClick={fecharModalImagem} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={enviandoImagem || !arquivoImagemSelecionado} onClick={enviarImagemCurso} type="button" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {enviandoImagem ? "Enviando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <div className="campo">
            <label className="campo__rotulo" htmlFor="curso-imagem">Imagem *</label>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="campo__entrada"
              disabled={enviandoImagem}
              id="curso-imagem"
              onChange={selecionarArquivoImagem}
              type="file"
            />
          </div>

          {previewImagem ? (
            <img alt="" className="novo-cont__miniatura" src={resolverUrlArquivo(previewImagem)} style={{ marginTop: "var(--espaco-md)" }} />
          ) : null}

          {mensagemImagem.message ? <InlineMessage tone={mensagemImagem.tone}>{mensagemImagem.message}</InlineMessage> : null}
        </Modal>
      ) : null}

      {cursoParaCoordenador ? (
        <Modal
          onFechar={fecharModalCoordenadorCurso}
          titulo={`Coordenador de ${cursoParaCoordenador.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoCoordenadorCurso} onClick={fecharModalCoordenadorCurso} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoCoordenadorCurso} onClick={salvarCoordenadorCurso} type="button" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoCoordenadorCurso ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <div className="campo">
            <label className="campo__rotulo" htmlFor="curso-coordenador-select">Coordenador</label>
            <select
              className="campo__entrada"
              disabled={salvandoCoordenadorCurso}
              id="curso-coordenador-select"
              onChange={(event) => setCoordenadorIdParaCurso(event.target.value)}
              value={coordenadorIdParaCurso}
            >
              <option value="0">Aguardando coordenador</option>
              {coordenadoresOrdenados.map((coordenador) => (
                <option key={coordenador.id} value={coordenador.id}>
                  {coordenador.nome}
                </option>
              ))}
            </select>
          </div>
          {mensagemCoordenadorCurso.message ? <InlineMessage tone={mensagemCoordenadorCurso.tone}>{mensagemCoordenadorCurso.message}</InlineMessage> : null}
        </Modal>
      ) : null}
    </>
  );

  if (cursoSelecionado) {
    return (
      <div className="tela-cursos">
        <PainelCursoGestao
          coordenadores={coordenadoresOrdenados}
          curso={cursoSelecionado}
          modulos={modulos}
          onAlterarFotoCurso={() => abrirModalImagem(cursoSelecionado)}
          onAtribuirCoordenador={() => abrirModalCoordenadorCurso(cursoSelecionado)}
          onEditarCurso={() => abrirModalEdicao(cursoSelecionado)}
          onEncerrarCurso={() => encerrarCurso(cursoSelecionado)}
          onReabrirCurso={() => reabrirCurso(cursoSelecionado)}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
          onVoltar={voltarParaListaCursos}
          perfil={ehAdmin ? "Admin" : "Coordenador"}
          professores={professores}
          salvandoCurso={salvando}
        />
        {modaisComuns}
      </div>
    );
  }

  return (
    <div className="tela-cursos">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Cursos</h2>
          <p className="cabecalho-pagina__subtitulo">
            {ehCoordenador
              ? "Cursos ativos vinculados a sua coordenacao."
              : ehAdmin
                ? "Todos os cursos cadastrados na plataforma."
                : "Catalogo academico reutilizado na home publica e no ambiente autenticado."}
          </p>
        </div>

        <div className="barra-filtros">
          <label className="visualmente-oculto" htmlFor="busca-cursos">Buscar curso</label>
          <div className="campo-busca">
            <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
            <input
              className="campo__entrada"
              id="busca-cursos"
              onChange={(event) => setBuscaCurso(event.target.value)}
              placeholder="Pesquisar cursos"
              type="search"
              value={buscaCurso}
            />
          </div>

          {ehAdmin ? (
            <Botao onClick={abrirFormularioCriacaoCurso} tamanho="pequeno" variante="primario">
              <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                <TbPlus aria-hidden="true" size={16} />
              </motion.span>{" "}
              Novo curso
            </Botao>
          ) : null}
        </div>
      </header>

      {ehAdmin ? (
        <div className="barra-filtros">
          <label className="visualmente-oculto" htmlFor="filtro-coordenador">Filtrar por coordenador</label>
          <select
            className="campo__entrada barra-filtros__select"
            id="filtro-coordenador"
            onChange={(event) => setFiltroCoordenador(event.target.value)}
            value={filtroCoordenador}
          >
            <option value="todos">Todos os coordenadores</option>
            <option value="aguardando">Aguardando coordenador</option>
            {coordenadoresOrdenados.map((coordenador) => (
              <option key={coordenador.id} value={coordenador.id}>
                {coordenador.nome}
              </option>
            ))}
          </select>
          <Botao disabled={!temFiltroAtivo} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
            Limpar filtros
          </Botao>
        </div>
      ) : null}

      {cursosFiltrados.length === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">
          {temFiltroAtivo ? "Nenhum curso encontrado com os filtros aplicados." : ehCoordenador ? "Nenhum curso ativo sob sua coordenacao." : "Nenhum curso encontrado."}
        </p>
      ) : (
        <ul aria-label="Cursos" className={`catalogo-grade${ehCoordenador ? " catalogo-grade--relevo" : ""}`} role="list">
          {cursosFiltrados.map((curso) => {
            const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, alunosMatriculados: 0, notasContadas: 0 };
            const media = mediaDoCurso(resumo);
            const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;

            return (
              <li key={curso.id}>
                <button
                  className="catalogo-card catalogo-card--acionavel"
                  onClick={() => abrirDetalheCurso(curso)}
                  type="button"
                >
                  <img
                    alt=""
                    className="catalogo-card__imagem"
                    loading="lazy"
                    src={resolverImagemCurso(curso)}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getCourseCover(curso);
                    }}
                  />
                  <div className="catalogo-card__corpo">
                    <div className="meus-cursos__titulo-linha">
                      <strong className="catalogo-card__titulo">{curso.titulo}</strong>
                      <Insignia texto={coordenador || curso.coordenadorId ? "Coordenado" : "Pendente"} />
                    </div>
                    <p className="catalogo-card__data">
                      {resumo.alunosMatriculados} aluno{resumo.alunosMatriculados === 1 ? "" : "s"} · {resumo.modulos} modulo{resumo.modulos === 1 ? "" : "s"}
                    </p>
                    <footer className="catalogo-card__rodape-aluno">
                      <span className="catalogo-card__codigo">{curso.codigoRegistro || "Sem codigo"}</span>
                      <Insignia texto={`Media ${formatGrade(media)}`} />
                    </footer>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {modaisComuns}
    </div>
  );
}
