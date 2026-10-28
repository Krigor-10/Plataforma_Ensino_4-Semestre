import { useMemo, useState } from "react";
import { TbArrowRight, TbClock, TbCreditCard, TbSearch } from "react-icons/tb";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import ConfirmacaoCompraModal from "../../components/ConfirmacaoCompraModal.jsx";
import Insignia from "../../components/Insignia.jsx";
import PopupResultadoMatricula from "./PopupResultadoMatricula.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { clampPercent, formatDate, formatGrade, formatMoney } from "../../lib/format.js";
import { isCursoVisivelNoCatalogoPublico } from "../../data/appConfig.js";
import { getCourseCover } from "../../data/courseCovers.js";
import { resolverImagemCurso } from "../../lib/courseImage.js";

const PAGAMENTO_PENDENTE = 1;
const MODELO_ACOMPANHADO = 3;

export function SecaoMatriculas({ cursos, ehAluno, linhasMatriculas, onNavigate, onRefresh, onSessionExpired, usuario }) {
  if (ehAluno) {
    return (
      <VistaAlunoMatriculas
        cursos={cursos}
        linhasMatriculas={linhasMatriculas}
        onNavigate={onNavigate}
        onRefresh={onRefresh}
        onSessionExpired={onSessionExpired}
        usuario={usuario}
      />
    );
  }

  return <VistaGestorMatriculas linhasMatriculas={linhasMatriculas} />;
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
   Imagem resolvida com a mesma logica usada na Home Publica
   (resolverImagemCurso, em lib/courseImage.js): prioriza curso.imagemUrl
   (upload real do Admin), com fallback pro dicionario estatico por titulo
   (getCourseCover), garantindo que as tres telas mostrem sempre a mesma
   imagem por curso. */
export function CartaoCursoMatricula({ compacto = false, curso, matricula, onCancelar, onComecarGratis, onComprar, onConcluirCompra, onEntrarNoCurso, onReabrir, processando }) {
  const temPagamentoPendente = matricula?.status === "Aprovada" && matricula.pagamentoStatus === PAGAMENTO_PENDENTE;
  const progresso = clampPercent(matricula?.progresso);
  const rotuloEntrada = progresso >= 100 ? "Revisar curso" : progresso > 0 ? "Continuar curso" : "Iniciar curso";
  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  return (
    <li className="catalogo-card">
      <img
        alt=""
        className="catalogo-card__imagem"
        loading="lazy"
        src={resolverImagemCurso(curso)}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = getCourseCover(curso);
        }}
      />
      <div className="catalogo-card__corpo">
        <div className="meus-cursos__titulo-linha">
          <h3 className="catalogo-card__titulo">{curso.titulo}</h3>
          {matricula && !compacto ? <Insignia texto={matricula.status} /> : null}
        </div>
        {!compacto ? <p className="catalogo-card__turma">{curso.descricao}</p> : null}
        {!matricula && ehAcompanhado ? <Insignia texto="Com acompanhamento" /> : null}

        {matricula ? (
          <>
            {!compacto ? (
              <p className="catalogo-card__data">
                <TbClock aria-hidden="true" size={13} />
                {[
                  `Solicitada em ${formatDate(matricula.dataSolicitacao)}`,
                  matricula.turma,
                  matricula.professor ? `Professor ${matricula.professor}` : null
                ].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {temPagamentoPendente ? (
              <InlineMessage tone="warning">
                Compra pendente: {formatMoney(matricula.pagamentoValor)}.
              </InlineMessage>
            ) : null}
            {compacto && matricula.status === "Aprovada" ? <BarraProgresso percentual={progresso} /> : null}
            <footer className="catalogo-card__rodape-aluno">
              {!compacto ? <span className="catalogo-card__codigo">{matricula.codigoRegistro || "Sem protocolo"}</span> : null}
              {!compacto && matricula.status === "Aprovada" ? <span className="catalogo-card__codigo">Nota {formatGrade(matricula.notaFinal)}</span> : null}
              {matricula.status === "Pendente" && onCancelar ? (
                <Botao disabled={processando} onClick={onCancelar} tamanho="pequeno" variante="perigo">
                  {processando ? "Cancelando..." : "Cancelar solicitacao"}
                </Botao>
              ) : null}
              {matricula.status === "Rejeitada" && onReabrir ? (
                <Botao disabled={processando} onClick={onReabrir} tamanho="pequeno" variante="primario">
                  {processando ? "Reabrindo..." : "Reabrir solicitacao"}
                </Botao>
              ) : null}
              {temPagamentoPendente && onConcluirCompra ? (
                <Botao onClick={onConcluirCompra} tamanho="pequeno" variante="sucesso">
                  <TbCreditCard aria-hidden="true" size={14} /> Concluir compra
                </Botao>
              ) : null}
              {matricula.status === "Aprovada" && !temPagamentoPendente && onEntrarNoCurso ? (
                <Botao onClick={onEntrarNoCurso} tamanho="pequeno" variante={progresso >= 100 ? "fantasma" : "primario"}>
                  {rotuloEntrada} <TbArrowRight aria-hidden="true" size={14} />
                </Botao>
              ) : null}
            </footer>
          </>
        ) : (
          <footer className="catalogo-card__rodape-aluno">
            <span className="catalogo-card__codigo">
              {curso.ehGratuito ? <Insignia texto="Gratis" variante="sucesso" /> : formatMoney(curso.preco)}
            </span>
            {curso.ehGratuito ? (
              <Botao disabled={processando} onClick={onComecarGratis} tamanho="pequeno" variante="primario">
                {processando ? "Começando..." : "Começar grátis"} <TbArrowRight aria-hidden="true" size={14} />
              </Botao>
            ) : (
              <Botao onClick={onComprar} tamanho="pequeno" variante="primario">
                <TbCreditCard aria-hidden="true" size={14} /> Comprar · {formatMoney(curso.preco)}
              </Botao>
            )}
          </footer>
        )}
      </div>
    </li>
  );
}

/* Tela "Meus Cursos": so os cursos em que o aluno tem matricula (qualquer status) - sem catalogo, sem opcao de solicitar */
export function SecaoMeusCursosMatriculados({ cursos = [], linhasMatriculas = [], onNavigate, onRefresh, onSessionExpired }) {
  const { mostrarToast } = useToast();
  const [matriculaProcessando, setMatriculaProcessando] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);

  const matriculaPorCursoId = useMemo(() => criarMatriculaPorCursoId(linhasMatriculas), [linhasMatriculas]);
  const cursosMatriculados = useMemo(
    () => cursos.filter((curso) => matriculaPorCursoId.has(curso.id)),
    [cursos, matriculaPorCursoId]
  );

  async function cancelarMatricula(matricula) {
    setMatriculaProcessando(matricula.id);

    try {
      await apiRequest(`/Matriculas/${matricula.id}/cancelar`, { method: "PUT" });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel cancelar a solicitacao agora.", "erro");
    } finally {
      setMatriculaProcessando(null);
    }
  }

  async function reabrirMatricula(matricula) {
    setMatriculaProcessando(matricula.id);

    try {
      await apiRequest(`/Matriculas/${matricula.id}/reabrir`, { method: "PUT" });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel reabrir a solicitacao agora.", "erro");
    } finally {
      setMatriculaProcessando(null);
    }
  }

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Meus Cursos</h2>
          <p className="cabecalho-pagina__subtitulo">{cursosMatriculados.length} matricula(s) registrada(s).</p>
        </div>
      </header>

      {cursosMatriculados.length === 0 ? (
        <EmptyState message="Voce ainda nao esta matriculado em nenhum curso. Explore o catalogo em Matriculas." />
      ) : (
        <ul aria-label="Meus cursos matriculados" className="catalogo-grade" role="list">
          {cursosMatriculados.map((curso) => {
            const matricula = matriculaPorCursoId.get(curso.id);

            return (
              <CartaoCursoMatricula
                curso={curso}
                key={curso.id}
                matricula={matricula}
                onCancelar={() => cancelarMatricula(matricula)}
                onConcluirCompra={() => setCursoParaComprar(curso)}
                onReabrir={() => reabrirMatricula(matricula)}
                processando={matriculaProcessando === matricula.id}
              />
            );
          })}
        </ul>
      )}

      <ConfirmacaoCompraModal
        curso={cursoParaComprar}
        onCompraConfirmada={onRefresh}
        onFechar={() => setCursoParaComprar(null)}
        onIrParaCurso={(cursoId) => {
          setCursoParaComprar(null);
          onNavigate?.(`/app/conteudos/${cursoId}`);
        }}
        onSessionExpired={onSessionExpired}
      />
    </div>
  );
}

function VistaAlunoMatriculas({ cursos = [], linhasMatriculas, onNavigate, onRefresh, onSessionExpired, usuario }) {
  const { mostrarToast } = useToast();
  const [busca, setBusca] = useState("");
  const [cursoComecando, setCursoComecando] = useState(null);
  const [cursoParaComprar, setCursoParaComprar] = useState(null);
  const [popupMatricula, setPopupMatricula] = useState(null);

  const matriculaPorCursoId = useMemo(() => criarMatriculaPorCursoId(linhasMatriculas), [linhasMatriculas]);

  const cursosFiltrados = useMemo(
    () =>
      cursos
        .filter(isCursoVisivelNoCatalogoPublico)
        .filter((curso) => !matriculaPorCursoId.has(curso.id))
        .filter((curso) => curso.titulo.toLowerCase().includes(busca.toLowerCase())),
    [busca, cursos, matriculaPorCursoId]
  );

  async function comecarGratis(curso) {
    setCursoComecando(curso.id);

    try {
      await apiRequest("/Matriculas", {
        method: "POST",
        body: JSON.stringify({ alunoId: usuario.id, cursoId: curso.id })
      });

      setPopupMatricula({
        acessoLiberado: true,
        mensagem: `Você começou o curso ${curso.titulo}. Ele já está disponível em Meus Cursos.`
      });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel comecar o curso agora.", "erro");
    } finally {
      setCursoComecando(null);
    }
  }

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Catalogo de Cursos</h2>
          <p className="cabecalho-pagina__subtitulo">Explore o catalogo, comece os cursos gratuitos e compre os pagos.</p>
        </div>
        <label className="visualmente-oculto" htmlFor="busca-catalogo-aluno">Buscar curso</label>
        <div className="campo-busca campo-busca--cabecalho">
          <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
          <input
            className="campo__entrada"
            id="busca-catalogo-aluno"
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar cursos"
            type="search"
            value={busca}
          />
        </div>
      </header>

      {cursosFiltrados.length === 0 ? (
        <EmptyState message="Nenhum curso encontrado." />
      ) : (
        <ul aria-label="Catalogo de cursos" className="catalogo-grade" role="list">
          {cursosFiltrados.map((curso) => (
            <CartaoCursoMatricula
              curso={curso}
              key={curso.id}
              matricula={matriculaPorCursoId.get(curso.id)}
              onComecarGratis={() => comecarGratis(curso)}
              onComprar={() => setCursoParaComprar(curso)}
              processando={cursoComecando === curso.id}
            />
          ))}
        </ul>
      )}

      {popupMatricula ? (
        <PopupResultadoMatricula
          acessoLiberado={popupMatricula.acessoLiberado}
          mensagem={popupMatricula.mensagem}
          onAcaoPrimaria={() => {
            setPopupMatricula(null);
            onNavigate?.("/app/cursos-matriculados");
          }}
          onFechar={() => setPopupMatricula(null)}
          rotuloAcaoPrimaria={popupMatricula.acessoLiberado ? "Acessar Meus Cursos" : "Regularizar pagamento"}
        />
      ) : null}

      <ConfirmacaoCompraModal
        curso={cursoParaComprar}
        onCompraConfirmada={onRefresh}
        onFechar={() => setCursoParaComprar(null)}
        onIrParaCurso={(cursoId) => {
          setCursoParaComprar(null);
          onNavigate?.(`/app/conteudos/${cursoId}`);
        }}
        onSessionExpired={onSessionExpired}
      />
    </div>
  );
}

/* Lista de consulta do Admin: matricula e sempre automatica, entao nao ha
   mais acao manual de aprovar/rejeitar aqui - so visualizacao por status,
   util pra auditoria/suporte. */
function VistaGestorMatriculas({ linhasMatriculas }) {
  const [abaAtiva, setAbaAtiva] = useState("aprovadas");

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
  const matriculasCanceladas = useMemo(
    () => linhasMatriculas.filter((matricula) => matricula.status === "Cancelada"),
    [linhasMatriculas]
  );

  const abas = [
    { chave: "aprovadas", rotulo: "Aprovadas", contagem: matriculasAprovadas.length },
    { chave: "pendentes", rotulo: "Pendentes", contagem: matriculasPendentes.length },
    { chave: "rejeitadas", rotulo: "Rejeitadas", contagem: matriculasRejeitadas.length },
    { chave: "canceladas", rotulo: "Canceladas", contagem: matriculasCanceladas.length }
  ];

  const linhasDaAba =
    abaAtiva === "pendentes"
      ? matriculasPendentes
      : abaAtiva === "aprovadas"
        ? matriculasAprovadas
        : abaAtiva === "rejeitadas"
          ? matriculasRejeitadas
          : matriculasCanceladas;

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Matriculas</h2>
          <p className="cabecalho-pagina__subtitulo">
            {linhasMatriculas.length} no total - matricula e sempre automatica, esta tela e so consulta.
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

      <div className="tabela-dados-container painel-secao">
        <table aria-label="Matriculas" className="tabela-dados">
          <thead>
            <tr>
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
                <td colSpan={5}>
                  {abaAtiva === "pendentes"
                    ? "Nenhuma matricula pendente encontrada."
                    : abaAtiva === "aprovadas"
                      ? "Nenhuma matricula aprovada encontrada."
                      : abaAtiva === "rejeitadas"
                        ? "Nenhuma matricula rejeitada encontrada."
                        : "Nenhuma matricula cancelada encontrada."}
                </td>
              </tr>
            ) : (
              linhasDaAba.map((matricula) => (
                <tr key={matricula.id}>
                  <td data-label="Protocolo">{matricula.codigoRegistro || "Sem protocolo"}</td>
                  <td data-label="Aluno">{matricula.aluno}</td>
                  <td data-label="Curso">{matricula.curso}</td>
                  <td data-label="Turma">{matricula.turma}</td>
                  <td data-label="Solicitada em">{formatDate(matricula.dataSolicitacao)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
