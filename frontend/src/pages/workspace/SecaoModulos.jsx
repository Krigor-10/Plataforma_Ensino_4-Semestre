import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbArrowLeft, TbCheck, TbChevronDown, TbDotsVertical, TbFileText, TbLayoutGrid, TbPlus, TbStack, TbX } from "react-icons/tb";
import { MdLayers, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
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
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [moduloEmEdicaoId, setModuloEmEdicaoId] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
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
  const grupoSelecionado = useMemo(
    () => grupos.find((grupo) => Number(grupo.curso.id) === cursoSelecionadoId) || null,
    [cursoSelecionadoId, grupos]
  );
  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId) {
      return;
    }

    const grupoDoCurso = grupos.find((grupo) => Number(grupo.curso.id) === cursoEmFocoId);

    if (grupoDoCurso) {
      setCursoSelecionadoId(cursoEmFocoId);
    }

    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId]);

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(cursoId);
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
  }

  function abrirFormularioNovoModulo() {
    setModuloEmEdicaoId(null);
    setDadosFormulario({ cursoId: String(grupoSelecionado?.curso.id || cursosOrdenados[0]?.id || ""), titulo: "" });
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
      {!grupoSelecionado ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Modulos</h2>
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
            <GradeCursosProfessor
              cursos={grupos.map(({ curso, itens }) => ({
                curso,
                resumo: `${itens.length} modulo${itens.length === 1 ? "" : "s"}`,
                rodapeEsquerda: `${alunosAtivosPorCurso.get(Number(curso.id)) || 0} aluno${
                  (alunosAtivosPorCurso.get(Number(curso.id)) || 0) === 1 ? "" : "s"
                } ativo${(alunosAtivosPorCurso.get(Number(curso.id)) || 0) === 1 ? "" : "s"}`,
                badge: curso.codigoRegistro || undefined
              }))}
              mensagemVazia="Nenhum curso encontrado."
              onSelecionar={selecionarCurso}
            />
          )}
        </>
      ) : (
        <>
          <nav aria-label="Navegacao entre cursos" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaLista} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Modulos
            </button>
          </nav>

          <SlideCurso
            alunosAtivos={alunosAtivosPorCurso.get(Number(grupoSelecionado.curso.id)) || 0}
            curso={grupoSelecionado.curso}
            itens={grupoSelecionado.itens}
            menuAbertoId={menuAbertoId}
            onEditar={podeGerenciar ? abrirEdicaoModulo : null}
            onExcluir={podeGerenciar ? setModuloParaExcluir : null}
            onNovoModulo={podeGerenciar ? abrirFormularioNovoModulo : null}
            onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
            professoresPorCurso={professoresPorCurso}
          />
        </>
      )}

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

function SlideCurso({ alunosAtivos, curso, itens, menuAbertoId, onEditar, onExcluir, onNovoModulo, onToggleMenu, professoresPorCurso }) {
  const [moduloAbertoId, setModuloAbertoId] = useState(null);
  const professoresDoCurso =
    (professoresPorCurso.get(Number(curso.id)) || []).map((professor) => professor.nome).join(", ") || "Sem professor vinculado";

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

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

        {onNovoModulo ? (
          <Botao onClick={onNovoModulo} tamanho="pequeno" variante="primario">
            <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
              <TbPlus aria-hidden="true" size={16} />
            </motion.span>{" "}
            Novo modulo
          </Botao>
        ) : null}
      </header>

      {itens.length === 0 ? (
        <p className="texto-vazio" role="status">Nenhum modulo cadastrado neste curso.</p>
      ) : (
        <div className="atividades-curso__lista-modulos">
          {itens.map((modulo, indice) => {
            const aberto = moduloAbertoId === modulo.id;
            const idDetalhe = `modulo-detalhe-${modulo.id}`;

            return (
              <section className="conteudos-modulo" key={modulo.id}>
                <header className="conteudos-modulo__cabecalho">
                  <h3 className="conteudos-modulo__cabecalho-wrapper">
                    <button
                      aria-controls={idDetalhe}
                      aria-expanded={aberto}
                      className="conteudos-modulo__toggle"
                      onClick={() => alternarModulo(modulo.id)}
                      type="button"
                    >
                      <div className="conteudos-modulo__info">
                        <span aria-hidden="true" className="conteudos-modulo__icone">
                          <TbLayoutGrid size="1.4rem" />
                        </span>
                        <span className="conteudos-modulo__eyebrow">Modulo {String(indice + 1).padStart(2, "0")}</span>
                        <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                        <span className="conteudos-modulo__contagem">{modulo.codigoRegistro || "Sem codigo"}</span>
                      </div>
                      <TbChevronDown
                        aria-hidden="true"
                        className={`conteudos-modulo__chevron${aberto ? " conteudos-modulo__chevron--aberto" : ""}`}
                        size="1.1rem"
                      />
                    </button>
                  </h3>

                  {onEditar || onExcluir ? (
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
                        <TbDotsVertical aria-hidden="true" size={18} />
                      </button>
                      {menuAbertoId === modulo.id ? (
                        <ul className="menu-contexto__lista">
                          {onEditar ? (
                            <li>
                              <button onClick={() => onEditar(modulo)} type="button">
                                Editar
                              </button>
                            </li>
                          ) : null}
                          {onExcluir ? (
                            <li>
                              <button className="menu-item--perigo" onClick={() => onExcluir(modulo)} type="button">
                                Excluir
                              </button>
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </header>

                <AnimatePresence initial={false}>
                  {aberto ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      id={idDetalhe}
                      initial={{ height: 0, opacity: 0 }}
                      key={`detalhe-modulo-${modulo.id}`}
                      style={{ overflow: "hidden" }}
                      transition={{ duration: 0.24, ease: "easeInOut" }}
                    >
                      <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
                        <div className="lista-detalhes__item">
                          <dt>Professor(es) do curso</dt>
                          <dd>{professoresDoCurso}</dd>
                        </div>
                        <div className="lista-detalhes__item">
                          <dt>Alunos ativos no curso</dt>
                          <dd>{alunosAtivos}</dd>
                        </div>
                        <div className="lista-detalhes__item">
                          <dt>Criado em</dt>
                          <dd>{formatDate(modulo.dataCriacao)}</dd>
                        </div>
                      </dl>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
