import { useEffect, useMemo, useState } from "react";
import { TbDotsVertical, TbSearch, TbX } from "react-icons/tb";
import { MdGroups, MdLayers, MdMenuBook, MdSchool } from "react-icons/md";
import { InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { mapById } from "../../lib/dashboard.js";
import { ApiError, apiRequest } from "../../lib/api.js";
import { siglas } from "../../lib/format.js";

function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

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
  const [menuAberto, setMenuAberto] = useState(null);
  const [cursoParaImagem, setCursoParaImagem] = useState(null);
  const [arquivoImagemSelecionado, setArquivoImagemSelecionado] = useState(null);
  const [previewImagem, setPreviewImagem] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [mensagemImagem, setMensagemImagem] = useState({ tone: "", message: "" });

  useEffect(() => {
    if (menuAberto === null) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }

      setMenuAberto(null);
    }

    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [menuAberto]);

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
    const resumoInicial = new Map(cursos.map((curso) => [curso.id, { modulos: 0, turmas: 0, matriculas: 0 }]));

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

      if (resumo) {
        resumo.matriculas += 1;
      }
    });

    return resumoInicial;
  }, [cursos, matriculas, modulos, turmas]);
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
      const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, turmas: 0, matriculas: 0 };
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
    setMenuAberto(null);
    onAbrirSecaoCurso?.(section, curso);
  }

  function abrirModalImagem(curso) {
    setMenuAberto(null);
    setCursoParaImagem(curso);
    setArquivoImagemSelecionado(null);
    setPreviewImagem(curso.imagemUrl || "");
    setMensagemImagem({ tone: "", message: "" });
  }

  function fecharModalImagem() {
    if (enviandoImagem) {
      return;
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

  return (
    <div className="tela-cursos">
      <header className="cabecalho-pagina" style={{ alignItems: "center" }}>
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
        <div style={{ flexShrink: 0, marginLeft: "auto", position: "relative", width: "260px" }}>
          <TbSearch
            aria-hidden="true"
            size={15}
            style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="campo__entrada"
            id="busca-cursos"
            onChange={(event) => setBuscaCurso(event.target.value)}
            placeholder="Pesquisar cursos"
            style={{ paddingLeft: "32px", width: "100%" }}
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
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-md)", marginBottom: "var(--espaco-lg)" }}>
          <label className="visualmente-oculto" htmlFor="filtro-coordenador">Filtrar por coordenador</label>
          <select
            className="campo__entrada"
            id="filtro-coordenador"
            onChange={(event) => setFiltroCoordenador(event.target.value)}
            style={{ maxWidth: "220px" }}
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

          <span aria-hidden="true" style={{ background: "var(--cor-borda)", flexShrink: 0, height: "24px", width: "1px" }} />

          <label style={{ alignItems: "center", color: "var(--cor-texto-suave)", display: "flex", fontSize: "0.82rem", gap: "6px" }}>
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
            className="campo__entrada"
            disabled={salvando || !coordenadoresOrdenados.length}
            id="coordenador-atribuir"
            onChange={(event) => setCoordenadorSelecionado(event.target.value)}
            style={{ maxWidth: "220px" }}
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
        <>
          <div className="desempenho-cursos-cabecalho" aria-hidden="true">
            {ehAdmin ? <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--checkbox" /> : null}
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--avatar" />
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--identidade">
              <MdMenuBook size={13} /> Curso
            </span>
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--turma">
              <MdGroups size={13} /> Turma / Professor
            </span>
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--alunos">
              <MdSchool size={13} /> Matriculas
            </span>
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--metricas">Estrutura</span>
            <span className="desempenho-cursos-cabecalho__col desempenho-cursos-cabecalho__col--acoes" />
          </div>

          <ul aria-label="Cursos" className="desempenho-cursos" role="list">
            {cursosFiltrados.map((curso) => {
              const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, turmas: 0, matriculas: 0 };
              const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;
              const turmaPadrao = turmaPorCursoId.get(curso.id) || null;
              const professorNome = turmaPadrao?.professorId ? professorPorId.get(turmaPadrao.professorId)?.nome : null;
              const selecionado = cursosSelecionados.has(curso.id);

              return (
                <li
                  className={`desempenho-curso-item${selecionado ? " desempenho-curso-item--selecionado" : ""}`}
                  key={curso.id}
                >
                  {ehAdmin ? (
                    <div className="desempenho-curso-item__checkbox">
                      <input
                        aria-label={`Selecionar ${curso.titulo}`}
                        checked={selecionado}
                        disabled={salvando}
                        onChange={() => alternarCurso(curso)}
                        type="checkbox"
                      />
                    </div>
                  ) : null}

                  <div aria-hidden="true" className="cartao-progresso-aluno__avatar">
                    {siglas(curso.titulo)}
                  </div>

                  <div className="desempenho-curso-item__identidade">
                    <div className="desempenho-curso-item__cabecalho">
                      <h3 className="desempenho-curso-item__titulo">{curso.titulo}</h3>
                    </div>
                    <div className="desempenho-curso-item__meta">
                      <span className="desempenho-curso-item__codigo">{curso.codigoRegistro || "Sem codigo"}</span>
                    </div>
                  </div>

                  <div className="desempenho-curso-item__turma">
                    <span aria-hidden="true" className="dado-rotulo">Turma / Professor</span>
                    {turmaPadrao ? (
                      <>
                        <span className="desempenho-curso-item__turma-nome">{turmaPadrao.nomeTurma}</span>
                        <span className="desempenho-curso-item__professor">{professorNome || "Sem professor"}</span>
                      </>
                    ) : (
                      <span className="desempenho-curso-item__sem-turma">Sem turma padrao</span>
                    )}
                  </div>

                  <div className="desempenho-curso-item__alunos">
                    <span aria-hidden="true" className="dado-rotulo">Matriculas</span>
                    <span className="desempenho-curso-item__alunos-num">{resumo.matriculas}</span>
                  </div>

                  <div className="desempenho-curso-item__metricas">
                    <span aria-hidden="true" className="dado-rotulo">Estrutura / Coordenacao</span>
                    <span className="desempenho-metrica">
                      <strong>{resumo.modulos}</strong> modulo{resumo.modulos === 1 ? "" : "s"}
                    </span>
                    <Insignia texto={coordenador || curso.coordenadorId ? "Coordenado" : "Pendente"} />
                  </div>

                  <div className="menu-contexto">
                    <button
                      aria-expanded={menuAberto === curso.id}
                      aria-haspopup="true"
                      aria-label={`Opcoes para ${curso.titulo}`}
                      className="menu-contexto__botao"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuAberto((atual) => (atual === curso.id ? null : curso.id));
                      }}
                      type="button"
                    >
                      <TbDotsVertical aria-hidden="true" size={18} />
                    </button>
                    {menuAberto === curso.id ? (
                      <ul className="menu-contexto__lista">
                        {!ehProfessor ? (
                          <li>
                            <button onClick={() => abrirSecaoRelacionada("modulos", curso)} type="button">
                              Ver modulos
                            </button>
                          </li>
                        ) : null}
                        <li>
                          <button onClick={() => abrirSecaoRelacionada("turmas", curso)} type="button">
                            Ver turma padrao
                          </button>
                        </li>
                        {ehAdmin || ehCoordenador ? (
                          <li>
                            <button onClick={() => abrirModalImagem(curso)} type="button">
                              Alterar foto de capa
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {cursoParaImagem ? (
        <Modal onFechar={fecharModalImagem} titulo={`Foto de capa - ${cursoParaImagem.titulo}`}>
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
            <img alt="" className="novo-cont__miniatura" src={previewImagem} style={{ marginTop: "var(--espaco-md)" }} />
          ) : null}

          {mensagemImagem.message ? <InlineMessage tone={mensagemImagem.tone}>{mensagemImagem.message}</InlineMessage> : null}

          <footer className="modal-rodape">
            <Botao disabled={enviandoImagem} onClick={fecharModalImagem} type="button" variante="perigo">
              <TbX aria-hidden="true" size={15} /> Cancelar
            </Botao>
            <Botao disabled={enviandoImagem || !arquivoImagemSelecionado} onClick={enviarImagemCurso} type="button" variante="primario">
              {enviandoImagem ? "Enviando..." : "Salvar"}
            </Botao>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}
