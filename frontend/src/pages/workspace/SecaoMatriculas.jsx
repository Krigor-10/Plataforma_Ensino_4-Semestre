import { useEffect, useMemo, useState } from "react";
import { TbClock, TbSearch, TbSend } from "react-icons/tb";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatDate, formatGrade } from "../../lib/format.js";
import { isCursoVisivelNoCatalogoPublico } from "../../data/appConfig.js";

export function SecaoMatriculas({ cursos, ehAluno, linhasMatriculas, onRefresh, onSessionExpired, turmas, usuario }) {
  if (ehAluno) {
    return (
      <VistaAlunoMatriculas
        cursos={cursos}
        linhasMatriculas={linhasMatriculas}
        onRefresh={onRefresh}
        onSessionExpired={onSessionExpired}
        turmas={turmas}
        usuario={usuario}
      />
    );
  }

  return <VistaGestorMatriculas linhasMatriculas={linhasMatriculas} onRefresh={onRefresh} onSessionExpired={onSessionExpired} />;
}

/* Mapa cursoId -> matricula mais relevante do aluno (prioriza Aprovada > Pendente > Rejeitada/Cancelada) */
function criarMatriculaPorCursoId(linhasMatriculas) {
  const prioridade = { Aprovada: 3, Pendente: 2, Rejeitada: 1, Cancelada: 1 };
  const mapa = new Map();
  linhasMatriculas.forEach((matricula) => {
    const atual = mapa.get(matricula.cursoId);
    if (!atual || (prioridade[matricula.status] || 0) > (prioridade[atual.status] || 0)) {
      mapa.set(matricula.cursoId, matricula);
    }
  });
  return mapa;
}

/* Card de curso reaproveitado pelo catalogo (Matriculas) e por Meus Cursos.
   O bloco de imagem so aparece quando curso.imagemUrl existir - hoje o backend
   nao expoe esse campo, entao fica inerte ate essa fonte de dados ser criada. */
function CartaoCursoMatricula({ curso, matricula, onSolicitar, solicitando, temTurmaDisponivel = false }) {
  return (
    <li className="catalogo-card">
      {curso.imagemUrl ? (
        <img alt="" className="catalogo-card__imagem" src={curso.imagemUrl} />
      ) : null}
      <div className="catalogo-card__corpo">
        <div className="meus-cursos__titulo-linha">
          <h3 className="catalogo-card__titulo">{curso.titulo}</h3>
          {matricula ? <Insignia texto={matricula.status} /> : null}
        </div>
        <p className="catalogo-card__turma">{curso.descricao}</p>

        {matricula ? (
          <>
            <p className="catalogo-card__data">
              <TbClock aria-hidden="true" size={13} />
              Solicitada em {formatDate(matricula.dataSolicitacao)}
            </p>
            <footer className="catalogo-card__rodape-aluno">
              <span className="catalogo-card__codigo">{matricula.codigoRegistro || "Sem protocolo"}</span>
              {matricula.status === "Aprovada" ? <span className="catalogo-card__codigo">Nota {formatGrade(matricula.notaFinal)}</span> : null}
            </footer>
          </>
        ) : (
          <footer className="catalogo-card__rodape-aluno">
            {temTurmaDisponivel ? (
              <Botao disabled={solicitando} onClick={onSolicitar} tamanho="pequeno" variante="primario">
                <TbSend aria-hidden="true" size={14} /> {solicitando ? "Enviando..." : "Solicitar matricula"}
              </Botao>
            ) : (
              <span className="catalogo-card__codigo">Sem turma disponivel</span>
            )}
          </footer>
        )}
      </div>
    </li>
  );
}

/* Tela "Meus Cursos": so os cursos em que o aluno tem matricula (qualquer status) - sem catalogo, sem opcao de solicitar */
export function SecaoMeusCursosMatriculados({ cursos = [], linhasMatriculas = [] }) {
  const matriculaPorCursoId = useMemo(() => criarMatriculaPorCursoId(linhasMatriculas), [linhasMatriculas]);
  const cursosMatriculados = useMemo(
    () => cursos.filter((curso) => matriculaPorCursoId.has(curso.id)),
    [cursos, matriculaPorCursoId]
  );

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Meus Cursos</h1>
          <p className="cabecalho-pagina__subtitulo">{cursosMatriculados.length} matricula(s) registrada(s).</p>
        </div>
      </header>

      {cursosMatriculados.length === 0 ? (
        <EmptyState message="Voce ainda nao esta matriculado em nenhum curso. Explore o catalogo em Matriculas." />
      ) : (
        <ul aria-label="Meus cursos matriculados" className="catalogo-grade" role="list">
          {cursosMatriculados.map((curso) => (
            <CartaoCursoMatricula curso={curso} key={curso.id} matricula={matriculaPorCursoId.get(curso.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VistaAlunoMatriculas({ cursos = [], linhasMatriculas, onRefresh, onSessionExpired, turmas = [], usuario }) {
  const [busca, setBusca] = useState("");
  const [cursoSolicitando, setCursoSolicitando] = useState(null);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });

  const turmasPorCursoId = useMemo(() => {
    const grupos = new Map();
    turmas.forEach((turma) => {
      const lista = grupos.get(turma.cursoId) || [];
      lista.push(turma);
      grupos.set(turma.cursoId, lista);
    });
    return grupos;
  }, [turmas]);

  const matriculaPorCursoId = useMemo(() => criarMatriculaPorCursoId(linhasMatriculas), [linhasMatriculas]);

  const cursosFiltrados = useMemo(
    () =>
      cursos
        .filter(isCursoVisivelNoCatalogoPublico)
        .filter((curso) => !matriculaPorCursoId.has(curso.id))
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [busca, cursos, matriculaPorCursoId]
  );

  async function solicitarMatricula(curso) {
    const turmaAlvo = (turmasPorCursoId.get(curso.id) || [])[0];
    if (!turmaAlvo) {
      return;
    }

    setCursoSolicitando(curso.id);
    setMensagem({ tone: "", message: "" });

    try {
      await apiRequest("/Matriculas", {
        method: "POST",
        body: JSON.stringify({ alunoId: usuario.id, turmaId: turmaAlvo.id })
      });
      setMensagem({ tone: "success", message: `Matricula solicitada em ${curso.titulo}. Aguarde a aprovacao da coordenacao.` });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel solicitar a matricula agora." });
    } finally {
      setCursoSolicitando(null);
    }
  }

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Catalogo de Cursos</h1>
          <p className="cabecalho-pagina__subtitulo">Explore o catalogo e acompanhe suas solicitacoes de matricula.</p>
        </div>
        <label className="visualmente-oculto" htmlFor="busca-catalogo-aluno">Buscar curso</label>
        <div style={{ flexShrink: 0, marginLeft: "auto", position: "relative", width: "260px" }}>
          <TbSearch
            aria-hidden="true"
            size={15}
            style={{ color: "var(--cor-texto-mudo)", left: "10px", pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="campo__entrada"
            id="busca-catalogo-aluno"
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar cursos"
            style={{ paddingLeft: "32px", width: "100%" }}
            type="search"
            value={busca}
          />
        </div>
      </header>

      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

      {cursosFiltrados.length === 0 ? (
        <EmptyState message="Nenhum curso encontrado." />
      ) : (
        <ul aria-label="Catalogo de cursos" className="catalogo-grade" role="list">
          {cursosFiltrados.map((curso) => (
            <CartaoCursoMatricula
              curso={curso}
              key={curso.id}
              matricula={matriculaPorCursoId.get(curso.id)}
              onSolicitar={() => solicitarMatricula(curso)}
              solicitando={cursoSolicitando === curso.id}
              temTurmaDisponivel={(turmasPorCursoId.get(curso.id) || []).length > 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VistaGestorMatriculas({ linhasMatriculas, onRefresh, onSessionExpired }) {
  const [mensagem, setMensagem] = useState({ tone: "info", message: "" });
  const [processandoLote, setProcessandoLote] = useState(false);
  const [matriculasSelecionadas, setMatriculasSelecionadas] = useState(() => new Set());
  const [abaAtiva, setAbaAtiva] = useState("pendentes");

  const matriculasPendentes = useMemo(
    () => linhasMatriculas.filter((matricula) => matricula.status === "Pendente"),
    [linhasMatriculas]
  );
  const matriculasAprovadas = useMemo(
    () => linhasMatriculas.filter((matricula) => matricula.status === "Aprovada"),
    [linhasMatriculas]
  );
  const matriculasRejeitadas = useMemo(
    () => linhasMatriculas.filter((matricula) => matricula.status === "Rejeitada"),
    [linhasMatriculas]
  );

  const idsPendentes = useMemo(() => new Set(matriculasPendentes.map((matricula) => matricula.id)), [matriculasPendentes]);

  const matriculasPendentesSelecionadas = useMemo(
    () => linhasMatriculas.filter((matricula) => matriculasSelecionadas.has(matricula.id) && matricula.status === "Pendente"),
    [linhasMatriculas, matriculasSelecionadas]
  );

  const todasPendentesSelecionadas =
    matriculasPendentes.length > 0 && matriculasPendentes.every((matricula) => matriculasSelecionadas.has(matricula.id));
  const quantidadeSelecionada = matriculasPendentesSelecionadas.length;

  useEffect(() => {
    setMatriculasSelecionadas((atuais) => {
      const proximas = new Set([...atuais].filter((id) => idsPendentes.has(id)));
      return proximas.size === atuais.size ? atuais : proximas;
    });
  }, [idsPendentes]);

  useEffect(() => {
    if (abaAtiva !== "pendentes") {
      setMatriculasSelecionadas(new Set());
      setMensagem({ tone: "info", message: "" });
    }
  }, [abaAtiva]);

  async function executarLote(acao, resolverFeedback) {
    try {
      setMensagem({ tone: "info", message: "" });
      setProcessandoLote(true);

      const resultado = await acao();
      const feedback =
        typeof resolverFeedback === "function"
          ? resolverFeedback(resultado)
          : { tone: "success", message: resolverFeedback };

      setMensagem(feedback);
      if (feedback.tone !== "error") {
        setMatriculasSelecionadas(new Set());
      }
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel atualizar a matricula." });
    } finally {
      setProcessandoLote(false);
    }
  }

  function montarFeedbackAprovacao(resultado) {
    const aprovadas = Number(resultado?.totalAprovado ?? resultado?.aprovadas?.length ?? 0);
    const erros = Array.isArray(resultado?.erros) ? resultado.erros : [];
    const resumoErros = erros
      .slice(0, 3)
      .map((erro) => {
        const rotulo = erro.nomeAluno || erro.codigoRegistro || `Matricula #${erro.matriculaId}`;
        return erro.motivo ? `${rotulo} (${erro.motivo})` : rotulo;
      })
      .join(", ");
    const complementoErros =
      erros.length > 3 ? ` e mais ${erros.length - 3}` : "";

    if (aprovadas > 0 && erros.length > 0) {
      return {
        tone: "warning",
        message: `${aprovadas} matricula${aprovadas > 1 ? "s aprovadas" : " aprovada"}. ${erros.length} nao ${erros.length > 1 ? "foram aprovadas" : "foi aprovada"}: ${resumoErros}${complementoErros}.`
      };
    }

    if (aprovadas > 0) {
      return {
        tone: "success",
        message: `${aprovadas} matricula${aprovadas > 1 ? "s aprovadas" : " aprovada"} automaticamente com sucesso.`
      };
    }

    if (erros.length > 0) {
      return {
        tone: "error",
        message: `Nenhuma matricula foi aprovada. Verifique turma padrao cadastrada para: ${resumoErros}${complementoErros}.`
      };
    }

    return { tone: "info", message: "Nenhuma matricula pendente foi alterada." };
  }

  async function aprovarSelecionadas() {
    if (!quantidadeSelecionada) {
      setMensagem({ tone: "error", message: "Selecione ao menos uma matricula pendente." });
      return;
    }

    await executarLote(async () => {
      return apiRequest("/Matriculas/aprovar-lote", {
        method: "PUT",
        body: JSON.stringify({
          matriculaIds: matriculasPendentesSelecionadas.map((matricula) => matricula.id)
        })
      });
    }, montarFeedbackAprovacao);
  }

  async function rejeitarSelecionadas() {
    if (!quantidadeSelecionada) {
      setMensagem({ tone: "error", message: "Selecione ao menos uma matricula pendente." });
      return;
    }

    await executarLote(async () => {
      for (const matricula of matriculasPendentesSelecionadas) {
        await apiRequest(`/Matriculas/${matricula.id}/rejeitar`, { method: "PUT" });
      }
    }, `${quantidadeSelecionada} matricula${quantidadeSelecionada > 1 ? "s rejeitadas" : " rejeitada"} com sucesso.`);
  }

  function alternarMatricula(matricula) {
    if (matricula.status !== "Pendente" || processandoLote) {
      return;
    }

    setMatriculasSelecionadas((atuais) => {
      const proximas = new Set(atuais);

      if (proximas.has(matricula.id)) {
        proximas.delete(matricula.id);
      } else {
        proximas.add(matricula.id);
      }

      return proximas;
    });
  }

  function alternarTodasPendentes() {
    if (processandoLote || !matriculasPendentes.length) {
      return;
    }

    setMatriculasSelecionadas((atuais) => {
      if (todasPendentesSelecionadas) {
        return new Set();
      }

      const proximas = new Set(atuais);
      matriculasPendentes.forEach((matricula) => proximas.add(matricula.id));
      return proximas;
    });
  }

  const abas = [
    { chave: "pendentes", rotulo: "Pendentes", contagem: matriculasPendentes.length },
    { chave: "rejeitadas", rotulo: "Rejeitadas", contagem: matriculasRejeitadas.length },
    { chave: "aprovadas", rotulo: "Aprovadas", contagem: matriculasAprovadas.length }
  ];

  const linhasDaAba =
    abaAtiva === "pendentes" ? matriculasPendentes : abaAtiva === "aprovadas" ? matriculasAprovadas : matriculasRejeitadas;

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Matriculas</h1>
          <p className="cabecalho-pagina__subtitulo">
            {linhasMatriculas.length} no total - {matriculasPendentes.length} pendente{matriculasPendentes.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <nav aria-label="Filtrar matriculas por status" className="abas-matriculas" role="tablist">
        {abas.map((aba) => (
          <button
            aria-selected={abaAtiva === aba.chave}
            className={`abas-matriculas__aba${abaAtiva === aba.chave ? " abas-matriculas__aba--ativa" : ""}`}
            key={aba.chave}
            onClick={() => setAbaAtiva(aba.chave)}
            role="tab"
            type="button"
          >
            {aba.rotulo}
            {aba.contagem > 0 ? <span className="abas-matriculas__contagem">{aba.contagem}</span> : null}
          </button>
        ))}
      </nav>

      {abaAtiva === "pendentes" ? (
        <div className="toolbar-massa-matriculas">
          <label className="table-bulk-toggle">
            <input
              checked={todasPendentesSelecionadas}
              className="tabela-checkbox"
              disabled={processandoLote || !matriculasPendentes.length}
              onChange={alternarTodasPendentes}
              type="checkbox"
            />
            <span>Selecionar todas as pendentes</span>
          </label>
          <div className="toolbar-massa-matriculas__acoes">
            <Botao disabled={processandoLote} onClick={aprovarSelecionadas} tamanho="pequeno" variante="sucesso">
              {processandoLote ? "Processando..." : "Aprovar selecionadas"}
            </Botao>
            <Botao disabled={processandoLote} onClick={rejeitarSelecionadas} tamanho="pequeno" variante="perigo">
              Rejeitar selecionadas
            </Botao>
          </div>
          <span className="toolbar-massa-matriculas__contador">
            {quantidadeSelecionada
              ? `${quantidadeSelecionada} selecionada${quantidadeSelecionada > 1 ? "s" : ""}`
              : `${matriculasPendentes.length} pendente${matriculasPendentes.length === 1 ? "" : "s"}`}
          </span>
        </div>
      ) : null}

      {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Matriculas" className="tabela-dados">
          <thead>
            <tr>
              {abaAtiva === "pendentes" ? <th scope="col" style={{ width: 40 }} /> : null}
              <th scope="col">Protocolo</th>
              <th scope="col">Aluno</th>
              <th scope="col">Curso</th>
              <th scope="col">Turma</th>
              <th scope="col">Solicitada em</th>
            </tr>
          </thead>
          <tbody>
            {linhasDaAba.length === 0 ? (
              <tr className="tabela-dados--sem-dados">
                <td colSpan={abaAtiva === "pendentes" ? 6 : 5}>
                  {abaAtiva === "pendentes"
                    ? "Nenhum aluno pendente de aprovacao."
                    : abaAtiva === "aprovadas"
                      ? "Nenhuma matricula aprovada encontrada."
                      : "Nenhuma matricula rejeitada encontrada."}
                </td>
              </tr>
            ) : (
              linhasDaAba.map((matricula) => (
                <tr
                  className={matriculasSelecionadas.has(matricula.id) ? "tabela-linha-clicavel--selecionada" : undefined}
                  key={matricula.id}
                >
                  {abaAtiva === "pendentes" ? (
                    <td>
                      <input
                        aria-label={`Selecionar matricula de ${matricula.aluno}`}
                        checked={matriculasSelecionadas.has(matricula.id)}
                        className="tabela-checkbox"
                        disabled={processandoLote}
                        onChange={() => alternarMatricula(matricula)}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  <td>{matricula.codigoRegistro || "Sem protocolo"}</td>
                  <td>{matricula.aluno}</td>
                  <td>{matricula.curso}</td>
                  <td>{matricula.turma}</td>
                  <td>{formatDate(matricula.dataSolicitacao)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
