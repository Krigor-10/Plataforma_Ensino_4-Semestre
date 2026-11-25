import { useMemo, useState } from "react";
import { MdSave } from "react-icons/md";
import { TbCheck, TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbEye, TbLock, TbSearch, TbSelector, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { mapById } from "../../lib/dashboard.js";
import { formatDate, iniciaisNome, maskCpf, maskTelefone, normalizeStatus } from "../../lib/format.js";

const ITENS_POR_PAGINA = 8;
const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 300;

const ESTADO_INICIAL_EDICAO = { nome: "", email: "", telefone: "", matricula: "" };

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

/* Editar dados basicos/de contato e inativar/reativar o acesso (docs/alunos-
   admin/PROMPT-agente-editar-e-inativar-aluno.md) - so o Admin ve os botoes
   novos no rodape do modal de detalhes; o Coordenador continua so com
   "Fechar", como antes. `alunoDetalheBase` guarda soh o registro no momento
   em que o modal abriu - `alunoDetalhe` deriva da lista `alunos` (prop) mais
   recente pra refletir a edicao/inativacao sem precisar fechar e reabrir o
   modal, caindo de volta pro snapshot se o id sumir momentaneamente de uma
   atualizacao em andamento (onRefresh nao e aguardavel, so dispara o refetch
   no componente pai). */
export function SecaoAlunos({ alunos, cursos = [], matriculas = [], onRefresh, onSessionExpired, usuario }) {
  const { mostrarToast } = useToast();
  const souAdmin = usuario?.tipoUsuario === "Admin";

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [alunoDetalheBase, setAlunoDetalheBase] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState(ESTADO_INICIAL_EDICAO);
  const [mensagemEdicao, setMensagemEdicao] = useState({ tone: "", message: "" });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);
  const [motivoInativar, setMotivoInativar] = useState("");
  const [confirmandoReativar, setConfirmandoReativar] = useState(false);
  const [processandoAcesso, setProcessandoAcesso] = useState(false);

  const alunoDetalhe = alunoDetalheBase
    ? alunos.find((aluno) => Number(aluno.id) === Number(alunoDetalheBase.id)) || alunoDetalheBase
    : null;

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

  function abrirDetalhe(aluno) {
    setAlunoDetalheBase(aluno);
    setModoEdicao(false);
    setConfirmandoInativar(false);
    setConfirmandoReativar(false);
  }

  function fecharModalDetalhe() {
    if (salvandoEdicao || processandoAcesso) {
      return;
    }

    setAlunoDetalheBase(null);
    setModoEdicao(false);
  }

  function abrirEdicao() {
    if (!alunoDetalhe) {
      return;
    }

    setDadosEdicao({
      nome: alunoDetalhe.nome || "",
      email: alunoDetalhe.email || "",
      telefone: alunoDetalhe.telefone || "",
      matricula: alunoDetalhe.matricula || ""
    });
    setMensagemEdicao({ tone: "", message: "" });
    setModoEdicao(true);
  }

  function fecharEdicao() {
    if (salvandoEdicao) {
      return;
    }

    setModoEdicao(false);
  }

  function atualizarCampoEdicao(event) {
    const { name, value } = event.target;
    setDadosEdicao((atual) => ({ ...atual, [name]: name === "telefone" ? maskTelefone(value) : value }));
  }

  const emailMudou = Boolean(
    modoEdicao && alunoDetalhe && dadosEdicao.email.trim().toLowerCase() !== String(alunoDetalhe.email || "").trim().toLowerCase()
  );

  async function salvarEdicao(event) {
    event.preventDefault();

    if (!alunoDetalhe) {
      return;
    }

    if (!dadosEdicao.nome.trim() || !dadosEdicao.email.trim() || !dadosEdicao.matricula.trim()) {
      setMensagemEdicao({ tone: "error", message: "Preencha nome, e-mail e RA." });
      return;
    }

    setSalvandoEdicao(true);
    setMensagemEdicao({ tone: "", message: "" });

    try {
      const resposta = await apiRequest(`/Alunos/${alunoDetalhe.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: dadosEdicao.nome.trim(),
          email: dadosEdicao.email.trim(),
          telefone: dadosEdicao.telefone.trim(),
          matricula: dadosEdicao.matricula.trim()
        })
      });

      setModoEdicao(false);
      onRefresh?.();

      if (resposta?.avisoEmailEnviado === false) {
        mostrarToast("Dados do aluno atualizados. Não foi possível enviar o aviso por e-mail.", "aviso");
      } else {
        mostrarToast("Dados do aluno atualizados.", "sucesso");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemEdicao({ tone: "error", message: err.message || "Não foi possível salvar os dados agora." });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirConfirmacaoInativar() {
    setMotivoInativar("");
    setConfirmandoInativar(true);
  }

  async function confirmarInativar() {
    if (!alunoDetalhe || motivoInativar.trim().length < MOTIVO_MINIMO) {
      return;
    }

    setProcessandoAcesso(true);

    try {
      await apiRequest(`/Alunos/${alunoDetalhe.id}/inativar`, {
        method: "POST",
        body: JSON.stringify({ motivo: motivoInativar.trim() })
      });

      setConfirmandoInativar(false);
      onRefresh?.();
      mostrarToast("Acesso do aluno inativado.", "sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Não foi possível inativar o acesso agora.", "erro");
    } finally {
      setProcessandoAcesso(false);
    }
  }

  async function confirmarReativar() {
    if (!alunoDetalhe) {
      return;
    }

    setProcessandoAcesso(true);

    try {
      await apiRequest(`/Alunos/${alunoDetalhe.id}/reativar`, { method: "POST" });

      setConfirmandoReativar(false);
      onRefresh?.();
      mostrarToast("Acesso do aluno reativado.", "sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Não foi possível reativar o acesso agora.", "erro");
    } finally {
      setProcessandoAcesso(false);
    }
  }

  return (
    <div className="tela-alunos">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Alunos</h2>
          <p className="cabecalho-pagina__subtitulo">
            {alunos.length} cadastrado{alunos.length === 1 ? "" : "s"} - {totalAtivos} ativo{totalAtivos === 1 ? "" : "s"}
          </p>
        </div>
        <div className="campo-busca campo-busca--cabecalho">
          <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
          <label className="visualmente-oculto" htmlFor="busca-alunos">Buscar aluno</label>
          <input
            className="campo__entrada"
            id="busca-alunos"
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nome ou e-mail..."
            type="search"
            value={busca}
          />
        </div>
      </header>

      <div className="barra-filtros">
        <select
          aria-label="Filtrar alunos por status"
          className="campo__entrada barra-filtros__select"
          onChange={(event) => {
            setFiltroStatus(event.target.value);
            setPagina(1);
          }}
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
              <th className="tabela-dados__col-acoes" scope="col" />
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
                  <tr className="tabela-linha-clicavel" key={aluno.id} onClick={() => abrirDetalhe(aluno)}>
                    <td data-label="Aluno">
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
                    <td data-label="Cadastro">{formatDate(aluno.dataCadastro)}</td>
                    <td data-label="Cursos matriculados">
                      {cursosDoAluno.length === 0 ? (
                        <span className="tabela-matricula__vazio">Nenhum curso</span>
                      ) : (
                        <span>{cursosDoAluno[0].cursoTitulo}{cursosDoAluno.length > 1 ? ` +${cursosDoAluno.length - 1}` : ""}</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <Insignia texto={aluno.ativo ? "Ativo" : "Inativo"} variante={aluno.ativo ? "sucesso" : "erro"} />
                    </td>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <button
                        aria-label={`Ver detalhes de ${aluno.nome}`}
                        className="kebab-btn"
                        onClick={() => abrirDetalhe(aluno)}
                        type="button"
                      >
                        <TbEye aria-hidden="true" size={16} />
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

      {alunoDetalhe && !confirmandoInativar && !confirmandoReativar ? (
        <Modal
          onFechar={fecharModalDetalhe}
          titulo={modoEdicao ? "Editar dados do aluno" : "Detalhes do aluno"}
          rodape={
            modoEdicao ? (
              <footer className="modal-rodape">
                <Botao disabled={salvandoEdicao} onClick={fecharEdicao} type="button" variante="perigo">
                  <TbX aria-hidden="true" size={15} /> Cancelar
                </Botao>
                <Botao disabled={salvandoEdicao} form="form-editar-aluno" type="submit" variante="primario">
                  <MdSave aria-hidden="true" size={17} /> {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
                </Botao>
              </footer>
            ) : (
              <footer className="modal-rodape">
                {souAdmin ? (
                  <>
                    <Botao onClick={abrirEdicao} variante="secundario">Editar dados</Botao>
                    {alunoDetalhe.ativo ? (
                      <Botao onClick={abrirConfirmacaoInativar} variante="perigo">Inativar acesso</Botao>
                    ) : (
                      <Botao onClick={() => setConfirmandoReativar(true)} variante="sucesso">Reativar acesso</Botao>
                    )}
                  </>
                ) : null}
                <Botao onClick={fecharModalDetalhe} variante="fantasma">
                  <TbX aria-hidden="true" size={15} /> Fechar
                </Botao>
              </footer>
            )
          }
        >
          {modoEdicao ? (
            <form className="formulario-modal" id="form-editar-aluno" onSubmit={salvarEdicao}>
              <div className="formulario-perfil__grade">
                <div className="campo formulario-perfil__campo--largo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-nome">Nome completo *</label>
                  <input autoComplete="name" className="campo__entrada" disabled={salvandoEdicao} id="aluno-edicao-nome" maxLength={150} name="nome" onChange={atualizarCampoEdicao} value={dadosEdicao.nome} />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-email">E-mail *</label>
                  <input autoComplete="email" className="campo__entrada" disabled={salvandoEdicao} id="aluno-edicao-email" name="email" onChange={atualizarCampoEdicao} type="email" value={dadosEdicao.email} />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-telefone">Telefone</label>
                  <input autoComplete="tel" className="campo__entrada" disabled={salvandoEdicao} id="aluno-edicao-telefone" maxLength={15} name="telefone" onChange={atualizarCampoEdicao} placeholder="(11) 99999-9999" value={dadosEdicao.telefone} />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-matricula">RA *</label>
                  <input autoComplete="off" className="campo__entrada" disabled={salvandoEdicao} id="aluno-edicao-matricula" maxLength={30} name="matricula" onChange={atualizarCampoEdicao} value={dadosEdicao.matricula} />
                </div>
              </div>

              <div className="formulario-perfil__grade" style={{ marginTop: "var(--espaco-md)" }}>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-cpf">CPF</label>
                  <input className="campo__entrada" disabled id="aluno-edicao-cpf" readOnly value={maskCpf(alunoDetalhe.cpf)} />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="aluno-edicao-cidade">Cidade/UF</label>
                  <input className="campo__entrada" disabled id="aluno-edicao-cidade" readOnly value={alunoDetalhe.cidade ? `${alunoDetalhe.cidade}/${alunoDetalhe.estado}` : "-"} />
                </div>
              </div>
              <span className="campo__dica">
                <TbLock aria-hidden="true" size={12} /> Dados pessoais protegidos: não editáveis pela administração.
              </span>

              {emailMudou ? (
                <InlineMessage tone="warning">O aluno será desconectado e receberá um aviso no e-mail antigo e no novo.</InlineMessage>
              ) : null}
              {mensagemEdicao.message ? <InlineMessage tone={mensagemEdicao.tone}>{mensagemEdicao.message}</InlineMessage> : null}
            </form>
          ) : (
            <>
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

              {!alunoDetalhe.ativo && alunoDetalhe.inativadoEm ? (
                <InlineMessage tone="error">
                  Acesso inativado em {formatDate(alunoDetalhe.inativadoEm)}
                  {alunoDetalhe.inativadoPorNome ? ` por ${alunoDetalhe.inativadoPorNome}` : ""}.
                  {alunoDetalhe.motivoInativacao ? ` Motivo: ${alunoDetalhe.motivoInativacao}` : ""}
                </InlineMessage>
              ) : null}

              <dl className="detalhe-usuario__dados">
                <div className="detalhe-usuario__dado">
                  <dt>RA</dt>
                  <dd>{alunoDetalhe.matricula || "-"}</dd>
                </div>
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
            </>
          )}
        </Modal>
      ) : null}

      {confirmandoInativar && alunoDetalhe ? (
        <Modal
          onFechar={() => !processandoAcesso && setConfirmandoInativar(false)}
          titulo={`Inativar acesso de ${alunoDetalhe.nome}?`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={processandoAcesso} onClick={() => setConfirmandoInativar(false)} variante="fantasma">
                Cancelar
              </Botao>
              <Botao disabled={processandoAcesso || motivoInativar.trim().length < MOTIVO_MINIMO} onClick={confirmarInativar} variante="perigo">
                {processandoAcesso ? "Inativando..." : "Inativar"}
              </Botao>
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            O aluno sai da plataforma imediatamente e não consegue entrar até ser reativado. Matrículas, progresso e certificados ficam guardados.
          </p>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="motivo-inativar-aluno">Motivo *</label>
            <textarea
              className="campo__entrada"
              disabled={processandoAcesso}
              id="motivo-inativar-aluno"
              maxLength={MOTIVO_MAXIMO}
              onChange={(event) => setMotivoInativar(event.target.value)}
              rows={3}
              value={motivoInativar}
            />
            <span className="campo__dica">{motivoInativar.trim().length}/{MOTIVO_MAXIMO}</span>
          </div>
        </Modal>
      ) : null}

      {confirmandoReativar && alunoDetalhe ? (
        <Modal
          onFechar={() => !processandoAcesso && setConfirmandoReativar(false)}
          titulo="Reativar acesso"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={processandoAcesso} onClick={() => setConfirmandoReativar(false)} variante="fantasma">
                Cancelar
              </Botao>
              <Botao disabled={processandoAcesso} onClick={confirmarReativar} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {processandoAcesso ? "Reativando..." : "Reativar"}
              </Botao>
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            Reativar o acesso de {alunoDetalhe.nome}? Ele volta a entrar com o mesmo e-mail e senha.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
