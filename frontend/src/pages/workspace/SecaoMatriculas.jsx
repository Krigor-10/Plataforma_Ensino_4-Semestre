import { useEffect, useMemo, useState } from "react";
import { TbClock } from "react-icons/tb";
import { InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatDate, formatGrade } from "../../lib/format.js";

export function SecaoMatriculas({ ehAluno, linhasMatriculas, onRefresh, onSessionExpired }) {
  if (ehAluno) {
    return <VistaAlunoMatriculas linhasMatriculas={linhasMatriculas} />;
  }

  return <VistaGestorMatriculas linhasMatriculas={linhasMatriculas} onRefresh={onRefresh} onSessionExpired={onSessionExpired} />;
}

function VistaAlunoMatriculas({ linhasMatriculas }) {
  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Minhas matriculas</h1>
          <p className="cabecalho-pagina__subtitulo">
            {linhasMatriculas.length} matricula{linhasMatriculas.length === 1 ? "" : "s"} registrada{linhasMatriculas.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {linhasMatriculas.length === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">Nenhuma matricula encontrada.</p>
      ) : (
        <ul aria-label="Minhas matriculas" className="catalogo-grade" role="list">
          {linhasMatriculas.map((matricula) => (
            <li className="catalogo-card" key={matricula.id}>
              <div className="catalogo-card__corpo">
                <div className="meus-cursos__titulo-linha">
                  <h3 className="catalogo-card__titulo">{matricula.curso}</h3>
                  <Insignia texto={matricula.status} />
                </div>
                <p className="catalogo-card__turma">{matricula.turma}</p>
                <p className="catalogo-card__data">
                  <TbClock aria-hidden="true" size={13} />
                  Solicitada em {formatDate(matricula.dataSolicitacao)}
                </p>

                <footer className="catalogo-card__rodape-aluno">
                  <span className="catalogo-card__codigo">{matricula.codigoRegistro || "Sem protocolo"}</span>
                  {matricula.status === "Aprovada" ? <span className="catalogo-card__codigo">Nota {formatGrade(matricula.notaFinal)}</span> : null}
                </footer>
              </div>
            </li>
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
