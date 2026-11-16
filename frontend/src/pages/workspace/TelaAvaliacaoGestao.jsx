import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbAward, TbChartBar, TbCircleCheck, TbUsers } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GabaritoQuestoes from "../../components/GabaritoQuestoes.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { formatDayMonth, formatGrade, formatPercent, normalizeTipoAvaliacao } from "../../lib/format.js";

function encontrarEntradaRevisao(revisaoConteudo, avaliacaoId) {
  if (!revisaoConteudo) {
    return null;
  }

  const doModulo = revisaoConteudo.modulos
    .flatMap((modulo) => modulo.avaliacoes)
    .find((entrada) => entrada.avaliacao.id === avaliacaoId);
  if (doModulo) {
    return doModulo;
  }

  return revisaoConteudo.avaliacoesSemModulo.find((entrada) => entrada.avaliacao.id === avaliacaoId) || null;
}

function resumoPeriodo(avaliacao) {
  const abertura = formatDayMonth(avaliacao.dataAbertura);
  const fechamento = formatDayMonth(avaliacao.dataFechamento);

  if (abertura && fechamento) {
    return `Aberta de ${abertura} a ${fechamento}`;
  }
  if (abertura) {
    return `Abre em ${abertura}`;
  }
  if (fechamento) {
    return `Fecha em ${fechamento}`;
  }
  return null;
}

// Uma linha so, no lugar das pilulas da ficha + do "avaliacao X de Y" (que
// ja repetia o caminho e o pe de pagina) - docs/fluxo-coordenador/PROMPT-
// agente-avaliacao-tela-limpa.md, item 3.
function montarResumo(avaliacaoResumo, avaliacaoCompleta, totalQuestoes) {
  const partes = [normalizeTipoAvaliacao(avaliacaoResumo.tipoAvaliacao), `${totalQuestoes} questõe${totalQuestoes === 1 ? "" : "s"}`];

  if (avaliacaoCompleta) {
    partes.push(`Nota máxima ${formatGrade(avaliacaoCompleta.notaMaxima)}`);
    partes.push(avaliacaoCompleta.tempoLimiteMinutos ? `Tempo ${avaliacaoCompleta.tempoLimiteMinutos} min` : "Sem limite de tempo");
    partes.push(`${avaliacaoCompleta.tentativasPermitidas} tentativa${avaliacaoCompleta.tentativasPermitidas === 1 ? "" : "s"}`);

    const periodo = resumoPeriodo(avaliacaoCompleta);
    if (periodo) {
      partes.push(periodo);
    }
    if (avaliacaoCompleta.moduloId) {
      partes.push(`Módulo: ${avaliacaoCompleta.moduloTitulo}`);
    }
  }

  return partes;
}

/* Avaliacoes do curso ganham tela propria (Admin/Coordenador), mesmo fluxo
   da tela do modulo - docs/fluxo-coordenador/PROMPT-agente-avaliacao-tela-
   propria.md (fluxo original) + ...-avaliacao-tela-limpa.md (alinhamento do
   topo e menos repeticao). Mostrada por PainelCursoGestao.jsx no lugar do
   conteudo normal do curso quando ha avaliacaoIdSelecionada. Os 4 numeros
   (participantes/nota media/conclusao/aproveitamento) vem de
   avaliacoesDoCurso (GET /Cursos/{id}/desempenho, que o curso ja carrega); a
   prova completa com gabarito vem de GET /Cursos/{id}/revisao-conteudo
   (mesma chamada que a tela do modulo ja usa e reaproveita - so avaliacao
   Publicada tem questoes; uma ainda em rascunho aparece na lista mas sem
   elas). Sem nenhuma acao de editar/excluir/publicar/arquivar: so leitura,
   igual a tela do modulo. */
export default function TelaAvaliacaoGestao({
  avaliacaoId,
  avaliacoesDoCurso,
  curso,
  erroRevisaoConteudo,
  onNavigate,
  onTentarNovamenteRevisaoConteudo,
  revisaoConteudo,
  revisaoConteudoCarregando
}) {
  const [questaoAtualIndice, setQuestaoAtualIndice] = useState(0);

  useEffect(() => {
    setQuestaoAtualIndice(0);
  }, [avaliacaoId]);

  const indiceAvaliacaoAtual = avaliacoesDoCurso.findIndex((item) => item.avaliacaoId === avaliacaoId);
  const avaliacaoResumo = indiceAvaliacaoAtual >= 0 ? avaliacoesDoCurso[indiceAvaliacaoAtual] : null;
  const avaliacaoAnterior = indiceAvaliacaoAtual > 0 ? avaliacoesDoCurso[indiceAvaliacaoAtual - 1] : null;
  const avaliacaoProxima =
    indiceAvaliacaoAtual >= 0 && indiceAvaliacaoAtual < avaliacoesDoCurso.length - 1
      ? avaliacoesDoCurso[indiceAvaliacaoAtual + 1]
      : null;

  const entradaRevisao = useMemo(() => encontrarEntradaRevisao(revisaoConteudo, avaliacaoId), [revisaoConteudo, avaliacaoId]);
  const avaliacaoCompleta = entradaRevisao?.avaliacao || null;
  const questoes = entradaRevisao?.questoes || [];
  const questaoAtual = questoes[questaoAtualIndice] || null;

  function voltarParaAvaliacoes() {
    onNavigate(`/app/cursos/${curso.id}`);
  }

  function irParaAvaliacao(id) {
    onNavigate(`/app/cursos/${curso.id}/avaliacoes/${id}`);
  }

  function irParaQuestao(indice) {
    if (indice < 0 || indice >= questoes.length) {
      return;
    }

    setQuestaoAtualIndice(indice);
  }

  // So troca de questao quando o foco esta dentro da area da questao
  // (indice + leitura) - o evento sobe por bubbling de qualquer elemento
  // focado ali dentro.
  function aoTeclarNaAreaDaQuestao(event) {
    if (event.key === "ArrowRight") {
      irParaQuestao(questaoAtualIndice + 1);
    } else if (event.key === "ArrowLeft") {
      irParaQuestao(questaoAtualIndice - 1);
    }
  }

  if (!avaliacaoResumo) {
    return null;
  }

  const temParticipantes = (avaliacaoResumo.totalParticipantes || 0) > 0;
  const partesResumo = montarResumo(avaliacaoResumo, avaliacaoCompleta, questoes.length);

  return (
    <div className="avaliacao-gestao">
      <BotaoVoltar destino="Avaliações" onClick={voltarParaAvaliacoes} />

      <header className="modulo-gestao__cabecalho">
        <div className="modulo-gestao__cabecalho-principal">
          <nav aria-label="Caminho até a avaliação" className="modulo-gestao__migalha">
            <button onClick={() => onNavigate("/app/cursos")} type="button">
              Cursos
            </button>
            <span aria-hidden="true">›</span>
            <button onClick={voltarParaAvaliacoes} title={curso.titulo} type="button">
              {curso.titulo}
            </button>
            <span aria-hidden="true">›</span>
            <button onClick={voltarParaAvaliacoes} type="button">
              Avaliações
            </button>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{`Avaliação ${String(indiceAvaliacaoAtual + 1).padStart(2, "0")}`}</span>
          </nav>

          <h2 className="modulo-gestao__titulo">{avaliacaoResumo.titulo}</h2>
          <p className="modulo-gestao__resumo">
            {partesResumo.map((parte, indice) => (
              <span key={parte}>
                {indice > 0 ? (
                  <span aria-hidden="true" className="avaliacao-gestao__resumo-separador">
                    {" "}
                    ·{" "}
                  </span>
                ) : null}
                {parte}
              </span>
            ))}
          </p>
          {avaliacaoCompleta?.descricao ? <p className="avaliacao-gestao__descricao">{avaliacaoCompleta.descricao}</p> : null}
        </div>

        <div className="avaliacao-gestao__kpis-area">
          {temParticipantes ? (
            <div className="atividades-curso__kpis-compactos avaliacao-gestao__kpis">
              <CartaoEstatistica icone={<TbUsers size={20} />} rotulo="Participantes" valor={avaliacaoResumo.totalParticipantes || 0} />
              <CartaoEstatistica
                corBorda="var(--cor-sucesso)"
                icone={<TbAward size={20} />}
                rotulo="Nota média"
                valor={formatGrade(avaliacaoResumo.mediaNota)}
              />
              <CartaoEstatistica
                corBorda="var(--cor-info)"
                icone={<TbCircleCheck size={20} />}
                rotulo="Conclusão"
                valor={formatPercent(avaliacaoResumo.percentualConclusao)}
              />
              <CartaoEstatistica
                icone={<TbChartBar size={20} />}
                rotulo="Aproveitamento"
                valor={formatPercent(avaliacaoResumo.percentualAproveitamento)}
              />
            </div>
          ) : (
            <p className="avaliacao-gestao__sem-participantes">
              <TbUsers aria-hidden="true" size={20} /> Nenhum aluno fez esta prova ainda.
            </p>
          )}
        </div>
      </header>

      {revisaoConteudoCarregando ? (
        <p className="texto-vazio" role="status">
          Carregando avaliação…
        </p>
      ) : erroRevisaoConteudo ? (
        <>
          <InlineMessage tone="error">{erroRevisaoConteudo}</InlineMessage>
          <Botao onClick={onTentarNovamenteRevisaoConteudo} tamanho="pequeno" variante="secundario">
            Tentar de novo
          </Botao>
        </>
      ) : !entradaRevisao ? (
        <p className="texto-vazio" role="status">
          Esta avaliação ainda não foi publicada. As questões aparecem aqui depois da publicação.
        </p>
      ) : questoes.length === 0 ? (
        <p className="texto-vazio" role="status">
          Esta avaliação não tem questões.
        </p>
      ) : (
        <div className="avaliacao-gestao__corpo" onKeyDown={aoTeclarNaAreaDaQuestao}>
          <nav aria-label="Questões" className="avaliacao-gestao__indice">
            {questoes.map((questao, indice) => (
              <button
                aria-current={indice === questaoAtualIndice ? "true" : undefined}
                className="avaliacao-gestao__indice-item"
                key={questao.id}
                onClick={() => irParaQuestao(indice)}
                type="button"
              >
                Questão {indice + 1}
              </button>
            ))}
          </nav>

          <div className="avaliacao-gestao__questao">
            {questaoAtual ? (
              <GabaritoQuestoes compacto mostrarFicha numeroInicial={questaoAtualIndice} questoes={[questaoAtual]} />
            ) : null}

            <footer className="avaliacao-gestao__questao-rodape">
              <Botao
                disabled={questaoAtualIndice === 0}
                onClick={() => irParaQuestao(questaoAtualIndice - 1)}
                type="button"
                variante="secundario"
              >
                <TbArrowLeft aria-hidden="true" size={16} /> Questão {questaoAtualIndice}
              </Botao>
              <span className="avaliacao-gestao__questao-contador">
                Questão {questaoAtualIndice + 1} de {questoes.length}
              </span>
              <Botao
                disabled={questaoAtualIndice === questoes.length - 1}
                onClick={() => irParaQuestao(questaoAtualIndice + 1)}
                type="button"
                variante="primario"
              >
                Questão {questaoAtualIndice + 2} <TbArrowRight aria-hidden="true" size={16} />
              </Botao>
            </footer>
          </div>
        </div>
      )}

      <footer className="modulo-gestao__rodape">
        <Botao disabled={!avaliacaoAnterior} onClick={() => avaliacaoAnterior && irParaAvaliacao(avaliacaoAnterior.avaliacaoId)} variante="secundario">
          <TbArrowLeft aria-hidden="true" size={16} /> Avaliação anterior
        </Botao>
        <Botao disabled={!avaliacaoProxima} onClick={() => avaliacaoProxima && irParaAvaliacao(avaliacaoProxima.avaliacaoId)} variante="primario">
          {avaliacaoProxima ? `Próxima avaliação: ${avaliacaoProxima.titulo}` : "Próxima avaliação"} <TbArrowRight aria-hidden="true" size={16} />
        </Botao>
      </footer>
    </div>
  );
}
