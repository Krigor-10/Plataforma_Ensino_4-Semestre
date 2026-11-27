import { useEffect, useMemo, useState } from "react";
import { TbAward, TbChartBar, TbCircleCheck, TbListDetails, TbTrophy } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoCursoModulo from "../../components/CartaoCursoModulo.jsx";
import JanelaPreviaItem from "../../components/JanelaPreviaItem.jsx";
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
      questoes: quizVinculado.questoes,
      conteudoVinculado: conteudo
    });
  });
  quizzesSoltos.forEach((quiz) => {
    itens.push({ id: `quiz-${quiz.id}`, tipo: "quiz", titulo: quiz.titulo, tituloReal: quiz.titulo, quiz, questoes: quiz.questoes });
  });

  return { conteudos, itens };
}

/* Tela do modulo (Admin/Coordenador), docs/TelaConteudosProfessor/PROMPT-
   agente-tela-modulo-lista-e-janela.md + correcoes-1.md (itens 7-8) +
   hierarquia-curso-kpis.md: mesma tela do Professor (PainelItensModulo/
   JanelaPreviaItem, compartilhados), so que so leitura - sem menu, sem
   selecao, sem botoes de criar; cartao do curso na variante `medio`,
   ocupando a largura toda (sem coluna de modulos nem seletor) - a unica
   forma de trocar de modulo e o "← Voltar" (BotaoVoltar), que leva pra aba
   Modulos da tela do curso. O selo do cartao e a situacao do curso (Em
   andamento/Aguardando encerramento/Encerrado/A venda) e a barra usa o
   progresso medio dos alunos (`desempenho`, GET /Cursos/{id}/desempenho,
   carregado por PainelCursoGestao.jsx) em vez do % publicado. Os KPIs do
   modulo (Progresso/Conclusao/Desempenho medio) ficam DENTRO do cartao do
   curso, a direita (`kpis`), nao mais numa faixa separada esticada na
   largura toda. A lista de itens vem de `revisaoConteudo` (GET /Cursos/{id}/
   revisao-conteudo: todos os modulos do curso, so o que esta Publicado, com
   questoes pro gabarito) - carregada uma vez e reaproveitada enquanto o
   curso continuar aberto, mesmo trocando de modulo. */
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

  const moduloRevisao = useMemo(
    () => revisaoConteudo?.modulos.find((modulo) => modulo.id === moduloId) || null,
    [revisaoConteudo, moduloId]
  );
  const { conteudos, itens: itensOrdenados } = useMemo(() => montarItensDoModulo(moduloRevisao), [moduloRevisao]);
  const quizzes = useMemo(() => itensOrdenados.filter((item) => item.tipo === "quiz"), [itensOrdenados]);

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

  if (!moduloAtual) {
    return null;
  }

  const semConteudoPublicado = !revisaoConteudoCarregando && !erroRevisaoConteudo && itensOrdenados.length === 0;
  const totalConteudos = conteudos.length;
  const totalQuizzes = quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;

  const desempenhoModulo = desempenho?.modulos?.find((modulo) => modulo.moduloId === moduloId) || null;
  const percentualProgressoMedio = desempenhoModulo ? Math.round(desempenhoModulo.progressoMedio) : 0;
  const kpisCurso = [
    {
      id: "progresso",
      icone: <TbChartBar aria-hidden="true" size={16} />,
      rotulo: "Progresso",
      valor: desempenhoModulo ? formatPercent(desempenhoModulo.progressoMedio) : "—"
    },
    {
      id: "conclusao",
      icone: <TbCircleCheck aria-hidden="true" size={16} />,
      rotulo: "Conclusão",
      valor: desempenhoModulo ? formatPercent(desempenhoModulo.percentualConclusao) : "—"
    },
    {
      id: "desempenho",
      icone: <TbAward aria-hidden="true" size={16} />,
      rotulo: "Desempenho médio",
      valor: desempenhoModulo ? formatGrade(desempenhoModulo.desempenhoMedio) : "—"
    }
  ];

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
          <span className="painel-itens-modulo__item-dados-parte">
            {obterIconeTipoConteudo(item.conteudo.tipoConteudo, "0.85rem")} {tipoTexto}
          </span>
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
      vinculadoA: item.conteudoVinculado ? { id: item.conteudoVinculado.id, titulo: item.conteudoVinculado.titulo } : null,
      descricao: "",
      corIcone: "verde",
      iconeTipo: <TbTrophy aria-hidden="true" size="1.6rem" />,
      dadosLinha: (
        <span className="painel-itens-modulo__item-dados-parte">
          <TbListDetails aria-hidden="true" size="0.85rem" /> {totalQuestoesQuiz} {totalQuestoesQuiz === 1 ? "questão" : "questões"}
        </span>
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
        <div className="modulo-lista-janela__caminho-navegacao">
          <BotaoVoltar destino="Módulos" onClick={voltarParaModulos} />
          <span className="modulo-lista-janela__caminho-texto">Cursos › {curso.titulo} › {moduloAtual.titulo}</span>
        </div>
      </div>

      <CartaoCursoModulo
        curso={curso}
        kpis={kpisCurso}
        legendaProgresso={`${percentualProgressoMedio}% de progresso dos alunos`}
        percentual={percentualProgressoMedio}
        selo={obterSituacaoCurso(curso)}
        variante="medio"
      />

      <div className="modulo-lista-janela__painel">
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
            moduloIndice={indiceModuloAtual}
            moduloTitulo={moduloAtual.titulo}
            moduloVazio={semConteudoPublicado}
            mostrarSelecionar={false}
            resumoModulo={resumoModulo}
            totalItens={totalConteudos + totalQuizzes}
          />
        )}
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
