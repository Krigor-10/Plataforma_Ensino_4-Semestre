import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbCheck, TbDotsVertical, TbFileText, TbPlus, TbStack, TbX } from "react-icons/tb";
import { MdLayers, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";
import SelectSimples from "../../components/SelectSimples.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { formatDate, normalizeStatus } from "../../lib/format.js";

const ESTADO_INICIAL_FORMULARIO = { cursoId: "", titulo: "" };

export function SecaoModulos({
  alunos = [],
  cursos,
  cursoEmFoco,
  ehAdmin = false,
  ehCoordenador = false,
  matriculas = [],
  modulos,
  onCursoEmFocoAplicado,
  onRefresh,
  onSessionExpired,
  professores = [],
  turmas = []
}) {
  const podeGerenciar = ehAdmin || ehCoordenador;
  const [slideAtual, setSlideAtual] = useState(0);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [moduloEmEdicaoId, setModuloEmEdicaoId] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [moduloDetalheId, setModuloDetalheId] = useState(null);
  const [moduloParaExcluir, setModuloParaExcluir] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);

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
  const alunoPorId = useMemo(() => mapById(alunos), [alunos]);
  const professorPorId = useMemo(() => mapById(professores), [professores]);
  const cursosOrdenados = useMemo(
    () => [...cursos].sort((cursoA, cursoB) => String(cursoA.titulo || "").localeCompare(String(cursoB.titulo || ""), "pt-BR")),
    [cursos]
  );

  const professoresPorCurso = useMemo(() => {
    const mapa = new Map();

    turmas.forEach((turma) => {
      const cursoId = Number(turma.cursoId);
      const professorId = Number(turma.professorId);

      if (!cursoId || !professorId) {
        return;
      }

      if (!mapa.has(cursoId)) {
        mapa.set(cursoId, new Map());
      }

      mapa.get(cursoId).set(professorId, professorPorId.get(professorId) || { id: professorId, nome: `Professor #${professorId}` });
    });

    return new Map(
      [...mapa.entries()].map(([cursoId, mapaProfessores]) => [
        cursoId,
        [...mapaProfessores.values()].sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      ])
    );
  }, [professorPorId, turmas]);

  const alunosAtivosPorCurso = useMemo(() => {
    const porCurso = new Map();

    matriculas.forEach((matricula) => {
      const alunoId = Number(matricula.alunoId);
      const cursoId = Number(matricula.cursoId);

      if (!alunoId || !cursoId || normalizeStatus(matricula.status) !== "Aprovada") {
        return;
      }

      const aluno = alunoPorId.get(alunoId) || matricula.aluno;

      if (aluno && typeof aluno.ativo !== "undefined" && !aluno.ativo) {
        return;
      }

      if (!porCurso.has(cursoId)) {
        porCurso.set(cursoId, new Set());
      }

      porCurso.get(cursoId).add(alunoId);
    });

    return new Map([...porCurso.entries()].map(([cursoId, idsAlunos]) => [cursoId, idsAlunos.size]));
  }, [alunoPorId, matriculas]);

  const modulosPorCursoId = useMemo(() => {
    const mapa = new Map();

    modulos.forEach((modulo) => {
      const cursoId = Number(modulo.cursoId);

      if (!mapa.has(cursoId)) {
        mapa.set(cursoId, []);
      }

      mapa.get(cursoId).push(modulo);
    });

    mapa.forEach((itens) => {
      itens.sort((moduloA, moduloB) => {
        const dataA = new Date(moduloA.dataCriacao || 0).getTime();
        const dataB = new Date(moduloB.dataCriacao || 0).getTime();
        return dataA - dataB || Number(moduloA.id) - Number(moduloB.id);
      });
    });

    return mapa;
  }, [modulos]);

  const grupos = useMemo(
    () => cursosOrdenados.map((curso) => ({ curso, itens: modulosPorCursoId.get(Number(curso.id)) || [] })),
    [cursosOrdenados, modulosPorCursoId]
  );

  const total = grupos.length;
  const slide = Math.min(slideAtual, Math.max(0, total - 1));
  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId) {
      return;
    }

    const indice = grupos.findIndex((grupo) => Number(grupo.curso.id) === cursoEmFocoId);

    if (indice >= 0) {
      setSlideAtual(indice);
    }

    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId]);

  const moduloDetalhe = useMemo(() => modulos.find((modulo) => modulo.id === moduloDetalheId) || null, [moduloDetalheId, modulos]);

  useEffect(() => {
    if (moduloDetalheId && !moduloDetalhe) {
      setModuloDetalheId(null);
    }
  }, [moduloDetalhe, moduloDetalheId]);

  function irPara(indice) {
    setSlideAtual(Math.max(0, Math.min(indice, total - 1)));
  }

  function abrirFormularioNovoModulo() {
    setModuloEmEdicaoId(null);
    setDadosFormulario({ cursoId: String(grupos[slide]?.curso.id || cursosOrdenados[0]?.id || ""), titulo: "" });
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function abrirEdicaoModulo(modulo) {
    setModuloEmEdicaoId(modulo.id);
    setDadosFormulario({ cursoId: String(modulo.cursoId), titulo: modulo.titulo });
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setFormularioAberto(false);
    setModuloEmEdicaoId(null);
    setDadosFormulario(ESTADO_INICIAL_FORMULARIO);
    setMensagemFormulario({ tone: "", message: "" });
  }

  async function salvarModulo(event) {
    event.preventDefault();

    const tituloNormalizado = dadosFormulario.titulo.trim();

    if (!tituloNormalizado) {
      setMensagemFormulario({ tone: "error", message: "Informe o titulo do modulo antes de salvar." });
      return;
    }

    if (!dadosFormulario.cursoId) {
      setMensagemFormulario({ tone: "error", message: "Selecione um curso para vincular o modulo." });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      if (moduloEmEdicaoId) {
        await apiRequest(`/Modulos/${moduloEmEdicaoId}`, {
          method: "PUT",
          body: JSON.stringify({ titulo: tituloNormalizado })
        });
      } else {
        await apiRequest("/Modulos", {
          method: "POST",
          body: JSON.stringify({ titulo: tituloNormalizado, cursoId: Number(dadosFormulario.cursoId) })
        });
      }

      fecharFormulario();
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel salvar o modulo agora." });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!moduloParaExcluir) {
      return;
    }

    setSalvando(true);

    try {
      await apiRequest(`/Modulos/${moduloParaExcluir.id}`, { method: "DELETE" });
      setModuloParaExcluir(null);

      if (moduloDetalheId === moduloParaExcluir.id) {
        setModuloDetalheId(null);
      }

      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel excluir o modulo agora." });
      setModuloParaExcluir(null);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="tela-modulos">
      <header className="cabecalho-pagina">
        <div style={{ flex: 1 }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-lg)" }}>
            <h2 className="cabecalho-pagina__titulo">Modulos</h2>
            {total > 0 ? (
              <>
                <label className="visualmente-oculto" htmlFor="filtro-modulo-curso">Selecionar curso</label>
                <select
                  aria-label="Navegar para curso"
                  className="campo__entrada barra-filtros__select"
                  id="filtro-modulo-curso"
                  onChange={(event) => irPara(Number(event.target.value))}
                  style={{ marginLeft: "auto", maxWidth: "220px" }}
                  value={slide}
                >
                  {grupos.map(({ curso }, indice) => (
                    <option key={curso.id} value={indice}>
                      {curso.titulo}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {cursosOrdenados.length && podeGerenciar ? (
              <>
                <span aria-hidden="true" style={{ background: "var(--cor-borda)", flexShrink: 0, height: "24px", width: "1px" }} />
                <Botao onClick={abrirFormularioNovoModulo} variante="primario">
                  <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                    <TbPlus aria-hidden="true" size={18} />
                  </motion.span>{" "}
                  Novo modulo
                </Botao>
              </>
            ) : null}
          </div>
          <p className="cabecalho-pagina__subtitulo">
            {modulos.length} modulo{modulos.length === 1 ? "" : "s"} cadastrado{modulos.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {total === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">
          Cadastre um curso antes de criar modulos.
        </p>
      ) : (
        <div className="carrossel-cursos">
          {total > 1 ? (
            <nav aria-label="Navegacao entre cursos" className="carrossel-cursos__nav">
              <button
                aria-label="Curso anterior"
                className="carrossel-cursos__seta"
                disabled={slide === 0}
                onClick={() => irPara(slide - 1)}
                type="button"
              >
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div aria-label="Cursos" className="carrossel-cursos__indicadores" role="tablist">
                {grupos.map(({ curso }, indice) => (
                  <button
                    aria-label={`Curso ${indice + 1}: ${curso.titulo}`}
                    aria-selected={indice === slide}
                    className={`carrossel-cursos__bolinha${indice === slide ? " carrossel-cursos__bolinha--ativa" : ""}`}
                    key={curso.id}
                    onClick={() => irPara(indice)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>

              <button
                aria-label="Proximo curso"
                className="carrossel-cursos__seta"
                disabled={slide === total - 1}
                onClick={() => irPara(slide + 1)}
                type="button"
              >
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </nav>
          ) : null}

          <div className="carrossel-cursos__janela">
            <SlideCurso
              alunosAtivos={alunosAtivosPorCurso.get(Number(grupos[slide].curso.id)) || 0}
              curso={grupos[slide].curso}
              itens={grupos[slide].itens}
              menuAbertoId={menuAbertoId}
              onExcluir={setModuloParaExcluir}
              onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
              onVerDetalhes={setModuloDetalheId}
              podeGerenciar={podeGerenciar}
            />
          </div>
        </div>
      )}

      {moduloDetalhe ? (
        <Modal
          onFechar={() => setModuloDetalheId(null)}
          titulo={moduloDetalhe.titulo}
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setModuloDetalheId(null)} style={{ marginRight: podeGerenciar ? "auto" : 0 }} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Fechar
              </Botao>
              {podeGerenciar ? (
                <Botao
                  onClick={() => {
                    setModuloDetalheId(null);
                    abrirEdicaoModulo(moduloDetalhe);
                  }}
                  variante="primario"
                >
                  Editar titulo
                </Botao>
              ) : null}
            </footer>
          }
        >
          <dl className="lista-detalhes">
            <div className="lista-detalhes__item">
              <dt>Codigo do modulo</dt>
              <dd>{moduloDetalhe.codigoRegistro || "Sem codigo"}</dd>
            </div>
            <div className="lista-detalhes__item">
              <dt>Curso</dt>
              <dd>{cursoPorId.get(moduloDetalhe.cursoId)?.titulo || `Curso #${moduloDetalhe.cursoId}`}</dd>
            </div>
            <div className="lista-detalhes__item">
              <dt>Professor(es) do curso</dt>
              <dd>
                {(professoresPorCurso.get(Number(moduloDetalhe.cursoId)) || []).map((professor) => professor.nome).join(", ") ||
                  "Sem professor vinculado"}
              </dd>
            </div>
            <div className="lista-detalhes__item">
              <dt>Alunos ativos no curso</dt>
              <dd>{alunosAtivosPorCurso.get(Number(moduloDetalhe.cursoId)) || 0}</dd>
            </div>
            <div className="lista-detalhes__item">
              <dt>Criado em</dt>
              <dd>{formatDate(moduloDetalhe.dataCriacao)}</dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      {moduloParaExcluir ? (
        <Modal
          onFechar={() => setModuloParaExcluir(null)}
          titulo="Excluir modulo"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setModuloParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            Deseja excluir o modulo <strong>{moduloParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={fecharFormulario}
          titulo={moduloEmEdicaoId ? "Editar modulo" : "Novo modulo"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} form="form-modulo" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-modulo" onSubmit={salvarModulo}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="modulo-curso">Curso *</label>
              <SelectSimples
                id="modulo-curso"
                onChange={(valor) => setDadosFormulario((atual) => ({ ...atual, cursoId: valor }))}
                opcoes={cursosOrdenados.map((curso) => ({ valor: String(curso.id), rotulo: curso.titulo }))}
                placeholder="Selecione um curso"
                value={dadosFormulario.cursoId}
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="modulo-titulo">Titulo *</label>
              <input
                autoComplete="off"
                className="campo__entrada"
                id="modulo-titulo"
                maxLength={150}
                onChange={(event) => setDadosFormulario((atual) => ({ ...atual, titulo: event.target.value }))}
                placeholder="Ex: Fundamentos de Programacao"
                type="text"
                value={dadosFormulario.titulo}
              />
            </div>
            {moduloEmEdicaoId ? (
              <p className="texto-mudo" style={{ fontSize: "0.8rem" }}>
                O curso fica travado durante a edicao porque a API atual permite atualizar apenas o titulo do modulo.
              </p>
            ) : null}
            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SlideCurso({ alunosAtivos, curso, itens, menuAbertoId, onExcluir, onToggleMenu, onVerDetalhes, podeGerenciar }) {
  return (
    <div className="conteudos-aluno">
      <header className="conteudos-aluno__cabecalho">
        <div className="conteudos-aluno__curso-info">
          <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-md)" }}>
            <div aria-hidden="true" className="cartao-progresso-aluno__avatar conteudos-aluno__avatar-desktop">
              <MdLayers size={20} />
            </div>
            <h2 className="conteudos-aluno__curso-titulo">{curso.titulo}</h2>
          </div>
          <div className="conteudos-aluno__meta-chips">
            <span className="conteudos-aluno__meta-chip conteudos-aluno__meta-chip--progresso">
              <TbStack aria-hidden="true" size={12} />
              {itens.length} modulo{itens.length !== 1 ? "s" : ""}
            </span>
            <span className="conteudos-aluno__meta-chip">
              <TbFileText aria-hidden="true" size={12} />
              {alunosAtivos} aluno{alunosAtivos !== 1 ? "s" : ""} ativo{alunosAtivos !== 1 ? "s" : ""}
            </span>
            {curso.codigoRegistro ? <span className="conteudos-aluno__meta-chip">{curso.codigoRegistro}</span> : null}
          </div>
        </div>
      </header>

      {itens.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhum modulo cadastrado neste curso.</p>
      ) : (
        <ul aria-label={`Modulos de ${curso.titulo}`} className="lista-aproveitamento" role="list">
          {itens.map((modulo, indice) => (
            <li className="item-aproveitamento" key={modulo.id}>
              <span aria-hidden="true" className="item-aproveitamento__num">
                {indice + 1}
              </span>
              <div className="item-aproveitamento__info">
                <span className="item-aproveitamento__titulo">
                  {modulo.titulo}
                  <span style={{ color: "var(--cor-texto-mudo)", fontSize: "0.78rem", marginLeft: "0.5rem" }}>
                    {modulo.codigoRegistro}
                  </span>
                </span>
              </div>
              <div className="item-aproveitamento__badges">
                <span style={{ color: "var(--cor-texto-mudo)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                  {formatDate(modulo.dataCriacao)}
                </span>
              </div>
              <div className="menu-contexto">
                <button
                  aria-expanded={menuAbertoId === modulo.id}
                  aria-haspopup="true"
                  aria-label={`Opcoes para ${modulo.titulo}`}
                  className="menu-contexto__botao"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMenu(modulo.id);
                  }}
                  type="button"
                >
                  <TbDotsVertical aria-hidden="true" size={16} />
                </button>
                {menuAbertoId === modulo.id ? (
                  <ul className="menu-contexto__lista">
                    <li>
                      <button onClick={() => onVerDetalhes(modulo.id)} type="button">
                        Ver detalhes
                      </button>
                    </li>
                    {podeGerenciar ? (
                      <li>
                        <button className="menu-item--perigo" onClick={() => onExcluir(modulo)} type="button">
                          Excluir
                        </button>
                      </li>
                    ) : null}
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
