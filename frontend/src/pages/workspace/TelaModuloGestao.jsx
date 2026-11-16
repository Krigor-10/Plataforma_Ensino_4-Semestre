import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbAward, TbChartBar, TbChevronRight, TbCircleCheck, TbTrophy, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import LeituraItemConteudo from "../../components/LeituraItemConteudo.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useLarguraJanela } from "../../hooks/useLarguraJanela.js";
import { tituloQuizEhGenerico } from "../../lib/trilhaConteudos.js";
import { formatGrade, formatPercent, normalizeContentType } from "../../lib/format.js";

const TIPO_AVALIACAO_QUIZ = 1;
const STATUS_PUBLICADO = 2;

// Abaixo disso a leitura vira tela cheia (sem abrir o 1o item sozinha) -
// docs/fluxo-coordenador/PROMPT-agente-modulo-tela-melhorias.md, item 6.
const LARGURA_MINIMA_LEITURA_FIXA = 768;

function montarItensDoModulo(moduloRevisao) {
  if (!moduloRevisao) {
    return { conteudos: [], quizzes: [] };
  }

  const conteudosPublicados = moduloRevisao.conteudos.filter(
    (conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO
  );

  const quizPorConteudoId = new Map();
  const quizzesSoltos = [];

  moduloRevisao.avaliacoes.forEach(({ avaliacao, questoes }) => {
    if (Number(avaliacao.tipoAvaliacao) !== TIPO_AVALIACAO_QUIZ || Number(avaliacao.statusPublicacao) !== STATUS_PUBLICADO) {
      return;
    }

    const quizResumo = { id: avaliacao.id, titulo: avaliacao.titulo, totalQuestoes: avaliacao.totalQuestoes, questoes };

    if (avaliacao.conteudoDidaticoId) {
      quizPorConteudoId.set(avaliacao.conteudoDidaticoId, quizResumo);
    } else {
      quizzesSoltos.push(quizResumo);
    }
  });

  const conteudos = conteudosPublicados.map((conteudo) => ({
    id: `conteudo-${conteudo.id}`,
    tipo: "material",
    titulo: conteudo.titulo,
    conteudo
  }));

  const quizzes = [];
  conteudosPublicados.forEach((conteudo) => {
    const quizVinculado = quizPorConteudoId.get(conteudo.id);
    if (!quizVinculado) {
      return;
    }

    const titulo = tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo) ? "Quiz do conteúdo" : quizVinculado.titulo;
    quizzes.push({ id: `quiz-${quizVinculado.id}`, tipo: "quiz", titulo, quiz: quizVinculado, questoes: quizVinculado.questoes });
  });
  quizzesSoltos.forEach((quiz) => {
    quizzes.push({ id: `quiz-${quiz.id}`, tipo: "quiz", titulo: quiz.titulo, quiz, questoes: quiz.questoes });
  });

  return { conteudos, quizzes };
}

// Quiz e de fixacao, sem nota - nao faz sentido mostrar "Media" (prompt
// modulo-tela-melhorias.md, achado 5).
function metricaQuiz(metricaQuizPorId, quiz) {
  const metrica = metricaQuizPorId.get(quiz.id);
  if (!metrica) {
    return "—";
  }

  const total = metrica.totalParticipantes || 0;
  if (total === 0) {
    return "Nenhum participante ainda";
  }

  return `${total} participante${total === 1 ? "" : "s"}`;
}

/* Tela do modulo (Admin/Coordenador) - docs/fluxo-coordenador/PROMPT-agente-
   modulo-tela-propria.md (fluxo original) + PROMPT-agente-modulo-tela-
   melhorias.md (relevo, leitura ocupando o lado direito inteiro,
   responsividade 1024/768). Mostrada por PainelCursoGestao.jsx no lugar do
   conteudo normal do curso quando ha moduloIdSelecionado. A lista vem de
   GET /Cursos/{id}/revisao-conteudo (so publicado, carregado uma vez e
   reaproveitado pelo curso inteiro - ver PainelCursoGestao); as metricas vem
   do /desempenho que o curso ja carrega, ligadas por conteudoDidaticoId/
   avaliacaoId. */
export default function TelaModuloGestao({
  curso,
  desempenho,
  erroRevisaoConteudo,
  modulosOrdenados,
  moduloId,
  onNavigate,
  onTentarNovamenteRevisaoConteudo,
  revisaoConteudo,
  revisaoConteudoCarregando
}) {
  const [itemAbertoId, setItemAbertoId] = useState(null);
  const larguraJanela = useLarguraJanela();
  const leituraFixa = larguraJanela >= LARGURA_MINIMA_LEITURA_FIXA;

  useEffect(() => {
    setItemAbertoId(null);
  }, [moduloId]);

  useEffect(() => {
    if (!itemAbertoId || leituraFixa) {
      return undefined;
    }

    function fecharComEsc(evento) {
      if (evento.key === "Escape") {
        setItemAbertoId(null);
      }
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [itemAbertoId, leituraFixa]);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;
  const moduloAnterior = indiceModuloAtual > 0 ? modulosOrdenados[indiceModuloAtual - 1] : null;
  const moduloProximo =
    indiceModuloAtual >= 0 && indiceModuloAtual < modulosOrdenados.length - 1 ? modulosOrdenados[indiceModuloAtual + 1] : null;

  const desempenhoModulo = useMemo(
    () => desempenho?.modulos?.find((modulo) => modulo.moduloId === moduloId) || null,
    [desempenho, moduloId]
  );

  const metricaQuizPorId = useMemo(
    () => new Map((desempenhoModulo?.avaliacoes || []).map((avaliacao) => [avaliacao.avaliacaoId, avaliacao])),
    [desempenhoModulo]
  );

  const moduloRevisao = useMemo(
    () => revisaoConteudo?.modulos.find((modulo) => modulo.id === moduloId) || null,
    [revisaoConteudo, moduloId]
  );
  const { conteudos, quizzes } = useMemo(() => montarItensDoModulo(moduloRevisao), [moduloRevisao]);
  const itensOrdenados = useMemo(() => [...conteudos, ...quizzes], [conteudos, quizzes]);

  // No desktop/tablet a leitura nunca fica vazia: ao entrar no modulo (ou
  // trocar pra outro) o 1o item ja abre sozinho. No celular isso nao
  // acontece - o usuario escolhe o item na lista (prompt, item 5 e 6).
  useEffect(() => {
    if (!leituraFixa || itemAbertoId || itensOrdenados.length === 0) {
      return;
    }

    setItemAbertoId(itensOrdenados[0].id);
  }, [itemAbertoId, itensOrdenados, leituraFixa]);

  const indiceItemAberto = itensOrdenados.findIndex((item) => item.id === itemAbertoId);
  const itemAberto = indiceItemAberto >= 0 ? itensOrdenados[indiceItemAberto] : null;
  const itemAnterior = indiceItemAberto > 0 ? itensOrdenados[indiceItemAberto - 1] : null;
  const itemProximo =
    indiceItemAberto >= 0 && indiceItemAberto < itensOrdenados.length - 1 ? itensOrdenados[indiceItemAberto + 1] : null;

  function voltarParaModulos() {
    onNavigate(`/app/cursos/${curso.id}`);
  }

  function irParaModulo(id) {
    onNavigate(`/app/cursos/${curso.id}/modulos/${id}`);
  }

  if (!moduloAtual) {
    return null;
  }

  const semConteudoPublicado = !revisaoConteudoCarregando && !erroRevisaoConteudo && conteudos.length === 0 && quizzes.length === 0;
  const totalConteudos = conteudos.length;
  const totalQuizzes = quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"} · módulo ${indiceModuloAtual + 1} de ${modulosOrdenados.length}`;

  return (
    <div className="modulo-gestao">
      <BotaoVoltar destino="Módulos" onClick={voltarParaModulos} />

      <nav aria-label="Caminho até o módulo" className="modulo-gestao__migalha">
        <button onClick={() => onNavigate("/app/cursos")} type="button">
          Cursos
        </button>
        <span aria-hidden="true">›</span>
        <button onClick={voltarParaModulos} title={curso.titulo} type="button">
          {curso.titulo}
        </button>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{moduloAtual.titulo}</span>
      </nav>

      <header className="modulo-gestao__cabecalho">
        <div className="modulo-gestao__cabecalho-principal">
          <h2 className="modulo-gestao__titulo">
            <NumeroModulo indice={indiceModuloAtual} /> {moduloAtual.titulo}
          </h2>
          <p className="modulo-gestao__resumo">{resumoModulo}</p>
        </div>

        <div className="atividades-curso__kpis-compactos modulo-gestao__kpis">
          <CartaoEstatistica
            corBorda="var(--cor-info)"
            icone={<TbChartBar size={20} />}
            rotulo="Progresso"
            valor={desempenhoModulo ? formatPercent(desempenhoModulo.progressoMedio) : "—"}
          />
          <CartaoEstatistica
            icone={<TbCircleCheck size={20} />}
            rotulo="Conclusão"
            valor={desempenhoModulo ? formatPercent(desempenhoModulo.percentualConclusao) : "—"}
          />
          <CartaoEstatistica
            corBorda="var(--cor-sucesso)"
            icone={<TbAward size={20} />}
            rotulo={larguraJanela < 480 ? "Média" : "Desempenho médio"}
            valor={desempenhoModulo ? formatGrade(desempenhoModulo.desempenhoMedio) : "—"}
          />
        </div>
      </header>

      {revisaoConteudoCarregando ? (
        <p className="texto-vazio" role="status">Carregando módulo…</p>
      ) : erroRevisaoConteudo ? (
        <>
          <InlineMessage tone="error">{erroRevisaoConteudo}</InlineMessage>
          <Botao onClick={onTentarNovamenteRevisaoConteudo} tamanho="pequeno" variante="secundario">
            Tentar de novo
          </Botao>
        </>
      ) : semConteudoPublicado ? (
        <p className="texto-vazio" role="status">Este módulo ainda não tem conteúdo publicado.</p>
      ) : (
        <div className={`modulo-gestao__corpo${itemAberto ? " modulo-gestao__corpo--item-aberto" : ""}`}>
          <div className="modulo-gestao__lista">
            {conteudos.length > 0 ? (
              <section aria-label={`Conteúdos (${conteudos.length})`}>
                <h3 className="modulo-gestao__secao-titulo">
                  Conteúdos <span className="modulo-gestao__secao-contagem">{conteudos.length}</span>
                </h3>
                <ul className="atividades-curso__lista" role="list">
                  {conteudos.map((item) => (
                    <li className="atividades-curso__item modulo-gestao__item-cartao" key={item.id}>
                      <button
                        aria-current={itemAberto?.id === item.id ? "true" : undefined}
                        className="atividades-curso__linha atividades-curso__linha--acionavel"
                        onClick={() => setItemAbertoId(item.id)}
                        type="button"
                      >
                        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--conteudo">
                          {obterIconeTipoConteudo(item.conteudo.tipoConteudo)}
                        </span>
                        <div className="atividades-curso__corpo">
                          <strong className="atividades-curso__item-titulo">{item.titulo}</strong>
                          <p className="atividades-curso__meta">
                            <span>{normalizeContentType(item.conteudo.tipoConteudo)}</span>
                          </p>
                        </div>
                        <TbChevronRight aria-hidden="true" className="atividades-curso__chevron" size="1.1rem" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {quizzes.length > 0 ? (
              <section aria-label={`Quizzes (${quizzes.length})`}>
                <h3 className="modulo-gestao__secao-titulo">
                  Quizzes <span className="modulo-gestao__secao-contagem">{quizzes.length}</span>
                </h3>
                <ul className="atividades-curso__lista" role="list">
                  {quizzes.map((item) => (
                    <li className="atividades-curso__item atividades-curso__item--quiz modulo-gestao__item-cartao" key={item.id}>
                      <button
                        aria-current={itemAberto?.id === item.id ? "true" : undefined}
                        className="atividades-curso__linha atividades-curso__linha--acionavel"
                        onClick={() => setItemAbertoId(item.id)}
                        type="button"
                      >
                        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                          <TbTrophy size="1.75rem" />
                        </span>
                        <div className="atividades-curso__corpo">
                          <strong className="atividades-curso__item-titulo">{item.titulo}</strong>
                          <p className="atividades-curso__meta">
                            <span>
                              Quiz · {item.quiz.totalQuestoes || 0} {item.quiz.totalQuestoes === 1 ? "questão" : "questões"}
                            </span>
                          </p>
                        </div>
                        <TbChevronRight aria-hidden="true" className="atividades-curso__chevron" size="1.1rem" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div aria-label="Leitura do item selecionado" className="modulo-gestao__painel">
            {itemAberto ? (
              <>
                <div className="modulo-gestao__painel-topo">
                  <button className="modulo-gestao__voltar-painel" onClick={() => setItemAbertoId(null)} type="button">
                    <TbArrowLeft aria-hidden="true" size={16} /> Voltar ao módulo
                  </button>
                  <button aria-label="Fechar" className="modulo-gestao__fechar-painel" onClick={() => setItemAbertoId(null)} type="button">
                    <TbX aria-hidden="true" size={18} />
                  </button>
                </div>

                <LeituraItemConteudo
                  item={itemAberto}
                  meta={
                    itemAberto.tipo === "quiz"
                      ? `Quiz · ${itemAberto.quiz.totalQuestoes || 0} ${itemAberto.quiz.totalQuestoes === 1 ? "questão" : "questões"} · ${metricaQuiz(metricaQuizPorId, itemAberto.quiz)}`
                      : undefined
                  }
                  moduloIndice={indiceModuloAtual}
                  moduloTitulo={moduloAtual.titulo}
                  questoes={itemAberto.questoes}
                />

                <footer className="modal-rodape modulo-gestao__painel-rodape">
                  <Botao
                    disabled={!itemAnterior}
                    onClick={() => itemAnterior && setItemAbertoId(itemAnterior.id)}
                    type="button"
                    variante="secundario"
                  >
                    <TbArrowLeft aria-hidden="true" size={16} />
                    <span className="modulo-gestao__painel-rodape-texto">
                      {itemAnterior ? `Item anterior: ${itemAnterior.titulo}` : "Item anterior"}
                    </span>
                  </Botao>
                  <span className="modulo-gestao__painel-rodape-contador">
                    Item {indiceItemAberto + 1} de {itensOrdenados.length}
                  </span>
                  <Botao
                    disabled={!itemProximo}
                    onClick={() => itemProximo && setItemAbertoId(itemProximo.id)}
                    type="button"
                    variante="primario"
                  >
                    <span className="modulo-gestao__painel-rodape-texto">
                      {itemProximo ? `Próximo item: ${itemProximo.titulo}` : "Próximo item"}
                    </span>
                    <TbArrowRight aria-hidden="true" size={16} />
                  </Botao>
                </footer>
              </>
            ) : (
              <p className="texto-vazio" role="status">Escolha um conteúdo ou quiz para ver aqui.</p>
            )}
          </div>
        </div>
      )}

      <footer className="modulo-gestao__rodape">
        <Botao disabled={!moduloAnterior} onClick={() => moduloAnterior && irParaModulo(moduloAnterior.id)} variante="secundario">
          <TbArrowLeft aria-hidden="true" size={16} /> Módulo anterior
        </Botao>
        <Botao disabled={!moduloProximo} onClick={() => moduloProximo && irParaModulo(moduloProximo.id)} variante="primario">
          {moduloProximo ? `Próximo módulo: ${moduloProximo.titulo}` : "Próximo módulo"} <TbArrowRight aria-hidden="true" size={16} />
        </Botao>
      </footer>
    </div>
  );
}
