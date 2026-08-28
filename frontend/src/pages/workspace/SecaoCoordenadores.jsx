import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbDotsVertical, TbPlus, TbSearch, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
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
  senha: "",
  confirmarSenha: ""
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

export function SecaoCoordenadores({ coordenadores = [], cursos = [], onRefresh, onSessionExpired }) {
  const [busca, setBusca] = useState("");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [kebabAbertoId, setKebabAbertoId] = useState(null);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  const [coordenadorDetalhe, setCoordenadorDetalhe] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
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

  const cursosPorCoordenador = useMemo(() => {
    const mapa = new Map();

    cursos.forEach((curso) => {
      const coordenadorId = Number(curso.coordenadorId);

      if (!coordenadorId) {
        return;
      }

      if (!mapa.has(coordenadorId)) {
        mapa.set(coordenadorId, []);
      }

      mapa.get(coordenadorId).push(curso);
    });

    mapa.forEach((lista) => lista.sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR")));

    return mapa;
  }, [cursos]);

  function obterCursosDoCoordenador(coordenador) {
    return cursosPorCoordenador.get(Number(coordenador.id)) || [];
  }

  const termoBusca = useMemo(() => normalizarBusca(busca), [busca]);
  const coordenadoresFiltrados = useMemo(() => {
    let proximos = coordenadores;

    if (termoBusca) {
      proximos = proximos.filter((coordenador) => {
        const cursosSupervisionados = obterCursosDoCoordenador(coordenador);
        const campos = [
          coordenador.nome,
          coordenador.email,
          coordenador.codigoRegistro,
          ...cursosSupervisionados.map((curso) => curso.titulo)
        ];

        return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
      });
    }

    return [...proximos].sort((left, right) => {
      const comparacao = String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
      return direcao === "asc" ? comparacao : -comparacao;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordenadores, cursosPorCoordenador, direcao, termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(coordenadoresFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = coordenadoresFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  function limparFiltros() {
    setBusca("");
    setPagina(1);
  }

  function alternarOrdenacao() {
    setDirecao((atual) => (atual === "asc" ? "desc" : "asc"));
    setPagina(1);
  }

  function abrirKebab(event, coordenadorId) {
    event.stopPropagation();
    const retangulo = event.currentTarget.getBoundingClientRect();
    setKebabPos({ top: retangulo.bottom + 6, left: retangulo.right - 168 });
    setKebabAbertoId((atual) => (atual === coordenadorId ? null : coordenadorId));
  }

  function abrirFormulario() {
    setDadosFormulario(ESTADO_INICIAL_FORMULARIO);
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setFormularioAberto(false);
  }

  function atualizarCampo(event) {
    const { name, value } = event.target;
    setDadosFormulario((atual) => ({ ...atual, [name]: value }));
  }

  function validarFormulario() {
    const obrigatorios = ["nome", "email", "cpf", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado", "senha", "confirmarSenha"];
    const campoVazio = obrigatorios.find((campo) => !String(dadosFormulario[campo] || "").trim());

    if (campoVazio) {
      return "Preencha todos os campos obrigatorios para cadastrar a coordenacao.";
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

    if (dadosFormulario.senha.length < 6) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (dadosFormulario.senha !== dadosFormulario.confirmarSenha) {
      return "As senhas nao coincidem.";
    }

    return "";
  }

  async function salvarCoordenador(event) {
    event.preventDefault();

    const erro = validarFormulario();
    if (erro) {
      setMensagemFormulario({ tone: "error", message: erro });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      await apiRequest("/Coordenadores", {
        method: "POST",
        body: JSON.stringify({
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
          senha: dadosFormulario.senha,
          ativo: true
        })
      });

      setFormularioAberto(false);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel cadastrar a coordenacao agora." });
    } finally {
      setSalvando(false);
    }
  }

  const coordenadorKebab = coordenadores.find((coordenador) => coordenador.id === kebabAbertoId);
  const cursosDetalhe = coordenadorDetalhe ? obterCursosDoCoordenador(coordenadorDetalhe) : [];

  return (
    <div className="tela-coordenadores">
      <header className="cabecalho-pagina" style={{ alignItems: "center" }}>
        <div>
          <h2 className="cabecalho-pagina__titulo">Coordenadores</h2>
          <p className="cabecalho-pagina__subtitulo">{coordenadores.length} cadastrado{coordenadores.length === 1 ? "" : "s"}</p>
        </div>
        <div style={{ flexShrink: 0, marginLeft: "auto", position: "relative", width: "260px" }}>
          <TbSearch
            aria-hidden="true"
            size={15}
            style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
          />
          <label className="visualmente-oculto" htmlFor="busca-coordenadores">Buscar coordenador</label>
          <input
            className="campo__entrada"
            id="busca-coordenadores"
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
        <Botao disabled={!termoBusca} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
          Limpar filtros
        </Botao>
        <Botao onClick={abrirFormulario} style={{ marginLeft: "auto" }} variante="primario">
          <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
            <TbPlus aria-hidden="true" size={18} />
          </motion.span>{" "}
          Cadastrar coordenacao
        </Botao>
      </div>

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Lista de coordenadores" className="tabela-dados">
          <thead>
            <tr>
              <th scope="col">
                <button className="tabela-dados__th-btn" onClick={alternarOrdenacao} type="button">
                  Coordenador <IconeOrdenacao direcao={direcao} />
                </button>
              </th>
              <th scope="col">Curso sob supervisao</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {itensPagina.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={4}>Nenhum coordenador encontrado.</td>
              </tr>
            ) : (
              itensPagina.map((coordenador) => {
                const cursosDoCoordenador = obterCursosDoCoordenador(coordenador);
                const cursoPrincipal = cursosDoCoordenador[0]?.titulo || "";

                return (
                  <tr className="tabela-linha-clicavel" key={coordenador.id} onClick={() => setCoordenadorDetalhe(coordenador)}>
                    <td>
                      <div className="tabela-aluno">
                        <div aria-hidden="true" className="topbar__avatar tabela-aluno__avatar">
                          {iniciaisNome(coordenador.nome)}
                        </div>
                        <div>
                          <strong className="tabela-aluno__nome">{coordenador.nome}</strong>
                          <span className="tabela-aluno__email">{coordenador.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {cursoPrincipal ? (
                        <span>{cursoPrincipal}{cursosDoCoordenador.length > 1 ? ` +${cursosDoCoordenador.length - 1}` : ""}</span>
                      ) : (
                        <span className="tabela-matricula__vazio">Sem curso</span>
                      )}
                    </td>
                    <td>
                      <Insignia texto={coordenador.ativo ? "Ativo" : "Inativo"} variante={coordenador.ativo ? "sucesso" : "erro"} />
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <button
                        aria-expanded={kebabAbertoId === coordenador.id}
                        aria-haspopup="menu"
                        aria-label={`Acoes para ${coordenador.nome}`}
                        className="kebab-btn"
                        onClick={(event) => abrirKebab(event, coordenador.id)}
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
        <nav aria-label="Paginacao de coordenadores" className="paginacao">
          <span className="paginacao__info">
            {inicio + 1}-{Math.min(inicio + ITENS_POR_PAGINA, coordenadoresFiltrados.length)} de {coordenadoresFiltrados.length}
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

      {kebabAbertoId && coordenadorKebab
        ? createPortal(
            <div className="kebab-menu" ref={kebabRef} style={{ left: kebabPos.left, top: kebabPos.top }}>
              <button
                className="kebab-menu__item"
                onClick={() => {
                  setCoordenadorDetalhe(coordenadorKebab);
                  setKebabAbertoId(null);
                }}
                type="button"
              >
                Ver detalhes
              </button>
            </div>,
            document.body
          )
        : null}

      {coordenadorDetalhe ? (
        <Modal onFechar={() => setCoordenadorDetalhe(null)} titulo="Detalhes do coordenador">
          <div className="detalhe-usuario__perfil">
            <div aria-hidden="true" className="topbar__avatar detalhe-usuario__avatar">
              {iniciaisNome(coordenadorDetalhe.nome)}
            </div>
            <div className="detalhe-usuario__identidade">
              <h3 className="detalhe-usuario__nome">{coordenadorDetalhe.nome}</h3>
              <span className="detalhe-usuario__email">{coordenadorDetalhe.email}</span>
            </div>
            <Insignia texto={coordenadorDetalhe.ativo ? "Ativo" : "Inativo"} variante={coordenadorDetalhe.ativo ? "sucesso" : "erro"} />
          </div>

          <dl className="detalhe-usuario__dados">
            <div className="detalhe-usuario__dado">
              <dt>Registro</dt>
              <dd>{coordenadorDetalhe.codigoRegistro || "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>CPF</dt>
              <dd>{maskCpf(coordenadorDetalhe.cpf)}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Telefone</dt>
              <dd>{coordenadorDetalhe.telefone || "-"}</dd>
            </div>
            <div className="detalhe-usuario__dado">
              <dt>Cadastro</dt>
              <dd>{formatDate(coordenadorDetalhe.dataCadastro)}</dd>
            </div>
          </dl>

          <section>
            <h4 className="detalhe-usuario__secao-titulo">Cursos sob supervisao</h4>
            {cursosDetalhe.length === 0 ? (
              <p className="texto-vazio">Nenhum curso sob supervisao.</p>
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
            <Botao onClick={() => setCoordenadorDetalhe(null)} variante="perigo">
              <TbX aria-hidden="true" size={15} /> Fechar
            </Botao>
          </footer>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal onFechar={fecharFormulario} titulo="Cadastrar coordenacao">
          <form className="formulario-modal" onSubmit={salvarCoordenador}>
            <div className="formulario-perfil__grade">
              <div className="campo formulario-perfil__campo--largo">
                <label className="campo__rotulo" htmlFor="coordenador-nome">Nome completo *</label>
                <input autoComplete="name" className="campo__entrada" disabled={salvando} id="coordenador-nome" maxLength={150} name="nome" onChange={atualizarCampo} value={dadosFormulario.nome} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-email">E-mail *</label>
                <input autoComplete="email" className="campo__entrada" disabled={salvando} id="coordenador-email" name="email" onChange={atualizarCampo} type="email" value={dadosFormulario.email} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-cpf">CPF *</label>
                <input autoComplete="off" className="campo__entrada" disabled={salvando} id="coordenador-cpf" inputMode="numeric" maxLength={14} name="cpf" onChange={atualizarCampo} placeholder="Somente numeros" value={dadosFormulario.cpf} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-telefone">Telefone *</label>
                <input autoComplete="tel" className="campo__entrada" disabled={salvando} id="coordenador-telefone" maxLength={20} name="telefone" onChange={atualizarCampo} placeholder="(11) 99999-9999" value={dadosFormulario.telefone} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-cep">CEP *</label>
                <input autoComplete="postal-code" className="campo__entrada" disabled={salvando} id="coordenador-cep" inputMode="numeric" maxLength={9} name="cep" onChange={atualizarCampo} placeholder="00000-000" value={dadosFormulario.cep} />
              </div>
              <div className="campo formulario-perfil__campo--largo">
                <label className="campo__rotulo" htmlFor="coordenador-rua">Rua *</label>
                <input autoComplete="address-line1" className="campo__entrada" disabled={salvando} id="coordenador-rua" maxLength={200} name="rua" onChange={atualizarCampo} value={dadosFormulario.rua} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-numero">Numero *</label>
                <input autoComplete="address-line2" className="campo__entrada" disabled={salvando} id="coordenador-numero" maxLength={20} name="numero" onChange={atualizarCampo} value={dadosFormulario.numero} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-bairro">Bairro *</label>
                <input autoComplete="address-level3" className="campo__entrada" disabled={salvando} id="coordenador-bairro" maxLength={120} name="bairro" onChange={atualizarCampo} value={dadosFormulario.bairro} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-cidade">Cidade *</label>
                <input autoComplete="address-level2" className="campo__entrada" disabled={salvando} id="coordenador-cidade" maxLength={120} name="cidade" onChange={atualizarCampo} value={dadosFormulario.cidade} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-estado">UF *</label>
                <input autoComplete="address-level1" className="campo__entrada" disabled={salvando} id="coordenador-estado" maxLength={2} name="estado" onChange={atualizarCampo} placeholder="SP" value={dadosFormulario.estado} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-senha">Senha *</label>
                <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="coordenador-senha" minLength={6} name="senha" onChange={atualizarCampo} type="password" value={dadosFormulario.senha} />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="coordenador-confirmar-senha">Confirmar senha *</label>
                <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="coordenador-confirmar-senha" minLength={6} name="confirmarSenha" onChange={atualizarCampo} type="password" value={dadosFormulario.confirmarSenha} />
              </div>
            </div>

            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}

            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Cadastrar coordenacao"}
              </Botao>
            </footer>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
