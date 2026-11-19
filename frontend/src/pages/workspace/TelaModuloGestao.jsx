import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbAward, TbChartBar, TbChevronUp, TbCircleCheck } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import ListaModulosRoteiro from "../../components/ListaModulosRoteiro.jsx";
import MiniaturaPasso from "../../components/MiniaturaPasso.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import PreviaItemAluno from "../../components/PreviaItemAluno.jsx";
import RoteiroModulo from "../../components/RoteiroModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { formatGrade, formatPercent, normalizeContentType } from "../../lib/format.js";
import { tituloQuizEhGenerico } from "../../lib/trilhaConteudos.js";

const TIPO_AVALIACAO_QUIZ = 1;
const STATUS_PUBLICADO = 2;

// Mesma altura passada pro bloco aberto do Professor (TelaModuloGestaoProfessor.jsx)
// - PDF/imagem ocupam o bloco grande do roteiro, em vez do tamanho padrao.
const ALTURA_MIDIA_ROTEIRO = 560;

function montarItensDoModulo(moduloRevisao) {
  if (!moduloRevisao) {
    return { conteudos: [], passos: [] };
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

  const passos = [];
  conteudosPublicados.forEach((conteudo) => {
    passos.push({ id: `conteudo-${conteudo.id}`, tipo: "material", titulo: conteudo.titulo, conteudo, pendurado: false });

    const quizVinculado = quizPorConteudoId.get(conteudo.id);
    if (!quizVinculado) {
      return;
    }

    const titulo = tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo) ? "Quiz do conteúdo" : quizVinculado.titulo;
    passos.push({
      id: `quiz-${quizVinculado.id}`,
      tipo: "quiz",
      titulo,
      tituloReal: quizVinculado.titulo,
      quiz: quizVinculado,
      questoes: quizVinculado.questoes,
      pendurado: true
    });
  });
  quizzesSoltos.forEach((quiz) => {
    passos.push({ id: `quiz-${quiz.id}`, tipo: "quiz", titulo: quiz.titulo, tituloReal: quiz.titulo, quiz, questoes: quiz.questoes, pendurado: false });
  });

  return { conteudos, passos };
}

// Resumo (so "N itens", sem rascunho - o Coordenador/Admin nunca ve
// rascunho) de TODOS os modulos do curso, pra ListaModulosRoteiro.
function montarResumosPorModuloId(revisaoConteudo) {
  const mapa = new Map();
  (revisaoConteudo?.modulos || []).forEach((moduloRevisao) => {
    const totalConteudos = moduloRevisao.conteudos.filter((conteudo) => Number(conteudo.statusPublicacao) === STATUS_PUBLICADO).length;
    const totalQuizzes = moduloRevisao.avaliacoes.filter(
      ({ avaliacao }) => Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ && Number(avaliacao.statusPublicacao) === STATUS_PUBLICADO
    ).length;
    mapa.set(moduloRevisao.id, { totalItens: totalConteudos + totalQuizzes, totalRascunhos: null });
  });
  return mapa;
}

/* Tela do modulo (Admin/Coordenador) - "roteiro da aula" (docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-roteiro.md): mesmo
   roteiro em linha do tempo do Professor (RoteiroModulo/ListaModulosRoteiro,
   compartilhados), so que so leitura - sem menu, sem selecao, sem botoes de
   criar. No lugar deles, os KPIs do modulo (Progresso/Conclusao/Desempenho
   medio) vindos de `desempenho` (GET /Cursos/{id}/desempenho, carregado por
   PainelCursoGestao.jsx). A lista de itens vem de `revisaoConteudo` (GET
   /Cursos/{id}/revisao-conteudo: todos os modulos do curso, so o que esta
   Publicado, com questoes pro gabarito) - carregada uma vez e reaproveitada
   enquanto o curso continuar aberto, mesmo trocando de modulo pela lista. */
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
  // Fechar o bloco aberto (seta ⌃) nao pode reabrir ele sozinho de novo - so
  // controla se o efeito abaixo (1o passo ja vem aberto) pode agir; vira
  // false de novo ao trocar de modulo.
  const [fechadoManualmente, setFechadoManualmente] = useState(false);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;
  const moduloAnterior = indiceModuloAtual > 0 ? modulosOrdenados[indiceModuloAtual - 1] : null;
  const moduloProximo =
    indiceModuloAtual >= 0 && indiceModuloAtual < modulosOrdenados.length - 1 ? modulosOrdenados[indiceModuloAtual + 1] : null;

  const moduloRevisao = useMemo(
    () => revisaoConteudo?.modulos.find((modulo) => modulo.id === moduloId) || null,
    [revisaoConteudo, moduloId]
  );
  const { conteudos, passos: passosBrutos } = useMemo(() => montarItensDoModulo(moduloRevisao), [moduloRevisao]);
  const quizzes = useMemo(() => passosBrutos.filter((passo) => passo.tipo === "quiz"), [passosBrutos]);
  const resumosPorModuloId = useMemo(() => montarResumosPorModuloId(revisaoConteudo), [revisaoConteudo]);

  const itensOrdenados = passosBrutos;

  useEffect(() => {
    setItemAbertoId(null);
    setFechadoManualmente(false);
  }, [moduloId]);

  // Ao entrar no modulo (ou trocar pra outro), o 1o passo ja vem aberto -
  // sem gate de largura: o bloco abre no lugar em qualquer tamanho de tela,
  // sem a tela cheia separada da versao B. So nao reabre sozinho se o
  // bloco foi fechado de proposito (seta ⌃).
  useEffect(() => {
    if (fechadoManualmente || itemAbertoId || itensOrdenados.length === 0) {
      return;
    }

    setItemAbertoId(itensOrdenados[0].id);
  }, [fechadoManualmente, itemAbertoId, itensOrdenados]);

  const indiceItemAberto = itensOrdenados.findIndex((item) => item.id === itemAbertoId);
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

  const semConteudoPublicado = !revisaoConteudoCarregando && !erroRevisaoConteudo && itensOrdenados.length === 0;
  const totalConteudos = conteudos.length;
  const totalQuizzes = quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;

  const desempenhoModulo = desempenho?.modulos?.find((modulo) => modulo.moduloId === moduloId) || null;

  let proximoNumero = 0;
  const passos = itensOrdenados.map((item) => {
    const numerado = !item.pendurado;
    if (numerado) {
      proximoNumero += 1;
    }

    const tituloReal = item.tipo === "material" ? item.conteudo.titulo : item.tituloReal || item.titulo;
    const detalhe =
      item.tipo === "quiz"
        ? `Quiz${item.quiz.totalQuestoes ? ` · ${item.quiz.totalQuestoes} questão${item.quiz.totalQuestoes === 1 ? "" : "ões"}` : ""}`
        : normalizeContentType(item.conteudo.tipoConteudo);

    return {
      id: item.id,
      numero: numerado ? proximoNumero : null,
      pendurado: Boolean(item.pendurado),
      renderFechado: () => (
        <button
          aria-label={`Ver ${tituloReal}`}
          className="roteiro-passo__fechado"
          onClick={() => setItemAbertoId(item.id)}
          type="button"
        >
          <MiniaturaPasso item={item} />
          <div className="roteiro-passo__fechado-texto">
            <strong className="roteiro-passo__fechado-titulo" title={tituloReal}>
              {item.titulo}
            </strong>
            <span className="roteiro-passo__fechado-meta">{detalhe}</span>
          </div>
        </button>
      ),
      renderAberto: () => (
        <>
          <button
            aria-label="Fechar"
            className="roteiro-passo__fechar"
            onClick={() => {
              setItemAbertoId(null);
              setFechadoManualmente(true);
            }}
            type="button"
          >
            <TbChevronUp aria-hidden="true" size={18} />
          </button>
          <PreviaItemAluno
            alturaMidia={ALTURA_MIDIA_ROTEIRO}
            item={item}
            questoes={item.questoes}
            rodape={
              <footer className="modal-rodape roteiro-passo__rodape">
                <Botao
                  aria-label="Item anterior"
                  disabled={!itemAnterior}
                  onClick={() => itemAnterior && setItemAbertoId(itemAnterior.id)}
                  title={itemAnterior?.titulo}
                  type="button"
                  variante="secundario"
                >
                  <TbArrowLeft aria-hidden="true" size={16} /> Anterior
                </Botao>
                <span className="roteiro-passo__rodape-contador">
                  Item {indiceItemAberto + 1} de {itensOrdenados.length}
                </span>
                <Botao
                  aria-label="Próximo item"
                  disabled={!itemProximo}
                  onClick={() => itemProximo && setItemAbertoId(itemProximo.id)}
                  title={itemProximo?.titulo}
                  type="button"
                  variante="primario"
                >
                  Próximo <TbArrowRight aria-hidden="true" size={16} />
                </Botao>
              </footer>
            }
            selo="Somente leitura"
          />
        </>
      )
    };
  });

  return (
    <div className="modulo-gestao roteiro-tela">
      <div className="roteiro-tela__topo">
        <button className="roteiro-tela__voltar" onClick={voltarParaModulos} type="button">
          <TbArrowLeft aria-hidden="true" size={16} /> {curso.titulo}
        </button>

        <div className="roteiro-tela__kpis">
          <CartaoEstatistica
            icone={<TbChartBar size={18} />}
            rotulo="Progresso"
            valor={desempenhoModulo ? formatPercent(desempenhoModulo.progressoMedio) : "—"}
          />
          <CartaoEstatistica
            icone={<TbCircleCheck size={18} />}
            rotulo="Conclusão"
            valor={desempenhoModulo ? formatPercent(desempenhoModulo.percentualConclusao) : "—"}
          />
          <CartaoEstatistica
            icone={<TbAward size={18} />}
            rotulo="Desempenho médio"
            valor={desempenhoModulo ? formatGrade(desempenhoModulo.desempenhoMedio) : "—"}
          />
        </div>
      </div>

      <div className="roteiro-tela__corpo">
        <aside aria-label="Módulos do curso" className="roteiro-tela__coluna-modulos">
          <ListaModulosRoteiro
            modulosOrdenados={modulosOrdenados}
            moduloId={moduloId}
            onIrParaModulo={irParaModulo}
            resumosPorModuloId={resumosPorModuloId}
          />
        </aside>

        <div className="modulo-gestao__conteudo roteiro-tela__coluna-roteiro">
          <header className="modulo-gestao__cabecalho roteiro-modulo__cabecalho">
            <div className="modulo-gestao__cabecalho-principal">
              <h2 className="modulo-gestao__titulo">
                <NumeroModulo indice={indiceModuloAtual} />
                <span className="modulo-gestao__titulo-texto" title={moduloAtual.titulo}>
                  {moduloAtual.titulo}
                </span>
              </h2>
              <p className="modulo-gestao__resumo">{resumoModulo}</p>
            </div>
          </header>

          {erroRevisaoConteudo ? (
            <>
              <InlineMessage tone="error">{erroRevisaoConteudo}</InlineMessage>
              <Botao onClick={onTentarNovamenteRevisaoConteudo} tamanho="pequeno" variante="secundario">
                Tentar de novo
              </Botao>
            </>
          ) : null}

          {revisaoConteudoCarregando ? (
            <p className="texto-vazio" role="status">
              Carregando módulo…
            </p>
          ) : semConteudoPublicado ? (
            <div className="roteiro-tela__vazio">
              <p className="texto-vazio" role="status">
                Este módulo ainda não tem conteúdo publicado.
              </p>
            </div>
          ) : (
            <RoteiroModulo
              itemAbertoId={itemAbertoId}
              passos={passos}
              rodapeModulos={
                <footer className="modulo-gestao__rodape">
                  <Botao disabled={!moduloAnterior} onClick={() => moduloAnterior && irParaModulo(moduloAnterior.id)} variante="secundario">
                    <TbArrowLeft aria-hidden="true" size={16} /> Módulo anterior
                  </Botao>
                  <Botao disabled={!moduloProximo} onClick={() => moduloProximo && irParaModulo(moduloProximo.id)} variante="primario">
                    {moduloProximo ? `Próximo módulo: ${moduloProximo.titulo}` : "Próximo módulo"} <TbArrowRight aria-hidden="true" size={16} />
                  </Botao>
                </footer>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
