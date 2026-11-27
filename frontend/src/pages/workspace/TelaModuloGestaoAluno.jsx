import { useEffect, useMemo, useState } from "react";
import { TbCheck, TbCircle, TbCircleDot, TbListDetails, TbLock, TbTrophy } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoCursoModulo from "../../components/CartaoCursoModulo.jsx";
import JanelaPreviaItem from "../../components/JanelaPreviaItem.jsx";
import PainelItensModulo from "../../components/PainelItensModulo.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import { normalizeContentType } from "../../lib/format.js";
import { montarNomesExibicaoQuizzesVinculados } from "../../lib/trilhaConteudos.js";
import { obterDisponibilidadeAvaliacao, obterSeloCursoAluno } from "./SecoesAluno.jsx";

export const MOTIVO_BLOQUEIO_CONTEUDO_ANTERIOR = "conteudo-anterior";
export const MOTIVO_BLOQUEIO_QUIZ_ANTERIOR = "quiz-anterior";

export function quizFoiEnviado(quiz) {
  return Number(quiz.tentativasRealizadas || 0) > 0;
}

// Quiz vinculado que ainda segura o conteudo seguinte: nao enviado e que o
// aluno consegue (ou vai conseguir, ao concluir o conteudo-pai) responder.
// Quiz sem questoes, agendado, encerrado ou sem tentativas restantes nao
// trava a trilha - senao o aluno ficaria parado sem ter o que fazer.
function quizVinculadoSeguraProximoConteudo(quiz) {
  if (quizFoiEnviado(quiz)) {
    return false;
  }
  return quiz.progressoLiberado === false || obterDisponibilidadeAvaliacao(quiz).podeRealizar;
}

// Lista plana na ordem da trilha (material, quiz(zes) vinculado(s) logo
// depois, quizzes soltos no fim), ja com o bloqueio em ORDEM ESTRITA (docs/
// TelaConteudosAlunos/PROMPT-agente-quiz-vinculado-ordem-estrita.md): a
// ordem da tela e a ordem em que os itens liberam.
// - conteudo: espera o conteudo anterior E o(s) quiz(zes) vinculado(s) a
//   ele. Conteudo ja concluido nunca volta a ficar bloqueado (o aluno pode
//   rever o que ja viu);
// - quiz vinculado: libera quando o conteudo-pai e concluido (o servidor
//   segue a mesma regra, ver AvaliacaoService.AvaliacaoLiberadaPorProgresso);
// - quiz solto: a liberacao vem so do servidor (100% dos conteudos).
// `modulo.conteudos[].quizzes` ja vem pronto de SecoesAluno.jsx
// (gruposConteudosPorCurso). Reaproveitado pelo botao "Continuar" do cartao
// do curso (obterProximoItemLiberado), pra os dois nunca discordarem.
export function montarItensOrdenadosAluno(modulo) {
  const itens = [];
  modulo.conteudos.forEach((conteudo, indice) => {
    const conteudoAnterior = indice > 0 ? modulo.conteudos[indice - 1] : null;
    let motivoBloqueio = null;
    if (conteudoAnterior && !conteudo.concluido) {
      if (!conteudoAnterior.concluido) {
        motivoBloqueio = MOTIVO_BLOQUEIO_CONTEUDO_ANTERIOR;
      } else if ((conteudoAnterior.quizzes || []).some(quizVinculadoSeguraProximoConteudo)) {
        motivoBloqueio = MOTIVO_BLOQUEIO_QUIZ_ANTERIOR;
      }
    }

    itens.push({ id: `material-${conteudo.id}`, tipo: "material", conteudo, bloqueado: Boolean(motivoBloqueio), motivoBloqueio });
    (conteudo.quizzes || []).forEach((quiz) => {
      const bloqueado = !conteudo.concluido;
      itens.push({
        id: `quiz-${quiz.id}`,
        tipo: "quiz",
        quiz,
        conteudoVinculado: conteudo,
        bloqueado,
        motivoBloqueio: bloqueado ? MOTIVO_BLOQUEIO_CONTEUDO_ANTERIOR : null
      });
    });
  });
  modulo.quizzes.forEach((quiz) => {
    itens.push({ id: `quiz-${quiz.id}`, tipo: "quiz", quiz, bloqueado: false, motivoBloqueio: null });
  });
  return itens;
}

// Proximo passo do aluno neste modulo: o primeiro item liberado e ainda nao
// feito (quiz so conta quando pode ser respondido agora).
export function encontrarProximoPassoAluno(itensOrdenados) {
  return (
    itensOrdenados.find((item) => {
      if (item.bloqueado) {
        return false;
      }
      if (item.tipo === "material") {
        return !item.conteudo.concluido;
      }
      return !quizFoiEnviado(item.quiz) && obterDisponibilidadeAvaliacao(item.quiz).podeRealizar;
    }) || null
  );
}

const TEXTO_MOTIVO_BLOQUEIO = {
  [MOTIVO_BLOQUEIO_CONTEUDO_ANTERIOR]: "Conclua o conteúdo anterior",
  [MOTIVO_BLOQUEIO_QUIZ_ANTERIOR]: "Responda o quiz acima para liberar"
};

function DadosLinhaBloqueada({ motivoBloqueio }) {
  return (
    <span className="painel-itens-modulo__item-dados-parte">
      <TbLock aria-hidden="true" size="0.85rem" /> Bloqueado · {TEXTO_MOTIVO_BLOQUEIO[motivoBloqueio]}
    </span>
  );
}

function statusConteudo(conteudo) {
  if (conteudo.concluido) {
    return { icone: <TbCheck aria-hidden="true" size="0.85rem" />, texto: "Concluído" };
  }
  if (Number(conteudo.statusProgresso) === 2) {
    return { icone: <TbCircleDot aria-hidden="true" size="0.85rem" />, texto: "Em andamento" };
  }
  return { icone: <TbCircle aria-hidden="true" size="0.85rem" />, texto: "Não iniciado" };
}

/* Tela do modulo (Aluno), docs/TelaConteudosAlunos/PROMPT-agente-trilha-
   aluno-modulo-em-tela-propria.md: mesmo fluxo lista+janela do Professor/
   Coordenador (PainelItensModulo/JanelaPreviaItem/CartaoCursoModulo medio,
   compartilhados), com o ponto de vista do aluno - linha de dados mostra o
   STATUS do aluno (Concluido/Em andamento/Nao iniciado/Bloqueado) em vez de
   Publicado/Rascunho, e o quiz tem o botao da acao de hoje (Iniciar quiz/
   Ver revisao) na propria linha, em vez de abrir na janela. Bloqueio em
   ordem estrita (montarItensOrdenadosAluno) - a linha continua
   visivel, so fica inerte (cadeado, opacidade reduzida), em vez de sumir
   como o acordeao fazia. Sem coluna de modulos, sem seletor e sem "Modulo
   anterior/Proximo" - a unica forma de trocar de modulo e o "← Voltar",
   que leva de volta pra tela do curso (lista de cartoes de modulo). */
export default function TelaModuloGestaoAluno({
  conteudoProcessando,
  curso,
  itemDestaqueId,
  modulo,
  moduloIndice,
  onAbrirRevisao,
  onConcluir,
  onConsumirDestaque,
  onIniciarQuiz,
  onNavigate,
  quizIndisponivel
}) {
  const [itemAbertoId, setItemAbertoId] = useState(null);
  const [destaqueLocalId, setDestaqueLocalId] = useState(null);

  const itensOrdenados = useMemo(() => montarItensOrdenadosAluno(modulo), [modulo]);

  useEffect(() => {
    setItemAbertoId(null);
    setDestaqueLocalId(null);
  }, [modulo.id]);

  function destacarLinha(id) {
    setDestaqueLocalId(id);
    requestAnimationFrame(() => {
      document.getElementById(`painel-item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setTimeout(() => setDestaqueLocalId((atual) => (atual === id ? null : atual)), 3000);
  }

  // Item vindo do botao "Continuar: {proximo item}" do cartao do curso:
  // material abre a janela sozinho (ja marca concluido ao abrir, como
  // qualquer outro); quiz so e destacado/rolado ate a linha, porque quiz
  // nunca abre dentro da janela.
  useEffect(() => {
    if (!itemDestaqueId) {
      return;
    }

    const alvo = itensOrdenados.find((item) => item.id === itemDestaqueId);
    if (alvo && alvo.tipo === "material" && !alvo.bloqueado) {
      abrirMaterial(alvo.conteudo);
    } else if (alvo) {
      destacarLinha(alvo.id);
    }

    onConsumirDestaque?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemDestaqueId, itensOrdenados]);

  function abrirMaterial(conteudo) {
    if (!conteudo.concluido) {
      onConcluir(conteudo.id);
    }
    setItemAbertoId(`material-${conteudo.id}`);
  }

  const indiceItemAberto = itemAbertoId ? itensOrdenados.findIndex((item) => item.id === itemAbertoId) : -1;
  const itemAbertoEntrada = indiceItemAberto >= 0 ? itensOrdenados[indiceItemAberto] : null;
  const itemAberto = itemAbertoEntrada?.conteudo || null;

  const entradaAnterior = itemAberto
    ? [...itensOrdenados].slice(0, indiceItemAberto).reverse().find((item) => item.tipo === "material")
    : null;
  const entradaProxima =
    itemAberto && indiceItemAberto < itensOrdenados.length - 1 ? itensOrdenados[indiceItemAberto + 1] : null;
  const proximaBloqueada = Boolean(entradaProxima?.bloqueado);

  const materiaisApenas = useMemo(() => itensOrdenados.filter((item) => item.tipo === "material"), [itensOrdenados]);
  const indiceEntreMateriais = itemAberto ? materiaisApenas.findIndex((item) => item.conteudo.id === itemAberto.id) : -1;

  function aoClicarAnterior() {
    if (entradaAnterior) {
      abrirMaterial(entradaAnterior.conteudo);
    }
  }

  function aoClicarProximo() {
    if (!entradaProxima || proximaBloqueada) {
      return;
    }
    if (entradaProxima.tipo === "quiz") {
      setItemAbertoId(null);
      destacarLinha(entradaProxima.id);
      return;
    }
    abrirMaterial(entradaProxima.conteudo);
  }

  const nomesQuizzesPorConteudoId = useMemo(
    () =>
      new Map(
        modulo.conteudos.map((conteudo) => [
          conteudo.id,
          montarNomesExibicaoQuizzesVinculados(conteudo.quizzes || [], conteudo.titulo)
        ])
      ),
    [modulo]
  );

  function tituloExibicaoItem(entrada) {
    if (entrada.tipo === "material") {
      return entrada.conteudo.titulo;
    }
    if (entrada.conteudoVinculado) {
      return nomesQuizzesPorConteudoId.get(entrada.conteudoVinculado.id)?.get(entrada.quiz.id) || entrada.quiz.titulo;
    }
    return entrada.quiz.titulo;
  }

  const destaqueAtivoId = destaqueLocalId;
  const proximoPassoId = encontrarProximoPassoAluno(itensOrdenados)?.id ?? null;

  const linhas = itensOrdenados.map((entrada) => {
    const tituloExibicao = tituloExibicaoItem(entrada);
    const ancoraId = `painel-item-${entrada.id}`;
    const destaque = entrada.id === destaqueAtivoId;
    const proximoPasso = entrada.id === proximoPassoId;

    if (entrada.tipo === "material") {
      const { conteudo } = entrada;
      const tipoTexto = normalizeContentType(conteudo.tipoConteudo);
      const processando = conteudoProcessando === conteudo.id;
      const status = statusConteudo(conteudo);

      return {
        id: entrada.id,
        ancoraId,
        bloqueado: entrada.bloqueado,
        destaque,
        proximoPasso,
        tituloReal: conteudo.titulo,
        tituloExibicao,
        descricao: conteudo.descricao || "",
        corIcone: conteudo.concluido ? "verde" : "roxo",
        iconeTipo: obterIconeTipoConteudo(conteudo.tipoConteudo, "1.6rem"),
        dadosLinha: entrada.bloqueado ? (
          <DadosLinhaBloqueada motivoBloqueio={entrada.motivoBloqueio} />
        ) : (
          <>
            <span className="painel-itens-modulo__item-dados-parte">
              {obterIconeTipoConteudo(conteudo.tipoConteudo, "0.85rem")} {tipoTexto}
            </span>
            <span aria-hidden="true">|</span>
            <span className="painel-itens-modulo__item-dados-parte">
              {status.icone} {status.texto}
            </span>
          </>
        ),
        seloTipo: { icone: obterIconeTipoConteudo(conteudo.tipoConteudo, "0.85rem"), texto: tipoTexto },
        acao: entrada.bloqueado ? null : <span className="painel-itens-modulo__abrir">Abrir ›</span>,
        menuItens: null,
        onAbrir: processando ? () => {} : () => abrirMaterial(conteudo)
      };
    }

    const { quiz } = entrada;
    const totalQuestoesQuiz = quiz.totalQuestoes || 0;
    const quizConcluido = quizFoiEnviado(quiz);
    const disponibilidadeQuiz = obterDisponibilidadeAvaliacao(quiz);
    const quizBloqueado = entrada.bloqueado || (!quizConcluido && !disponibilidadeQuiz.podeRealizar);

    const statusQuiz = quizConcluido
      ? { icone: <TbCheck aria-hidden="true" size="0.85rem" />, texto: "Concluído" }
      : disponibilidadeQuiz.podeRealizar
        ? { icone: <TbCircleDot aria-hidden="true" size="0.85rem" />, texto: disponibilidadeQuiz.label }
        : { icone: <TbLock aria-hidden="true" size="0.85rem" />, texto: disponibilidadeQuiz.label };

    return {
      id: entrada.id,
      ancoraId,
      bloqueado: quizBloqueado,
      destaque,
      proximoPasso,
      vinculadoA: entrada.conteudoVinculado ? { id: entrada.conteudoVinculado.id, titulo: entrada.conteudoVinculado.titulo } : null,
      tituloReal: quiz.titulo,
      tituloExibicao,
      descricao: "",
      corIcone: quizConcluido ? "verde" : "roxo",
      iconeTipo: <TbTrophy aria-hidden="true" size="1.6rem" />,
      dadosLinha: entrada.bloqueado ? (
        <DadosLinhaBloqueada motivoBloqueio={entrada.motivoBloqueio} />
      ) : (
        <>
          <span className="painel-itens-modulo__item-dados-parte">
            <TbListDetails aria-hidden="true" size="0.85rem" /> {totalQuestoesQuiz} {totalQuestoesQuiz === 1 ? "questão" : "questões"}
          </span>
          <span aria-hidden="true">|</span>
          <span className="painel-itens-modulo__item-dados-parte">
            {statusQuiz.icone} {statusQuiz.texto}
          </span>
        </>
      ),
      seloTipo: { icone: <TbTrophy aria-hidden="true" size="0.85rem" />, texto: "Quiz" },
      acao: entrada.bloqueado ? null : quizConcluido ? (
        <Botao disabled={quizIndisponivel} onClick={() => onAbrirRevisao(quiz)} tamanho="pequeno" variante="fantasma">
          Ver revisão
        </Botao>
      ) : disponibilidadeQuiz.podeRealizar ? (
        <Botao disabled={quizIndisponivel} onClick={() => onIniciarQuiz(quiz)} tamanho="pequeno" variante="primario">
          Iniciar quiz
        </Botao>
      ) : null,
      menuItens: null,
      onAbrir: () => {
        if (quizConcluido) {
          onAbrirRevisao(quiz);
        } else if (disponibilidadeQuiz.podeRealizar) {
          onIniciarQuiz(quiz);
        }
      }
    };
  });

  const totalConteudos = modulo.conteudos.length;
  const quizzesVinculados = modulo.conteudos.flatMap((conteudo) => conteudo.quizzes || []);
  const totalQuizzes = quizzesVinculados.length + modulo.quizzes.length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;
  const totalConcluidos =
    modulo.conteudos.filter((conteudo) => conteudo.concluido).length +
    quizzesVinculados.filter(quizFoiEnviado).length +
    modulo.quizzes.filter(quizFoiEnviado).length;
  const totalItensModulo = totalConteudos + totalQuizzes;

  const numeroModuloTexto = `Módulo ${String(moduloIndice + 1).padStart(2, "0")}`;
  const itemAbertoTitulo = itemAberto?.titulo || "";

  function voltarParaCurso() {
    onNavigate?.(`/app/conteudos/${curso.id}`);
  }

  return (
    <div className="modulo-gestao modulo-lista-janela">
      <div className="modulo-lista-janela__caminho">
        <div className="modulo-lista-janela__caminho-navegacao">
          <BotaoVoltar destino="Conteúdos" onClick={voltarParaCurso} />
          <span className="modulo-lista-janela__caminho-texto">Meus cursos › {curso.titulo} › {modulo.titulo}</span>
        </div>
      </div>

      <CartaoCursoModulo
        curso={curso}
        legendaProgresso={`${Math.round(curso.progresso)}%`}
        percentual={curso.progresso}
        selo={obterSeloCursoAluno(curso)}
        variante="medio"
      />

      <div className="modulo-lista-janela__painel">
        <PainelItensModulo
          itensSelecionados={null}
          linhas={linhas}
          mensagemVazia="Este módulo ainda não tem conteúdo."
          modoSelecao={false}
          moduloIndice={moduloIndice}
          moduloTitulo={modulo.titulo}
          moduloVazio={totalItensModulo === 0}
          mostrarSelecionar={false}
          resumoModulo={`${resumoModulo} · ${totalConcluidos} de ${totalItensModulo} concluídos`}
          totalItens={totalItensModulo}
        />
      </div>

      {itemAberto ? (
        <JanelaPreviaItem
          indiceAtual={indiceEntreMateriais + 1}
          item={{ id: itemAberto.id, tipo: "material", titulo: itemAbertoTitulo, conteudo: itemAberto }}
          itemAnterior={entradaAnterior ? { titulo: entradaAnterior.conteudo.titulo } : null}
          itemProximo={entradaProxima && !proximaBloqueada ? { titulo: entradaProxima.tipo === "material" ? entradaProxima.conteudo.titulo : entradaProxima.quiz.titulo } : null}
          numeroModuloTexto={numeroModuloTexto}
          onAnterior={aoClicarAnterior}
          onFechar={() => setItemAbertoId(null)}
          onProximo={aoClicarProximo}
          publicado
          somenteLeitura={false}
          totalItens={materiaisApenas.length}
        />
      ) : null}
    </div>
  );
}
