import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbAward, TbCamera, TbEdit, TbLayoutGrid, TbSearch, TbUserCheck, TbUsers, TbX } from "react-icons/tb";
import { MdAttachMoney, MdGroups, MdLayers, MdMenuBook, MdSave } from "react-icons/md";
import { InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { mapById } from "../../lib/dashboard.js";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { formatGrade, formatMoney, normalizeStatus } from "../../lib/format.js";
import { getCourseCover } from "../../data/courseCovers.js";

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
  cursos,
  ehAdmin,
  ehCoordenador,
  ehProfessor,
  matriculas = [],
  modulos = [],
  professores = [],
  turmas = [],
  onAbrirSecaoCurso,
  onRefresh,
  onSessionExpired
}) {
  const [cursosSelecionados, setCursosSelecionados] = useState(() => new Set());
  const [coordenadorSelecionado, setCoordenadorSelecionado] = useState("");
  const [filtroCoordenador, setFiltroCoordenador] = useState("todos");
  const [buscaCurso, setBuscaCurso] = useState("");
  const [mensagem, setMensagem] = useState({ tone: "info", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [cursoParaImagem, setCursoParaImagem] = useState(null);
  const [arquivoImagemSelecionado, setArquivoImagemSelecionado] = useState(null);
  const [previewImagem, setPreviewImagem] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [mensagemImagem, setMensagemImagem] = useState({ tone: "", message: "" });
  const [cursoParaEditar, setCursoParaEditar] = useState(null);
  const [dadosEdicaoCurso, setDadosEdicaoCurso] = useState({ titulo: "", descricao: "", preco: "" });
  const [mensagemEdicao, setMensagemEdicao] = useState({ tone: "", message: "" });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const coordenadoresOrdenados = useMemo(
    () => [...coordenadores].sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [coordenadores]
  );
  const coordenadorPorId = useMemo(() => mapById(coordenadoresOrdenados), [coordenadoresOrdenados]);
  const professorPorId = useMemo(() => mapById(professores), [professores]);
  // Assume uma turma padrao por curso (regra aplicada na criacao de turmas).
  const turmaPorCursoId = useMemo(() => {
    const mapa = new Map();

    turmas.forEach((turma) => {
      if (!mapa.has(turma.cursoId)) {
        mapa.set(turma.cursoId, turma);
      }
    });

    return mapa;
  }, [turmas]);

  const resumoPorCursoId = useMemo(() => {
    const resumoInicial = new Map(
      cursos.map((curso) => [curso.id, { modulos: 0, turmas: 0, matriculas: 0, alunosMatriculados: 0, somaNotas: 0, notasContadas: 0 }])
    );

    modulos.forEach((modulo) => {
      const resumo = resumoInicial.get(modulo.cursoId);

      if (resumo) {
        resumo.modulos += 1;
      }
    });

    turmas.forEach((turma) => {
      const resumo = resumoInicial.get(turma.cursoId);

      if (resumo) {
        resumo.turmas += 1;
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
  }, [cursos, matriculas, modulos, turmas]);

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
  const idsCursos = useMemo(() => new Set(cursosFiltrados.map((curso) => curso.id)), [cursosFiltrados]);
  const cursosMarcados = useMemo(
    () => cursosFiltrados.filter((curso) => cursosSelecionados.has(curso.id)),
    [cursosFiltrados, cursosSelecionados]
  );
  const todosCursosSelecionados =
    cursosFiltrados.length > 0 && cursosFiltrados.every((curso) => cursosSelecionados.has(curso.id));
  const quantidadeSelecionada = cursosMarcados.length;
  const temFiltroAtivo = Boolean(termoBusca || (ehAdmin && filtroCoordenador !== "todos"));

  useEffect(() => {
    setCursosSelecionados((atuais) => {
      const proximos = new Set([...atuais].filter((id) => idsCursos.has(id)));
      return proximos.size === atuais.size ? atuais : proximos;
    });
  }, [idsCursos]);

  const cursoSelecionado = useMemo(
    () => cursos.find((curso) => curso.id === cursoSelecionadoId) || null,
    [cursoSelecionadoId, cursos]
  );

  function abrirDetalheCurso(curso) {
    setCursoSelecionadoId(curso.id);
  }

  function voltarParaListaCursos() {
    setCursoSelecionadoId(null);
  }

  function alternarCurso(curso) {
    if (!ehAdmin || salvando) {
      return;
    }

    setCursosSelecionados((atuais) => {
      const proximos = new Set(atuais);

      if (proximos.has(curso.id)) {
        proximos.delete(curso.id);
      } else {
        proximos.add(curso.id);
      }

      return proximos;
    });
  }

  function alternarTodosCursos() {
    if (!ehAdmin || salvando || !cursosFiltrados.length) {
      return;
    }

    setCursosSelecionados((atuais) => {
      if (todosCursosSelecionados) {
        return new Set();
      }

      const proximos = new Set(atuais);
      cursosFiltrados.forEach((curso) => proximos.add(curso.id));
      return proximos;
    });
  }

  function limparFiltros() {
    setBuscaCurso("");
    setFiltroCoordenador("todos");
  }

  async function atribuirCoordenador() {
    const coordenadorId = Number(coordenadorSelecionado);

    if (!quantidadeSelecionada) {
      setMensagem({ tone: "error", message: "Selecione ao menos um curso para atribuir coordenador." });
      return;
    }

    if (coordenadorSelecionado === "") {
      setMensagem({ tone: "error", message: "Selecione um coordenador ou a opcao Aguardando coordenador." });
      return;
    }

    try {
      setMensagem({ tone: "info", message: "" });
      setSalvando(true);

      for (const curso of cursosMarcados) {
        await apiRequest(`/Cursos/${curso.id}/coordenador`, {
          method: "PUT",
          body: JSON.stringify(coordenadorId)
        });
      }

      const coordenador = coordenadorId ? coordenadorPorId.get(coordenadorId) : null;
      setMensagem({
        tone: "success",
        message: coordenador
          ? `${quantidadeSelecionada} curso${quantidadeSelecionada > 1 ? "s vinculados" : " vinculado"} a ${coordenador.nome}.`
          : `${quantidadeSelecionada} curso${quantidadeSelecionada > 1 ? "s marcados" : " marcado"} como aguardando coordenador.`
      });
      setCursosSelecionados(new Set());
      setCoordenadorSelecionado("");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel atribuir coordenador agora." });
      onRefresh?.();
    } finally {
      setSalvando(false);
    }
  }

  function abrirSecaoRelacionada(section, curso) {
    onAbrirSecaoCurso?.(section, curso);
  }

  function abrirModalEdicao(curso) {
    setCursoParaEditar(curso);
    setDadosEdicaoCurso({
      titulo: curso.titulo || "",
      descricao: curso.descricao || "",
      preco: String(curso.preco ?? "")
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

    if (!Number.isFinite(preco) || preco < 0) {
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
          preco
        })
      });

      setCursoParaEditar(null);
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

  const totalMatriculas = cursosFiltrados.reduce((total, curso) => total + (resumoPorCursoId.get(curso.id)?.matriculas || 0), 0);
  const totalModulos = cursosFiltrados.reduce((total, curso) => total + (resumoPorCursoId.get(curso.id)?.modulos || 0), 0);

  const modaisComuns = (
    <>
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
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-preco">Preco (R$) *</label>
              <input className="campo__entrada" disabled={salvandoEdicao} id="curso-preco" inputMode="decimal" min={0} name="preco" onChange={atualizarCampoEdicao} step="0.01" type="number" value={dadosEdicaoCurso.preco} />
            </div>

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
                {enviandoImagem ? "Enviando..." : "Salvar"}
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
    </>
  );

  if (cursoSelecionado) {
    const resumo = resumoPorCursoId.get(cursoSelecionado.id) || { modulos: 0, alunosMatriculados: 0, notasContadas: 0 };
    const media = mediaDoCurso(resumo);
    const coordenador = cursoSelecionado.coordenadorId ? coordenadorPorId.get(cursoSelecionado.coordenadorId) : null;
    const turmaPadrao = turmaPorCursoId.get(cursoSelecionado.id) || null;
    const professorNome = turmaPadrao?.professorId ? professorPorId.get(turmaPadrao.professorId)?.nome : null;

    return (
      <div className="tela-cursos">
        <div className="conteudos-aluno">
          <nav aria-label="Navegacao dos cursos" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaListaCursos} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Cursos
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{cursoSelecionado.titulo}</h2>
              <p className="atividades-curso__subtitulo">
                {cursoSelecionado.codigoRegistro || "Sem codigo"}
                {coordenador ? ` · Coordenacao: ${coordenador.nome}` : cursoSelecionado.coordenadorId ? "" : " · Aguardando coordenador"}
              </p>
            </div>
          </header>

          {cursoSelecionado.descricao ? <p className="texto-vazio">{cursoSelecionado.descricao}</p> : null}

          <div className="grade-estatisticas">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Alunos matriculados" valor={resumo.alunosMatriculados} />
            <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbAward size={22} />} rotulo="Media geral" valor={formatGrade(media)} />
            <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbLayoutGrid size={22} />} rotulo="Modulos" valor={resumo.modulos} />
            <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbUserCheck size={22} />} rotulo="Turma / Professor" valor={professorNome || turmaPadrao?.nomeTurma || "Sem turma"} />
            <CartaoEstatistica icone={<MdAttachMoney size={22} />} rotulo="Valor do curso" valor={formatMoney(cursoSelecionado.preco)} />
          </div>

          <section aria-label="Acoes do curso" className="painel-secao">
            <div className="painel-secao__conteudo" style={{ display: "flex", flexWrap: "wrap", gap: "var(--espaco-sm)" }}>
              {!ehProfessor ? (
                <Botao onClick={() => abrirSecaoRelacionada("modulos", cursoSelecionado)} tamanho="pequeno" variante="secundario">
                  <TbLayoutGrid aria-hidden="true" size={16} /> Ver modulos
                </Botao>
              ) : null}
              <Botao onClick={() => abrirSecaoRelacionada("turmas", cursoSelecionado)} tamanho="pequeno" variante="secundario">
                <TbUsers aria-hidden="true" size={16} /> Ver turma padrao
              </Botao>
              {ehAdmin || ehCoordenador ? (
                <>
                  <Botao onClick={() => abrirModalEdicao(cursoSelecionado)} tamanho="pequeno" variante="secundario">
                    <TbEdit aria-hidden="true" size={16} /> Editar curso
                  </Botao>
                  <Botao onClick={() => abrirModalImagem(cursoSelecionado)} tamanho="pequeno" variante="secundario">
                    <TbCamera aria-hidden="true" size={16} /> Alterar foto de capa
                  </Botao>
                </>
              ) : null}
            </div>
          </section>
        </div>

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
                ? `${cursos.length} curso${cursos.length === 1 ? "" : "s"} cadastrado${cursos.length === 1 ? "" : "s"}`
                : "Catalogo academico reutilizado na home publica e no ambiente autenticado."}
          </p>
        </div>
        <label className="visualmente-oculto" htmlFor="busca-cursos">Buscar curso</label>
        <div className="campo-busca campo-busca--cabecalho">
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
      </header>

      <section aria-label="Indicadores de cursos" style={{ marginBottom: "var(--espaco-lg)" }}>
        <div className="grade-estatisticas">
          <CartaoEstatistica icone={<MdMenuBook size={22} />} rotulo="Cursos listados" valor={cursosFiltrados.length} />
          <CartaoEstatistica corBorda="var(--cor-info)" icone={<MdLayers size={22} />} rotulo="Modulos no total" valor={totalModulos} />
          <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<MdGroups size={22} />} rotulo="Matriculas no total" valor={totalMatriculas} />
        </div>
      </section>

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

          <span aria-hidden="true" className="divisor-vertical" />

          <label className="barra-filtros__checkbox-selecao">
            <input
              checked={todosCursosSelecionados}
              disabled={salvando || !cursosFiltrados.length}
              onChange={alternarTodosCursos}
              type="checkbox"
            />
            Selecionar cursos
          </label>
          <label className="visualmente-oculto" htmlFor="coordenador-atribuir">Coordenador para atribuir</label>
          <select
            className="campo__entrada barra-filtros__select"
            disabled={salvando || !coordenadoresOrdenados.length}
            id="coordenador-atribuir"
            onChange={(event) => setCoordenadorSelecionado(event.target.value)}
            value={coordenadorSelecionado}
          >
            <option value="">Selecionar coordenador</option>
            <option value="0">Aguardando coordenador</option>
            {coordenadoresOrdenados.map((coordenador) => (
              <option key={coordenador.id} value={coordenador.id}>
                {coordenador.nome}
              </option>
            ))}
          </select>
          <Botao disabled={salvando} onClick={atribuirCoordenador} tamanho="pequeno" variante="primario">
            {salvando ? "Salvando..." : "Atribuir coordenador"}
          </Botao>
          <p style={{ color: "var(--cor-texto-suave)", fontSize: "0.8rem", marginLeft: "auto" }}>
            {quantidadeSelecionada
              ? `${quantidadeSelecionada} curso${quantidadeSelecionada > 1 ? "s selecionados" : " selecionado"}`
              : `${cursosFiltrados.length} de ${cursos.length} curso${cursos.length === 1 ? "" : "s"}`}
          </p>
        </div>
      ) : null}

      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

      {cursosFiltrados.length === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">
          {temFiltroAtivo ? "Nenhum curso encontrado com os filtros aplicados." : ehCoordenador ? "Nenhum curso ativo sob sua coordenacao." : "Nenhum curso encontrado."}
        </p>
      ) : (
        <ul aria-label="Cursos" className="catalogo-grade" role="list">
          {cursosFiltrados.map((curso) => {
            const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, alunosMatriculados: 0, notasContadas: 0 };
            const media = mediaDoCurso(resumo);
            const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;
            const selecionado = cursosSelecionados.has(curso.id);

            return (
              <li key={curso.id}>
                <button
                  className="catalogo-card catalogo-card--acionavel"
                  onClick={() => abrirDetalheCurso(curso)}
                  type="button"
                >
                  {ehAdmin ? (
                    <span
                      className="catalogo-card__selecao"
                      onClick={(event) => event.stopPropagation()}
                      role="presentation"
                    >
                      <input
                        aria-label={`Selecionar ${curso.titulo}`}
                        checked={selecionado}
                        disabled={salvando}
                        onChange={() => alternarCurso(curso)}
                        onClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    </span>
                  ) : null}
                  <img alt="" className="catalogo-card__imagem" loading="lazy" src={getCourseCover(curso)} />
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
