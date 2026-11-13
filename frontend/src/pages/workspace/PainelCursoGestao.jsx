import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbAlertTriangle,
  TbAward,
  TbBan,
  TbCamera,
  TbCertificate,
  TbChartBar,
  TbChevronDown,
  TbCircleCheck,
  TbDotsVertical,
  TbInfoCircle,
  TbLock,
  TbLockOpen,
  TbPencil,
  TbTag,
  TbTarget,
  TbTrophy,
  TbUserCheck,
  TbUsers
} from "react-icons/tb";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import BlocoProfessoresCurso from "../../components/BlocoProfessoresCurso.jsx";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import DetalheModuloDesempenho from "../../components/DetalheModuloDesempenho.jsx";
import Insignia from "../../components/Insignia.jsx";
import ModaisModulo from "../../components/ModaisModulo.jsx";
import Modal from "../../components/Modal.jsx";
import ModalPrepararVenda from "../../components/ModalPrepararVenda.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useModaisModulo } from "../../hooks/useModaisModulo.js";
import { useProfessoresCurso } from "../../hooks/useProfessoresCurso.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatDayMonth, formatGrade, formatMoney, formatPercent, normalizeTipoAvaliacao } from "../../lib/format.js";

const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;
const MODELO_ACOMPANHADO = 3;
const TIPO_AVALIACAO_QUIZ = 1;
const STATUS_ARQUIVADO = 3;
const ROTULOS_MODELO_CURSO = { 1: "Gratuito", 2: "Pago", 3: "Acompanhado" };

function ordenarPorCriacao(moduloA, moduloB) {
  const dataA = new Date(moduloA.dataCriacao || 0).getTime();
  const dataB = new Date(moduloB.dataCriacao || 0).getTime();
  return dataA - dataB || Number(moduloA.id) - Number(moduloB.id);
}

/* Tela unica do curso, compartilhada entre Coordenador e Admin (rodada 1:
   "fluxo do coordenador: tela unica do curso"; rodada 2: ajustes de topo/
   abas/breadcrumb/quiz; rodada 3: Admin ganha a mesma tela, ver
   docs/fluxo-coordenador/ e docs/fluxo-admin/). Renderizada por SecaoCursos
   quando ha curso aberto - os modais de editar curso, foto de capa e
   atribuir coordenador continuam la (modaisComuns), SecaoCursos so passa os
   callbacks. `perfil`("Coordenador" default | "Admin") liga as acoes
   exclusivas de cada papel: Admin ganha Foto de capa e atribuir Coordenador;
   Encerrar/Reabrir continua so do Coordenador (regra de negocio, nao de UI).
   Admin NAO tem mais "Novo modulo" aqui (ajuste de responsabilidades - a
   trilha de modulos e so do Professor agora, ver
   docs/permissoes/PROMPT-agente-ajuste-responsabilidades-perfis.md); Admin e
   Coordenador continuam editando/excluindo modulo pelo menu ⋮. Busca o
   desempenho do curso aqui dentro (GET /Cursos/{id}/desempenho),
   independente do snapshot global. */
export default function PainelCursoGestao({
  coordenadores = [],
  curso,
  modulos,
  onAlterarFotoCurso,
  onAtribuirCoordenador,
  onEditarCurso,
  onEncerrarCurso,
  onReabrirCurso,
  onRefresh,
  onSessionExpired,
  onVoltar,
  perfil = "Coordenador",
  professores,
  salvandoCurso
}) {
  const ehAdmin = perfil === "Admin";
  const { mostrarToast } = useToast();
  const [desempenho, setDesempenho] = useState(null);
  const [carregandoDesempenho, setCarregandoDesempenho] = useState(true);
  const [erroDesempenho, setErroDesempenho] = useState("");
  const [tentativaRecarga, setTentativaRecarga] = useState(0);
  const [moduloAbertoId, setModuloAbertoId] = useState(null);
  const [avaliacaoAbertaId, setAvaliacaoAbertaId] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("modulos");
  const [modalProfessoresAberto, setModalProfessoresAberto] = useState(false);
  const [modalPrepararVendaAberto, setModalPrepararVendaAberto] = useState(false);
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false);
  const [processandoConfirmacaoCiclo, setProcessandoConfirmacaoCiclo] = useState(false);
  const refAbas = useRef(null);
  const abasTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbas);

  useEffect(() => {
    let ativo = true;
    setCarregandoDesempenho(true);
    setErroDesempenho("");

    apiRequest(`/Cursos/${curso.id}/desempenho`)
      .then((dados) => {
        if (ativo) {
          setDesempenho(dados);
        }
      })
      .catch((err) => {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErroDesempenho(err.message || "Nao foi possivel carregar o desempenho do curso agora.");
      })
      .finally(() => {
        if (ativo) {
          setCarregandoDesempenho(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [curso.id, onSessionExpired, tentativaRecarga]);

  function recarregarDesempenho() {
    setTentativaRecarga((atual) => atual + 1);
  }

  const modulosOrdenados = useMemo(
    () => modulos.filter((modulo) => Number(modulo.cursoId) === Number(curso.id)).slice().sort(ordenarPorCriacao),
    [curso.id, modulos]
  );

  // Quiz vs Prova/Exercicio ligado a modulo (rodada 2, item 5): o bloco do
  // modulo conta/lista so quiz nao arquivado, pra bater com a contagem do
  // Professor (SecaoConteudosProfessor.jsx). Qualquer avaliacao NAO-quiz
  // vinculada a um modulo (Prova/Exercicio) nao pode sumir da tela - entra
  // na aba "Avaliacoes do curso", junto das que ja vem soltas no DTO
  // (avaliacoesSemModulo).
  const modulosComQuizFiltrado = useMemo(() => {
    const mapa = new Map();
    (desempenho?.modulos || []).forEach((moduloDesempenho) => {
      const quizzesNaoArquivados = moduloDesempenho.avaliacoes.filter(
        (avaliacao) => Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ && Number(avaliacao.statusPublicacao) !== STATUS_ARQUIVADO
      );
      mapa.set(moduloDesempenho.moduloId, { ...moduloDesempenho, avaliacoes: quizzesNaoArquivados });
    });
    return mapa;
  }, [desempenho]);

  const avaliacoesDoCurso = useMemo(() => {
    const ligadasAModulo = (desempenho?.modulos || []).flatMap((moduloDesempenho) =>
      moduloDesempenho.avaliacoes.filter((avaliacao) => Number(avaliacao.tipoAvaliacao) !== TIPO_AVALIACAO_QUIZ)
    );
    return [...(desempenho?.avaliacoesSemModulo || []), ...ligadasAModulo];
  }, [desempenho]);

  const mostrarAbaAvaliacoes = avaliacoesDoCurso.length > 0;

  const modais = useModaisModulo({
    cursoFixoId: curso.id,
    mostrarToast,
    onSalvo: () => {
      onRefresh?.();
      recarregarDesempenho();
    },
    onSessionExpired
  });

  const professoresCurso = useProfessoresCurso({ cursoId: curso.id, mostrarToast, onRefresh, onSessionExpired, professores });

  useEffect(() => {
    if (menuAbertoId === null) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }

      setMenuAbertoId(null);
    }

    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [menuAbertoId]);

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

  function alternarAvaliacaoDoCurso(avaliacaoId) {
    setAvaliacaoAbertaId((atual) => (atual === avaliacaoId ? null : avaliacaoId));
  }

  function abrirExclusaoModulo(modulo) {
    modais.abrirExclusaoModulo(modulo);
    setMenuAbertoId(null);
  }

  // Encerrar/Reabrir agora passam por confirmacao (PROMPT-agente-confirmacao-
  // encerrar-curso.md) - onEncerrarCurso/onReabrirCurso (SecaoCursos.jsx)
  // nunca rejeitam a promise, ja tratam sucesso/erro com toast proprio
  // (executarAcaoCurso); por isso a janela sempre fecha ao final dos dois
  // casos, sem precisar saber o resultado.
  async function confirmarEncerramento() {
    setProcessandoConfirmacaoCiclo(true);
    await onEncerrarCurso();
    setProcessandoConfirmacaoCiclo(false);
    setConfirmandoEncerrar(false);
  }

  async function confirmarReabertura() {
    setProcessandoConfirmacaoCiclo(true);
    await onReabrirCurso();
    setProcessandoConfirmacaoCiclo(false);
    setConfirmandoReabrir(false);
  }

  function fecharConfirmacaoEncerrar() {
    if (processandoConfirmacaoCiclo) {
      return;
    }

    setConfirmandoEncerrar(false);
  }

  function fecharConfirmacaoReabrir() {
    if (processandoConfirmacaoCiclo) {
      return;
    }

    setConfirmandoReabrir(false);
  }

  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;
  const ehGratuito = Number(curso.modeloCurso) === MODELO_GRATUITO;
  const ehPagoPacote = Number(curso.modeloCurso) === MODELO_PAGO_PACOTE;
  // Acompanhado/Gratuito sempre tem o ciclo concluir->encerrar->reabrir; um
  // PagoPacote so entra nele se veio do fluxo Gratuito->pacote
  // (concluidoPeloProfessorEm preenchido) - um pacote criado direto pelo
  // Admin nunca passa por aqui.
  const temCicloDeEncerramento = ehAcompanhado || ehGratuito || (ehPagoPacote && Boolean(curso.concluidoPeloProfessorEm));
  const pacoteTravadoNaVenda = ehPagoPacote && Boolean(curso.publicadoParaVendaEm);
  // Round 6 (plano fluxo-venda-cursos): Gratuito encerrado abre a janela pra
  // virar pacote; PagoPacote (criado direto ou ja convertido) reabre a mesma
  // janela pra editar preco/descricao e alternar Colocar/Tirar da venda -
  // ModalPrepararVenda.jsx ja adapta o rotulo do botao de venda sozinho.
  const podeGerenciarVenda = ehAdmin && (ehPagoPacote || (ehGratuito && Boolean(curso.encerradoEm)));
  const coordenadorDoCurso = ehAdmin && curso.coordenadorId ? coordenadores.find((coordenador) => coordenador.id === curso.coordenadorId) : null;
  const rotuloModeloCurso = ROTULOS_MODELO_CURSO[Number(curso.modeloCurso)] || "—";

  return (
    <div className="conteudos-aluno">
      <BotaoVoltar destino="Cursos" onClick={onVoltar} />

      <header className="atividades-curso__cabecalho">
        <div className="atividades-curso__cabecalho-principal">
          <h2 className="atividades-curso__titulo">{curso.titulo}</h2>
          <p className="atividades-curso__subtitulo">
            {ehAdmin ? (
              <>
                {curso.codigoRegistro || "Sem codigo"}
                {` · ${coordenadorDoCurso ? `Coordenacao: ${coordenadorDoCurso.nome}` : "Sem coordenacao"}`}
                {` · ${rotuloModeloCurso}`}
                {` · ${formatMoney(curso.preco)}`}
              </>
            ) : (
              <>
                {curso.codigoRegistro || "Sem codigo"}
                {curso.descricao ? ` · ${curso.descricao}` : ""}
              </>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--espaco-sm)", marginTop: "var(--espaco-sm)" }}>
            <Botao onClick={onEditarCurso} tamanho="pequeno" variante="secundario">
              <TbPencil aria-hidden="true" size={16} /> Editar curso
            </Botao>
            {ehAdmin ? (
              <Botao onClick={onAlterarFotoCurso} tamanho="pequeno" variante="secundario">
                <TbCamera aria-hidden="true" size={16} /> Foto de capa
              </Botao>
            ) : null}
            <Botao onClick={() => setModalProfessoresAberto(true)} tamanho="pequeno" variante="secundario">
              <TbUsers aria-hidden="true" size={16} /> Professores ({professoresCurso.professoresDoCurso.length})
            </Botao>
            {ehAdmin ? (
              <Botao onClick={onAtribuirCoordenador} tamanho="pequeno" variante={coordenadorDoCurso ? "secundario" : "primario"}>
                <TbUserCheck aria-hidden="true" size={16} /> {coordenadorDoCurso ? "Coordenador" : "Atribuir coordenador"}
              </Botao>
            ) : null}
            {podeGerenciarVenda ? (
              <Botao onClick={() => setModalPrepararVendaAberto(true)} tamanho="pequeno" variante="primario">
                <TbTag aria-hidden="true" size={16} /> {ehPagoPacote ? "Gerenciar venda" : "Preparar para venda"}
              </Botao>
            ) : null}
            {!ehAdmin && temCicloDeEncerramento && curso.concluidoPeloProfessorEm && !curso.encerradoEm ? (
              <Botao disabled={salvandoCurso} onClick={() => setConfirmandoEncerrar(true)} tamanho="pequeno" variante="primario">
                <TbLock aria-hidden="true" size={16} /> Encerrar curso
              </Botao>
            ) : null}
            {!ehAdmin && temCicloDeEncerramento && curso.encerradoEm ? (
              <Botao
                disabled={salvandoCurso || pacoteTravadoNaVenda}
                onClick={() => setConfirmandoReabrir(true)}
                tamanho="pequeno"
                variante="secundario"
                title={pacoteTravadoNaVenda ? "Tire o curso da venda antes de reabrir." : undefined}
              >
                <TbLockOpen aria-hidden="true" size={16} /> Reabrir curso
              </Botao>
            ) : null}
            {temCicloDeEncerramento ? (
              <Insignia
                texto={curso.encerradoEm ? "Encerrado" : curso.concluidoPeloProfessorEm ? "Aguardando encerramento" : "Em andamento"}
              />
            ) : null}
          </div>
        </div>

        <div className="atividades-curso__kpis-compactos">
          <CartaoEstatistica icone={<TbUsers size={20} />} rotulo="Alunos" valor={desempenho ? desempenho.totalAlunos : "—"} />
          <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={20} />} rotulo="Progresso" valor={desempenho ? formatPercent(desempenho.progressoMedio) : "—"} />
          <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCertificate size={20} />} rotulo="Certificados" valor={desempenho ? `${desempenho.certificadosEmitidos} de ${desempenho.totalAlunos}` : "—"} />
          <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbAward size={20} />} rotulo="Media" valor={desempenho ? formatGrade(desempenho.desempenhoMedio) : "—"} />
        </div>
      </header>

      {erroDesempenho ? <InlineMessage tone="error">{erroDesempenho}</InlineMessage> : null}

      <nav
        aria-label="Secoes do curso"
        className={`abas-matriculas${abasTemConteudoEscondido ? " abas-matriculas--mais-a-direita" : ""}`}
        ref={refAbas}
        role="tablist"
      >
        <button
          aria-selected={abaAtiva === "modulos"}
          className={`abas-matriculas__aba${abaAtiva === "modulos" ? " abas-matriculas__aba--ativa" : ""}`}
          onClick={() => setAbaAtiva("modulos")}
          role="tab"
          type="button"
        >
          Modulos <span className="abas-matriculas__contagem">{modulosOrdenados.length}</span>
        </button>
        {mostrarAbaAvaliacoes ? (
          <button
            aria-selected={abaAtiva === "avaliacoes"}
            className={`abas-matriculas__aba${abaAtiva === "avaliacoes" ? " abas-matriculas__aba--ativa" : ""}`}
            onClick={() => setAbaAtiva("avaliacoes")}
            role="tab"
            type="button"
          >
            Avaliacoes do curso <span className="abas-matriculas__contagem">{avaliacoesDoCurso.length}</span>
          </button>
        ) : null}
      </nav>

      {abaAtiva === "modulos" ? (
        <div aria-label="Modulos do curso" role="tabpanel">
          {modulosOrdenados.length === 0 ? (
            <p className="texto-vazio" role="status">Nenhum modulo cadastrado neste curso.</p>
          ) : (
            <div className="atividades-curso__lista-modulos">
              {modulosOrdenados.map((modulo, indice) => {
                const aberto = moduloAbertoId === modulo.id;
                const idDetalhe = `modulo-coordenador-detalhe-${modulo.id}`;
                const desempenhoModulo = modulosComQuizFiltrado.get(modulo.id) || null;
                const totalConteudos = desempenhoModulo ? desempenhoModulo.materiais.length : modulo.totalConteudos ?? 0;
                const totalQuizzes = desempenhoModulo ? desempenhoModulo.avaliacoes.length : modulo.totalAvaliacoes ?? 0;

                return (
                  <section className="conteudos-modulo conteudos-modulo--gestao conteudos-modulo--cartao" key={modulo.id}>
                    <header className="conteudos-modulo__cabecalho">
                      <h3 className="conteudos-modulo__cabecalho-wrapper">
                        <button
                          aria-controls={idDetalhe}
                          aria-expanded={aberto}
                          className="conteudos-modulo__toggle"
                          onClick={() => alternarModulo(modulo.id)}
                          type="button"
                        >
                          <div className="conteudos-modulo__info">
                            <NumeroModulo indice={indice} />
                            <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                            <span className="conteudos-modulo__contagem">
                              {totalConteudos} conteudo{totalConteudos === 1 ? "" : "s"} · {totalQuizzes} quiz{totalQuizzes === 1 ? "" : "zes"}
                            </span>
                          </div>
                          <div className="conteudos-modulo__progresso-wrapper" style={{ minWidth: "8rem" }}>
                            {desempenhoModulo ? <BarraProgresso percentual={desempenhoModulo.progressoMedio} /> : <span className="texto-vazio">—</span>}
                          </div>
                          <TbChevronDown
                            aria-hidden="true"
                            className={`conteudos-modulo__chevron${aberto ? " conteudos-modulo__chevron--aberto" : ""}`}
                            size="1.1rem"
                          />
                        </button>
                      </h3>

                      <div className="menu-contexto">
                        <button
                          aria-expanded={menuAbertoId === modulo.id}
                          aria-haspopup="true"
                          aria-label={`Opcoes para ${modulo.titulo}`}
                          className="menu-contexto__botao"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuAbertoId((atual) => (atual === modulo.id ? null : modulo.id));
                          }}
                          type="button"
                        >
                          <TbDotsVertical aria-hidden="true" size={18} />
                        </button>
                        {menuAbertoId === modulo.id ? (
                          <ul className="menu-contexto__lista">
                            <li>
                              <button onClick={() => modais.abrirEdicaoModulo(modulo)} type="button">
                                Editar
                              </button>
                            </li>
                            <li>
                              <button className="menu-item--perigo" onClick={() => abrirExclusaoModulo(modulo)} type="button">
                                Excluir
                              </button>
                            </li>
                          </ul>
                        ) : null}
                      </div>
                    </header>

                    <AnimatePresence initial={false}>
                      {aberto ? (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          className="conteudos-modulo__corpo"
                          exit={{ height: 0, opacity: 0 }}
                          id={idDetalhe}
                          initial={{ height: 0, opacity: 0 }}
                          key={`detalhe-modulo-coordenador-${modulo.id}`}
                          style={{ overflow: "hidden" }}
                          transition={{ duration: 0.24, ease: "easeInOut" }}
                        >
                          {desempenhoModulo ? (
                            <DetalheModuloDesempenho contextoCoordenador modulo={desempenhoModulo} separarGrupos />
                          ) : (
                            <p className="texto-vazio" role="status">
                              {carregandoDesempenho ? "Carregando desempenho do modulo..." : "Nao foi possivel carregar o desempenho deste modulo agora."}
                            </p>
                          )}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div aria-label="Avaliacoes do curso" role="tabpanel">
          <div className="atividades-curso__lista-modulos">
            {avaliacoesDoCurso.map((avaliacao, indice) => {
              const avaliacaoAberta = avaliacaoAbertaId === avaliacao.avaliacaoId;
              const idDetalheAvaliacao = `avaliacao-curso-detalhe-${avaliacao.avaliacaoId}`;
              const ehQuizDoCurso = Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ;

              return (
                <section className="conteudos-modulo conteudos-modulo--cartao" key={`avaliacao-curso-${avaliacao.avaliacaoId}`}>
                  <header className="conteudos-modulo__cabecalho">
                    <h3 className="conteudos-modulo__cabecalho-wrapper">
                      <button
                        aria-controls={idDetalheAvaliacao}
                        aria-expanded={avaliacaoAberta}
                        className="conteudos-modulo__toggle"
                        onClick={() => alternarAvaliacaoDoCurso(avaliacao.avaliacaoId)}
                        type="button"
                      >
                        <div className="conteudos-modulo__info">
                          <span aria-hidden="true" className="conteudos-modulo__icone conteudos-modulo__icone--caixa">
                            <TbTrophy size="1.15rem" />
                          </span>
                          <span className="conteudos-modulo__eyebrow">Avaliacao {String(indice + 1).padStart(2, "0")}</span>
                          <span className="conteudos-modulo__titulo">{avaliacao.titulo}</span>
                        </div>
                        <span className="atividades-curso__metrica">
                          {normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)} · {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"}
                        </span>
                        <TbChevronDown
                          aria-hidden="true"
                          className={`conteudos-modulo__chevron${avaliacaoAberta ? " conteudos-modulo__chevron--aberto" : ""}`}
                          size="1.1rem"
                        />
                      </button>
                    </h3>
                  </header>

                  <AnimatePresence initial={false}>
                    {avaliacaoAberta ? (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="conteudos-modulo__corpo"
                        exit={{ height: 0, opacity: 0 }}
                        id={idDetalheAvaliacao}
                        initial={{ height: 0, opacity: 0 }}
                        key={`detalhe-avaliacao-curso-${avaliacao.avaliacaoId}`}
                        style={{ overflow: "hidden" }}
                        transition={{ duration: 0.24, ease: "easeInOut" }}
                      >
                        <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline lista-detalhes--metricas">
                          <div className="lista-detalhes__item">
                            <dt><TbUsers aria-hidden="true" size={15} /> Participantes</dt>
                            <dd>{avaliacao.totalParticipantes || 0}</dd>
                          </div>
                          {ehQuizDoCurso ? (
                            <div className="lista-detalhes__item">
                              <dt><TbTrophy aria-hidden="true" size={15} /> Tipo</dt>
                              <dd>Quiz - formativo, sem nota</dd>
                            </div>
                          ) : (
                            <>
                              <div className="lista-detalhes__item">
                                <dt><TbAward aria-hidden="true" size={15} /> Nota média</dt>
                                <dd>{formatGrade(avaliacao.mediaNota)}</dd>
                              </div>
                              <div className="lista-detalhes__item">
                                <dt><TbTarget aria-hidden="true" size={15} /> Nota máxima</dt>
                                <dd>{formatGrade(avaliacao.notaMaxima)}</dd>
                              </div>
                            </>
                          )}
                          <div className="lista-detalhes__item">
                            <dt><TbCircleCheck aria-hidden="true" size={15} /> Conclusão</dt>
                            <dd>{formatPercent(avaliacao.percentualConclusao)}</dd>
                          </div>
                          <div className="lista-detalhes__item">
                            <dt><TbChartBar aria-hidden="true" size={15} /> Aproveitamento</dt>
                            <dd>{formatPercent(avaliacao.percentualAproveitamento)}</dd>
                          </div>
                        </dl>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {modalPrepararVendaAberto ? (
        <ModalPrepararVenda
          curso={curso}
          onFechar={() => setModalPrepararVendaAberto(false)}
          onSalvo={() => {
            mostrarToast("Curso preparado para venda com sucesso.", "sucesso");
            onRefresh?.();
          }}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

      {confirmandoEncerrar ? (
        <Modal
          onFechar={fecharConfirmacaoEncerrar}
          titulo={
            <span className="linha-icone-texto">
              <TbLock aria-hidden="true" size={18} /> Encerrar "{curso.titulo}"?
            </span>
          }
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={processandoConfirmacaoCiclo} onClick={fecharConfirmacaoEncerrar} variante="fantasma">
                Cancelar
              </Botao>
              <Botao disabled={processandoConfirmacaoCiclo} onClick={confirmarEncerramento} variante="primario">
                {processandoConfirmacaoCiclo ? "Encerrando..." : ehAcompanhado ? "Encerrar e emitir certificados" : "Encerrar curso"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)" }}>
            {curso.concluidoPeloProfessorEm
              ? `O professor concluiu este curso em ${formatDayMonth(curso.concluidoPeloProfessorEm)}. Confira o que acontece ao encerrar:`
              : "Confira o que acontece ao encerrar:"}
          </p>

          <ul className="lista-consequencias">
            <li className="lista-consequencias__item">
              <TbBan aria-hidden="true" className="lista-consequencias__icone" size={18} />
              <p className="lista-consequencias__texto">
                Sai da home e do catálogo; <strong>nenhum aluno novo</strong> consegue entrar.
              </p>
            </li>

            {ehAcompanhado ? (
              <li className="lista-consequencias__item">
                <TbCertificate aria-hidden="true" className="lista-consequencias__icone" size={18} />
                <p className="lista-consequencias__texto">
                  <strong>Os alunos que cumpriram os requisitos recebem o certificado automaticamente.</strong>
                </p>
              </li>
            ) : (
              <li className="lista-consequencias__item">
                <TbCircleCheck aria-hidden="true" className="lista-consequencias__icone" size={18} />
                <p className="lista-consequencias__texto">
                  {desempenho
                    ? <>Os <strong>{desempenho.totalAlunos} alunos matriculados continuam</strong> estudando e podem pedir o certificado.</>
                    : <>Os <strong>alunos matriculados continuam</strong> estudando e podem pedir o certificado.</>}
                </p>
              </li>
            )}

            <li className="lista-consequencias__item">
              <TbLock aria-hidden="true" className="lista-consequencias__icone" size={18} />
              <p className="lista-consequencias__texto">
                Materiais, quizzes e módulos ficam <strong>travados</strong> para edição.
              </p>
            </li>

            {ehGratuito ? (
              // So faz sentido "transformar em pacote pago" pra quem ainda e
              // Gratuito - um PagoPacote reencerrado (veio do fluxo, Admin
              // reabriu/Professor editou/Coordenador reencerra) ja e um
              // pacote, nao tem o que virar.
              <li className="lista-consequencias__item">
                <TbAlertTriangle aria-hidden="true" className="lista-consequencias__icone" size={18} />
                <p className="lista-consequencias__texto">
                  O <strong>Admin é avisado</strong> e pode transformar o curso em pacote pago.
                </p>
              </li>
            ) : null}
          </ul>

          {ehAcompanhado ? (
            <InlineMessage tone="error">
              <TbAlertTriangle aria-hidden="true" size={16} style={{ verticalAlign: "-3px", marginRight: "0.375rem" }} />
              Os certificados emitidos <strong>não são desfeitos</strong>, mesmo se o curso for reaberto.
            </InlineMessage>
          ) : (
            <InlineMessage tone="warning">
              <TbInfoCircle aria-hidden="true" size={16} style={{ verticalAlign: "-3px", marginRight: "0.375rem" }} />
              Dá para <strong>reabrir depois</strong>, enquanto o curso não estiver à venda.
            </InlineMessage>
          )}
        </Modal>
      ) : null}

      {confirmandoReabrir ? (
        <Modal
          onFechar={fecharConfirmacaoReabrir}
          titulo={
            <span className="linha-icone-texto">
              <TbLockOpen aria-hidden="true" size={18} /> Reabrir "{curso.titulo}"?
            </span>
          }
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={processandoConfirmacaoCiclo} onClick={fecharConfirmacaoReabrir} variante="fantasma">
                Cancelar
              </Botao>
              <Botao disabled={processandoConfirmacaoCiclo} onClick={confirmarReabertura} variante="primario">
                {processandoConfirmacaoCiclo ? "Reabrindo..." : "Reabrir curso"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            O conteúdo volta a ser editável pelo professor e o curso volta a aceitar novos alunos.
            {ehAcompanhado ? " Os certificados já emitidos continuam válidos." : ""}
          </p>
        </Modal>
      ) : null}

      {modalProfessoresAberto ? (
        <Modal
          onFechar={() => setModalProfessoresAberto(false)}
          titulo={`Professores de ${curso.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setModalProfessoresAberto(false)} variante="secundario">
                Fechar
              </Botao>
            </footer>
          }
        >
          <BlocoProfessoresCurso confirmarDesvinculo titulo={`Professores de ${curso.titulo}`} {...professoresCurso} />
        </Modal>
      ) : null}

      <ModaisModulo
        cursoFixo={{ titulo: curso.titulo }}
        dadosFormulario={modais.dadosFormulario}
        formularioAberto={modais.formularioAberto}
        mensagemExclusao={modais.mensagemExclusao}
        mensagemFormulario={modais.mensagemFormulario}
        moduloEmEdicaoId={modais.moduloEmEdicaoId}
        moduloParaExcluir={modais.moduloParaExcluir}
        onConfirmarExclusao={modais.confirmarExclusao}
        onFecharExclusao={modais.fecharExclusaoModulo}
        onFecharFormulario={modais.fecharFormulario}
        onSalvarModulo={modais.salvarModulo}
        salvando={modais.salvando}
        setDadosFormulario={modais.setDadosFormulario}
      />
    </div>
  );
}
