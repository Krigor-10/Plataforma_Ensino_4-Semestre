import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbArrowLeft, TbAward, TbChartBar, TbChevronDown, TbCircleCheck, TbDownload, TbUserCheck, TbUsers } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import { EmptyState, InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest, baixarArquivo } from "../../lib/api.js";
import { formatGrade, formatPercent, normalizePublicationStatus } from "../../lib/format.js";

const ROTULO_TIPO_AVALIACAO = { 1: "Quiz", 2: "Prova", 3: "Exercicio" };

function normalizeTipoAvaliacao(tipo) {
  return ROTULO_TIPO_AVALIACAO[tipo] || "Avaliacao";
}

function tomPercentual(percentual) {
  if (percentual >= 70) return "sucesso";
  if (percentual >= 40) return "aviso";
  return "erro";
}

/* TURMAS DO PROFESSOR — analise de desempenho dos cursos e avaliacoes, sem
   nenhuma acao administrativa de turma (isso e exclusivo do Coordenador/Admin
   em SecaoTurmas.jsx). Busca os dados agregados direto do backend em vez de
   depender do snapshot geral, ja que essa tela e a unica consumidora deles. */
export function SecaoTurmasProfessor({ cursoPorId, onSessionExpired }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [turmasDesempenho, setTurmasDesempenho] = useState([]);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState("");
  const [avaliacoesAbertas, setAvaliacoesAbertas] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        setCarregando(true);
        setErro("");
        const dados = await apiRequest("/Turmas/desempenho");

        if (!ativo) {
          return;
        }

        setTurmasDesempenho(dados);
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar o desempenho das turmas agora.");
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

  const turmaSelecionada = useMemo(
    () => turmasDesempenho.find((turma) => turma.turmaId === turmaSelecionadaId) || null,
    [turmaSelecionadaId, turmasDesempenho]
  );

  function selecionarTurma(turmaId) {
    setTurmaSelecionadaId(turmaId);
    setAvaliacoesAbertas(false);
  }

  function voltarParaLista() {
    setTurmaSelecionadaId(null);
  }

  /* Exportacao usa sempre o turmaId da turma selecionada no momento — o
     backend (ObterDesempenhoPorTurmaAsync) so devolve dados dessa turma, ja
     validando que ela pertence ao professor autenticado. */
  async function exportarDesempenho() {
    if (!turmaSelecionada || exportando) {
      return;
    }

    try {
      setExportando(true);
      setErroExportacao("");

      const { blob, nomeArquivo } = await baixarArquivo(`/Turmas/${turmaSelecionada.turmaId}/desempenho/exportar`);

      const urlObjeto = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlObjeto;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlObjeto);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setErroExportacao(err.message || "Nao foi possivel exportar o desempenho agora.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="tela-turmas-professor">
      {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}

      {carregando ? (
        <p className="texto-vazio texto-vazio--central" role="status">Carregando desempenho das turmas...</p>
      ) : !turmaSelecionada ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Progresso</h2>
              <p className="cabecalho-pagina__subtitulo">Analise de desempenho dos cursos e avaliacoes.</p>
            </div>
          </header>

          <GradeCursosProfessor
            cursos={turmasDesempenho.map((turma) => ({
              curso: cursoPorId.get(turma.cursoId) || { id: turma.cursoId, titulo: turma.cursoTitulo, descricao: turma.nomeTurma },
              resumo: `${turma.totalAlunos} aluno${turma.totalAlunos === 1 ? "" : "s"} - ${turma.avaliacoes.length} avaliaca${turma.avaliacoes.length === 1 ? "o" : "oes"}`,
              rodapeEsquerda: `Progresso medio ${formatPercent(turma.progressoMedio)}`,
              badge: `Media ${formatGrade(turma.desempenhoMedio)}`
            }))}
            mensagemVazia="Voce ainda nao tem turmas atribuidas a nenhum curso."
            onSelecionar={(cursoId) => {
              const turma = turmasDesempenho.find((entrada) => entrada.cursoId === cursoId);
              if (turma) {
                selecionarTurma(turma.turmaId);
              }
            }}
          />
        </>
      ) : (
        <>
          <nav aria-label="Navegacao das turmas" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaLista} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Progresso
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{turmaSelecionada.cursoTitulo}</h2>
            </div>
            <Botao disabled={exportando} onClick={exportarDesempenho} variante="secundario">
              <TbDownload aria-hidden="true" size={16} /> {exportando ? "Gerando Excel..." : "Exportar desempenho"}
            </Botao>
          </header>

          {erroExportacao ? <InlineMessage tone="error">{erroExportacao}</InlineMessage> : null}

          <div className="grade-estatisticas turmas-professor__indicadores">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Alunos" valor={turmaSelecionada.totalAlunos} />
            <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbUserCheck size={22} />} rotulo="Ativos" valor={turmaSelecionada.alunosAtivos} />
            <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio" valor={formatPercent(turmaSelecionada.progressoMedio)} />
            <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Taxa de conclusao" valor={formatPercent(turmaSelecionada.percentualConclusao)} />
            <CartaoEstatistica icone={<TbAward size={22} />} rotulo="Desempenho medio" valor={formatGrade(turmaSelecionada.desempenhoMedio)} />
          </div>

          <section aria-label="Avaliacoes" className="painel-secao turmas-professor__secao-avaliacoes">
            <button
              aria-controls="conteudo-avaliacoes-turma"
              aria-expanded={avaliacoesAbertas}
              className="painel-secao__cabecalho turmas-professor__avaliacoes-toggle"
              onClick={() => setAvaliacoesAbertas((atual) => !atual)}
              type="button"
            >
              <span className="painel-secao__titulo">Avaliacoes</span>
              <TbChevronDown
                aria-hidden="true"
                className={`turmas-professor__avaliacoes-chevron${avaliacoesAbertas ? " turmas-professor__avaliacoes-chevron--aberto" : ""}`}
                size={18}
              />
            </button>

            <AnimatePresence initial={false}>
              {avaliacoesAbertas ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  id="conteudo-avaliacoes-turma"
                  initial={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <div className="painel-secao__conteudo turmas-professor__avaliacoes-conteudo">
                    {turmaSelecionada.avaliacoes.length === 0 ? (
                      <EmptyState message="Nenhuma avaliacao cadastrada para este curso ainda." />
                    ) : (
                      <ul aria-label={`Avaliacoes de ${turmaSelecionada.nomeTurma}`} className="turmas-professor__avaliacoes" role="list">
                        {turmaSelecionada.avaliacoes.map((avaliacao) => (
                          <li className="turmas-professor__avaliacao" key={avaliacao.avaliacaoId}>
                            <div className="turmas-professor__avaliacao-cabecalho">
                              <strong className="turmas-professor__avaliacao-titulo">{avaliacao.titulo}</strong>
                              <div className="turmas-professor__avaliacao-badges">
                                <Insignia texto={normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)} variante="neutro" />
                                <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
                              </div>
                            </div>
                            <div className="turmas-professor__avaliacao-metricas">
                              <span>
                                <TbUsers aria-hidden="true" size={14} /> {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"}
                              </span>
                              <span>
                                <TbAward aria-hidden="true" size={14} /> Media {formatGrade(avaliacao.mediaNota)} / {formatGrade(avaliacao.notaMaxima)}
                              </span>
                              {avaliacao.totalParticipantes > 0 ? (
                                <>
                                  <Insignia texto={`${formatPercent(avaliacao.percentualConclusao)} de participacao`} variante={tomPercentual(avaliacao.percentualConclusao)} />
                                  <Insignia texto={`${formatPercent(avaliacao.percentualAproveitamento)} de aproveitamento`} variante={tomPercentual(avaliacao.percentualAproveitamento)} />
                                </>
                              ) : (
                                <Insignia texto="Sem participacao ainda" variante="neutro" />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </>
      )}
    </div>
  );
}
