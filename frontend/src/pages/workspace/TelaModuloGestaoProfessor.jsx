import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbChevronDown, TbChevronRight, TbListCheck, TbPlus, TbSparkles, TbTrophy, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import MenuAcoes from "../../components/MenuAcoes.jsx";
import Modal from "../../components/Modal.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import PreviaItemAluno from "../../components/PreviaItemAluno.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useLarguraJanela } from "../../hooks/useLarguraJanela.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import {
  montarNomesExibicaoQuizzesVinculados,
  montarPayloadAvaliacao,
  montarPayloadConteudo,
  STATUS_ARQUIVADO,
  STATUS_PUBLICADO,
  STATUS_RASCUNHO,
  TITULO_LOTE_POR_ACAO
} from "../../lib/trilhaConteudos.js";

const TIPO_AVALIACAO_QUIZ = 1;

// Abaixo disso a previa vira tela cheia, igual TelaModuloGestao.jsx
// (Coordenador/Admin) - mesmo breakpoint, mesmo motivo (useLarguraJanela).
const LARGURA_MINIMA_LEITURA_FIXA = 768;

function chaveItem(tipo, id) {
  return `${tipo}:${id}`;
}

// Materiais + quizzes (vinculados a um material ou soltos) do modulo, ja sem
// arquivados - mesma regra de ListaModulosProfessor (SecaoConteudosProfessor.jsx).
function montarDadosDoModulo(moduloId, conteudos, avaliacoes) {
  const conteudosDoModulo = conteudos
    .filter((conteudo) => conteudo.moduloId === moduloId && Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO)
    .slice()
    .sort((left, right) => (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0) || (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"));

  const quizzesDoModulo = avaliacoes.filter(
    (avaliacao) =>
      avaliacao.moduloId === moduloId &&
      Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ &&
      Number(avaliacao.statusPublicacao) !== STATUS_ARQUIVADO
  );

  const quizzesPorConteudoId = new Map();
  const quizzesSoltos = [];
  quizzesDoModulo.forEach((quiz) => {
    if (quiz.conteudoDidaticoId) {
      const atuais = quizzesPorConteudoId.get(quiz.conteudoDidaticoId) || [];
      atuais.push(quiz);
      quizzesPorConteudoId.set(quiz.conteudoDidaticoId, atuais);
    } else {
      quizzesSoltos.push(quiz);
    }
  });

  return { conteudosDoModulo, quizzesDoModulo, quizzesPorConteudoId, quizzesSoltos };
}

// Lista plana (material, quiz vinculado logo depois, quizzes soltos no fim) -
// usada tanto pra "Selecionar tudo"/menus quanto pra Anterior/Proximo da previa.
function montarItensOrdenados(conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos) {
  const itens = [];
  conteudosDoModulo.forEach((conteudo) => {
    itens.push({ id: chaveItem("material", conteudo.id), tipo: "material", titulo: conteudo.titulo, conteudo });
    (quizzesPorConteudoId.get(conteudo.id) || []).forEach((quiz) => {
      itens.push({ id: chaveItem("quiz", quiz.id), tipo: "quiz", titulo: quiz.titulo, quiz, conteudoVinculado: conteudo });
    });
  });
  quizzesSoltos.forEach((quiz) => {
    itens.push({ id: chaveItem("quiz", quiz.id), tipo: "quiz", titulo: quiz.titulo, quiz });
  });
  return itens;
}

// Ponto colorido + texto pequeno (verde/ambar) no lugar do selo .insignia -
// docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-trilha-versao-b.md,
// item 1.4. Mesma logica de cor que o selo ja usava (sucesso/aviso), so o
// desenho muda.
function StatusPonto({ publicado }) {
  return (
    <span className="modulo-gestao__trilha-item-status">
      <span
        aria-hidden="true"
        className={`modulo-gestao__status-ponto modulo-gestao__status-ponto--${publicado ? "publicado" : "rascunho"}`}
      />
      {publicado ? "Publicado" : "Rascunho"}
    </span>
  );
}

/* Tela do modulo do professor - versao B (docs/TelaConteudosProfessor/
   PROMPT-agente-tela-modulo-trilha-versao-b.md): trilha com TODOS os modulos
   do curso a esquerda (module atual aberto com os itens dentro, os outros
   fechados e clicaveis pra trocar de modulo sem voltar pra lista), previa
   larga a direita com as acoes (Editar/Publicar) no topo do painel. A
   selecao em lote fica escondida atras do botao "Selecionar" (modoSelecao) -
   so aparece quando o professor liga. Os handlers (onAbrirEdicao,
   onAlternarPublicacao etc.) e os modais que eles abrem (criar/editar
   conteudo, excluir, assistente de quiz/IA) continuam todos em
   SecaoConteudosProfessor.jsx, compartilhados com ListaModulosProfessor -
   esta tela so os aciona. */
export default function TelaModuloGestaoProfessor({
  acaoEmAndamentoId,
  avaliacoes,
  conteudos,
  cursoAtivo,
  edicaoTravada,
  moduloId,
  modulosOrdenados,
  onAbrirEdicao,
  onAlternarPublicacao,
  onAlternarPublicacaoQuiz,
  onArquivarQuiz,
  onExcluir,
  onExcluirQuiz,
  onGerarQuizComIaModulo,
  onGerenciarQuizModulo,
  onNavigate,
  onNovoConteudo,
  onReordenar,
  onSessionExpired
}) {
  const { mostrarToast } = useToast();
  const larguraJanela = useLarguraJanela();
  const leituraFixa = larguraJanela >= LARGURA_MINIMA_LEITURA_FIXA;

  const [itemAbertoId, setItemAbertoId] = useState(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState(() => new Set());
  const [loteConfirmacao, setLoteConfirmacao] = useState(null);
  const [loteExecutando, setLoteExecutando] = useState(false);
  const [loteFalhas, setLoteFalhas] = useState([]);
  const [questoesPorAvaliacaoId, setQuestoesPorAvaliacaoId] = useState(() => new Map());
  const [carregandoQuestoesId, setCarregandoQuestoesId] = useState(null);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;

  const { conteudosDoModulo, quizzesDoModulo, quizzesPorConteudoId, quizzesSoltos } = useMemo(
    () => montarDadosDoModulo(moduloId, conteudos, avaliacoes),
    [moduloId, conteudos, avaliacoes]
  );
  const itensOrdenados = useMemo(
    () => montarItensOrdenados(conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos),
    [conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos]
  );

  useEffect(() => {
    setItemAbertoId(null);
    setModoSelecao(false);
    setItensSelecionados(new Set());
    setLoteFalhas([]);
  }, [moduloId]);

  useEffect(() => {
    if (!leituraFixa || itemAbertoId || itensOrdenados.length === 0) {
      return;
    }

    setItemAbertoId(itensOrdenados[0].id);
  }, [itemAbertoId, itensOrdenados, leituraFixa]);

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

  const indiceItemAberto = itensOrdenados.findIndex((item) => item.id === itemAbertoId);
  const itemAberto = indiceItemAberto >= 0 ? itensOrdenados[indiceItemAberto] : null;
  const itemAnterior = indiceItemAberto > 0 ? itensOrdenados[indiceItemAberto - 1] : null;
  const itemProximo =
    indiceItemAberto >= 0 && indiceItemAberto < itensOrdenados.length - 1 ? itensOrdenados[indiceItemAberto + 1] : null;

  // Questoes do quiz aberto, carregadas sob demanda pelo mesmo endpoint que o
  // assistente de edicao de quiz ja usa - sem endpoint novo.
  useEffect(() => {
    if (!itemAberto || itemAberto.tipo !== "quiz") {
      return undefined;
    }

    const quizId = itemAberto.quiz.id;
    if (questoesPorAvaliacaoId.has(quizId) || carregandoQuestoesId === quizId) {
      return undefined;
    }

    let ativo = true;
    setCarregandoQuestoesId(quizId);

    apiRequest(`/Avaliacoes/${quizId}/questoes`)
      .then((questoes) => {
        if (!ativo) {
          return;
        }
        setQuestoesPorAvaliacaoId((atual) => new Map(atual).set(quizId, questoes));
      })
      .catch((err) => {
        if (!ativo) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired();
          return;
        }
        mostrarToast(err.message || "Não foi possível carregar as questões agora.", "erro", 6000);
      })
      .finally(() => {
        if (ativo) {
          setCarregandoQuestoesId(null);
        }
      });

    return () => {
      ativo = false;
    };
  }, [itemAberto, questoesPorAvaliacaoId, carregandoQuestoesId, onSessionExpired, mostrarToast]);

  function voltarParaModulos() {
    onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}`);
  }

  function irParaModulo(id) {
    onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}/modulos/${id}`);
  }

  function sairDoModoSelecao() {
    setModoSelecao(false);
    setItensSelecionados(new Set());
  }

  function alternarSelecaoItem(tipo, id) {
    const chave = chaveItem(tipo, id);
    setItensSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  }

  function alternarSelecaoTudo(chaves) {
    setItensSelecionados((atual) => {
      const todasJaMarcadas = chaves.length > 0 && chaves.every((chave) => atual.has(chave));
      const novo = new Set(atual);
      if (todasJaMarcadas) {
        chaves.forEach((chave) => novo.delete(chave));
      } else {
        chaves.forEach((chave) => novo.add(chave));
      }
      return novo;
    });
  }

  function abrirConfirmacaoLote(acao) {
    if (itensSelecionados.size === 0) {
      return;
    }
    setLoteFalhas([]);
    setLoteConfirmacao({ acao, chaves: Array.from(itensSelecionados) });
  }

  function fecharConfirmacaoLote() {
    if (loteExecutando) {
      return;
    }
    setLoteConfirmacao(null);
  }

  function resolverItemPorChave(chave) {
    const [tipo, idTexto] = chave.split(":");
    const id = Number(idTexto);
    const dado =
      tipo === "material"
        ? conteudosDoModulo.find((item) => item.id === id)
        : quizzesDoModulo.find((item) => item.id === id);
    return { tipo, id, dado };
  }

  async function executarAcaoLote() {
    if (!loteConfirmacao) {
      return;
    }

    const itens = loteConfirmacao.chaves.map(resolverItemPorChave).filter((item) => item.dado);
    // Exclusao recusa conteudo com quiz vinculado (ConteudoDidaticoService),
    // entao os quizzes do lote precisam sair primeiro.
    const ordem = loteConfirmacao.acao === "excluir" ? [...itens].sort((a) => (a.tipo === "quiz" ? -1 : 1)) : itens;
    const statusAlvoPorAcao = { publicar: STATUS_PUBLICADO, rascunho: STATUS_RASCUNHO, arquivar: STATUS_ARQUIVADO };
    const statusAlvo = statusAlvoPorAcao[loteConfirmacao.acao];

    setLoteExecutando(true);

    const contagem = { excluidos: 0, arquivados: 0, publicados: 0, rascunhos: 0, ignorados: 0 };
    const falhas = [];
    const falharam = new Set();

    for (const item of ordem) {
      try {
        if (loteConfirmacao.acao === "excluir") {
          const endpoint = item.tipo === "material" ? `/ConteudosDidaticos/${item.id}` : `/Avaliacoes/${item.id}`;
          const resultado = await apiRequest(endpoint, { method: "DELETE" });
          if (resultado?.arquivado) {
            contagem.arquivados += 1;
          } else {
            contagem.excluidos += 1;
          }
        } else if (Number(item.dado.statusPublicacao) === statusAlvo) {
          contagem.ignorados += 1;
        } else if (item.tipo === "material") {
          await apiRequest(`/ConteudosDidaticos/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(montarPayloadConteudo(item.dado, { statusPublicacao: statusAlvo }))
          });
          if (statusAlvo === STATUS_PUBLICADO) contagem.publicados += 1;
          else if (statusAlvo === STATUS_RASCUNHO) contagem.rascunhos += 1;
          else contagem.arquivados += 1;
        } else {
          await apiRequest(`/Avaliacoes/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(montarPayloadAvaliacao(item.dado, { statusPublicacao: statusAlvo }))
          });
          if (statusAlvo === STATUS_PUBLICADO) contagem.publicados += 1;
          else if (statusAlvo === STATUS_RASCUNHO) contagem.rascunhos += 1;
          else contagem.arquivados += 1;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setLoteExecutando(false);
          setLoteConfirmacao(null);
          onSessionExpired();
          return;
        }

        falharam.add(chaveItem(item.tipo, item.id));
        falhas.push({ titulo: item.dado.titulo, motivo: err.message || "Não foi possível concluir esta ação." });
      }
    }

    setLoteExecutando(false);
    setLoteConfirmacao(null);
    setLoteFalhas(falhas);
    setItensSelecionados(falharam);

    const partes = [];
    if (contagem.excluidos > 0) partes.push(`${contagem.excluidos} excluído${contagem.excluidos === 1 ? "" : "s"}`);
    if (contagem.arquivados > 0) partes.push(`${contagem.arquivados} arquivado${contagem.arquivados === 1 ? "" : "s"}`);
    if (contagem.publicados > 0) partes.push(`${contagem.publicados} publicado${contagem.publicados === 1 ? "" : "s"}`);
    if (contagem.rascunhos > 0) partes.push(`${contagem.rascunhos} voltou pra rascunho`);
    if (contagem.ignorados > 0) partes.push(`${contagem.ignorados} já estava nesse status`);
    if (falhas.length > 0) partes.push(`${falhas.length} falhou`);
    mostrarToast(partes.length > 0 ? partes.join(", ") : "Nada para fazer.", falhas.length > 0 ? "aviso" : "sucesso");
  }

  if (!moduloAtual) {
    return null;
  }

  const moduloVazio = itensOrdenados.length === 0;
  const totalConteudos = conteudosDoModulo.length;
  const totalQuizzes = quizzesDoModulo.length;
  const totalRascunhos = [...conteudosDoModulo, ...quizzesDoModulo].filter(
    (item) => Number(item.statusPublicacao) === STATUS_RASCUNHO
  ).length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}${totalRascunhos > 0 ? ` · ${totalRascunhos} rascunho${totalRascunhos === 1 ? "" : "s"}` : ""}`;

  const chavesSelecionaveis = [
    ...conteudosDoModulo.map((item) => chaveItem("material", item.id)),
    ...quizzesDoModulo.map((item) => chaveItem("quiz", item.id))
  ];
  const totalSelecionado = chavesSelecionaveis.filter((chave) => itensSelecionados.has(chave)).length;
  const todosSelecionados = chavesSelecionaveis.length > 0 && totalSelecionado === chavesSelecionaveis.length;
  const algunsSelecionados = totalSelecionado > 0 && !todosSelecionados;

  const itensMaisAcoes = [
    {
      chave: "publicar",
      rotulo: "Publicar selecionados",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("publicar")
    },
    {
      chave: "rascunho",
      rotulo: "Voltar para rascunho",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("rascunho")
    },
    {
      chave: "arquivar",
      rotulo: "Arquivar selecionados",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("arquivar")
    },
    {
      chave: "excluir",
      rotulo: "Excluir selecionados",
      perigo: true,
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("excluir")
    }
  ];

  function itensMenuMaterial(conteudo, indiceConteudo) {
    const publicado = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO;
    const processando = acaoEmAndamentoId === conteudo.id;
    return [
      { chave: "editar", rotulo: "Editar", desabilitado: edicaoTravada || processando, onSelecionar: () => onAbrirEdicao(conteudo) },
      {
        chave: "alternar-status",
        rotulo: publicado ? "Voltar para rascunho" : "Publicar",
        desabilitado: edicaoTravada,
        onSelecionar: () => onAlternarPublicacao(conteudo)
      },
      {
        chave: "mover-cima",
        rotulo: "Mover para cima",
        desabilitado: edicaoTravada || processando || indiceConteudo === 0,
        onSelecionar: () => onReordenar(conteudo, conteudosDoModulo, -1)
      },
      {
        chave: "mover-baixo",
        rotulo: "Mover para baixo",
        desabilitado: edicaoTravada || processando || indiceConteudo === conteudosDoModulo.length - 1,
        onSelecionar: () => onReordenar(conteudo, conteudosDoModulo, 1)
      },
      { chave: "excluir", rotulo: "Excluir", perigo: true, desabilitado: edicaoTravada, onSelecionar: () => onExcluir(conteudo) }
    ];
  }

  function itensMenuQuiz(quiz) {
    const publicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
    const processando = acaoEmAndamentoId === quiz.id;
    return [
      {
        chave: "editar",
        rotulo: "Editar",
        desabilitado: edicaoTravada || processando,
        onSelecionar: () => onGerenciarQuizModulo(moduloAtual, quiz)
      },
      {
        chave: "alternar-status",
        rotulo: publicado ? "Voltar para rascunho" : "Publicar",
        desabilitado: edicaoTravada,
        onSelecionar: () => onAlternarPublicacaoQuiz(quiz)
      },
      { chave: "arquivar", rotulo: "Arquivar", desabilitado: edicaoTravada, onSelecionar: () => onArquivarQuiz(quiz) },
      { chave: "excluir", rotulo: "Excluir", perigo: true, desabilitado: edicaoTravada, onSelecionar: () => onExcluirQuiz(quiz) }
    ];
  }

  function alternarPublicacaoDoItemAberto() {
    if (!itemAberto) {
      return;
    }
    if (itemAberto.tipo === "material") {
      onAlternarPublicacao(itemAberto.conteudo);
    } else {
      onAlternarPublicacaoQuiz(itemAberto.quiz);
    }
  }

  function abrirEdicaoDoItemAberto() {
    if (!itemAberto) {
      return;
    }
    if (itemAberto.tipo === "material") {
      onAbrirEdicao(itemAberto.conteudo);
    } else {
      onGerenciarQuizModulo(moduloAtual, itemAberto.quiz);
    }
  }

  const itemAbertoPublicado = itemAberto
    ? Number((itemAberto.tipo === "material" ? itemAberto.conteudo : itemAberto.quiz).statusPublicacao) === STATUS_PUBLICADO
    : false;

  const nomesQuizzesSoltos = montarNomesExibicaoQuizzesVinculados(quizzesSoltos, moduloAtual.titulo);

  // Linha de 1 item da trilha (material ou quiz, vinculado ou solto) - usada
  // nas 3 situacoes abaixo pra nao repetir a mesma marcacao 3x. `titulo` e o
  // texto exibido (pode ser o nome generico "Quiz do conteúdo" quando o quiz
  // vinculado nao tem nome proprio - montarNomesExibicaoQuizzesVinculados);
  // `tituloReal` (default = titulo) e sempre o nome de verdade do item e vai
  // pro title/aria-label/menu, pra nunca perder a referencia a qual item e
  // qual quando varios mostram o mesmo texto generico.
  function renderizarLinhaItem({ chave, titulo, tituloReal = titulo, icone, publicado, recuado, menuItens, onAbrir }) {
    const aberto = itemAberto?.id === chave;
    return (
      <li className={`modulo-gestao__trilha-item-wrap${recuado ? " modulo-gestao__trilha-item-wrap--recuado" : ""}`} key={chave}>
        <div
          aria-current={aberto ? "true" : undefined}
          aria-label={`Ver ${tituloReal}`}
          className="modulo-gestao__trilha-item"
          onClick={onAbrir}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) {
              return;
            }
            event.preventDefault();
            onAbrir();
          }}
          role="button"
          tabIndex={0}
        >
          {modoSelecao ? (
            <span className="atividades-curso__checkbox-alvo" onClick={(event) => event.stopPropagation()}>
              <input
                aria-label={`Selecionar ${tituloReal}`}
                checked={itensSelecionados.has(chave)}
                className="tabela-checkbox"
                onChange={() => alternarSelecaoItem(...chave.split(":"))}
                type="checkbox"
              />
            </span>
          ) : null}
          <span aria-hidden="true" className="modulo-gestao__trilha-item-icone">
            {icone}
          </span>
          <span className="modulo-gestao__trilha-item-titulo" title={tituloReal}>
            {titulo}
          </span>
          <StatusPonto publicado={publicado} />
          <div className="modulo-gestao__trilha-item-acoes" onClick={(event) => event.stopPropagation()}>
            <MenuAcoes itens={menuItens} rotulo={`Opções de ${tituloReal}`} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className={`modulo-gestao modulo-gestao--trilha${itemAberto ? " modulo-gestao--item-aberto" : ""}`}>
      <aside aria-label="Módulos do curso" className="modulo-gestao__trilha">
        <button className="modulo-gestao__trilha-voltar" onClick={voltarParaModulos} type="button">
          <TbArrowLeft aria-hidden="true" size={16} /> {cursoAtivo.curso.titulo}
        </button>

        <nav aria-label="Módulos" className="modulo-gestao__trilha-lista">
          {modulosOrdenados.map((modulo, indice) => {
            if (modulo.id !== moduloId) {
              return (
                <button
                  className="modulo-gestao__trilha-modulo"
                  key={modulo.id}
                  onClick={() => irParaModulo(modulo.id)}
                  type="button"
                >
                  <NumeroModulo indice={indice} />
                  <span className="modulo-gestao__trilha-modulo-titulo" title={modulo.titulo}>
                    {modulo.titulo}
                  </span>
                  <TbChevronRight aria-hidden="true" className="modulo-gestao__trilha-modulo-seta" size="1.1rem" />
                </button>
              );
            }

            return (
              <section className="modulo-gestao__trilha-modulo modulo-gestao__trilha-modulo--aberto" key={modulo.id}>
                <div className="modulo-gestao__trilha-modulo-cabecalho">
                  <NumeroModulo indice={indice} />
                  <span className="modulo-gestao__trilha-modulo-titulo" title={modulo.titulo}>
                    {modulo.titulo}
                  </span>
                  <TbChevronDown aria-hidden="true" className="modulo-gestao__trilha-modulo-seta modulo-gestao__trilha-modulo-seta--aberta" size="1.1rem" />
                </div>

                {moduloVazio ? (
                  <p className="texto-vazio" role="status">Nenhum conteúdo neste módulo ainda.</p>
                ) : (
                  <div className="modulo-gestao__trilha-itens">
                    <div className="modulo-gestao__trilha-itens-cabecalho">
                      <span className="modulo-gestao__trilha-itens-rotulo">Itens do módulo</span>
                      {!edicaoTravada && !modoSelecao ? (
                        <button className="modulo-gestao__trilha-selecionar" onClick={() => setModoSelecao(true)} type="button">
                          <TbListCheck aria-hidden="true" size={15} /> Selecionar
                        </button>
                      ) : null}
                    </div>

                    {modoSelecao ? (
                      <div className="atividades-curso__barra-selecao">
                        <label className="atividades-curso__selecionar-tudo">
                          <span className="atividades-curso__checkbox-alvo">
                            <input
                              checked={todosSelecionados}
                              className="tabela-checkbox"
                              onChange={() => alternarSelecaoTudo(chavesSelecionaveis)}
                              ref={(elemento) => {
                                if (elemento) {
                                  elemento.indeterminate = algunsSelecionados;
                                }
                              }}
                              type="checkbox"
                            />
                          </span>
                          Selecionar tudo
                        </label>
                        <span aria-hidden="true" className="atividades-curso__barra-divisoria" />
                        <span aria-live="polite" className="atividades-curso__contagem-selecao">
                          {totalSelecionado} selecionado{totalSelecionado === 1 ? "" : "s"}
                        </span>
                        <MenuAcoes itens={itensMaisAcoes} rotulo="Mais ações" textoBotao="Mais ações" varianteBotao="fantasma" />
                        <Botao onClick={sairDoModoSelecao} tamanho="pequeno" variante="fantasma">
                          Cancelar
                        </Botao>
                      </div>
                    ) : null}

                    {loteFalhas.length > 0 ? (
                      <InlineMessage tone="error">
                        <strong>{loteFalhas.length} {loteFalhas.length === 1 ? "item não foi processado" : "itens não foram processados"}:</strong>
                        <ul className="atividades-curso__lote-falhas-lista">
                          {loteFalhas.map((falha, indiceFalha) => (
                            <li key={indiceFalha}>{falha.titulo} — {falha.motivo}</li>
                          ))}
                        </ul>
                      </InlineMessage>
                    ) : null}

                    {conteudosDoModulo.length > 0 ? (
                      <section aria-label={`Conteúdos (${conteudosDoModulo.length})`}>
                        <h3 className="modulo-gestao__secao-titulo">
                          Conteúdos
                          <span className="modulo-gestao__secao-contagem">{conteudosDoModulo.length}</span>
                        </h3>
                        <ul aria-label={`Conteúdos de ${modulo.titulo}`} role="list">
                          {conteudosDoModulo.flatMap((conteudo, indiceConteudo) => {
                            const publicado = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO;
                            const quizzesDoMaterial = quizzesPorConteudoId.get(conteudo.id) || [];
                            const nomesQuizDoMaterial = montarNomesExibicaoQuizzesVinculados(quizzesDoMaterial, conteudo.titulo);

                            return [
                              renderizarLinhaItem({
                                chave: chaveItem("material", conteudo.id),
                                titulo: conteudo.titulo,
                                icone: obterIconeTipoConteudo(conteudo.tipoConteudo, "1.1rem"),
                                publicado,
                                menuItens: itensMenuMaterial(conteudo, indiceConteudo),
                                onAbrir: () => setItemAbertoId(chaveItem("material", conteudo.id))
                              }),
                              ...quizzesDoMaterial.map((quiz) => {
                                const quizPublicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
                                return renderizarLinhaItem({
                                  chave: chaveItem("quiz", quiz.id),
                                  titulo: nomesQuizDoMaterial.get(quiz.id),
                                  tituloReal: quiz.titulo,
                                  icone: <TbTrophy aria-hidden="true" size="1.1rem" />,
                                  publicado: quizPublicado,
                                  recuado: true,
                                  menuItens: itensMenuQuiz(quiz),
                                  onAbrir: () => setItemAbertoId(chaveItem("quiz", quiz.id))
                                });
                              })
                            ];
                          })}
                        </ul>
                      </section>
                    ) : null}

                    {quizzesSoltos.length > 0 ? (
                      <section aria-label={`Quizzes (${quizzesSoltos.length})`}>
                        <h3 className="modulo-gestao__secao-titulo">
                          Quizzes do módulo
                          <span className="modulo-gestao__secao-contagem">{quizzesSoltos.length}</span>
                        </h3>
                        <ul aria-label={`Quizzes de ${modulo.titulo}`} role="list">
                          {quizzesSoltos.map((quiz) => {
                            const quizPublicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
                            return renderizarLinhaItem({
                              chave: chaveItem("quiz", quiz.id),
                              titulo: nomesQuizzesSoltos.get(quiz.id),
                              tituloReal: quiz.titulo,
                              icone: <TbTrophy aria-hidden="true" size="1.1rem" />,
                              publicado: quizPublicado,
                              menuItens: itensMenuQuiz(quiz),
                              onAbrir: () => setItemAbertoId(chaveItem("quiz", quiz.id))
                            });
                          })}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
      </aside>

      <div className="modulo-gestao__conteudo">
        <header className="modulo-gestao__cabecalho">
          <div className="modulo-gestao__cabecalho-principal">
            <h2 className="modulo-gestao__titulo">
              <NumeroModulo indice={indiceModuloAtual} />
              <span className="modulo-gestao__titulo-texto" title={moduloAtual.titulo}>{moduloAtual.titulo}</span>
            </h2>
            <p className="modulo-gestao__resumo">{resumoModulo}</p>
          </div>

          {!edicaoTravada ? (
            <div className="atividades-curso__cabecalho-acoes">
              {conteudosDoModulo.some((conteudo) => [1, 2].includes(Number(conteudo.tipoConteudo))) ? (
                <Botao className="atividades-curso__adicionar--ia" onClick={() => onGerarQuizComIaModulo(moduloAtual)} tamanho="pequeno">
                  <TbSparkles aria-hidden="true" size={13} /> Gerar quiz com IA
                </Botao>
              ) : null}
              <Botao className="atividades-curso__adicionar--quiz" onClick={() => onGerenciarQuizModulo(moduloAtual)} tamanho="pequeno">
                <TbPlus aria-hidden="true" size={13} /> Adicionar Quiz
              </Botao>
              <Botao onClick={() => onNovoConteudo(moduloAtual.id)} tamanho="pequeno" variante="primario">
                <TbPlus aria-hidden="true" size={13} /> Novo conteúdo
              </Botao>
            </div>
          ) : null}
        </header>

        {edicaoTravada ? (
          <InlineMessage tone="warning">
            A edição deste curso está travada. A prévia continua funcionando.
          </InlineMessage>
        ) : null}

        <div aria-label="Prévia do item selecionado" className="modulo-gestao__painel">
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

              <PreviaItemAluno
                acoesCabecalho={
                  <div className="previa-item-aluno__acoes-professor">
                    <Botao disabled={edicaoTravada} onClick={alternarPublicacaoDoItemAberto} tamanho="pequeno" variante="fantasma">
                      {itemAbertoPublicado ? "Voltar para rascunho" : "Publicar"}
                    </Botao>
                    <Botao disabled={edicaoTravada} onClick={abrirEdicaoDoItemAberto} tamanho="pequeno" variante="secundario">
                      Editar
                    </Botao>
                  </div>
                }
                aviso={!itemAbertoPublicado ? "Rascunho — os alunos ainda não veem este item." : undefined}
                item={itemAberto}
                questoes={itemAberto.tipo === "quiz" ? questoesPorAvaliacaoId.get(itemAberto.quiz.id) : undefined}
                rodape={
                  <footer className="modal-rodape modulo-gestao__painel-rodape">
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
                    <span className="modulo-gestao__painel-rodape-contador">
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
                selo={itemAbertoPublicado ? "Publicado" : "Rascunho"}
              />
            </>
          ) : (
            <p className="texto-vazio" role="status">Escolha um conteúdo ou quiz para ver aqui.</p>
          )}
        </div>
      </div>

      {loteConfirmacao ? (
        <Modal
          onFechar={fecharConfirmacaoLote}
          titulo={TITULO_LOTE_POR_ACAO[loteConfirmacao.acao]}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={loteExecutando} onClick={fecharConfirmacaoLote} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={loteExecutando} onClick={executarAcaoLote} type="button" variante="sucesso">
                {loteExecutando ? "Processando..." : "Confirmar"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            {loteConfirmacao.acao === "excluir" ? "Excluir" : loteConfirmacao.acao === "publicar" ? "Publicar" : loteConfirmacao.acao === "arquivar" ? "Arquivar" : "Voltar para rascunho"}{" "}
            {loteConfirmacao.chaves.length} item{loteConfirmacao.chaves.length === 1 ? "" : "s"} selecionado{loteConfirmacao.chaves.length === 1 ? "" : "s"}?
            {loteConfirmacao.acao === "publicar" ? " Os alunos serão notificados de cada conteúdo publicado." : ""}
            {loteConfirmacao.acao === "excluir" ? " Itens com progresso ou tentativa de aluno são arquivados em vez de excluídos definitivamente." : ""}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
