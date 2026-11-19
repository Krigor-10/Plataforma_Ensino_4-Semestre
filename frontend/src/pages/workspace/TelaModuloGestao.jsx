import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbAward, TbChartBar, TbCircleCheck, TbListDetails, TbTrophy } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import CartaoCursoModulo from "../../components/CartaoCursoModulo.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import JanelaPreviaItem from "../../components/JanelaPreviaItem.jsx";
import ListaModulosCartoes from "../../components/ListaModulosCartoes.jsx";
import PainelItensModulo from "../../components/PainelItensModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import { formatGrade, formatPercent, normalizeContentType } from "../../lib/format.js";
import { obterSituacaoCurso, tituloQuizEhGenerico } from "../../lib/trilhaConteudos.js";

const TIPO_AVALIACAO_QUIZ = 1;
const STATUS_PUBLICADO = 2;

function montarItensDoModulo(moduloRevisao) {
  if (!moduloRevisao) {
    return { conteudos: [], itens: [] };
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

  const itens = [];
  conteudosPublicados.forEach((conteudo) => {
    itens.push({ id: `conteudo-${conteudo.id}`, tipo: "material", titulo: conteudo.titulo, conteudo });

    const quizVinculado = quizPorConteudoId.get(conteudo.id);
    if (!quizVinculado) {
      return;
    }

    const titulo = tituloQuizEhGenerico(quizVinculado.titulo, conteudo.titulo) ? "Quiz do conteúdo" : quizVinculado.titulo;
    itens.push({
      id: `quiz-${quizVinculado.id}`,
      tipo: "quiz",
      titulo,
      tituloReal: quizVinculado.titulo,
      quiz: quizVinculado,
      questoes: quizVinculado.questoes
    });
  });
  quizzesSoltos.forEach((quiz) => {
    itens.push({ id: `quiz-${quiz.id}`, tipo: "quiz", titulo: quiz.titulo, tituloReal: quiz.titulo, quiz, questoes: quiz.questoes });
  });

  return { conteudos, itens };
}

// Resumo (so "N itens", sem rascunho - o Coordenador/Admin nunca ve
// rascunho) de TODOS os modulos do curso, pra ListaModulosCartoes.
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

/* Tela do modulo (Admin/Coordenador), docs/TelaConteudosProfessor/PROMPT-
   agente-tela-modulo-lista-e-janela.md: mesma tela de lista+janela do
   Professor (ListaModulosCartoes/PainelItensModulo/JanelaPreviaItem,
   compartilhados), so que so leitura - sem menu, sem selecao, sem botoes de
   criar; o selo do cartao do curso e a situacao do curso (Em andamento/
   Aguardando encerramento/Encerrado/A venda) e a barra usa o progresso medio
   dos alunos (`desempenho`, GET /Cursos/{id}/desempenho, carregado por
   PainelCursoGestao.jsx) em vez do % publicado. Os KPIs do modulo
   (Progresso/Conclusao/Desempenho medio) ficam no topo, como antes. A lista
   de itens vem de `revisaoConteudo` (GET /Cursos/{id}/revisao-conteudo:
   todos os modulos do curso, so o que esta Publicado, com questoes pro
   gabarito) - carregada uma vez e reaproveitada enquanto o curso continuar
   aberto, mesmo trocando de modulo pela lista. */
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

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;
  const moduloAnterior = indiceModuloAtual > 0 ? modulosOrdenados[indiceModuloAtual - 1] : null;
  const moduloProximo =
    indiceModuloAtual >= 0 && indiceModuloAtual < modulosOrdenados.length - 1 ? modulosOrdenados[indiceModuloAtual + 1] : null;

  const moduloRevisao = useMemo(
    () => revisaoConteudo?.modulos.find((modulo) => modulo.id === moduloId) || null,
    [revisaoConteudo, moduloId]
  );
  const { conteudos, itens: itensOrdenados } = useMemo(() => montarItensDoModulo(moduloRevisao), [moduloRevisao]);
  const quizzes = useMemo(() => itensOrdenados.filter((item) => item.tipo === "quiz"), [itensOrdenados]);
  const resumosPorModuloId = useMemo(() => montarResumosPorModuloId(revisaoConteudo), [revisaoConteudo]);

  useEffect(() => {
    setItemAbertoId(null);
  }, [moduloId]);

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

  const semConteudoPublicado = !revisaoConteudoCarregando && !erroRevisaoConteudo && itensOrdenados.length === 0;
  const totalConteudos = conteudos.length;
  const totalQuizzes = quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;

  const desempenhoModulo = desempenho?.modulos?.find((modulo) => modulo.moduloId === moduloId) || null;

  const linhas = itensOrdenados.map((item) => {
    const tituloReal = item.tipo === "material" ? item.conteudo.titulo : item.tituloReal || item.titulo;

    if (item.tipo === "material") {
      const tipoTexto = normalizeContentType(item.conteudo.tipoConteudo);
      return {
        id: item.id,
        tituloReal,
        tituloExibicao: item.titulo,
        descricao: item.conteudo.descricao || "",
        corIcone: "verde",
        iconeTipo: obterIconeTipoConteudo(item.conteudo.tipoConteudo, "1.6rem"),
        dadosLinha: (
          <>
            {obterIconeTipoConteudo(item.conteudo.tipoConteudo, "0.85rem")} {tipoTexto}
          </>
        ),
        seloTipo: { icone: obterIconeTipoConteudo(item.conteudo.tipoConteudo, "0.85rem"), texto: tipoTexto },
        menuItens: null,
        onAbrir: () => setItemAbertoId(item.id)
      };
    }

    const totalQuestoesQuiz = item.quiz.totalQuestoes || 0;
    return {
      id: item.id,
      tituloReal,
      tituloExibicao: item.titulo,
      descricao: "",
      corIcone: "verde",
      iconeTipo: <TbTrophy aria-hidden="true" size="1.6rem" />,
      dadosLinha: (
        <>
          <TbListDetails aria-hidden="true" size="0.85rem" /> {totalQuestoesQuiz} questão{totalQuestoesQuiz === 1 ? "" : "ões"}
        </>
      ),
      seloTipo: { icone: <TbTrophy aria-hidden="true" size="0.85rem" />, texto: "Quiz" },
      menuItens: null,
      onAbrir: () => setItemAbertoId(item.id)
    };
  });

  const numeroModuloTexto = `Módulo ${String(indiceModuloAtual + 1).padStart(2, "0")}`;

  return (
    <div className="modulo-gestao modulo-lista-janela">
      <div className="modulo-lista-janela__caminho">
        <button className="roteiro-tela__voltar" onClick={voltarParaModulos} type="button">
          <TbArrowLeft aria-hidden="true" size={16} /> Cursos › {curso.titulo} › {moduloAtual.titulo}
        </button>
      </div>

      <CartaoCursoModulo
        curso={curso}
        percentual={desempenhoModulo ? Math.round(desempenhoModulo.progressoMedio) : 0}
        selo={obterSituacaoCurso(curso)}
      />

      <div className="modulo-lista-janela__kpis">
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

      <div className="modulo-lista-janela__corpo">
        <aside aria-label="Módulos do curso" className="modulo-lista-janela__coluna-modulos">
          <ListaModulosCartoes
            modulosOrdenados={modulosOrdenados}
            moduloId={moduloId}
            onIrParaModulo={irParaModulo}
            resumosPorModuloId={resumosPorModuloId}
          />
        </aside>

        <div className="modulo-lista-janela__coluna-painel">
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
          ) : (
            <PainelItensModulo
              itensSelecionados={null}
              linhas={linhas}
              mensagemVazia="Este módulo ainda não tem conteúdo publicado."
              modoSelecao={false}
              moduloTitulo={moduloAtual.titulo}
              moduloVazio={semConteudoPublicado}
              mostrarSelecionar={false}
              resumoModulo={resumoModulo}
              totalItens={totalConteudos + totalQuizzes}
            />
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
      </div>

      {itemAberto ? (
        <JanelaPreviaItem
          carregandoQuestoes={false}
          indiceAtual={indiceItemAberto + 1}
          item={{
            id: itemAberto.id,
            tipo: itemAberto.tipo,
            titulo: itemAberto.titulo,
            conteudo: itemAberto.conteudo,
            questoes: itemAberto.tipo === "quiz" ? itemAberto.questoes : undefined
          }}
          itemAnterior={itemAnterior}
          itemProximo={itemProximo}
          numeroModuloTexto={numeroModuloTexto}
          onAnterior={() => itemAnterior && setItemAbertoId(itemAnterior.id)}
          onFechar={() => setItemAbertoId(null)}
          onProximo={() => itemProximo && setItemAbertoId(itemProximo.id)}
          publicado
          somenteLeitura
          totalItens={itensOrdenados.length}
        />
      ) : null}
    </div>
  );
}
