import { useEffect, useMemo, useState } from "react";
import { TbArrowRight, TbClock, TbCreditCard, TbSearch } from "react-icons/tb";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import ConfirmacaoCompraModal from "../../components/ConfirmacaoCompraModal.jsx";
import Insignia from "../../components/Insignia.jsx";
import PopupResultadoMatricula from "./PopupResultadoMatricula.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { clampPercent, formatDate, formatGrade, formatMoney, formatPercent } from "../../lib/format.js";
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

  return <VistaGestorMatriculas onSessionExpired={onSessionExpired} />;
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
  const rotuloEntrada = progresso > 0 ? "Continuar curso" : "Iniciar curso";
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
                <Botao onClick={onEntrarNoCurso} tamanho="pequeno" variante="primario">
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
/* Era uma lista de matriculas individuais por status (Pendente/Aprovada/
   Rejeitada/Cancelada), sem nenhuma acao desde que a matricula virou sempre
   automatica (ver pendencia_matriculas_sempre_automatica_2026_10_27 na
   memoria do projeto) - so consulta, sem lookup por aluno/protocolo que
   justificasse manter a listagem crua. Virou uma tabela de metricas por
   curso (prompt "sidebar do admin", 09/11): matriculas aprovadas, %
   conclusao e certificados emitidos, via GET /Cursos/desempenho (mesma
   agregacao ja usada por Coordenador/Professor, so sem filtro de dono). */
function VistaGestorMatriculas({ onSessionExpired }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [cursosDesempenho, setCursosDesempenho] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        setCarregando(true);
        setErro("");
        const dados = await apiRequest("/Cursos/desempenho");

        if (!ativo) {
          return;
        }

        setCursosDesempenho(dados);
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar as metricas dos cursos agora.");
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDesempenho();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const totalMatriculasAprovadas = cursosDesempenho.reduce((total, curso) => total + curso.totalAlunos, 0);
  const cursosOrdenados = useMemo(
    () => [...cursosDesempenho].sort((cursoA, cursoB) => cursoB.totalAlunos - cursoA.totalAlunos),
    [cursosDesempenho]
  );

  return (
    <div className="tela-matriculas">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Matriculas</h2>
          <p className="cabecalho-pagina__subtitulo">
            Matricula e sempre automatica - acompanhe aqui o volume por curso, conclusao e certificados emitidos.
          </p>
        </div>
      </header>

      {erro ? <InlineMessage tone="erro">{erro}</InlineMessage> : null}

      {carregando ? (
        <p className="texto-vazio" role="status">Carregando metricas...</p>
      ) : cursosOrdenados.length === 0 ? (
        <EmptyState message="Nenhum curso cadastrado ainda." />
      ) : (
        <div className="tabela-dados-container painel-secao">
          <table aria-label="Metricas de matricula por curso" className="tabela-dados">
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Matriculas aprovadas</th>
                <th scope="col">Alunos ativos</th>
                <th scope="col">% Conclusao</th>
                <th scope="col">Certificados emitidos</th>
              </tr>
            </thead>
            <tbody>
              {cursosOrdenados.map((curso) => (
                <tr key={curso.cursoId}>
                  <td data-label="Curso">{curso.cursoTitulo}</td>
                  <td data-label="Matriculas aprovadas">{curso.totalAlunos}</td>
                  <td data-label="Alunos ativos">{curso.alunosAtivos}</td>
                  <td data-label="% Conclusao">{formatPercent(curso.percentualConclusao)}</td>
                  <td data-label="Certificados emitidos">{curso.certificadosEmitidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="texto-mudo" style={{ fontSize: "0.82rem", marginTop: "var(--espaco-sm)" }}>
            {totalMatriculasAprovadas} matricula{totalMatriculasAprovadas === 1 ? "" : "s"} aprovada{totalMatriculasAprovadas === 1 ? "" : "s"} no total, em {cursosOrdenados.length} curso{cursosOrdenados.length === 1 ? "" : "s"}.
          </p>
        </div>
      )}
    </div>
  );
}
