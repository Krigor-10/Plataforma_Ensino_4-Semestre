import { useEffect, useMemo, useState } from "react";
import {
  TbArrowRight,
  TbChevronRight,
  TbCircleCheck,
  TbClock,
  TbCreditCard,
  TbCurrencyReal,
  TbMedal,
  TbPlayerPlay,
  TbSearch,
  TbUsers
} from "react-icons/tb";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import AtalhoAssistente from "../../components/chatbot/AtalhoAssistente.jsx";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import ConfirmacaoCompraModal from "../../components/ConfirmacaoCompraModal.jsx";
import Insignia from "../../components/Insignia.jsx";
import SelectSimples from "../../components/SelectSimples.jsx";
import PopupResultadoMatricula from "./PopupResultadoMatricula.jsx";
import { useLarguraJanela } from "../../hooks/useLarguraJanela.js";
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
                  Compra pendente: {formatMoney(matricula.pagamentoValor)}.
                </InlineMessage>
                <AtalhoAssistente pergunta={`Meu pagamento de ${curso.titulo} foi confirmado?`} />
              </>
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

const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;

// 1=EmAndamento, 2=AguardandoEncerramento, 3=Encerrado, 4=AVenda (backend
// SituacaoCursoInscricoes) - rotulo sempre neutro (so o modelo tem cor).
const ROTULO_SITUACAO_CURSO = {
  1: "Em andamento",
  2: "Aguardando encerramento",
  3: "Encerrado",
  4: "À venda"
};

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
    percentualComecaram: totalInscritos ? Math.round((totalComecaram / totalInscritos) * 100) : 0,
    percentualConcluiram: totalInscritos ? Math.round((totalConcluiram / totalInscritos) * 100) : 0
  };
}

/* Texto "N começaram › N concluíram › N com certificado" (prompt-agente-
   tela-inscricoes.md, item 7) - singular so nos verbos (comecar/concluir),
   "com certificado" nao muda de forma. */
function textoFunilInscricoes({ comCertificado, comecaram, concluiram, inscritos }) {
  if (inscritos === 0) {
    return "Ninguém inscrito ainda";
  }

  const verboComecar = comecaram === 1 ? "começou" : "começaram";
  const verboConcluir = concluiram === 1 ? "concluiu" : "concluíram";
  return `${comecaram} ${verboComecar} › ${concluiram} ${verboConcluir} › ${comCertificado} com certificado`;
}

function BarraFunilInscricoes({ inscricao }) {
  const { comCertificado, comecaram, concluiram, inscritos } = inscricao;
  const texto = textoFunilInscricoes(inscricao);

  if (inscritos === 0) {
    return (
      <div className="inscricoes-funil">
        <div aria-hidden="true" className="inscricoes-funil__barra inscricoes-funil__barra--vazia" />
        <p className="inscricoes-funil__texto">{texto}</p>
      </div>
    );
  }

  const concluidoComCertificado = comCertificado;
  const concluidoSemCertificado = Math.max(0, concluiram - comCertificado);
  const emAndamento = Math.max(0, comecaram - concluiram);
  const naoComecaram = Math.max(0, inscritos - comecaram);
  const paraPercentual = (valor) => (valor / inscritos) * 100;

  return (
    <div className="inscricoes-funil">
      <div aria-hidden="true" className="inscricoes-funil__barra">
        <span className="inscricoes-funil__segmento inscricoes-funil__segmento--concluido-com-certificado" style={{ width: `${paraPercentual(concluidoComCertificado)}%` }} />
        <span className="inscricoes-funil__segmento inscricoes-funil__segmento--concluido-sem-certificado" style={{ width: `${paraPercentual(concluidoSemCertificado)}%` }} />
        <span className="inscricoes-funil__segmento inscricoes-funil__segmento--em-andamento" style={{ width: `${paraPercentual(emAndamento)}%` }} />
        <span className="inscricoes-funil__segmento inscricoes-funil__segmento--nao-comecaram" style={{ width: `${paraPercentual(naoComecaram)}%` }} />
      </div>
      <p className="inscricoes-funil__texto">{texto}</p>
    </div>
  );
}

function LegendaFunilInscricoes() {
  return (
    <ul aria-label="Legenda do funil de inscrições" className="inscricoes-legenda" role="list">
      <li><span aria-hidden="true" className="inscricoes-legenda__cor inscricoes-legenda__cor--concluido-com-certificado" /> concluíram com certificado</li>
      <li><span aria-hidden="true" className="inscricoes-legenda__cor inscricoes-legenda__cor--concluido-sem-certificado" /> concluíram sem certificado</li>
      <li><span aria-hidden="true" className="inscricoes-legenda__cor inscricoes-legenda__cor--em-andamento" /> em andamento</li>
      <li><span aria-hidden="true" className="inscricoes-legenda__cor inscricoes-legenda__cor--nao-comecaram" /> não começaram</li>
    </ul>
  );
}

function BadgesCursoInscricoes({ inscricao }) {
  return (
    <span className="inscricoes-badges">
      <Insignia texto={ROTULO_MODELO_CURSO_INSCRICOES[inscricao.modeloCurso] || "—"} variante={VARIANTE_MODELO_CURSO_INSCRICOES[inscricao.modeloCurso]} />
      <Insignia texto={ROTULO_SITUACAO_CURSO[inscricao.situacao] || "—"} variante="neutro" />
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
  const [periodo, setPeriodo] = useState("todoOPeriodo");
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

  // Modelo e filtrado no cliente (dados ja carregados); periodo refaz a
  // chamada (ver useEffect acima) - ordem por inscritos ja vem do backend e
  // o filter() preserva a ordem relativa.
  const inscricoesFiltradas = useMemo(
    () => (filtroModelo === "todos" ? inscricoes : inscricoes.filter((item) => String(item.modeloCurso) === filtroModelo)),
    [filtroModelo, inscricoes]
  );

  const resumo = useMemo(() => calcularResumoInscricoes(inscricoesFiltradas), [inscricoesFiltradas]);

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/cursos/${cursoId}`);
  }

  function aoPressionarTeclaNaLinha(event, cursoId) {
    if (event.key === "Enter") {
      abrirCurso(cursoId);
    }
  }

  return (
    <div className="tela-matriculas tela-inscricoes">
      <header className="cabecalho-pagina">
        <div>
          <h2 className="cabecalho-pagina__titulo">Inscrições</h2>
          <p className="cabecalho-pagina__subtitulo">
            O aluno entra no curso sozinho, de graça ou comprando. Acompanhe quem entrou, quem terminou e o que foi vendido.
          </p>
        </div>
      </header>

      {erro ? <InlineMessage tone="erro">{erro}</InlineMessage> : null}

      <div className="grade-estatisticas grade-estatisticas--compacta-5" style={{ marginBottom: "var(--espaco-lg)" }}>
        <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbUsers size={22} />} rotulo="Inscrições" valor={resumo.totalInscritos} />
        <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbPlayerPlay size={22} />} rotulo={`Começaram · ${resumo.percentualComecaram}%`} valor={resumo.totalComecaram} />
        <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbCircleCheck size={22} />} rotulo={`Concluíram · ${resumo.percentualConcluiram}%`} valor={resumo.totalConcluiram} />
        <CartaoEstatistica corBorda="var(--cor-aviso)" icone={<TbMedal size={22} />} rotulo="Certificados emitidos" valor={resumo.totalComCertificado} />
        <CartaoEstatistica
          corBorda="var(--cor-marca)"
          icone={<TbCurrencyReal size={22} />}
          rotulo={`Receita (simulada) · ${resumo.totalPendentes} pendente${resumo.totalPendentes === 1 ? "" : "s"}`}
          valor={formatMoney(resumo.totalReceita)}
        />
      </div>

      <div className="inscricoes-filtros">
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

        <div className="inscricoes-filtros__periodo">
          <label className="visualmente-oculto" htmlFor="inscricoes-filtro-periodo">Período</label>
          <SelectSimples id="inscricoes-filtro-periodo" onChange={setPeriodo} opcoes={OPCOES_PERIODO_INSCRICOES} value={periodo} />
        </div>
      </div>

      {carregando ? (
        <p className="texto-vazio" role="status">Carregando inscrições...</p>
      ) : inscricoesFiltradas.length === 0 ? (
        <EmptyState message="Nenhum curso encontrado para esse filtro." />
      ) : ehCelular ? (
        <ul aria-label="Inscrições por curso" className="inscricoes-cartoes" role="list">
          {inscricoesFiltradas.map((inscricao) => (
            <li
              aria-label={`Abrir ${inscricao.titulo}`}
              className="inscricoes-cartao"
              key={inscricao.cursoId}
              onClick={() => abrirCurso(inscricao.cursoId)}
              onKeyDown={(event) => aoPressionarTeclaNaLinha(event, inscricao.cursoId)}
              role="button"
              tabIndex={0}
            >
              <strong className="inscricoes-cartao__titulo">{inscricao.titulo}</strong>
              <BadgesCursoInscricoes inscricao={inscricao} />
              <BarraFunilInscricoes inscricao={inscricao} />
              <p className="inscricoes-cartao__linha-dados">
                {inscricao.modeloCurso === MODELO_GRATUITO ? "Grátis" : formatMoney(inscricao.preco)}
                {" · "}
                {inscricao.inscritos} inscrito{inscricao.inscritos === 1 ? "" : "s"}
                {" · "}
                <span className={inscricao.pendentes > 0 ? "inscricoes-pendentes inscricoes-pendentes--destaque" : "inscricoes-pendentes"}>
                  {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : inscricao.pendentes} pendente{inscricao.pendentes === 1 ? "" : "s"}
                </span>
                {" · "}
                {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : formatMoney(inscricao.receita)}
              </p>
            </li>
          ))}
          <li className="inscricoes-cartao inscricoes-cartao--total">
            <strong>Total · {inscricoesFiltradas.length} curso{inscricoesFiltradas.length === 1 ? "" : "s"}</strong>
            <p className="inscricoes-cartao__linha-dados">
              {resumo.totalInscritos} inscrito{resumo.totalInscritos === 1 ? "" : "s"} · {resumo.totalPendentes} pendente{resumo.totalPendentes === 1 ? "" : "s"} · {formatMoney(resumo.totalReceita)}
            </p>
          </li>
          <LegendaFunilInscricoes />
        </ul>
      ) : (
        <div className="tabela-dados-container painel-secao">
          <table aria-label="Inscrições por curso" className="tabela-dados tabela-dados--inscricoes">
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Preço</th>
                <th scope="col">Inscritos</th>
                <th scope="col">Funil: começaram › concluíram › certificado</th>
                <th scope="col">Pendentes</th>
                <th scope="col">Receita</th>
                <th aria-hidden="true" scope="col" />
              </tr>
            </thead>
            <tbody>
              {inscricoesFiltradas.map((inscricao) => (
                <tr
                  className="tabela-linha-clicavel"
                  key={inscricao.cursoId}
                  onClick={() => abrirCurso(inscricao.cursoId)}
                  onKeyDown={(event) => aoPressionarTeclaNaLinha(event, inscricao.cursoId)}
                  tabIndex={0}
                >
                  <td data-label="Curso">
                    <strong>{inscricao.titulo}</strong>
                    <br />
                    <BadgesCursoInscricoes inscricao={inscricao} />
                  </td>
                  <td data-label="Preço">{inscricao.modeloCurso === MODELO_GRATUITO ? "Grátis" : formatMoney(inscricao.preco)}</td>
                  <td data-label="Inscritos">{inscricao.inscritos}</td>
                  <td data-label="Funil">
                    <BarraFunilInscricoes inscricao={inscricao} />
                  </td>
                  <td data-label="Pendentes">
                    <span className={inscricao.pendentes > 0 ? "inscricoes-pendentes inscricoes-pendentes--destaque" : "inscricoes-pendentes"}>
                      {inscricao.modeloCurso === MODELO_GRATUITO ? "—" : inscricao.pendentes}
                    </span>
                  </td>
                  <td data-label="Receita">{inscricao.modeloCurso === MODELO_GRATUITO ? "—" : formatMoney(inscricao.receita)}</td>
                  <td aria-hidden="true" data-label="">
                    <TbChevronRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total · {inscricoesFiltradas.length} curso{inscricoesFiltradas.length === 1 ? "" : "s"}</strong></td>
                <td>{resumo.totalInscritos}</td>
                <td />
                <td>{resumo.totalPendentes}</td>
                <td>{formatMoney(resumo.totalReceita)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <LegendaFunilInscricoes />
        </div>
      )}
    </div>
  );
}
