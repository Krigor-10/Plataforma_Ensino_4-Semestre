import { useEffect, useMemo, useState } from "react";
import {
  TbArrowRight,
  TbBook2,
  TbCalendar,
  TbChevronLeft,
  TbChevronRight,
  TbCircleCheck,
  TbCircleX,
  TbClock,
  TbCreditCard,
  TbFilter,
  TbMedal,
  TbPlayerPlay,
  TbSearch,
  TbTrendingUp,
  TbUsers,
  TbUsersGroup
} from "react-icons/tb";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import AtalhoAssistente from "../../components/chatbot/AtalhoAssistente.jsx";
import Botao from "../../components/Botao.jsx";
import ConfirmacaoCompraModal from "../../components/ConfirmacaoCompraModal.jsx";
import Insignia from "../../components/Insignia.jsx";
import SelectSimples from "../../components/SelectSimples.jsx";
import PopupResultadoMatricula from "./PopupResultadoMatricula.jsx";
import { useLarguraJanela } from "../../hooks/useLarguraJanela.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { clampPercent, formatDate, formatDayMonth, formatGrade, formatMoney } from "../../lib/format.js";
import { rotuloSituacaoCurso } from "../../lib/situacaoCurso.js";
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

  return <VistaGestorMatriculas onNavigate={onNavigate} onSessionExpired={onSessionExpired} />;
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
export function CartaoCursoMatricula({ compacto = false, curso, matricula, onCancelar, onComecarGratis, onComprar, onConcluirCompra, onDesistir, onEntrarNoCurso, onReabrir, processando }) {
  const [confirmandoDesistencia, setConfirmandoDesistencia] = useState(false);
  const temPagamentoPendente = matricula?.status === "Aprovada" && matricula.pagamentoStatus === PAGAMENTO_PENDENTE;
  // Gratuito ou com Pagamento Pago confirmado - "so Cancelado" (desistiu/
  // venceu, prompt-agente-inscricoes-v3.md) NAO libera, mesmo Aprovada.
  const acessoLiberado = matricula?.acessoLiberado ?? true;
  const precisaComprar = matricula?.status === "Aprovada" && !temPagamentoPendente && !acessoLiberado;
  const progresso = clampPercent(matricula?.progresso);
  const rotuloEntrada = progresso > 0 ? "Continuar curso" : "Iniciar curso";
  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;
  const pagueAte = temPagamentoPendente && matricula.pagamentoVenceEm ? formatDayMonth(matricula.pagamentoVenceEm) : null;

  function confirmarDesistencia() {
    setConfirmandoDesistencia(false);
    onDesistir?.();
  }

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
          <h3 className="catalogo-card__titulo" title={curso.titulo}>{curso.titulo}</h3>
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
              <>
                <InlineMessage tone="warning">
                  Compra pendente: {formatMoney(matricula.pagamentoValor)}{pagueAte ? ` · Pague até ${pagueAte}` : ""}.
                </InlineMessage>
                <AtalhoAssistente pergunta={`Meu pagamento de ${curso.titulo} foi confirmado?`} />
              </>
            ) : null}
            {compacto && matricula.status === "Aprovada" ? <BarraProgresso percentual={progresso} /> : null}
            {temPagamentoPendente && confirmandoDesistencia ? (
              <InlineMessage tone="warning">
                Desistir da compra de {curso.titulo}? Você pode comprar de novo depois.
              </InlineMessage>
            ) : null}
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
              {temPagamentoPendente && confirmandoDesistencia ? (
                <>
                  <Botao disabled={processando} onClick={() => setConfirmandoDesistencia(false)} tamanho="pequeno" variante="perigo">
                    Não
                  </Botao>
                  <Botao disabled={processando} onClick={confirmarDesistencia} tamanho="pequeno" variante="sucesso">
                    {processando ? "Desistindo..." : "Sim, desistir"}
                  </Botao>
                </>
              ) : (
                <>
                  {temPagamentoPendente && onConcluirCompra ? (
                    <Botao onClick={onConcluirCompra} tamanho="pequeno" variante="sucesso">
                      <TbCreditCard aria-hidden="true" size={14} /> Concluir compra
                    </Botao>
                  ) : null}
                  {temPagamentoPendente && onDesistir ? (
                    <Botao disabled={processando} onClick={() => setConfirmandoDesistencia(true)} tamanho="pequeno" variante="secundario">
                      Desistir da compra
                    </Botao>
                  ) : null}
                </>
              )}
              {precisaComprar && onComprar ? (
                <Botao onClick={onComprar} tamanho="pequeno" variante="primario">
                  <TbCreditCard aria-hidden="true" size={14} /> Comprar · {formatMoney(curso.preco)}
                </Botao>
              ) : null}
              {matricula.status === "Aprovada" && !temPagamentoPendente && acessoLiberado && onEntrarNoCurso ? (
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

  async function desistirDaCompra(matricula) {
    setMatriculaProcessando(matricula.id);

    try {
      await apiRequest(`/Pagamentos/${matricula.id}/cancelar`, { method: "POST" });
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel desistir da compra agora.", "erro");
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
                onComprar={() => setCursoParaComprar(curso)}
                onConcluirCompra={() => setCursoParaComprar(curso)}
                onDesistir={() => desistirDaCompra(matricula)}
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

const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;
const CURSOS_POR_PAGINA_INSCRICOES = 10;

// Situacao do curso: a mesma regra unica das abas e selos (lib/
// situacaoCurso.js, pacote 6 da auditoria de 26/11) - aqui o rotulo fica
// sempre neutro (so o modelo tem cor).

const ROTULO_MODELO_CURSO_INSCRICOES = { [MODELO_GRATUITO]: "Gratuito", [MODELO_PAGO_PACOTE]: "Pago", [MODELO_ACOMPANHADO]: "Acompanhado" };
const VARIANTE_MODELO_CURSO_INSCRICOES = { [MODELO_GRATUITO]: "sucesso", [MODELO_PAGO_PACOTE]: "marca", [MODELO_ACOMPANHADO]: "info" };

const CHIPS_MODELO_CURSO = [
  { valor: "todos", rotulo: "Todos" },
  { valor: String(MODELO_GRATUITO), rotulo: "Gratuito" },
  { valor: String(MODELO_PAGO_PACOTE), rotulo: "Pago" },
  { valor: String(MODELO_ACOMPANHADO), rotulo: "Acompanhado" }
];

const OPCOES_PERIODO_INSCRICOES = [
  { valor: "todoOPeriodo", rotulo: "Todo o período" },
  { valor: "esteMes", rotulo: "Este mês" },
  { valor: "ultimos3Meses", rotulo: "Últimos 3 meses" },
  { valor: "esteAno", rotulo: "Este ano" }
];

function paraISODate(data) {
  return data.toISOString().slice(0, 10);
}

function calcularIntervaloPeriodoInscricoes(periodo) {
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  switch (periodo) {
    case "esteMes":
      return { ate: paraISODate(hojeSemHora), de: paraISODate(new Date(hojeSemHora.getFullYear(), hojeSemHora.getMonth(), 1)) };
    case "ultimos3Meses":
      return { ate: paraISODate(hojeSemHora), de: paraISODate(new Date(hojeSemHora.getFullYear(), hojeSemHora.getMonth() - 3, hojeSemHora.getDate())) };
    case "esteAno":
      return { ate: paraISODate(hojeSemHora), de: paraISODate(new Date(hojeSemHora.getFullYear(), 0, 1)) };
    case "todoOPeriodo":
    default:
      return { ate: null, de: null };
  }
}

function calcularResumoInscricoes(lista) {
  const somar = (seletor) => lista.reduce((total, item) => total + seletor(item), 0);
  const totalInscritos = somar((item) => item.inscritos);
  const totalComecaram = somar((item) => item.comecaram);
  const totalConcluiram = somar((item) => item.concluiram);

  return {
    totalComCertificado: somar((item) => item.comCertificado),
    totalComecaram,
    totalConcluiram,
    totalInscritos,
    totalPendentes: somar((item) => item.pendentes),
    totalReceita: somar((item) => item.receita),
    // Aba "Vendas" (prompt-agente-inscricoes-v3.md, item 10).
    totalAReceber: somar((item) => item.aReceber),
    totalCancelados: somar((item) => item.cancelados),
    totalValorCancelado: somar((item) => item.valorCancelado),
    totalTentativasCompra: somar((item) => item.tentativasCompra),
    totalCompraram: somar((item) => item.compraram),
    percentualComecaram: totalInscritos ? Math.round((totalComecaram / totalInscritos) * 100) : 0,
    percentualConcluiram: totalInscritos ? Math.round((totalConcluiram / totalInscritos) * 100) : 0
  };
}

/* % de uma parte sobre os inscritos do curso (ou do total filtrado) -
   0 quando nao ha inscritos, pra nao dividir por zero (prompt-agente-
   inscricoes-v2.md: "com 0 inscritos, os % ficam 0%"). */
function percentualDeInscritos(parte, inscritos) {
  return inscritos > 0 ? Math.round((parte / inscritos) * 100) : 0;
}

/* Busca sem diferenciar maiusculas/acentos (prompt-agente-inscricoes-v2.md,
   item 5: "Buscar curso..." filtra pelo titulo no navegador). */
function normalizarTextoBusca(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/* "N gratuito"/"N gratuitos" etc. - singular so quando a contagem e 1
   (prompt-agente-inscricoes-v2.md, item 3 do KPI "Total de cursos"). */
function contarPorModelo(lista, modeloCurso, singular, plural) {
  const quantidade = lista.filter((item) => item.modeloCurso === modeloCurso).length;
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/* Cartao dos 5 KPIs com visual proprio desta tela (inscricoes-v2-proposta.png):
   icone num quadrado colorido + valor/rotulo, com uma linha extra opcional
   embaixo (% das inscricoes, pendentes) na mesma cor do cartao. A cor e uma
   custom property (--inscricoes-kpi-cor) pra um unico bloco de CSS servir os
   5 cartoes, em vez de 5 modificadores de cor repetindo o mesmo degrade. */
function CartaoKpiInscricoes({ cor, extra, icone, rotulo, valor }) {
  // "extra" pode ser texto simples (% das inscrições) ou um node com o selo
  // "Simulada" (Receita) - a aria-label so incorpora quando e texto puro,
  // pra nao virar "[object Object]" (prompt-agente-inscricoes-v2-correcoes.md,
  // item 1: o selo saiu de dentro do rotulo e foi pra linha extra).
  const extraTexto = typeof extra === "string" ? ` - ${extra}` : "";
  return (
    <article
      aria-label={`${rotulo}: ${valor}${extraTexto}`}
      className="inscricoes-kpi"
      style={{ "--inscricoes-kpi-cor": cor }}
    >
      <div className="inscricoes-kpi__cabeca">
        <span aria-hidden="true" className="inscricoes-kpi__icone">{icone}</span>
        <div className="inscricoes-kpi__texto">
          <strong className="inscricoes-kpi__valor" title={String(valor)}>{valor}</strong>
          <span className="inscricoes-kpi__rotulo">{rotulo}</span>
        </div>
      </div>
      {extra ? <p className="inscricoes-kpi__extra">{extra}</p> : null}
    </article>
  );
}

/* Paginacao no navegador (prompt-agente-inscricoes-v2.md, item 8): 10 cursos
   por pagina, some sozinha quando tudo cabe numa pagina so. */
function PaginacaoInscricoes({ itensPorPagina, onMudarPagina, paginaAtual, totalItens }) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
  if (totalPaginas <= 1) {
    return null;
  }

  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);
  const paginas = Array.from({ length: totalPaginas }, (_, indice) => indice + 1);

  return (
    <div className="inscricoes-paginacao">
      <p className="inscricoes-paginacao__resumo">
        Mostrando {inicio}–{fim} de {totalItens} curso{totalItens === 1 ? "" : "s"}
      </p>
      <nav aria-label="Paginação de cursos" className="inscricoes-paginacao__controles">
        <button
          aria-label="Página anterior"
          className="inscricoes-paginacao__botao"
          disabled={paginaAtual === 1}
          onClick={() => onMudarPagina(paginaAtual - 1)}
          type="button"
        >
          <TbChevronLeft aria-hidden="true" size={16} />
        </button>
        {paginas.map((pagina) => (
          <button
            aria-current={pagina === paginaAtual ? "page" : undefined}
            className={`inscricoes-paginacao__botao${pagina === paginaAtual ? " inscricoes-paginacao__botao--ativo" : ""}`}
            key={pagina}
            onClick={() => onMudarPagina(pagina)}
            type="button"
          >
            {pagina}
          </button>
        ))}
        <button
          aria-label="Próxima página"
          className="inscricoes-paginacao__botao"
          disabled={paginaAtual === totalPaginas}
          onClick={() => onMudarPagina(paginaAtual + 1)}
          type="button"
        >
          <TbChevronRight aria-hidden="true" size={16} />
        </button>
      </nav>
    </div>
  );
}

function BadgesCursoInscricoes({ inscricao }) {
  return (
    <span className="inscricoes-badges">
      <Insignia texto={ROTULO_MODELO_CURSO_INSCRICOES[inscricao.modeloCurso] || "—"} variante={VARIANTE_MODELO_CURSO_INSCRICOES[inscricao.modeloCurso]} />
      <Insignia texto={inscricao.situacao ? rotuloSituacaoCurso(inscricao.situacao) : "—"} variante="neutro" />
    </span>
  );
}

/* Tela "Inscricoes" do Admin (PROMPT-agente-tela-inscricoes.md): desde que
   matricula virou sempre automatica (sem aprovacao manual), a antiga lista
   "Matriculas" ficou sem funcao - "Matriculas aprovadas" e "Alunos ativos"
   sempre davam o mesmo numero, e "% Conclusao" era ambiguo. Agora o foco e
   inscricao/venda: funil de inscritos -> comecaram -> concluiram -> com
   certificado, pendentes de pagamento e receita (simulada), por curso. So
   muda o que o Admin VE - a palavra "Matricula" continua no banco, no
   codigo, nas rotas e nas telas do aluno. */
function VistaGestorMatriculas({ onNavigate, onSessionExpired }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [inscricoes, setInscricoes] = useState([]);
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("todoOPeriodo");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [abaAtiva, setAbaAtiva] = useState("alunos");
  const largura = useLarguraJanela();
  const ehCelular = largura <= 768;

  useEffect(() => {
    let ativo = true;

    async function carregarInscricoes() {
      try {
        setCarregando(true);
        setErro("");
        const { de, ate } = calcularIntervaloPeriodoInscricoes(periodo);
        const query = de && ate ? `?de=${de}&ate=${ate}` : "";
        const dados = await apiRequest(`/Cursos/inscricoes${query}`);

        if (!ativo) {
          return;
        }

        setInscricoes(dados);
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar as inscricoes agora.");
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarInscricoes();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired, periodo]);

  const buscaNormalizada = useMemo(() => normalizarTextoBusca(busca), [busca]);

  // Modelo e busca sao filtrados no cliente (dados ja carregados); periodo
  // refaz a chamada (ver useEffect acima) - ordem por inscritos ja vem do
  // backend e o filter() preserva a ordem relativa. "inscricoes" (sem
  // filtro) sempre traz TODOS os cursos da plataforma - o backend nao
  // filtra a lista pelo periodo, so os numeros de cada curso.
  const inscricoesFiltradas = useMemo(
    () =>
      inscricoes.filter((item) => {
        if (filtroModelo !== "todos" && String(item.modeloCurso) !== filtroModelo) {
          return false;
        }
        return !buscaNormalizada || normalizarTextoBusca(item.titulo).includes(buscaNormalizada);
      }),
    [buscaNormalizada, filtroModelo, inscricoes]
  );

  // Troca de chip, busca ou periodo volta pra pagina 1 (prompt-agente-
  // inscricoes-v2.md, item 8).
  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaNormalizada, filtroModelo, periodo]);

  const totalPaginas = Math.max(1, Math.ceil(inscricoesFiltradas.length / CURSOS_POR_PAGINA_INSCRICOES));
  const paginaAtualValida = Math.min(paginaAtual, totalPaginas);
  const inicioPagina = (paginaAtualValida - 1) * CURSOS_POR_PAGINA_INSCRICOES;
  const inscricoesDaPagina = inscricoesFiltradas.slice(inicioPagina, inicioPagina + CURSOS_POR_PAGINA_INSCRICOES);

  const resumo = useMemo(() => calcularResumoInscricoes(inscricoesFiltradas), [inscricoesFiltradas]);

  const totalCursosPlataforma = inscricoes.length;
  const rotuloGratuitos = contarPorModelo(inscricoes, MODELO_GRATUITO, "gratuito", "gratuitos");
  const rotuloPagos = contarPorModelo(inscricoes, MODELO_PAGO_PACOTE, "pago", "pagos");
  const rotuloAcompanhados = contarPorModelo(inscricoes, MODELO_ACOMPANHADO, "acompanhado", "acompanhados");

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/cursos/${cursoId}`);
  }

  // Tablist com 2 abas so (Alunos/Vendas): seta troca pra outra aba e leva o
  // foco junto, como o padrao WAI-ARIA de tabs pede.
  function aoNavegarAbas(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const proxima = abaAtiva === "alunos" ? "vendas" : "alunos";
    setAbaAtiva(proxima);
    document.getElementById(`inscricoes-aba-${proxima}`)?.focus();
  }

  function aoClicarVerDetalhes(event, cursoId) {
    event.stopPropagation();
    abrirCurso(cursoId);
  }

  function capaDoCurso(inscricao, event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = getCourseCover(inscricao);
  }

  return (
    <div className="tela-matriculas tela-inscricoes">
      <header className="cabecalho-pagina">
        <div className="inscricoes-cabecalho__identidade">
          <span aria-hidden="true" className="inscricoes-cabecalho__icone"><TbUsersGroup size={40} /></span>
          <span aria-hidden="true" className="inscricoes-cabecalho__linha" />
          <div>
            <h2 className="cabecalho-pagina__titulo">Inscrições</h2>
            <p className="cabecalho-pagina__subtitulo">
              Acompanhe inscrições, desempenho acadêmico, certificados e receita dos cursos.
            </p>
          </div>
        </div>

        <article
          aria-label={`Total de cursos na plataforma: ${totalCursosPlataforma} (${rotuloGratuitos}, ${rotuloPagos}, ${rotuloAcompanhados})`}
          className="inscricoes-kpi-total"
        >
          <span aria-hidden="true" className="inscricoes-kpi-total__icone"><TbBook2 size={24} /></span>
          <div className="inscricoes-kpi-total__corpo">
            <strong className="inscricoes-kpi-total__valor">{totalCursosPlataforma}</strong>
            <span className="inscricoes-kpi-total__rotulo">cursos na plataforma</span>
            <div className="inscricoes-kpi-total__pilulas">
              <span className="inscricoes-kpi-total__pilula">{rotuloGratuitos}</span>
              <span className="inscricoes-kpi-total__pilula">{rotuloPagos}</span>
              <span className="inscricoes-kpi-total__pilula">{rotuloAcompanhados}</span>
            </div>
          </div>
        </article>
      </header>

      {erro ? <InlineMessage tone="erro">{erro}</InlineMessage> : null}

      <div aria-label="Visão da tela Inscrições" className="inscricoes-abas" role="tablist">
        <button
          aria-controls="inscricoes-painel"
          aria-selected={abaAtiva === "alunos"}
          className={`inscricoes-aba${abaAtiva === "alunos" ? " inscricoes-aba--ativa" : ""}`}
          id="inscricoes-aba-alunos"
          onClick={() => setAbaAtiva("alunos")}
          onKeyDown={aoNavegarAbas}
          role="tab"
          tabIndex={abaAtiva === "alunos" ? 0 : -1}
          type="button"
        >
          <TbUsersGroup aria-hidden="true" size={16} /> Alunos
        </button>
        <button
          aria-controls="inscricoes-painel"
          aria-selected={abaAtiva === "vendas"}
          className={`inscricoes-aba${abaAtiva === "vendas" ? " inscricoes-aba--ativa" : ""}`}
          id="inscricoes-aba-vendas"
          onClick={() => setAbaAtiva("vendas")}
          onKeyDown={aoNavegarAbas}
          role="tab"
          tabIndex={abaAtiva === "vendas" ? 0 : -1}
          type="button"
        >
          <TbCreditCard aria-hidden="true" size={16} /> Vendas
          {resumo.totalPendentes > 0 ? (
            <span className="inscricoes-aba__contagem">{resumo.totalPendentes} pendente{resumo.totalPendentes === 1 ? "" : "s"}</span>
          ) : null}
        </button>
      </div>

      <div aria-labelledby={`inscricoes-aba-${abaAtiva}`} className="inscricoes-kpis" id="inscricoes-painel" role="tabpanel">
        {abaAtiva === "alunos" ? (
          <>
            <CartaoKpiInscricoes cor="var(--cor-marca)" icone={<TbUsers size={24} />} rotulo="Inscrições" valor={resumo.totalInscritos} />
            <CartaoKpiInscricoes
              cor="var(--cor-info)"
              extra={`${resumo.percentualComecaram}% das inscrições`}
              icone={<TbPlayerPlay size={24} />}
              rotulo="Começaram"
              valor={resumo.totalComecaram}
            />
            <CartaoKpiInscricoes
              cor="var(--cor-sucesso)"
              extra={`${resumo.percentualConcluiram}% das inscrições`}
              icone={<TbCircleCheck size={24} />}
              rotulo="Concluíram"
              valor={resumo.totalConcluiram}
            />
            <CartaoKpiInscricoes cor="var(--cor-aviso)" icone={<TbMedal size={24} />} rotulo="Certificados emitidos" valor={resumo.totalComCertificado} />
          </>
        ) : (
          <>
            <CartaoKpiInscricoes
              cor="var(--cor-sucesso)"
              extra={`${resumo.totalCompraram} pagamento${resumo.totalCompraram === 1 ? "" : "s"}`}
              icone={<TbCreditCard size={24} />}
              rotulo="Recebido"
              valor={formatMoney(resumo.totalReceita)}
            />
            <CartaoKpiInscricoes
              cor="var(--cor-aviso)"
              extra={`${resumo.totalPendentes} aluno${resumo.totalPendentes === 1 ? "" : "s"} pendente${resumo.totalPendentes === 1 ? "" : "s"}`}
              icone={<TbClock size={24} />}
              rotulo="A receber"
              valor={formatMoney(resumo.totalAReceber)}
            />
            <CartaoKpiInscricoes
              cor="var(--cor-erro)"
              extra={formatMoney(resumo.totalValorCancelado)}
              icone={<TbCircleX size={24} />}
              rotulo="Cancelados"
              valor={resumo.totalCancelados}
            />
            <CartaoKpiInscricoes
              cor="var(--cor-marca)"
              extra={resumo.totalTentativasCompra > 0 ? `${resumo.totalCompraram} de ${resumo.totalTentativasCompra} pagaram` : null}
              icone={<TbTrendingUp size={24} />}
              rotulo="Conversão"
              valor={resumo.totalTentativasCompra > 0 ? `${Math.round((resumo.totalCompraram / resumo.totalTentativasCompra) * 100)}%` : "—"}
            />
          </>
        )}
      </div>

      <div className="inscricoes-filtros">
        <div className="inscricoes-filtros__grupo-modalidade">
          <span className="inscricoes-filtros__rotulo"><TbFilter aria-hidden="true" size={16} /> Modalidade</span>
          <div aria-label="Filtrar por modelo do curso" className="inscricoes-filtros__chips" role="group">
            {CHIPS_MODELO_CURSO.map((chip) => (
              <button
                aria-pressed={filtroModelo === chip.valor}
                className={`inscricoes-chip${filtroModelo === chip.valor ? " inscricoes-chip--ativo" : ""}`}
                key={chip.valor}
                onClick={() => setFiltroModelo(chip.valor)}
                type="button"
              >
                {chip.rotulo}
              </button>
            ))}
          </div>
        </div>

        <label className="visualmente-oculto" htmlFor="inscricoes-busca-curso">Buscar curso</label>
        <div className="campo-busca inscricoes-filtros__busca">
          <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
          <input
            className="campo__entrada"
            id="inscricoes-busca-curso"
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar curso…"
            type="search"
            value={busca}
          />
        </div>

        <div className="inscricoes-filtros__periodo">
          <TbCalendar aria-hidden="true" className="inscricoes-filtros__periodo-icone" size={16} />
          <label className="visualmente-oculto" htmlFor="inscricoes-filtro-periodo">Período</label>
          <SelectSimples id="inscricoes-filtro-periodo" onChange={setPeriodo} opcoes={OPCOES_PERIODO_INSCRICOES} value={periodo} />
        </div>
      </div>

      {carregando ? (
        <p className="texto-vazio" role="status">Carregando inscrições...</p>
      ) : inscricoesFiltradas.length === 0 ? (
        <EmptyState message="Nenhum curso encontrado para esse filtro." />
      ) : ehCelular ? (
        <>
          <ul aria-label="Inscrições por curso" className="inscricoes-cartoes" role="list">
            {inscricoesDaPagina.map((inscricao) => {
              const percentualIniciaram = percentualDeInscritos(inscricao.comecaram, inscricao.inscritos);
              const percentualConcluiram = percentualDeInscritos(inscricao.concluiram, inscricao.inscritos);

              return (
                <li className="inscricoes-cartao" key={inscricao.cursoId}>
                  <img
                    alt=""
                    className="inscricoes-cartao__capa"
                    loading="lazy"
                    onError={(event) => capaDoCurso(inscricao, event)}
                    src={resolverImagemCurso(inscricao)}
                  />
                  <strong className="inscricoes-cartao__titulo">{inscricao.titulo}</strong>
                  <BadgesCursoInscricoes inscricao={inscricao} />
                  <p className="inscricoes-cartao__linha-dados">
                    {inscricao.modeloCurso === MODELO_GRATUITO ? "Grátis" : formatMoney(inscricao.preco)}
                    {" · "}
                    {inscricao.inscritos} inscrito{inscricao.inscritos === 1 ? "" : "s"}
                  </p>
                  <p className="inscricoes-cartao__linha-dados">
                    Iniciaram {inscricao.comecaram} ({percentualIniciaram}%) · Concluíram {inscricao.concluiram} ({percentualConcluiram}%)
                  </p>
                  <p className="inscricoes-cartao__linha-dados">
                    <span className={inscricao.pendentes > 0 ? "inscricoes-pendentes inscricoes-pendentes--destaque" : "inscricoes-pendentes"}>
                      {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : inscricao.pendentes} pendente{inscricao.pendentes === 1 ? "" : "s"}
                    </span>
                    {" · "}
                    {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : formatMoney(inscricao.receita)}
                  </p>
                  <Botao
                    aria-label={`Ver curso ${inscricao.titulo}`}
                    className="inscricoes-cartao__botao inscricoes-botao-ver-curso"
                    onClick={(event) => aoClicarVerDetalhes(event, inscricao.cursoId)}
                    tamanho="pequeno"
                    variante="secundario"
                  >
                    Ver curso <TbArrowRight aria-hidden="true" className="inscricoes-botao-ver-curso__seta" size={16} />
                  </Botao>
                </li>
              );
            })}
          </ul>
          <PaginacaoInscricoes
            itensPorPagina={CURSOS_POR_PAGINA_INSCRICOES}
            onMudarPagina={setPaginaAtual}
            paginaAtual={paginaAtualValida}
            totalItens={inscricoesFiltradas.length}
          />
        </>
      ) : (
        <div className="tabela-dados-container painel-secao">
          <header className="painel-secao__cabecalho">
            <h3 className="painel-secao__titulo inscricoes-tabela-titulo">
              <TbBook2 aria-hidden="true" size={18} /> Cursos e Desempenho
            </h3>
            <span className="inscricoes-tabela-contagem">
              {inscricoesFiltradas.length} curso{inscricoesFiltradas.length === 1 ? "" : "s"} encontrado{inscricoesFiltradas.length === 1 ? "" : "s"}
            </span>
          </header>
          <table aria-label="Inscrições por curso" className="tabela-dados tabela-dados--inscricoes">
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Preço</th>
                <th scope="col">Inscritos</th>
                <th scope="col">Iniciaram</th>
                <th scope="col">Concluíram</th>
                <th scope="col">Certificados</th>
                <th scope="col">Pendentes</th>
                <th scope="col">Receita</th>
                <th aria-hidden="true" scope="col" />
              </tr>
            </thead>
            <tbody>
              {inscricoesDaPagina.map((inscricao) => {
                const percentualIniciaram = percentualDeInscritos(inscricao.comecaram, inscricao.inscritos);
                const percentualConcluiram = percentualDeInscritos(inscricao.concluiram, inscricao.inscritos);

                return (
                  <tr key={inscricao.cursoId}>
                    <td data-label="Curso">
                      <div className="inscricoes-tabela-curso">
                        <img
                          alt=""
                          className="inscricoes-tabela-capa"
                          loading="lazy"
                          onError={(event) => capaDoCurso(inscricao, event)}
                          src={resolverImagemCurso(inscricao)}
                        />
                        <div>
                          <strong className="inscricoes-tabela-curso__titulo" title={inscricao.titulo}>{inscricao.titulo}</strong>
                          <BadgesCursoInscricoes inscricao={inscricao} />
                        </div>
                      </div>
                    </td>
                    <td data-label="Preço">{inscricao.modeloCurso === MODELO_GRATUITO ? "Grátis" : formatMoney(inscricao.preco)}</td>
                    <td data-label="Inscritos">{inscricao.inscritos}</td>
                    <td data-label="Iniciaram">
                      <div className="inscricoes-tabela-metrica">
                        <span>{inscricao.comecaram} <small>{percentualIniciaram}%</small></span>
                        <span aria-hidden="true" className="inscricoes-mini-barra inscricoes-mini-barra--azul">
                          <span style={{ width: `${percentualIniciaram}%` }} />
                        </span>
                      </div>
                    </td>
                    <td data-label="Concluíram">
                      <div className="inscricoes-tabela-metrica">
                        <span>{inscricao.concluiram} <small>{percentualConcluiram}%</small></span>
                        <span aria-hidden="true" className="inscricoes-mini-barra inscricoes-mini-barra--roxa">
                          <span style={{ width: `${percentualConcluiram}%` }} />
                        </span>
                      </div>
                    </td>
                    <td data-label="Certificados">{inscricao.comCertificado}</td>
                    <td data-label="Pendentes">
                      <span className={inscricao.pendentes > 0 ? "inscricoes-pendentes inscricoes-pendentes--destaque" : "inscricoes-pendentes"}>
                        {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : inscricao.pendentes}
                      </span>
                    </td>
                    <td data-label="Receita">{inscricao.modeloCurso === MODELO_GRATUITO ? "—" : formatMoney(inscricao.receita)}</td>
                    <td data-label="">
                      <Botao
                        aria-label={`Ver curso ${inscricao.titulo}`}
                        className="inscricoes-botao-ver-curso"
                        onClick={(event) => aoClicarVerDetalhes(event, inscricao.cursoId)}
                        tamanho="pequeno"
                        variante="secundario"
                      >
                        Ver curso <TbArrowRight aria-hidden="true" className="inscricoes-botao-ver-curso__seta" size={16} />
                      </Botao>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginacaoInscricoes
            itensPorPagina={CURSOS_POR_PAGINA_INSCRICOES}
            onMudarPagina={setPaginaAtual}
            paginaAtual={paginaAtualValida}
            totalItens={inscricoesFiltradas.length}
          />
        </div>
      )}
    </div>
  );
}
