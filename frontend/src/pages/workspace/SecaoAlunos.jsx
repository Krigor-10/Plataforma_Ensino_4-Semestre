import { useMemo, useRef, useState } from "react";
import { MdSave } from "react-icons/md";
import { TbCheck, TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbLock, TbSearch, TbSelector, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import MenuKebabTabela from "../../components/MenuKebabTabela.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useSelecaoEmLote } from "../../hooks/useSelecaoEmLote.js";
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

/* Tabela no mesmo padrao de SecaoProfessores.jsx (docs/alunos-admin/PROMPT-
   agente-tabela-alunos-igual-professores.md): abas Ativos/Inativos, selecao
   em lote e menu kebab, so pro Admin - o Coordenador continua so com "Ver
   detalhes", sem checkbox nem barra de lote. Editar dados e inativar/
   reativar (com motivo obrigatorio) vem de PROMPT-agente-editar-e-inativar-
   aluno.md; aqui so muda COMO se chega nessas acoes (direto pelo kebab/lote,
   alem de dentro do modal de detalhes). `alunoDetalheBase` guarda so o
   registro no momento em que o modal abriu - `alunoDetalhe` deriva da lista
   `alunos` (prop) mais recente pra refletir a edicao/inativacao sem precisar
   fechar e reabrir o modal. */
export function SecaoAlunos({ alunos, cursos = [], matriculas = [], onRefresh, onSessionExpired, usuario }) {
  const { mostrarToast } = useToast();
  const souAdmin = usuario?.tipoUsuario === "Admin";

  const [busca, setBusca] = useState("");
  const [abaStatus, setAbaStatus] = useState("ativos");
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
  const [confirmacaoLote, setConfirmacaoLote] = useState(null);
  const [motivoLote, setMotivoLote] = useState("");
  const [executandoLote, setExecutandoLote] = useState(false);
  const refAbas = useRef(null);
  const abasTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbas);

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
    let proximos = alunos.filter((aluno) => Boolean(aluno.ativo) === (abaStatus === "ativos"));

    if (termoBusca) {
      proximos = proximos.filter((aluno) => {
        const campos = [aluno.nome, aluno.email, aluno.matricula];
        return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
      });
    }

    return [...proximos].sort((left, right) => {
      const comparacao = String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
      return direcao === "asc" ? comparacao : -comparacao;
    });
  }, [abaStatus, alunos, direcao, termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(alunosFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = alunosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  const totalAtivos = alunos.filter((aluno) => aluno.ativo).length;
  const totalInativos = alunos.length - totalAtivos;
  const colunas = souAdmin ? 6 : 5;

  const {
    selecionados,
    setSelecionados,
    refCheckboxCabecalho,
    todosSelecionadosNaPagina,
    alternarSelecao,
    alternarSelecaoPagina,
    limparSelecao
  } = useSelecaoEmLote(itensPagina);

  function selecionarAbaStatus(aba) {
    setAbaStatus(aba);
    setPagina(1);
  }

  function limparFiltros() {
    setBusca("");
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

  function dadosEdicaoDoAluno(aluno) {
    return {
      nome: aluno.nome || "",
      email: aluno.email || "",
      telefone: maskTelefone(aluno.telefone || ""),
      matricula: aluno.matricula || ""
    };
  }

  function abrirEdicao() {
    if (!alunoDetalhe) {
      return;
    }

    setDadosEdicao(dadosEdicaoDoAluno(alunoDetalhe));
    setMensagemEdicao({ tone: "", message: "" });
    setModoEdicao(true);
  }

  // As tres funcoes abaixo abrem a edicao/confirmacao direto pelo menu kebab
  // da linha, sem passar pelo modal de Detalhes primeiro (item 3 do prompt) -
  // setam alunoDetalheBase pra essas acoes (que leem de alunoDetalhe) terem o
  // que precisam.
  function abrirEdicaoDireta(aluno) {
    setAlunoDetalheBase(aluno);
    setConfirmandoInativar(false);
    setConfirmandoReativar(false);
    setDadosEdicao(dadosEdicaoDoAluno(aluno));
    setMensagemEdicao({ tone: "", message: "" });
    setModoEdicao(true);
  }

  function abrirConfirmacaoInativarDireta(aluno) {
    setAlunoDetalheBase(aluno);
    setModoEdicao(false);
    setMotivoInativar("");
    setConfirmandoInativar(true);
  }

  function abrirConfirmacaoReativarDireta(aluno) {
    setAlunoDetalheBase(aluno);
    setModoEdicao(false);
    setConfirmandoReativar(true);
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

    // Valida o formato aqui porque o 400 do [EmailAddress] do backend vem
    // como ValidationProblemDetails ({ title, errors }), formato que
    // lerRespostaOuFalhar (shared/apiClient.js) nao sabe ler - sem isso, um
    // e-mail mal formatado so mostrava "Nao foi possivel concluir a
    // operacao.", sem dizer o que estava errado.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dadosEdicao.email.trim())) {
      setMensagemEdicao({ tone: "error", message: "O e-mail fornecido não é válido." });
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

  async function executarAcaoLote() {
    const reativando = confirmacaoLote === "reativar";
    if (!reativando && motivoLote.trim().length < MOTIVO_MINIMO) {
      return;
    }

    const alvos = itensPagina.filter((aluno) => selecionados.has(aluno.id));
    setExecutandoLote(true);

    let sucesso = 0;
    let falha = 0;

    for (const aluno of alvos) {
      try {
        if (reativando) {
          await apiRequest(`/Alunos/${aluno.id}/reativar`, { method: "POST" });
        } else {
          await apiRequest(`/Alunos/${aluno.id}/inativar`, {
            method: "POST",
            body: JSON.stringify({ motivo: motivoLote.trim() })
          });
        }
        sucesso += 1;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setExecutandoLote(false);
          onSessionExpired?.();
          return;
        }

        falha += 1;
      }
    }

    setExecutandoLote(false);
    setConfirmacaoLote(null);
    setMotivoLote("");
    setSelecionados(new Set());
    onRefresh?.();

    if (falha === 0) {
      mostrarToast(
        reativando
          ? `${sucesso} aluno${sucesso === 1 ? "" : "s"} reativado${sucesso === 1 ? "" : "s"} com sucesso.`
          : `${sucesso} aluno${sucesso === 1 ? "" : "s"} inativado${sucesso === 1 ? "" : "s"} com sucesso.`,
        "sucesso"
      );
    } else {
      mostrarToast(
        `${sucesso} de ${alvos.length} alunos atualizados; ${falha} falharam e continuam com o status anterior.`,
        "erro"
      );
    }
  }

  return (
    <div className="tela-alunos">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Alunos</h2>
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
            placeholder="Buscar por nome, e-mail ou RA..."
            type="search"
            value={busca}
          />
        </div>
      </header>

      <div className="linha-abas-status">
        <nav
          aria-label="Status dos alunos"
          className={`abas-matriculas${abasTemConteudoEscondido ? " abas-matriculas--mais-a-direita" : ""}`}
          ref={refAbas}
          role="tablist"
        >
          <button
            aria-selected={abaStatus === "ativos"}
            className={`abas-matriculas__aba${abaStatus === "ativos" ? " abas-matriculas__aba--ativa" : ""}`}
            onClick={() => selecionarAbaStatus("ativos")}
            role="tab"
            type="button"
          >
            Ativos <span className="abas-matriculas__contagem">{totalAtivos}</span>
          </button>
          <button
            aria-selected={abaStatus === "inativos"}
            className={`abas-matriculas__aba${abaStatus === "inativos" ? " abas-matriculas__aba--ativa" : ""}`}
            onClick={() => selecionarAbaStatus("inativos")}
            role="tab"
            type="button"
          >
            Inativos <span className="abas-matriculas__contagem">{totalInativos}</span>
          </button>
        </nav>
        <div className="indicadores-status">
          <Insignia texto={`${alunos.length} cadastrado${alunos.length === 1 ? "" : "s"}`} variante="neutro" />
          <Insignia texto={`${totalAtivos} ativo${totalAtivos === 1 ? "" : "s"}`} variante="sucesso" />
          <Insignia texto={`${totalInativos} inativo${totalInativos === 1 ? "" : "s"}`} variante="neutro" />
        </div>
      </div>

      <div className="barra-filtros">
        <Botao disabled={!termoBusca} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
          Limpar filtros
        </Botao>

        {souAdmin && selecionados.size > 0 ? (
          <div className="barra-filtros__selecao">
            <span aria-live="polite" className="barra-filtros__selecao-contador">
              {selecionados.size} aluno{selecionados.size === 1 ? "" : "s"} selecionado{selecionados.size === 1 ? "" : "s"}
            </span>
            {abaStatus === "ativos" ? (
              <Botao
                onClick={() => {
                  setMotivoLote("");
                  setConfirmacaoLote("inativar");
                }}
                tamanho="pequeno"
                variante="secundario"
              >
                Inativar selecionados
              </Botao>
            ) : (
              <Botao onClick={() => setConfirmacaoLote("reativar")} tamanho="pequeno" variante="secundario">
                Reativar selecionados
              </Botao>
            )}
            <Botao onClick={limparSelecao} tamanho="pequeno" variante="fantasma">
              Limpar seleção
            </Botao>
          </div>
        ) : null}
      </div>

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Lista de alunos" className="tabela-dados">
          <thead>
            <tr>
              {souAdmin ? (
                <th scope="col">
                  <input
                    aria-label="Selecionar todos os alunos desta pagina"
                    checked={todosSelecionadosNaPagina}
                    disabled={itensPagina.length === 0}
                    onChange={alternarSelecaoPagina}
                    ref={refCheckboxCabecalho}
                    type="checkbox"
                  />
                </th>
              ) : null}
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
                <td colSpan={colunas}>
                  {abaStatus === "ativos" ? "Nenhum aluno ativo encontrado." : "Nenhum aluno inativo."}
                </td>
              </tr>
            ) : (
              itensPagina.map((aluno) => {
                const cursosDoAluno = matriculasPorAluno.get(Number(aluno.id)) || [];

                return (
                  <tr className="tabela-linha-clicavel" key={aluno.id} onClick={() => abrirDetalhe(aluno)}>
                    {souAdmin ? (
                      <td data-label="" onClick={(event) => event.stopPropagation()}>
                        <input
                          aria-label={`Selecionar ${aluno.nome}`}
                          checked={selecionados.has(aluno.id)}
                          onChange={() => alternarSelecao(aluno.id)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
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
                      <Insignia texto={aluno.ativo ? "Ativo" : "Inativo"} variante={aluno.ativo ? "sucesso" : "neutro"} />
                    </td>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <MenuKebabTabela
                        itens={
                          souAdmin
                            ? [
                                { chave: "ver-detalhes", rotulo: "Ver detalhes", onSelecionar: () => abrirDetalhe(aluno) },
                                { chave: "editar", rotulo: "Editar dados", onSelecionar: () => abrirEdicaoDireta(aluno) },
                                aluno.ativo
                                  ? { chave: "inativar", rotulo: "Inativar acesso", onSelecionar: () => abrirConfirmacaoInativarDireta(aluno) }
                                  : { chave: "reativar", rotulo: "Reativar acesso", onSelecionar: () => abrirConfirmacaoReativarDireta(aluno) }
                              ]
                            : [{ chave: "ver-detalhes", rotulo: "Ver detalhes", onSelecionar: () => abrirDetalhe(aluno) }]
                        }
                        rotulo={`Ações para ${aluno.nome}`}
                      />
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

      {confirmacaoLote ? (
        <Modal
          onFechar={() => !executandoLote && setConfirmacaoLote(null)}
          titulo={confirmacaoLote === "reativar" ? "Reativar alunos selecionados" : "Inativar alunos selecionados"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={executandoLote} onClick={() => setConfirmacaoLote(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao
                disabled={executandoLote || (confirmacaoLote === "inativar" && motivoLote.trim().length < MOTIVO_MINIMO)}
                onClick={executarAcaoLote}
                variante={confirmacaoLote === "reativar" ? "sucesso" : "perigo"}
              >
                <TbCheck aria-hidden="true" size={15} />{" "}
                {executandoLote
                  ? "Processando..."
                  : confirmacaoLote === "reativar"
                  ? "Confirmar reativação"
                  : "Confirmar inativação"}
              </Botao>
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            {confirmacaoLote === "reativar"
              ? `Reativar ${selecionados.size} aluno${selecionados.size === 1 ? "" : "s"} selecionado${selecionados.size === 1 ? "" : "s"}?`
              : `Inativar ${selecionados.size} aluno${selecionados.size === 1 ? "" : "s"} selecionado${selecionados.size === 1 ? "" : "s"}? Eles saem da plataforma imediatamente. Matrículas, progresso e certificados ficam guardados.`}
          </p>
          {confirmacaoLote === "inativar" ? (
            <div className="campo">
              <label className="campo__rotulo" htmlFor="motivo-inativar-lote">Motivo *</label>
              <textarea
                className="campo__entrada"
                disabled={executandoLote}
                id="motivo-inativar-lote"
                maxLength={MOTIVO_MAXIMO}
                onChange={(event) => setMotivoLote(event.target.value)}
                rows={3}
                value={motivoLote}
              />
              <span className="campo__dica">{motivoLote.trim().length}/{MOTIVO_MAXIMO}</span>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
