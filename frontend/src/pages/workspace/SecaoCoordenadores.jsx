import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TbCheck, TbChevronDown, TbChevronUp, TbChevronLeft, TbChevronRight, TbPlus, TbSearch, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import MenuKebabTabela from "../../components/MenuKebabTabela.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useSelecaoEmLote } from "../../hooks/useSelecaoEmLote.js";
import { useToast } from "../../hooks/useToast.jsx";
import { useConsultaCep } from "../../hooks/useConsultaCep.js";
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

export function SecaoCoordenadores({ coordenadores = [], cursos = [], onRefresh, onSessionExpired }) {
  const { mostrarToast } = useToast();
  const [busca, setBusca] = useState("");
  const [abaStatus, setAbaStatus] = useState("ativos");
  const [direcao, setDirecao] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [coordenadorDetalhe, setCoordenadorDetalhe] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [coordenadorEmEdicaoId, setCoordenadorEmEdicaoId] = useState(null);
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [filtroSemCurso, setFiltroSemCurso] = useState(false);
  const refAbas = useRef(null);
  const refBuscaCoordenadores = useRef(null);
  const abasTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbas);
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
    let proximos = coordenadores.filter((coordenador) => Boolean(coordenador.ativo) === (abaStatus === "ativos"));

    if (filtroSemCurso) {
      proximos = proximos.filter((coordenador) => obterCursosDoCoordenador(coordenador).length === 0);
    }

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
  }, [coordenadores, cursosPorCoordenador, direcao, termoBusca, abaStatus, filtroSemCurso]);

  const totalPaginas = Math.max(1, Math.ceil(coordenadoresFiltrados.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const itensPagina = coordenadoresFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  const totalAtivos = coordenadores.filter((coordenador) => coordenador.ativo).length;
  const totalInativos = coordenadores.length - totalAtivos;
  const coordenadoresDaAba = coordenadores.filter((coordenador) => Boolean(coordenador.ativo) === (abaStatus === "ativos"));
  const totalSemCursoNaAba = coordenadoresDaAba.filter((coordenador) => obterCursosDoCoordenador(coordenador).length === 0).length;

  // Se o lote sem curso esvaziar (ex.: um coordenador filtrado ganhou curso
  // em outra aba), desliga o filtro sozinho em vez de deixar a tabela vazia
  // com o atalho escondido (o botao some quando o total chega a 0).
  useEffect(() => {
    if (filtroSemCurso && totalSemCursoNaAba === 0) {
      setFiltroSemCurso(false);
    }
  }, [filtroSemCurso, totalSemCursoNaAba]);

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
    const alvos = itensPagina.filter((coordenador) => selecionados.has(coordenador.id));

    setExecutandoLote(true);

    let sucesso = 0;
    let falha = 0;

    for (const coordenador of alvos) {
      try {
        await apiRequest(`/Coordenadores/${coordenador.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: coordenador.nome,
            email: coordenador.email,
            cpf: coordenador.cpf,
            telefone: coordenador.telefone,
            cep: coordenador.cep,
            rua: coordenador.rua,
            numero: coordenador.numero,
            bairro: coordenador.bairro,
            cidade: coordenador.cidade,
            estado: coordenador.estado,
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
          ? `${sucesso} coordenador${sucesso === 1 ? "" : "es"} reativado${sucesso === 1 ? "" : "s"} com sucesso.`
          : `${sucesso} coordenador${sucesso === 1 ? "" : "es"} inativado${sucesso === 1 ? "" : "s"} com sucesso.`,
        "sucesso"
      );
    } else {
      mostrarToast(
        `${sucesso} de ${alvos.length} coordenadores atualizados; ${falha} falharam e continuam com o status anterior.`,
        "erro"
      );
    }
  }

  function selecionarAbaStatus(aba) {
    setAbaStatus(aba);
    setPagina(1);
  }

  function alternarFiltroSemCurso() {
    setFiltroSemCurso((atual) => !atual);
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

  function abrirFormulario() {
    setCoordenadorEmEdicaoId(null);
    setDadosFormulario(ESTADO_INICIAL_FORMULARIO);
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function abrirEdicaoCoordenador(coordenador) {
    setCoordenadorEmEdicaoId(coordenador.id);
    setDadosFormulario({
      nome: coordenador.nome || "",
      email: coordenador.email || "",
      cpf: coordenador.cpf || "",
      telefone: coordenador.telefone || "",
      cep: coordenador.cep || "",
      rua: coordenador.rua || "",
      numero: coordenador.numero || "",
      bairro: coordenador.bairro || "",
      cidade: coordenador.cidade || "",
      estado: coordenador.estado || "",
      senha: "",
      confirmarSenha: "",
      ativo: coordenador.ativo !== false
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
    const obrigatorios = ["nome", "email", "cpf", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado"];
    const campoVazio = obrigatorios.find((campo) => !String(dadosFormulario[campo] || "").trim());

    if (campoVazio) {
      return `Preencha todos os campos obrigatorios para ${coordenadorEmEdicaoId ? "salvar" : "cadastrar"} o coordenador.`;
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

    if (!coordenadorEmEdicaoId) {
      if (dadosFormulario.senha.length < 6) {
        return "A senha precisa ter pelo menos 6 caracteres.";
      }

      if (dadosFormulario.senha !== dadosFormulario.confirmarSenha) {
        return "As senhas nao coincidem.";
      }
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
      estado: dadosFormulario.estado.trim().toUpperCase()
    };

    try {
      if (coordenadorEmEdicaoId) {
        await apiRequest(`/Coordenadores/${coordenadorEmEdicaoId}`, {
          method: "PUT",
          body: JSON.stringify({ ...dadosBase, ativo: dadosFormulario.ativo })
        });
      } else {
        await apiRequest("/Coordenadores", {
          method: "POST",
          body: JSON.stringify({ ...dadosBase, senha: dadosFormulario.senha, ativo: true })
        });
      }

      setFormularioAberto(false);
      mostrarToast(coordenadorEmEdicaoId ? "Coordenador atualizado com sucesso." : "Coordenador cadastrado com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormulario({
        tone: "error",
        message: err.message || `Nao foi possivel ${coordenadorEmEdicaoId ? "salvar" : "cadastrar"} o coordenador agora.`
      });
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusCoordenador(coordenador) {
    const novoStatusAtivo = !coordenador.ativo;

    try {
      await apiRequest(`/Coordenadores/${coordenador.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: coordenador.nome,
          email: coordenador.email,
          cpf: coordenador.cpf,
          telefone: coordenador.telefone,
          cep: coordenador.cep,
          rua: coordenador.rua,
          numero: coordenador.numero,
          bairro: coordenador.bairro,
          cidade: coordenador.cidade,
          estado: coordenador.estado,
          ativo: novoStatusAtivo
        })
      });

      mostrarToast(novoStatusAtivo ? "Coordenador reativado com sucesso." : "Coordenador inativado com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel atualizar o status do coordenador agora.", "erro");
    }
  }

  const cursosDetalhe = coordenadorDetalhe ? obterCursosDoCoordenador(coordenadorDetalhe) : [];

  return (
    <div className="tela-coordenadores">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Coordenadores</h2>
          <p className="cabecalho-pagina__subtitulo">Quem supervisiona cada curso</p>
        </div>
        <div className="barra-filtros">
          <div className="campo-busca">
            <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
            <label className="visualmente-oculto" htmlFor="busca-coordenadores">Buscar coordenador</label>
            <input
              className="campo__entrada"
              id="busca-coordenadores"
              onChange={(event) => {
                setBusca(event.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por nome ou e-mail..."
              ref={refBuscaCoordenadores}
              type="search"
              value={busca}
            />
            {busca ? (
              <button
                aria-label="Limpar busca"
                className="campo-busca__limpar"
                onClick={() => {
                  limparFiltros();
                  refBuscaCoordenadores.current?.focus();
                }}
                type="button"
              >
                <TbX aria-hidden="true" size={13} />
              </button>
            ) : null}
          </div>
          <Botao onClick={abrirFormulario} tamanho="pequeno" variante="primario">
            <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
              <TbPlus aria-hidden="true" size={18} />
            </motion.span>{" "}
            Cadastrar coordenador
          </Botao>
        </div>
      </header>

      <div className="linha-abas-status">
        <nav
          aria-label="Status dos coordenadores"
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

        {totalSemCursoNaAba > 0 ? (
          <button
            aria-pressed={filtroSemCurso}
            className="indicador-filtro"
            onClick={alternarFiltroSemCurso}
            type="button"
          >
            <Insignia
              style={filtroSemCurso ? { borderColor: "var(--cor-borda-forte)" } : undefined}
              texto={`${totalSemCursoNaAba} sem curso`}
              variante="neutro"
            />
          </button>
        ) : null}

        {selecionados.size > 0 ? (
          <div className="barra-filtros__selecao">
            <span aria-live="polite" className="barra-filtros__selecao-contador">
              {selecionados.size} coordenador{selecionados.size === 1 ? "" : "es"} selecionado{selecionados.size === 1 ? "" : "s"}
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
        <table aria-label="Lista de coordenadores" className="tabela-dados">
          <thead>
            <tr>
              <th scope="col">
                <input
                  aria-label="Selecionar todos os coordenadores desta pagina"
                  checked={todosSelecionadosNaPagina}
                  disabled={itensPagina.length === 0}
                  onChange={alternarSelecaoPagina}
                  ref={refCheckboxCabecalho}
                  type="checkbox"
                />
              </th>
              <th scope="col">
                <button className="tabela-dados__th-btn" onClick={alternarOrdenacao} type="button">
                  Coordenador <IconeOrdenacao direcao={direcao} />
                </button>
              </th>
              <th scope="col">Cursos supervisionados</th>
              <th className="tabela-dados__col-acoes" scope="col" />
            </tr>
          </thead>
          <tbody>
            {itensPagina.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={4}>
                  {abaStatus === "ativos" ? "Nenhum coordenador ativo encontrado." : "Nenhum coordenador inativo encontrado."}
                </td>
              </tr>
            ) : (
              itensPagina.map((coordenador) => {
                const cursosDoCoordenador = obterCursosDoCoordenador(coordenador);
                const totalCursosDoCoordenador = cursosDoCoordenador.length;

                return (
                  <tr className="tabela-linha-clicavel" key={coordenador.id} onClick={() => setCoordenadorDetalhe(coordenador)}>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <input
                        aria-label={`Selecionar ${coordenador.nome}`}
                        checked={selecionados.has(coordenador.id)}
                        onChange={() => alternarSelecao(coordenador.id)}
                        type="checkbox"
                      />
                    </td>
                    <td data-label="Coordenador">
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
                    <td data-label="Cursos supervisionados">
                      {totalCursosDoCoordenador === 0 ? (
                        <Insignia texto="Sem curso" variante="neutro" />
                      ) : (
                        <div className="celula-cursos">
                          <strong className="celula-cursos__contagem">
                            {totalCursosDoCoordenador} curso{totalCursosDoCoordenador === 1 ? "" : "s"}
                          </strong>
                          <span className="celula-cursos__detalhe">
                            {totalCursosDoCoordenador === 1
                              ? cursosDoCoordenador[0].titulo
                              : `${cursosDoCoordenador[0].titulo} e mais ${totalCursosDoCoordenador - 1}`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td data-label="" onClick={(event) => event.stopPropagation()}>
                      <MenuKebabTabela
                        itens={[
                          { chave: "ver-detalhes", rotulo: "Ver detalhes", onSelecionar: () => setCoordenadorDetalhe(coordenador) },
                          { chave: "editar", rotulo: "Editar", onSelecionar: () => abrirEdicaoCoordenador(coordenador) },
                          {
                            chave: "alternar-status",
                            rotulo: coordenador.ativo ? "Inativar" : "Reativar",
                            onSelecionar: () => alternarStatusCoordenador(coordenador)
                          }
                        ]}
                        rotulo={`Acoes para ${coordenador.nome}`}
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

      {coordenadorDetalhe ? (
        <Modal
          onFechar={() => setCoordenadorDetalhe(null)}
          titulo="Detalhes do coordenador"
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setCoordenadorDetalhe(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Fechar
              </Botao>
            </footer>
          }
        >
          <div className="detalhe-usuario__perfil">
            <div aria-hidden="true" className="topbar__avatar detalhe-usuario__avatar">
              {iniciaisNome(coordenadorDetalhe.nome)}
            </div>
            <div className="detalhe-usuario__identidade">
              <h3 className="detalhe-usuario__nome">{coordenadorDetalhe.nome}</h3>
              <span className="detalhe-usuario__email">{coordenadorDetalhe.email}</span>
            </div>
            <Insignia texto={coordenadorDetalhe.ativo ? "Ativo" : "Inativo"} variante={coordenadorDetalhe.ativo ? "sucesso" : "neutro"} />
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
        </Modal>
      ) : null}

      {confirmacaoLote ? (
        <Modal
          onFechar={() => !executandoLote && setConfirmacaoLote(null)}
          titulo={confirmacaoLote === "reativar" ? "Reativar coordenadores selecionados" : "Inativar coordenadores selecionados"}
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
              ? `Deseja reativar ${selecionados.size} coordenador${selecionados.size === 1 ? "" : "es"} selecionado${selecionados.size === 1 ? "" : "s"}?`
              : `Deseja inativar ${selecionados.size} coordenador${selecionados.size === 1 ? "" : "es"} selecionado${selecionados.size === 1 ? "" : "s"}? Os dados e o historico continuam preservados.`}
          </p>
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={fecharFormulario}
          titulo={coordenadorEmEdicaoId ? "Editar coordenador" : "Cadastrar coordenador"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={fecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} form="form-coordenador" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : coordenadorEmEdicaoId ? "Salvar alteracoes" : "Cadastrar coordenador"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-coordenador" onSubmit={salvarCoordenador}>
            <div>
              <h3 className="detalhe-usuario__secao-titulo">Dados pessoais</h3>
              <div className="formulario-perfil__grade">
                <div className="campo formulario-perfil__campo--largo">
                  <label className="campo__rotulo" htmlFor="coordenador-nome">Nome completo *</label>
                  <input autoComplete="name" className="campo__entrada" disabled={salvando} id="coordenador-nome" maxLength={150} name="nome" onChange={atualizarCampo} value={dadosFormulario.nome} />
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
                  <label className="campo__rotulo" htmlFor="coordenador-email">E-mail *</label>
                  <input autoComplete="email" className="campo__entrada" disabled={salvando} id="coordenador-email" name="email" onChange={atualizarCampo} type="email" value={dadosFormulario.email} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="detalhe-usuario__secao-titulo">Endereco</h3>
              <div className="formulario-perfil__grade">
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="coordenador-cep">CEP *</label>
                  <input
                    autoComplete="postal-code"
                    className="campo__entrada"
                    disabled={salvando}
                    id="coordenador-cep"
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
              </div>
            </div>

            <div>
              <h3 className="detalhe-usuario__secao-titulo">Acesso</h3>
              <div className="formulario-perfil__grade">
                {coordenadorEmEdicaoId ? (
                  <div className="campo campo--linha formulario-perfil__campo--largo">
                    <input checked={dadosFormulario.ativo} disabled={salvando} id="coordenador-ativo" name="ativo" onChange={atualizarCampo} type="checkbox" />
                    <label className="campo__rotulo" htmlFor="coordenador-ativo">Conta ativa</label>
                  </div>
                ) : (
                  <>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="coordenador-senha">Senha *</label>
                      <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="coordenador-senha" minLength={6} name="senha" onChange={atualizarCampo} type="password" value={dadosFormulario.senha} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="coordenador-confirmar-senha">Confirmar senha *</label>
                      <input autoComplete="new-password" className="campo__entrada" disabled={salvando} id="coordenador-confirmar-senha" minLength={6} name="confirmarSenha" onChange={atualizarCampo} type="password" value={dadosFormulario.confirmarSenha} />
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
