import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TbCheck, TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbPlus, TbSearch, TbX } from "react-icons/tb";
import { MdGroups, MdSave, MdSchool } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import Insignia from "../../components/Insignia.jsx";
import MenuKebabTabela from "../../components/MenuKebabTabela.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useSelecaoEmLote } from "../../hooks/useSelecaoEmLote.js";
import { useToast } from "../../hooks/useToast.jsx";
import { useConsultaCep } from "../../hooks/useConsultaCep.js";
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
  const { mostrarToast } = useToast();
  const [busca, setBusca] = useState("");
  const [abaStatus, setAbaStatus] = useState("ativos");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [professorDetalhe, setProfessorDetalhe] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [professorEmEdicaoId, setProfessorEmEdicaoId] = useState(null);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const { status: statusCep, mensagem: mensagemCep, consultarCep } = useConsultaCep({
    onEncontrado: (endereco) => {
      setDadosFormulario((atual) => ({
        ...atual,
        rua: endereco.rua,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado
      }));
    }
  });
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoLote, setConfirmacaoLote] = useState(null);
  const [executandoLote, setExecutandoLote] = useState(false);
  const refAbas = useRef(null);
  const abasTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbas);

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
    let proximos = professores.filter((professor) => Boolean(professor.ativo) === (abaStatus === "ativos"));

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
  }, [abaStatus, direcao, professores, termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(professoresFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = professoresFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  const totalAtivos = professores.filter((professor) => professor.ativo).length;
  const totalInativos = professores.length - totalAtivos;

  const {
    selecionados,
    setSelecionados,
    refCheckboxCabecalho,
    todosSelecionadosNaPagina,
    alternarSelecao,
    alternarSelecaoPagina,
    limparSelecao
  } = useSelecaoEmLote(itensPagina);

  async function executarAcaoLote() {
    const reativando = confirmacaoLote === "reativar";
    const alvos = itensPagina.filter((professor) => selecionados.has(professor.id));

    setExecutandoLote(true);

    let sucesso = 0;
    let falha = 0;

    for (const professor of alvos) {
      try {
        await apiRequest(`/Professores/${professor.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: professor.nome,
            email: professor.email,
            cpf: professor.cpf,
            telefone: professor.telefone,
            cep: professor.cep,
            rua: professor.rua,
            numero: professor.numero,
            bairro: professor.bairro,
            cidade: professor.cidade,
            estado: professor.estado,
            especialidade: professor.especialidade,
            ativo: reativando
          })
        });
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
    setSelecionados(new Set());
    onRefresh?.();

    if (falha === 0) {
      mostrarToast(
        reativando
          ? `${sucesso} professor${sucesso === 1 ? "" : "es"} reativado${sucesso === 1 ? "" : "s"} com sucesso.`
          : `${sucesso} professor${sucesso === 1 ? "" : "es"} inativado${sucesso === 1 ? "" : "s"} com sucesso.`,
        "sucesso"
      );
    } else {
      mostrarToast(
        `${sucesso} de ${alvos.length} professores atualizados; ${falha} falharam e continuam com o status anterior.`,
        "erro"
      );
    }
  }

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
      mostrarToast(professorEmEdicaoId ? "Professor atualizado com sucesso." : "Professor cadastrado com sucesso.", "sucesso");
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

  async function alternarStatusProfessor(professor) {
    const novoStatusAtivo = !professor.ativo;

    try {
      await apiRequest(`/Professores/${professor.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: professor.nome,
          email: professor.email,
          cpf: professor.cpf,
          telefone: professor.telefone,
          cep: professor.cep,
          rua: professor.rua,
          numero: professor.numero,
          bairro: professor.bairro,
          cidade: professor.cidade,
          estado: professor.estado,
          especialidade: professor.especialidade,
          ativo: novoStatusAtivo
        })
      });

      mostrarToast(novoStatusAtivo ? "Professor reativado com sucesso." : "Professor inativado com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel atualizar o status do professor agora.", "erro");
    }
  }

  const cursosDetalhe = professorDetalhe ? obterCursosDoProfessor(professorDetalhe) : [];
  const turmasDetalhe = professorDetalhe ? turmasPorProfessor.get(Number(professorDetalhe.id)) || [] : [];

  return (
    <div className="tela-professores">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Professores</h2>
        </div>
        <div className="barra-filtros">
          <div className="campo-busca">
            <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
            <label className="visualmente-oculto" htmlFor="busca-professores">Buscar professor</label>
            <input
              className="campo__entrada"
              id="busca-professores"
              onChange={(event) => {
                setBusca(event.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por nome, e-mail ou especialidade..."
              type="search"
              value={busca}
            />
          </div>
          <Botao onClick={abrirFormulario} tamanho="pequeno" variante="primario">
            <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
              <TbPlus aria-hidden="true" size={18} />
            </motion.span>{" "}
            Cadastrar professor
          </Botao>
        </div>
      </header>

      <div className="linha-abas-status">
        <nav
          aria-label="Status dos professores"
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
          <Insignia texto={`${professores.length} cadastrado${professores.length === 1 ? "" : "s"}`} variante="neutro" />
          <Insignia texto={`${totalAtivos} ativo${totalAtivos === 1 ? "" : "s"}`} variante="sucesso" />
          <Insignia texto={`${totalInativos} inativo${totalInativos === 1 ? "" : "s"}`} variante="neutro" />
        </div>
      </div>

      <div className="barra-filtros">
        <Botao disabled={!termoBusca} onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
          Limpar filtros
        </Botao>

        {selecionados.size > 0 ? (
          <div className="barra-filtros__selecao">
            <span aria-live="polite" className="barra-filtros__selecao-contador">
              {selecionados.size} professor{selecionados.size === 1 ? "" : "es"} selecionado{selecionados.size === 1 ? "" : "s"}
            </span>
            {abaStatus === "ativos" ? (
              <Botao onClick={() => setConfirmacaoLote("inativar")} tamanho="pequeno" variante="secundario">
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
        <table aria-label="Lista de professores" className="tabela-dados">
          <thead>
            <tr>
              <th scope="col">
                <input
                  aria-label="Selecionar todos os professores desta pagina"
                  checked={todosSelecionadosNaPagina}
                  disabled={itensPagina.length === 0}
                  onChange={alternarSelecaoPagina}
                  ref={refCheckboxCabecalho}
                  type="checkbox"
                />
              </th>
              <th scope="col">
                <button className="tabela-dados__th-btn" onClick={alternarOrdenacao} type="button">
                  Professor <IconeOrdenacao direcao={direcao} />
                </button>
              </th>
              <th scope="col">Especialidade</th>
              <th scope="col">Cursos em andamento</th>
              <th scope="col">Status</th>
              <th className="tabela-dados__col-acoes" scope="col" />
            </tr>
          </thead>
          <tbody>
            {itensPagina.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={6}>
                  {abaStatus === "ativos" ? "Nenhum professor ativo encontrado." : "Nenhum professor inativo encontrado."}
                </td>
              </tr>
            ) : (
              itensPagina.map((professor) => {
                const cursosDoProfessor = obterCursosDoProfessor(professor);

                return (
                  <tr className="tabela-linha-clicavel" key={professor.id} onClick={() => setProfessorDetalhe(professor)}>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <input
                        aria-label={`Selecionar ${professor.nome}`}
                        checked={selecionados.has(professor.id)}
                        onChange={() => alternarSelecao(professor.id)}
                        type="checkbox"
                      />
                    </td>
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
                      <Insignia texto={professor.ativo ? "Ativo" : "Inativo"} variante={professor.ativo ? "sucesso" : "neutro"} />
                    </td>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <MenuKebabTabela
                        itens={[
                          { chave: "ver-detalhes", rotulo: "Ver detalhes", onSelecionar: () => setProfessorDetalhe(professor) },
                          { chave: "editar", rotulo: "Editar", onSelecionar: () => abrirEdicaoProfessor(professor) },
                          {
                            chave: "alternar-status",
                            rotulo: professor.ativo ? "Inativar" : "Reativar",
                            onSelecionar: () => alternarStatusProfessor(professor)
                          }
                        ]}
                        rotulo={`Acoes para ${professor.nome}`}
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


      {professorDetalhe ? (
        <Modal
          onFechar={() => setProfessorDetalhe(null)}
          titulo="Detalhes do professor"
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setProfessorDetalhe(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Fechar
              </Botao>
            </footer>
          }
        >
          <div className="detalhe-usuario__perfil">
            <div aria-hidden="true" className="topbar__avatar detalhe-usuario__avatar">
              {iniciaisNome(professorDetalhe.nome)}
            </div>
            <div className="detalhe-usuario__identidade">
              <h3 className="detalhe-usuario__nome">{professorDetalhe.nome}</h3>
              <span className="detalhe-usuario__email">{professorDetalhe.email}</span>
            </div>
            <Insignia texto={professorDetalhe.ativo ? "Ativo" : "Inativo"} variante={professorDetalhe.ativo ? "sucesso" : "neutro"} />
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

          <section aria-label="Resumo de atividade" style={{ marginBottom: "var(--espaco-xl)" }}>
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
        </Modal>
      ) : null}

      {confirmacaoLote ? (
        <Modal
          onFechar={() => !executandoLote && setConfirmacaoLote(null)}
          titulo={confirmacaoLote === "reativar" ? "Reativar professores selecionados" : "Inativar professores selecionados"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={executandoLote} onClick={() => setConfirmacaoLote(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={executandoLote} onClick={executarAcaoLote} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} />{" "}
                {executandoLote
                  ? "Processando..."
                  : confirmacaoLote === "reativar"
                  ? "Confirmar reativacao"
                  : "Confirmar inativacao"}
              </Botao>
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            {confirmacaoLote === "reativar"
              ? `Deseja reativar ${selecionados.size} professor${selecionados.size === 1 ? "" : "es"} selecionado${selecionados.size === 1 ? "" : "s"}?`
              : `Deseja inativar ${selecionados.size} professor${selecionados.size === 1 ? "" : "es"} selecionado${selecionados.size === 1 ? "" : "s"}? Os dados e o historico continuam preservados.`}
          </p>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={fecharFormulario}
          titulo={professorEmEdicaoId ? "Editar professor" : "Cadastrar professor"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} form="form-professor" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : professorEmEdicaoId ? "Salvar alteracoes" : "Cadastrar professor"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-professor" onSubmit={salvarProfessor}>
            <div>
              <h3 className="detalhe-usuario__secao-titulo">Dados pessoais</h3>
              <div className="formulario-perfil__grade">
                <div className="campo formulario-perfil__campo--largo">
                  <label className="campo__rotulo" htmlFor="professor-nome">Nome completo *</label>
                  <input autoComplete="name" className="campo__entrada" disabled={salvando} id="professor-nome" maxLength={150} name="nome" onChange={atualizarCampo} value={dadosFormulario.nome} />
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
                  <label className="campo__rotulo" htmlFor="professor-email">E-mail *</label>
                  <input autoComplete="email" className="campo__entrada" disabled={salvando} id="professor-email" name="email" onChange={atualizarCampo} type="email" value={dadosFormulario.email} />
                </div>
                <div className="campo formulario-perfil__campo--largo">
                  <label className="campo__rotulo" htmlFor="professor-especialidade">Especialidade *</label>
                  <input autoComplete="off" className="campo__entrada" disabled={salvando} id="professor-especialidade" maxLength={120} name="especialidade" onChange={atualizarCampo} placeholder="Ex.: Engenharia de Software" value={dadosFormulario.especialidade} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="detalhe-usuario__secao-titulo">Endereco</h3>
              <div className="formulario-perfil__grade">
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="professor-cep">CEP *</label>
                  <input
                    autoComplete="postal-code"
                    className="campo__entrada"
                    disabled={salvando}
                    id="professor-cep"
                    inputMode="numeric"
                    maxLength={9}
                    name="cep"
                    onChange={(event) => {
                      atualizarCampo(event);
                      consultarCep(event.target.value);
                    }}
                    placeholder="00000-000"
                    value={dadosFormulario.cep}
                  />
                  {statusCep === "buscando" || mensagemCep ? (
                    <span className="campo__dica" role="status">
                      {mensagemCep || "Buscando endereco..."}
                    </span>
                  ) : null}
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
              </div>
            </div>

            <div>
              <h3 className="detalhe-usuario__secao-titulo">Acesso</h3>
              <div className="formulario-perfil__grade">
                {professorEmEdicaoId ? (
                  <div className="campo campo--linha formulario-perfil__campo--largo">
                    <input checked={dadosFormulario.ativo} disabled={salvando} id="professor-ativo" name="ativo" onChange={atualizarCampo} type="checkbox" />
                    <label className="campo__rotulo" htmlFor="professor-ativo">Conta ativa</label>
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
            </div>

            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
