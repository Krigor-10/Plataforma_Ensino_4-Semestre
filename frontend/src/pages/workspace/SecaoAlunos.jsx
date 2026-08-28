import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbDotsVertical, TbSearch, TbSelector, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { mapById } from "../../lib/dashboard.js";
import { formatDate, iniciaisNome, maskCpf, normalizeStatus } from "../../lib/format.js";

const ITENS_POR_PAGINA = 8;

function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function IconeOrdenacao({ ativo, direcao }) {
  if (!ativo) {
    return <TbSelector aria-hidden="true" size={14} />;
  }

  return direcao === "asc" ? <TbChevronUp aria-hidden="true" size={14} /> : <TbChevronDown aria-hidden="true" size={14} />;
}

export function SecaoAlunos({ alunos, cursos = [], matriculas = [] }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [kebabAbertoId, setKebabAbertoId] = useState(null);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  const [alunoDetalhe, setAlunoDetalhe] = useState(null);
  const kebabRef = useRef(null);

  useEffect(() => {
    if (!kebabAbertoId) {
      return undefined;
    }

    function fechar(event) {
      if (kebabRef.current && !kebabRef.current.contains(event.target)) {
        setKebabAbertoId(null);
      }
    }

    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [kebabAbertoId]);

  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);
  const matriculasPorAluno = useMemo(() => {
    const mapa = new Map();

    matriculas.forEach((matricula) => {
      const alunoId = Number(matricula.alunoId);

      if (!alunoId) {
        return;
      }

      if (!mapa.has(alunoId)) {
        mapa.set(alunoId, []);
      }

      const curso = cursoPorId.get(Number(matricula.cursoId));

      mapa.get(alunoId).push({
        id: matricula.id,
        cursoTitulo: curso?.titulo || `Curso #${matricula.cursoId}`,
        status: normalizeStatus(matricula.status)
      });
    });

    return mapa;
  }, [cursoPorId, matriculas]);

  const termoBusca = useMemo(() => normalizarBusca(busca), [busca]);
  const alunosFiltrados = useMemo(() => {
    let proximos = alunos;

    if (filtroStatus === "ativos") {
      proximos = proximos.filter((aluno) => aluno.ativo);
    } else if (filtroStatus === "inativos") {
      proximos = proximos.filter((aluno) => !aluno.ativo);
    }

    if (termoBusca) {
      proximos = proximos.filter((aluno) => {
        const campos = [aluno.nome, aluno.email, maskCpf(aluno.cpf)];
        return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
      });
    }

    return [...proximos].sort((left, right) => {
      const comparacao = String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
      return direcao === "asc" ? comparacao : -comparacao;
    });
  }, [alunos, direcao, filtroStatus, termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(alunosFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = alunosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  const totalAtivos = alunos.filter((aluno) => aluno.ativo).length;

  function limparFiltros() {
    setBusca("");
    setFiltroStatus("todos");
    setPagina(1);
  }

  function alternarOrdenacao() {
    setDirecao((atual) => (atual === "asc" ? "desc" : "asc"));
    setPagina(1);
  }

  function abrirKebab(event, alunoId) {
    event.stopPropagation();
    const retangulo = event.currentTarget.getBoundingClientRect();
    setKebabPos({ top: retangulo.bottom + 6, left: retangulo.right - 168 });
    setKebabAbertoId((atual) => (atual === alunoId ? null : alunoId));
  }

  const alunoKebab = alunos.find((aluno) => aluno.id === kebabAbertoId);

  return (
    <div className="tela-alunos">
      <header className="cabecalho-pagina" style={{ alignItems: "center" }}>
        <div>
          <h2 className="cabecalho-pagina__titulo">Alunos</h2>
          <p className="cabecalho-pagina__subtitulo">
            {alunos.length} cadastrado{alunos.length === 1 ? "" : "s"} - {totalAtivos} ativo{totalAtivos === 1 ? "" : "s"}
          </p>
        </div>
        <div style={{ flexShrink: 0, marginLeft: "auto", position: "relative", width: "260px" }}>
          <TbSearch
            aria-hidden="true"
            size={15}
            style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
          />
          <label className="visualmente-oculto" htmlFor="busca-alunos">Buscar aluno</label>
          <input
            className="campo__entrada"
            id="busca-alunos"
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nome ou e-mail..."
            style={{ paddingLeft: "32px", width: "100%" }}
            type="search"
            value={busca}
          />
        </div>
      </header>

      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-md)", marginBottom: "var(--espaco-lg)" }}>
        <select
          aria-label="Filtrar alunos por status"
          className="campo__entrada"
          onChange={(event) => {
            setFiltroStatus(event.target.value);
            setPagina(1);
          }}
          style={{ maxWidth: "180px" }}
          value={filtroStatus}
        >
          <option value="todos">Todos os status</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <Botao disabled={!(termoBusca || filtroStatus !== "todos")} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
          Limpar filtros
        </Botao>
      </div>

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Lista de alunos" className="tabela-dados">
          <thead>
            <tr>
              <th scope="col">
                <button className="tabela-dados__th-btn" onClick={alternarOrdenacao} type="button">
                  Aluno <IconeOrdenacao ativo direcao={direcao} />
                </button>
              </th>
              <th scope="col">Cadastro</th>
              <th scope="col">Cursos matriculados</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {itensPagina.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={5}>Nenhum aluno encontrado.</td>
              </tr>
            ) : (
              itensPagina.map((aluno) => {
                const cursosDoAluno = matriculasPorAluno.get(Number(aluno.id)) || [];

                return (
                  <tr className="tabela-linha-clicavel" key={aluno.id} onClick={() => setAlunoDetalhe(aluno)}>
                    <td>
                      <div className="tabela-aluno">
                        <div aria-hidden="true" className="topbar__avatar tabela-aluno__avatar">
                          {iniciaisNome(aluno.nome)}
                        </div>
                        <div>
                          <strong className="tabela-aluno__nome">{aluno.nome}</strong>
                          <span className="tabela-aluno__email">{aluno.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(aluno.dataCadastro)}</td>
                    <td>
                      {cursosDoAluno.length === 0 ? (
                        <span className="tabela-matricula__vazio">Nenhum curso</span>
                      ) : (
                        <span>{cursosDoAluno[0].cursoTitulo}{cursosDoAluno.length > 1 ? ` +${cursosDoAluno.length - 1}` : ""}</span>
                      )}
                    </td>
                    <td>
                      <Insignia texto={aluno.ativo ? "Ativo" : "Inativo"} variante={aluno.ativo ? "sucesso" : "erro"} />
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <button
                        aria-expanded={kebabAbertoId === aluno.id}
                        aria-haspopup="menu"
                        aria-label={`Acoes para ${aluno.nome}`}
                        className="kebab-btn"
                        onClick={(event) => abrirKebab(event, aluno.id)}
                        type="button"
                      >
                        <TbDotsVertical aria-hidden="true" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 ? (
        <nav aria-label="Paginacao de alunos" className="paginacao">
          <span className="paginacao__info">
            {inicio + 1}-{Math.min(inicio + ITENS_POR_PAGINA, alunosFiltrados.length)} de {alunosFiltrados.length}
          </span>
          <div className="paginacao__controles">
            <Botao disabled={paginaSegura === 1} onClick={() => setPagina((atual) => Math.max(1, atual - 1))} tamanho="pequeno" variante="fantasma">
              <TbChevronLeft aria-hidden="true" size={14} /> Anterior
            </Botao>
            {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map((numero) => (
              <button
                aria-current={paginaSegura === numero ? "page" : undefined}
                className={`paginacao__pagina${paginaSegura === numero ? " paginacao__pagina--ativa" : ""}`}
                key={numero}
                onClick={() => setPagina(numero)}
                type="button"
              >
                {numero}
              </button>
            ))}
            <Botao disabled={paginaSegura === totalPaginas} onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))} tamanho="pequeno" variante="fantasma">
              Proxima <TbChevronRight aria-hidden="true" size={14} />
            </Botao>
          </div>
        </nav>
      ) : null}

      {kebabAbertoId && alunoKebab
        ? createPortal(
            <div className="kebab-menu" ref={kebabRef} role="menu" style={{ left: kebabPos.left, top: kebabPos.top }}>
              <button
                className="kebab-menu__item"
                onClick={() => {
                  setAlunoDetalhe(alunoKebab);
                  setKebabAbertoId(null);
                }}
                role="menuitem"
                type="button"
              >
                Ver detalhes
              </button>
            </div>,
            document.body
          )
        : null}

      {alunoDetalhe ? (
        <Modal onFechar={() => setAlunoDetalhe(null)} titulo="Detalhes do aluno">
          <div className="detalhe-usuario__perfil">
            <div aria-hidden="true" className="topbar__avatar detalhe-usuario__avatar">
              {iniciaisNome(alunoDetalhe.nome)}
            </div>
            <div className="detalhe-usuario__identidade">
              <h3 className="detalhe-usuario__nome">{alunoDetalhe.nome}</h3>
              <span className="detalhe-usuario__email">{alunoDetalhe.email}</span>
            </div>
            <Insignia texto={alunoDetalhe.ativo ? "Ativo" : "Inativo"} variante={alunoDetalhe.ativo ? "sucesso" : "erro"} />
          </div>

          <dl className="detalhe-usuario__dados">
            <div className="detalhe-usuario__dado">
              <dt>CPF</dt>
              <dd>{maskCpf(alunoDetalhe.cpf)}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Telefone</dt>
              <dd>{alunoDetalhe.telefone || "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Cidade/UF</dt>
              <dd>{alunoDetalhe.cidade ? `${alunoDetalhe.cidade}/${alunoDetalhe.estado}` : "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Cadastro</dt>
              <dd>{formatDate(alunoDetalhe.dataCadastro)}</dd>
            </div>
          </dl>

          <section>
            <h4 className="detalhe-usuario__secao-titulo">Cursos matriculados</h4>
            {(matriculasPorAluno.get(Number(alunoDetalhe.id)) || []).length === 0 ? (
              <p className="texto-vazio">Nenhuma matricula registrada.</p>
            ) : (
              <ul className="detalhe-usuario__lista" role="list">
                {(matriculasPorAluno.get(Number(alunoDetalhe.id)) || []).map((matricula) => (
                  <li className="detalhe-usuario__item" key={matricula.id}>
                    {matricula.cursoTitulo}
                    <Insignia texto={matricula.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="modal-rodape">
            <Botao onClick={() => setAlunoDetalhe(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Fechar
            </Botao>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}
