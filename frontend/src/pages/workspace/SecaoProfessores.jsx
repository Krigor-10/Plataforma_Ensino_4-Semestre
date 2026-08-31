import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbDotsVertical, TbPlus, TbSearch, TbSelector, TbX } from "react-icons/tb";
import { MdGroups, MdSave, MdSchool } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { formatCep, formatDate, iniciaisNome, maskCpf, onlyDigits } from "../../lib/format.js";

const ITENS_POR_PAGINA = 8;

const ESTADO_INICIAL_FORMULARIO = {
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  especialidade: "",
  senha: "",
  confirmarSenha: "",
  ativo: true
};

function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function IconeOrdenacao({ direcao }) {
  return direcao === "asc" ? <TbChevronUp aria-hidden="true" size={14} /> : <TbChevronDown aria-hidden="true" size={14} />;
}

export function SecaoProfessores({ cursos = [], onRefresh, onSessionExpired, professores = [], turmas = [] }) {
  const [busca, setBusca] = useState("");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [kebabAbertoId, setKebabAbertoId] = useState(null);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  const [professorDetalhe, setProfessorDetalhe] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [professorEmEdicaoId, setProfessorEmEdicaoId] = useState(null);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [professorParaExcluir, setProfessorParaExcluir] = useState(null);
  const [mensagemExclusao, setMensagemExclusao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const kebabRef = useRef(null);

  useEffect(() => {
    if (!kebabAbertoId) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown") {
        if (event.key === "Escape") {
          setKebabAbertoId(null);
        }
        return;
      }

      if (kebabRef.current && !kebabRef.current.contains(event.target)) {
        setKebabAbertoId(null);
      }
    }

    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [kebabAbertoId]);

  const cursoPorId = useMemo(() => mapById(cursos), [cursos]);
  const turmasPorProfessor = useMemo(() => {
    const mapa = new Map();

    turmas.forEach((turma) => {
      const professorId = Number(turma.professorId);

      if (!professorId) {
        return;
      }

      if (!mapa.has(professorId)) {
        mapa.set(professorId, []);
      }

      mapa.get(professorId).push(turma);
    });

    return mapa;
  }, [turmas]);

  const termoBusca = useMemo(() => normalizarBusca(busca), [busca]);
  const professoresFiltrados = useMemo(() => {
    let proximos = professores;

    if (termoBusca) {
      proximos = proximos.filter((professor) => {
        const campos = [professor.nome, professor.email, professor.especialidade, professor.codigoRegistro];
        return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
      });
    }

    return [...proximos].sort((left, right) => {
      const comparacao = String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
      return direcao === "asc" ? comparacao : -comparacao;
    });
  }, [direcao, professores, termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(professoresFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = professoresFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  function limparFiltros() {
    setBusca("");
    setPagina(1);
  }

  function alternarOrdenacao() {
    setDirecao((atual) => (atual === "asc" ? "desc" : "asc"));
    setPagina(1);
  }

  function abrirKebab(event, professorId) {
    event.stopPropagation();
    const retangulo = event.currentTarget.getBoundingClientRect();
    setKebabPos({ top: retangulo.bottom + 6, left: retangulo.right - 168 });
    setKebabAbertoId((atual) => (atual === professorId ? null : professorId));
  }

  function obterCursosDoProfessor(professor) {
    const turmasDoProfessor = turmasPorProfessor.get(Number(professor.id)) || [];
    const idsCursos = new Set(turmasDoProfessor.map((turma) => Number(turma.cursoId)));

    return [...idsCursos]
      .map((cursoId) => cursoPorId.get(cursoId) || { id: cursoId, titulo: `Curso #${cursoId}` })
      .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
  }

  function abrirFormulario() {
    setProfessorEmEdicaoId(null);
    setDadosFormulario(ESTADO_INICIAL_FORMULARIO);
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function abrirEdicaoProfessor(professor) {
    setProfessorEmEdicaoId(professor.id);
    setDadosFormulario({
      nome: professor.nome || "",
      email: professor.email || "",
      cpf: professor.cpf || "",
      telefone: professor.telefone || "",
      cep: professor.cep || "",
      rua: professor.rua || "",
      numero: professor.numero || "",
      bairro: professor.bairro || "",
      cidade: professor.cidade || "",
      estado: professor.estado || "",
      especialidade: professor.especialidade || "",
      senha: "",
      confirmarSenha: "",
      ativo: professor.ativo !== false
    });
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
    setKebabAbertoId(null);
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setFormularioAberto(false);
  }

  function atualizarCampo(event) {
    const { name, type, checked, value } = event.target;
    setDadosFormulario((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
  }

  function validarFormulario() {
    const obrigatorios = ["nome", "email", "cpf", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado", "especialidade"];
    const campoVazio = obrigatorios.find((campo) => !String(dadosFormulario[campo] || "").trim());

    if (campoVazio) {
      return `Preencha todos os campos para ${professorEmEdicaoId ? "salvar" : "cadastrar"} o professor.`;
    }

    if (onlyDigits(dadosFormulario.cpf).length !== 11) {
      return "Informe um CPF com 11 digitos.";
    }

    if (onlyDigits(dadosFormulario.cep).length !== 8) {
      return "Informe um CEP com 8 digitos.";
    }

    if (dadosFormulario.estado.trim().length !== 2) {
      return "Informe a UF com 2 letras.";
    }

    if (!professorEmEdicaoId) {
      if (dadosFormulario.senha.length < 6) {
        return "A senha precisa ter pelo menos 6 caracteres.";
      }

      if (dadosFormulario.senha !== dadosFormulario.confirmarSenha) {
        return "As senhas nao coincidem.";
      }
    }

    return "";
  }

  async function salvarProfessor(event) {
    event.preventDefault();

    const erro = validarFormulario();
    if (erro) {
      setMensagemFormulario({ tone: "error", message: erro });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    const dadosBase = {
      nome: dadosFormulario.nome.trim(),
      email: dadosFormulario.email.trim(),
      cpf: onlyDigits(dadosFormulario.cpf),
      telefone: dadosFormulario.telefone.trim(),
      cep: formatCep(onlyDigits(dadosFormulario.cep)),
      rua: dadosFormulario.rua.trim(),
      numero: dadosFormulario.numero.trim(),
      bairro: dadosFormulario.bairro.trim(),
      cidade: dadosFormulario.cidade.trim(),
      estado: dadosFormulario.estado.trim().toUpperCase(),
      especialidade: dadosFormulario.especialidade.trim()
    };

    try {
      if (professorEmEdicaoId) {
        await apiRequest(`/Professores/${professorEmEdicaoId}`, {
          method: "PUT",
          body: JSON.stringify({ ...dadosBase, ativo: dadosFormulario.ativo })
        });
      } else {
        await apiRequest("/Professores", {
          method: "POST",
          body: JSON.stringify({ ...dadosBase, senha: dadosFormulario.senha, ativo: true })
        });
      }

      setFormularioAberto(false);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormulario({
        tone: "error",
        message: err.message || `Nao foi possivel ${professorEmEdicaoId ? "salvar" : "cadastrar"} o professor agora.`
      });
    } finally {
      setSalvando(false);
    }
  }

  function abrirExclusaoProfessor(professor) {
    setProfessorParaExcluir(professor);
    setMensagemExclusao("");
    setKebabAbertoId(null);
  }

  async function confirmarExclusaoProfessor() {
    if (!professorParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusao("");

    try {
      await apiRequest(`/Professores/${professorParaExcluir.id}`, { method: "DELETE" });

      setProfessorParaExcluir(null);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemExclusao(err.message || "Nao foi possivel excluir o professor agora.");
    } finally {
      setSalvando(false);
    }
  }

  const professorKebab = professores.find((professor) => professor.id === kebabAbertoId);
  const cursosDetalhe = professorDetalhe ? obterCursosDoProfessor(professorDetalhe) : [];
  const turmasDetalhe = professorDetalhe ? turmasPorProfessor.get(Number(professorDetalhe.id)) || [] : [];

  return (
    <div className="tela-professores">
      <header className="cabecalho-pagina" style={{ alignItems: "center" }}>
        <div>
          <h2 className="cabecalho-pagina__titulo">Professores</h2>
          <p className="cabecalho-pagina__subtitulo">{professores.length} cadastrado{professores.length === 1 ? "" : "s"}</p>
        </div>
        <div style={{ flexShrink: 0, marginLeft: "auto", position: "relative", width: "260px" }}>
          <TbSearch
            aria-hidden="true"
            size={15}
            style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
          />
          <label className="visualmente-oculto" htmlFor="busca-professores">Buscar professor</label>
          <input
            className="campo__entrada"
            id="busca-professores"
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nome, e-mail ou especialidade..."
            style={{ paddingLeft: "32px", width: "100%" }}
            type="search"
            value={busca}
          />
        </div>
      </header>

      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "var(--espaco-md)", marginBottom: "var(--espaco-lg)" }}>
        <Botao disabled={!termoBusca} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
          Limpar filtros
        </Botao>
        <Botao onClick={abrirFormulario} style={{ marginLeft: "auto" }} variante="primario">
          <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
            <TbPlus aria-hidden="true" size={18} />
          </motion.span>{" "}
          Cadastrar professor
        </Botao>
      </div>

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Lista de professores" className="tabela-dados">
          <thead>
            <tr>
              <th scope="col">
                <button className="tabela-dados__th-btn" onClick={alternarOrdenacao} type="button">
                  Professor <IconeOrdenacao direcao={direcao} />
                </button>
              </th>
              <th scope="col">Especialidade</th>
              <th scope="col">Cursos em andamento</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {itensPagina.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={5}>Nenhum professor encontrado.</td>
              </tr>
            ) : (
              itensPagina.map((professor) => {
                const cursosDoProfessor = obterCursosDoProfessor(professor);

                return (
                  <tr className="tabela-linha-clicavel" key={professor.id} onClick={() => setProfessorDetalhe(professor)}>
                    <td data-label="Professor">
                      <div className="tabela-aluno">
                        <div aria-hidden="true" className="topbar__avatar tabela-aluno__avatar">
                          {iniciaisNome(professor.nome)}
                        </div>
                        <div>
                          <strong className="tabela-aluno__nome">{professor.nome}</strong>
                          <span className="tabela-aluno__email">{professor.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Especialidade">{professor.especialidade || "-"}</td>
                    <td data-label="Cursos em andamento">
                      {cursosDoProfessor.length === 0 ? (
                        <span className="tabela-matricula__vazio">Nenhum curso</span>
                      ) : (
                        <span>{cursosDoProfessor[0].titulo}{cursosDoProfessor.length > 1 ? ` +${cursosDoProfessor.length - 1}` : ""}</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <Insignia texto={professor.ativo ? "Ativo" : "Inativo"} variante={professor.ativo ? "sucesso" : "erro"} />
                    </td>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <button
                        aria-expanded={kebabAbertoId === professor.id}
                        aria-haspopup="menu"
                        aria-label={`Acoes para ${professor.nome}`}
                        className="kebab-btn"
                        onClick={(event) => abrirKebab(event, professor.id)}
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
        <nav aria-label="Paginacao de professores" className="paginacao">
          <span className="paginacao__info">
            {inicio + 1}-{Math.min(inicio + ITENS_POR_PAGINA, professoresFiltrados.length)} de {professoresFiltrados.length}
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

      {kebabAbertoId && professorKebab
        ? createPortal(
            <div className="kebab-menu" ref={kebabRef} style={{ left: kebabPos.left, top: kebabPos.top }}>
              <button
                className="kebab-menu__item"
                onClick={() => {
                  setProfessorDetalhe(professorKebab);
                  setKebabAbertoId(null);
                }}
                type="button"
              >
                Ver detalhes
              </button>
              <button className="kebab-menu__item" onClick={() => abrirEdicaoProfessor(professorKebab)} type="button">
                Editar
              </button>
              <button className="kebab-menu__item kebab-menu__item--perigo" onClick={() => abrirExclusaoProfessor(professorKebab)} type="button">
                Excluir
              </button>
            </div>,
            document.body
          )
        : null}

      {professorDetalhe ? (
        <Modal onFechar={() => setProfessorDetalhe(null)} titulo="Detalhes do professor">
          <div className="detalhe-usuario__perfil">
            <div aria-hidden="true" className="topbar__avatar detalhe-usuario__avatar">
              {iniciaisNome(professorDetalhe.nome)}
            </div>
            <div className="detalhe-usuario__identidade">
              <h3 className="detalhe-usuario__nome">{professorDetalhe.nome}</h3>
              <span className="detalhe-usuario__email">{professorDetalhe.email}</span>
            </div>
            <Insignia texto={professorDetalhe.ativo ? "Ativo" : "Inativo"} variante={professorDetalhe.ativo ? "sucesso" : "erro"} />
          </div>

          <dl className="detalhe-usuario__dados">
            <div className="detalhe-usuario__dado">
              <dt>Registro</dt>
              <dd>{professorDetalhe.codigoRegistro || "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Especialidade</dt>
              <dd>{professorDetalhe.especialidade || "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>CPF</dt>
              <dd>{maskCpf(professorDetalhe.cpf)}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Cadastro</dt>
              <dd>{formatDate(professorDetalhe.dataCadastro)}</dd>
            </div>
          </dl>

          <section aria-label="Resumo de atividade" style={{ marginBottom: "var(--espaco-lg)" }}>
            <div className="grade-estatisticas">
              <CartaoEstatistica icone={<MdGroups size={22} />} rotulo="Turmas" valor={turmasDetalhe.length} />
              <CartaoEstatistica corBorda="var(--cor-info)" icone={<MdSchool size={22} />} rotulo="Cursos" valor={cursosDetalhe.length} />
            </div>
          </section>

          <section>
            <h4 className="detalhe-usuario__secao-titulo">Cursos em andamento</h4>
            {cursosDetalhe.length === 0 ? (
              <p className="texto-vazio">Nenhum curso vinculado.</p>
            ) : (
              <ul className="detalhe-usuario__lista" role="list">
                {cursosDetalhe.map((curso) => (
                  <li className="detalhe-usuario__item" key={curso.id}>
                    {curso.titulo}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="modal-rodape">
            <Botao onClick={() => setProfessorDetalhe(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Fechar
            </Botao>
          </footer>
        </Modal>
      ) : null}

      {professorParaExcluir ? (
        <Modal onFechar={() => setProfessorParaExcluir(null)} titulo="Excluir professor">
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: "var(--espaco-xl)" }}>
            Deseja excluir o professor <strong>{professorParaExcluir.nome}</strong>? Esta acao nao pode ser desfeita.
          </p>
          {mensagemExclusao ? <InlineMessage tone="error">{mensagemExclusao}</InlineMessage> : null}
          <footer className="modal-rodape">
            <Botao disabled={salvando} onClick={() => setProfessorParaExcluir(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Cancelar
            </Botao>
            <Botao disabled={salvando} onClick={confirmarExclusaoProfessor} variante="primario">
              {salvando ? "Excluindo..." : "Confirmar exclusao"}
            </Botao>
          </footer>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal onFechar={fecharFormulario} titulo={professorEmEdicaoId ? "Editar professor" : "Cadastrar professor"}>
          <form className="formulario-modal" onSubmit={salvarProfessor}>
            <div className="formulario-perfil__grade">
              <div className="campo formulario-perfil__campo--largo">
                <label className="campo__rotulo" htmlFor="professor-nome">Nome completo *</label>
                <input autoComplete="name" className="campo__entrada" disabled={salvando} id="professor-nome" maxLength={150} name="nome" onChange={atualizarCampo} value={dadosFormulario.nome} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-email">E-mail *</label>
                <input autoComplete="email" className="campo__entrada" disabled={salvando} id="professor-email" name="email" onChange={atualizarCampo} type="email" value={dadosFormulario.email} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-cpf">CPF *</label>
                <input autoComplete="off" className="campo__entrada" disabled={salvando} id="professor-cpf" inputMode="numeric" maxLength={14} name="cpf" onChange={atualizarCampo} placeholder="Somente numeros" value={dadosFormulario.cpf} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-telefone">Telefone *</label>
                <input autoComplete="tel" className="campo__entrada" disabled={salvando} id="professor-telefone" maxLength={20} name="telefone" onChange={atualizarCampo} placeholder="(11) 99999-9999" value={dadosFormulario.telefone} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-cep">CEP *</label>
                <input autoComplete="postal-code" className="campo__entrada" disabled={salvando} id="professor-cep" inputMode="numeric" maxLength={9} name="cep" onChange={atualizarCampo} placeholder="00000-000" value={dadosFormulario.cep} />
              </div>
              <div className="campo formulario-perfil__campo--largo">
                <label className="campo__rotulo" htmlFor="professor-rua">Rua *</label>
                <input autoComplete="address-line1" className="campo__entrada" disabled={salvando} id="professor-rua" maxLength={200} name="rua" onChange={atualizarCampo} value={dadosFormulario.rua} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-numero">Numero *</label>
                <input autoComplete="address-line2" className="campo__entrada" disabled={salvando} id="professor-numero" maxLength={20} name="numero" onChange={atualizarCampo} value={dadosFormulario.numero} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-bairro">Bairro *</label>
                <input autoComplete="address-level3" className="campo__entrada" disabled={salvando} id="professor-bairro" maxLength={120} name="bairro" onChange={atualizarCampo} value={dadosFormulario.bairro} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-cidade">Cidade *</label>
                <input autoComplete="address-level2" className="campo__entrada" disabled={salvando} id="professor-cidade" maxLength={120} name="cidade" onChange={atualizarCampo} value={dadosFormulario.cidade} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="professor-estado">UF *</label>
                <input autoComplete="address-level1" className="campo__entrada" disabled={salvando} id="professor-estado" maxLength={2} name="estado" onChange={atualizarCampo} placeholder="SP" value={dadosFormulario.estado} />
              </div>
              <div className="campo formulario-perfil__campo--largo">
                <label className="campo__rotulo" htmlFor="professor-especialidade">Especialidade *</label>
                <input autoComplete="off" className="campo__entrada" disabled={salvando} id="professor-especialidade" maxLength={120} name="especialidade" onChange={atualizarCampo} placeholder="Ex.: Engenharia de Software" value={dadosFormulario.especialidade} />
              </div>
              {professorEmEdicaoId ? (
                <div className="campo formulario-perfil__campo--largo" style={{ alignItems: "center", display: "flex", gap: "var(--espaco-sm)" }}>
                  <input checked={dadosFormulario.ativo} disabled={salvando} id="professor-ativo" name="ativo" onChange={atualizarCampo} type="checkbox" />
                  <label className="campo__rotulo" htmlFor="professor-ativo" style={{ marginBottom: 0 }}>Conta ativa</label>
                </div>
              ) : (
                <>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="professor-senha">Senha *</label>
                    <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="professor-senha" minLength={6} name="senha" onChange={atualizarCampo} type="password" value={dadosFormulario.senha} />
                  </div>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="professor-confirmar-senha">Confirmar senha *</label>
                    <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="professor-confirmar-senha" minLength={6} name="confirmarSenha" onChange={atualizarCampo} type="password" value={dadosFormulario.confirmarSenha} />
                  </div>
                </>
              )}
            </div>

            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}

            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : professorEmEdicaoId ? "Salvar alteracoes" : "Cadastrar professor"}
              </Botao>
            </footer>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
