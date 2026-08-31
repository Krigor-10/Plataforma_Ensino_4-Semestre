import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbChalkboard, TbDotsVertical, TbPlus, TbSearch, TbUsers, TbX } from "react-icons/tb";
import { MdGroups, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import SelectSimples from "../../components/SelectSimples.jsx";
import SelectUsuario from "../../components/SelectUsuario.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { normalizeStatus } from "../../lib/format.js";

function montarNomeTurmaPadrao(curso) {
  const titulo = String(curso?.titulo || "").trim();
  const nome = titulo ? `Turma online - ${titulo}` : "Turma online";
  return nome.length <= 120 ? nome : nome.slice(0, 120).trimEnd();
}

export function SecaoTurmas({
  alunos = [],
  cursoEmFoco,
  ehGestor,
  ehProfessor,
  matriculas = [],
  turmas,
  cursoPorId,
  onCursoEmFocoAplicado,
  professores = [],
  professorPorId,
  onRefresh,
  onSessionExpired
}) {
  const [slideAtual, setSlideAtual] = useState(0);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [filtroProfessor, setFiltroProfessor] = useState("todos");
  const [formularioCriacaoAberto, setFormularioCriacaoAberto] = useState(false);
  const [dadosFormularioTurma, setDadosFormularioTurma] = useState({ nomeTurma: "", cursoId: "", professorId: "" });
  const [mensagemFormularioTurma, setMensagemFormularioTurma] = useState({ tone: "", message: "" });
  const [salvandoCriacao, setSalvandoCriacao] = useState(false);
  const [turmaAtribuindo, setTurmaAtribuindo] = useState(null);
  const [professorAtribuir, setProfessorAtribuir] = useState(null);
  const [mensagemAtribuicao, setMensagemAtribuicao] = useState({ tone: "", message: "" });
  const [salvandoAtribuicao, setSalvandoAtribuicao] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [turmaEditandoNome, setTurmaEditandoNome] = useState(null);
  const [nomeEdicaoTurma, setNomeEdicaoTurma] = useState("");
  const [mensagemEdicaoTurma, setMensagemEdicaoTurma] = useState({ tone: "", message: "" });
  const [salvandoNomeTurma, setSalvandoNomeTurma] = useState(false);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState(null);
  const [mensagemExclusaoTurma, setMensagemExclusaoTurma] = useState("");
  const [excluindoTurma, setExcluindoTurma] = useState(false);

  useEffect(() => {
    if (!menuAberto) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }

      setMenuAberto(false);
    }

    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [menuAberto]);

  const podeGerenciarTurmas = Boolean(ehGestor && !ehProfessor);
  const podeAtribuirProfessor = podeGerenciarTurmas;

  const alunoPorId = useMemo(() => mapById(alunos), [alunos]);
  const cursosOrdenados = useMemo(
    () => [...cursoPorId.values()].sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR")),
    [cursoPorId]
  );
  const professoresOrdenados = useMemo(
    () => [...professores].sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [professores]
  );
  const turmaPadraoPorCursoId = useMemo(() => {
    const mapa = new Map();

    [...turmas]
      .sort((left, right) => {
        const dataEsquerda = new Date(left.dataCriacao || 0).getTime();
        const dataDireita = new Date(right.dataCriacao || 0).getTime();
        return dataEsquerda - dataDireita || Number(left.id || 0) - Number(right.id || 0);
      })
      .forEach((turma) => {
        if (!mapa.has(turma.cursoId)) {
          mapa.set(turma.cursoId, turma);
        }
      });

    return mapa;
  }, [turmas]);
  const cursosDisponiveisParaTurma = useMemo(
    () => cursosOrdenados.filter((curso) => !turmaPadraoPorCursoId.has(curso.id)),
    [cursosOrdenados, turmaPadraoPorCursoId]
  );
  const motivoCriacaoBloqueada = useMemo(() => {
    if (!cursosOrdenados.length) {
      return "Cadastre ao menos um curso antes de criar a turma padrao.";
    }

    if (!professoresOrdenados.length) {
      return "Cadastre ao menos um professor antes de criar a turma padrao.";
    }

    if (!cursosDisponiveisParaTurma.length) {
      return "Todos os cursos ja possuem turma padrao.";
    }

    return "";
  }, [cursosDisponiveisParaTurma.length, cursosOrdenados.length, professoresOrdenados.length]);

  const alunosPorTurma = useMemo(() => {
    const mapa = new Map();

    matriculas.forEach((matricula) => {
      const turmaId = Number(matricula.turmaId);

      if (!turmaId) {
        return;
      }

      if (!mapa.has(turmaId)) {
        mapa.set(turmaId, []);
      }

      const aluno = alunoPorId.get(Number(matricula.alunoId));

      mapa.get(turmaId).push({
        matriculaId: matricula.id,
        alunoId: matricula.alunoId,
        nome: matricula.aluno?.nome || aluno?.nome || `Aluno #${matricula.alunoId}`,
        status: normalizeStatus(matricula.status)
      });
    });

    return mapa;
  }, [alunoPorId, matriculas]);

  const turmasFiltradas = useMemo(() => {
    if (filtroProfessor === "todos") {
      return turmas;
    }

    if (filtroProfessor === "sem-professor") {
      return turmas.filter((turma) => !turma.professorId);
    }

    const professorId = Number(filtroProfessor);
    return turmas.filter((turma) => Number(turma.professorId) === professorId);
  }, [filtroProfessor, turmas]);

  const total = turmasFiltradas.length;
  const slide = Math.min(slideAtual, Math.max(0, total - 1));
  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId) {
      return;
    }

    const indice = turmasFiltradas.findIndex((turma) => Number(turma.cursoId) === cursoEmFocoId);

    if (indice >= 0) {
      setSlideAtual(indice);
    }

    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId]);

  useEffect(() => {
    setBuscaAluno("");
  }, [slide]);

  function irParaSlide(indice) {
    setSlideAtual(Math.max(0, Math.min(indice, total - 1)));
  }

  function abrirFormularioCriacao() {
    if (motivoCriacaoBloqueada) {
      return;
    }

    const cursoInicial = String(cursosDisponiveisParaTurma[0]?.id || "");
    const curso = cursoPorId.get(Number(cursoInicial));

    setMensagemFormularioTurma({ tone: "", message: "" });
    setDadosFormularioTurma({ nomeTurma: montarNomeTurmaPadrao(curso), cursoId: cursoInicial, professorId: "" });
    setFormularioCriacaoAberto(true);
  }

  function fecharFormularioCriacao() {
    if (salvandoCriacao) {
      return;
    }

    setFormularioCriacaoAberto(false);
    setDadosFormularioTurma({ nomeTurma: "", cursoId: "", professorId: "" });
  }

  async function salvarTurma(event) {
    event.preventDefault();

    const cursoId = Number(dadosFormularioTurma.cursoId);
    const professorId = Number(dadosFormularioTurma.professorId);

    if (!cursoId) {
      setMensagemFormularioTurma({ tone: "error", message: "Selecione o curso da turma padrao." });
      return;
    }

    if (!professorId) {
      setMensagemFormularioTurma({ tone: "error", message: "Selecione o professor responsavel pela turma." });
      return;
    }

    const curso = cursoPorId.get(cursoId);

    try {
      setMensagemFormularioTurma({ tone: "", message: "" });
      setSalvandoCriacao(true);

      await apiRequest("/Turmas", {
        method: "POST",
        body: JSON.stringify({ nomeTurma: montarNomeTurmaPadrao(curso), cursoId, professorId })
      });

      setFormularioCriacaoAberto(false);
      setDadosFormularioTurma({ nomeTurma: "", cursoId: "", professorId: "" });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormularioTurma({ tone: "error", message: err.message || "Nao foi possivel criar a turma agora." });
    } finally {
      setSalvandoCriacao(false);
    }
  }

  function abrirAtribuicaoProfessor(turma) {
    setTurmaAtribuindo(turma);
    setProfessorAtribuir(turma.professorId || null);
    setMensagemAtribuicao({ tone: "", message: "" });
    setMenuAberto(false);
  }

  async function salvarAtribuicaoProfessor() {
    if (!turmaAtribuindo || !professorAtribuir) {
      setMensagemAtribuicao({ tone: "error", message: "Selecione um professor para atribuir a turma." });
      return;
    }

    try {
      setSalvandoAtribuicao(true);
      setMensagemAtribuicao({ tone: "", message: "" });

      await apiRequest(`/Turmas/${turmaAtribuindo.id}/professor`, {
        method: "PUT",
        body: JSON.stringify(professorAtribuir)
      });

      setTurmaAtribuindo(null);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemAtribuicao({ tone: "error", message: err.message || "Nao foi possivel atribuir o professor agora." });
    } finally {
      setSalvandoAtribuicao(false);
    }
  }

  function abrirEdicaoNomeTurma(turma) {
    setTurmaEditandoNome(turma);
    setNomeEdicaoTurma(turma.nomeTurma || "");
    setMensagemEdicaoTurma({ tone: "", message: "" });
    setMenuAberto(false);
  }

  async function salvarNomeTurma() {
    if (!nomeEdicaoTurma.trim()) {
      setMensagemEdicaoTurma({ tone: "error", message: "Informe um nome valido para a turma." });
      return;
    }

    try {
      setSalvandoNomeTurma(true);
      setMensagemEdicaoTurma({ tone: "", message: "" });

      await apiRequest(`/Turmas/${turmaEditandoNome.id}`, {
        method: "PUT",
        body: JSON.stringify(nomeEdicaoTurma.trim())
      });

      setTurmaEditandoNome(null);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemEdicaoTurma({ tone: "error", message: err.message || "Nao foi possivel salvar o nome da turma agora." });
    } finally {
      setSalvandoNomeTurma(false);
    }
  }

  function abrirExclusaoTurma(turma) {
    setTurmaParaExcluir(turma);
    setMensagemExclusaoTurma("");
    setMenuAberto(false);
  }

  async function confirmarExclusaoTurma() {
    if (!turmaParaExcluir) {
      return;
    }

    try {
      setExcluindoTurma(true);
      setMensagemExclusaoTurma("");

      await apiRequest(`/Turmas/${turmaParaExcluir.id}`, { method: "DELETE" });

      setTurmaParaExcluir(null);
      setSlideAtual(0);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemExclusaoTurma(err.message || "Nao foi possivel excluir a turma agora.");
    } finally {
      setExcluindoTurma(false);
    }
  }

  return (
    <div className="tela-turmas">
      <header className="cabecalho-pagina">
        <div style={{ flex: 1 }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-lg)" }}>
            <h2 className="cabecalho-pagina__titulo">Turmas</h2>
            {total > 0 ? (
              <label className="visualmente-oculto" htmlFor="filtro-turma">Selecionar turma</label>
            ) : null}
            {total > 0 ? (
              <select
                className="campo__entrada barra-filtros__select"
                id="filtro-turma"
                onChange={(event) => irParaSlide(Number(event.target.value))}
                style={{ maxWidth: "220px" }}
                value={slide}
              >
                {turmasFiltradas.map((turma, indice) => (
                  <option key={turma.id} value={indice}>
                    {turma.nomeTurma}
                  </option>
                ))}
              </select>
            ) : null}
            {ehGestor ? (
              <select
                aria-label="Filtrar turmas por professor"
                className="campo__entrada barra-filtros__select"
                onChange={(event) => {
                  setFiltroProfessor(event.target.value);
                  setSlideAtual(0);
                }}
                style={{ maxWidth: "200px" }}
                value={filtroProfessor}
              >
                <option value="todos">Todos os professores</option>
                <option value="sem-professor">Sem professor</option>
                {professoresOrdenados.map((professor) => (
                  <option key={professor.id} value={professor.id}>
                    {professor.nome}
                  </option>
                ))}
              </select>
            ) : null}
            <div style={{ flexShrink: 0, position: "relative", width: "220px" }}>
              <TbSearch
                aria-hidden="true"
                size={15}
                style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
              />
              <label className="visualmente-oculto" htmlFor="busca-aluno-turma">Buscar aluno</label>
              <input
                className="campo__entrada"
                id="busca-aluno-turma"
                onChange={(event) => setBuscaAluno(event.target.value)}
                placeholder="Buscar aluno..."
                style={{ paddingLeft: "32px", width: "100%" }}
                type="search"
                value={buscaAluno}
              />
            </div>
            {podeGerenciarTurmas ? (
              <Botao disabled={Boolean(motivoCriacaoBloqueada)} onClick={abrirFormularioCriacao} title={motivoCriacaoBloqueada || undefined} variante="primario">
                <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                  <TbPlus aria-hidden="true" size={18} />
                </motion.span>{" "}
                Nova turma
              </Botao>
            ) : null}
          </div>
          <p className="cabecalho-pagina__subtitulo">
            {ehProfessor ? `${total} turma${total !== 1 ? "s" : ""} sob sua responsabilidade` : `${total} turma${total !== 1 ? "s" : ""} cadastrada${total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </header>

      {podeGerenciarTurmas && motivoCriacaoBloqueada ? <InlineMessage tone="info">{motivoCriacaoBloqueada}</InlineMessage> : null}

      {total === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">Nenhuma turma encontrada.</p>
      ) : (
        <div className="carrossel-cursos">
          {total > 1 ? (
            <nav aria-label="Navegacao entre turmas" className="carrossel-cursos__nav">
              <button aria-label="Turma anterior" className="carrossel-cursos__seta" disabled={slide === 0} onClick={() => irParaSlide(slide - 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div aria-label="Turmas" className="carrossel-cursos__indicadores" role="tablist">
                {turmasFiltradas.map((turma, indice) => (
                  <button
                    aria-label={`Turma ${indice + 1}: ${turma.nomeTurma}`}
                    aria-selected={indice === slide}
                    className={`carrossel-cursos__bolinha${indice === slide ? " carrossel-cursos__bolinha--ativa" : ""}`}
                    key={turma.id}
                    onClick={() => irParaSlide(indice)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>

              <button aria-label="Proxima turma" className="carrossel-cursos__seta" disabled={slide === total - 1} onClick={() => irParaSlide(slide + 1)} type="button">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </nav>
          ) : null}

          <div className="carrossel-cursos__janela">
            <SlideTurma
              alunos={alunosPorTurma.get(Number(turmasFiltradas[slide].id)) || []}
              busca={buscaAluno}
              cursoTitulo={cursoPorId.get(turmasFiltradas[slide].cursoId)?.titulo || `Curso #${turmasFiltradas[slide].cursoId}`}
              menuAberto={menuAberto}
              onAtribuirProfessor={podeAtribuirProfessor ? () => abrirAtribuicaoProfessor(turmasFiltradas[slide]) : null}
              onEditarNome={podeGerenciarTurmas ? () => abrirEdicaoNomeTurma(turmasFiltradas[slide]) : null}
              onExcluirTurma={podeGerenciarTurmas ? () => abrirExclusaoTurma(turmasFiltradas[slide]) : null}
              onToggleMenu={() => setMenuAberto((atual) => !atual)}
              professorNome={
                turmasFiltradas[slide].professorId
                  ? professorPorId.get(turmasFiltradas[slide].professorId)?.nome || `Professor #${turmasFiltradas[slide].professorId}`
                  : "Sem professor"
              }
              turma={turmasFiltradas[slide]}
            />
          </div>
        </div>
      )}

      {turmaAtribuindo ? (
        <Modal onFechar={() => setTurmaAtribuindo(null)} titulo="Atribuir professor">
          <div className="formulario-modal">
            <p style={{ color: "var(--cor-texto-suave)", fontSize: "0.875rem", margin: 0 }}>
              Turma <strong>{turmaAtribuindo.nomeTurma}</strong>
            </p>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="turma-professor">Professor responsavel</label>
              <SelectUsuario
                id="turma-professor"
                onChange={setProfessorAtribuir}
                opcoes={professoresOrdenados}
                placeholder="Sem professor"
                value={professorAtribuir}
              />
            </div>
            {mensagemAtribuicao.message ? <InlineMessage tone={mensagemAtribuicao.tone}>{mensagemAtribuicao.message}</InlineMessage> : null}
            <footer className="modal-rodape">
              <Botao disabled={salvandoAtribuicao} onClick={() => setTurmaAtribuindo(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoAtribuicao} onClick={salvarAtribuicaoProfessor} variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoAtribuicao ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          </div>
        </Modal>
      ) : null}

      {turmaEditandoNome ? (
        <Modal onFechar={() => setTurmaEditandoNome(null)} titulo="Editar nome da turma">
          <div className="formulario-modal">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="turma-nome-edicao">Nome da turma *</label>
              <input
                className="campo__entrada"
                disabled={salvandoNomeTurma}
                id="turma-nome-edicao"
                maxLength={120}
                onChange={(event) => setNomeEdicaoTurma(event.target.value)}
                value={nomeEdicaoTurma}
              />
            </div>
            {mensagemEdicaoTurma.message ? <InlineMessage tone={mensagemEdicaoTurma.tone}>{mensagemEdicaoTurma.message}</InlineMessage> : null}
            <footer className="modal-rodape">
              <Botao disabled={salvandoNomeTurma} onClick={() => setTurmaEditandoNome(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoNomeTurma} onClick={salvarNomeTurma} variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoNomeTurma ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          </div>
        </Modal>
      ) : null}

      {turmaParaExcluir ? (
        <Modal onFechar={() => setTurmaParaExcluir(null)} titulo="Excluir turma">
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: "var(--espaco-xl)" }}>
            Deseja excluir a turma <strong>{turmaParaExcluir.nomeTurma}</strong>? Esta acao nao pode ser desfeita.
          </p>
          {mensagemExclusaoTurma ? <InlineMessage tone="error">{mensagemExclusaoTurma}</InlineMessage> : null}
          <footer className="modal-rodape">
            <Botao disabled={excluindoTurma} onClick={() => setTurmaParaExcluir(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Cancelar
            </Botao>
            <Botao disabled={excluindoTurma} onClick={confirmarExclusaoTurma} variante="primario">
              {excluindoTurma ? "Excluindo..." : "Confirmar exclusao"}
            </Botao>
          </footer>
        </Modal>
      ) : null}

      {formularioCriacaoAberto ? (
        <Modal onFechar={fecharFormularioCriacao} titulo="Nova turma">
          <div aria-hidden="true" className="modal-edicao__avatar">+</div>
          <form className="formulario-modal" onSubmit={salvarTurma}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-turma">Curso *</label>
              <SelectSimples
                id="curso-turma"
                onChange={(valor) =>
                  setDadosFormularioTurma((atual) => ({ ...atual, cursoId: valor, nomeTurma: montarNomeTurmaPadrao(cursoPorId.get(Number(valor))) }))
                }
                opcoes={cursosDisponiveisParaTurma.map((curso) => ({ valor: String(curso.id), rotulo: curso.titulo }))}
                placeholder="Selecione um curso sem turma padrao"
                value={dadosFormularioTurma.cursoId}
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="professor-turma">Professor responsavel *</label>
              <SelectSimples
                id="professor-turma"
                onChange={(valor) => setDadosFormularioTurma((atual) => ({ ...atual, professorId: valor }))}
                opcoes={professoresOrdenados.map((professor) => ({ valor: String(professor.id), rotulo: professor.nome }))}
                placeholder="Selecione um professor"
                value={dadosFormularioTurma.professorId}
              />
            </div>
            {dadosFormularioTurma.nomeTurma ? (
              <p className="texto-mudo" style={{ fontSize: "0.82rem" }}>
                Nome da turma: <strong style={{ color: "var(--cor-texto-forte)" }}>{dadosFormularioTurma.nomeTurma}</strong>
              </p>
            ) : null}
            {mensagemFormularioTurma.message ? <InlineMessage tone={mensagemFormularioTurma.tone}>{mensagemFormularioTurma.message}</InlineMessage> : null}
            <footer className="modal-rodape">
              <Botao disabled={salvandoCriacao} onClick={fecharFormularioCriacao} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoCriacao} type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoCriacao ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SlideTurma({ alunos, busca, cursoTitulo, menuAberto, onAtribuirProfessor, onEditarNome, onExcluirTurma, onToggleMenu, professorNome, turma }) {
  const alunosFiltrados = busca.trim()
    ? alunos.filter((aluno) => aluno.nome.toLowerCase().includes(busca.toLowerCase()))
    : alunos;
  const aprovados = alunos.filter((aluno) => aluno.status === "Aprovada").length;
  const taxaAprovacao = alunos.length > 0 ? Math.round((aprovados / alunos.length) * 100) : 0;

  return (
    <div className="conteudos-aluno">
      <header className="conteudos-aluno__cabecalho">
        <div className="conteudos-aluno__curso-info">
          <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-md)" }}>
            <div aria-hidden="true" className="cartao-progresso-aluno__avatar conteudos-aluno__avatar-desktop">
              <MdGroups size={20} />
            </div>
            <div>
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-sm)" }}>
                <h2 className="conteudos-aluno__curso-titulo">{turma.nomeTurma}</h2>
                <span className="conteudos-aluno__curso-etiqueta">{cursoTitulo}</span>
              </div>
            </div>
          </div>
          <div className="conteudos-aluno__meta-chips">
            <span className="conteudos-aluno__meta-chip conteudos-aluno__meta-chip--progresso">
              <TbUsers aria-hidden="true" size={12} />
              {alunos.length} aluno{alunos.length !== 1 ? "s" : ""}
            </span>
            <span className="conteudos-aluno__meta-chip">
              <TbChalkboard aria-hidden="true" size={12} />
              {professorNome}
            </span>
          </div>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-sm)" }}>
          <div className="conteudos-aluno__progresso-geral">
            <p className="progresso-hero__legenda">{aprovados}/{alunos.length} aprovados</p>
            <div aria-label={`${taxaAprovacao} por cento de aprovacao`} className="anel-progresso">
              <svg className="anel-progresso__svg" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id={`anel-grad-turma-${turma.id}`} x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#b992ff" />
                    <stop offset="100%" stopColor="#7b2ff7" />
                  </linearGradient>
                </defs>
                <circle className="anel-progresso__trilha" cx="60" cy="60" r="50" />
                <circle
                  className="anel-progresso__arco"
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={`url(#anel-grad-turma-${turma.id})`}
                  style={{ strokeDasharray: "314.16", strokeDashoffset: 314.16 * (1 - taxaAprovacao / 100) }}
                />
              </svg>
              <span aria-hidden="true" className="anel-progresso__texto">{taxaAprovacao}%</span>
            </div>
          </div>

          {onAtribuirProfessor || onEditarNome || onExcluirTurma ? (
            <div className="menu-contexto">
              <button
                aria-expanded={menuAberto}
                aria-haspopup="true"
                aria-label="Opcoes da turma"
                className="menu-contexto__botao"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleMenu();
                }}
                type="button"
              >
                <TbDotsVertical aria-hidden="true" size={18} />
              </button>
              {menuAberto ? (
                <ul className="menu-contexto__lista">
                  {onAtribuirProfessor ? (
                    <li>
                      <button onClick={onAtribuirProfessor} type="button">
                        Atribuir professor
                      </button>
                    </li>
                  ) : null}
                  {onEditarNome ? (
                    <li>
                      <button onClick={onEditarNome} type="button">
                        Editar nome
                      </button>
                    </li>
                  ) : null}
                  {onExcluirTurma ? (
                    <li>
                      <button className="menu-item--perigo" onClick={onExcluirTurma} type="button">
                        Excluir turma
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {alunos.length === 0 ? (
        <p className="texto-vazio">Nenhum aluno matriculado nesta turma.</p>
      ) : alunosFiltrados.length === 0 ? (
        <p className="texto-vazio">Nenhum aluno encontrado para &quot;{busca}&quot;.</p>
      ) : (
        <ul aria-label={`Alunos de ${turma.nomeTurma}`} className="slide-alunos__lista" role="list">
          {alunosFiltrados.map((aluno) => (
            <li className="slide-alunos__linha" key={aluno.matriculaId}>
              <div className="slide-alunos__linha-info">
                <strong className="slide-alunos__linha-nome">{aluno.nome}</strong>
              </div>
              <Insignia texto={aluno.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
