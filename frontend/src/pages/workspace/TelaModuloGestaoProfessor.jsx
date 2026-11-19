import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbChevronUp, TbListCheck, TbPlus, TbSparkles, TbX } from "react-icons/tb";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import Botao from "../../components/Botao.jsx";
import Insignia from "../../components/Insignia.jsx";
import ListaModulosRoteiro from "../../components/ListaModulosRoteiro.jsx";
import MenuAcoes from "../../components/MenuAcoes.jsx";
import MiniaturaPasso from "../../components/MiniaturaPasso.jsx";
import Modal from "../../components/Modal.jsx";
import NumeroModulo from "../../components/NumeroModulo.jsx";
import PreviaItemAluno from "../../components/PreviaItemAluno.jsx";
import RoteiroModulo from "../../components/RoteiroModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { normalizeContentType } from "../../lib/format.js";
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

// Altura (px) passada pro PreviaItemAluno quando o bloco do roteiro esta
// aberto - bem maior que o padrao (300px) pra PDF/imagem ocuparem o bloco
// grande (docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-roteiro.md,
// item 1), sem precisar medir a altura real do container.
const ALTURA_MIDIA_ROTEIRO = 560;

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
// usada tanto pra "Selecionar tudo"/menus quanto pra numeracao dos passos e
// pro Anterior/Proximo do bloco aberto.
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

// Resumo (N itens/N rascunhos) de TODOS os modulos do curso, pra lista da
// esquerda (ListaModulosRoteiro) - diferente de montarDadosDoModulo acima,
// que so calcula pro modulo ABERTO.
function montarResumosPorModuloId(modulosOrdenados, conteudos, avaliacoes) {
  const mapa = new Map();
  modulosOrdenados.forEach((modulo) => {
    const materiais = conteudos.filter(
      (conteudo) => conteudo.moduloId === modulo.id && Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO
    );
    const quizzes = avaliacoes.filter(
      (avaliacao) =>
        avaliacao.moduloId === modulo.id &&
        Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ &&
        Number(avaliacao.statusPublicacao) !== STATUS_ARQUIVADO
    );
    const todos = [...materiais, ...quizzes];
    mapa.set(modulo.id, {
      totalItens: todos.length,
      totalRascunhos: todos.filter((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO).length
    });
  });
  return mapa;
}

/* Tela do modulo do professor - "roteiro da aula" (docs/TelaConteudosProfessor/
   PROMPT-agente-tela-modulo-roteiro.md): lista simples dos modulos do curso a
   esquerda (ListaModulosRoteiro), o modulo aberto vira um passo-a-passo
   numerado no centro (RoteiroModulo) - cada bloco fechado e uma miniatura +
   titulo + selo + menu; clicar abre a previa ali mesmo, empurrando os outros
   blocos pra baixo, sem coluna de previa separada. Substitui a "trilha"
   compacta da versao B (PROMPT-agente-tela-modulo-trilha-versao-b.md). Os
   handlers (onAbrirEdicao, onAlternarPublicacao etc.) e os modais que eles
   abrem (criar/editar conteudo, excluir, assistente de quiz/IA) continuam
   todos em SecaoConteudosProfessor.jsx, compartilhados com
   ListaModulosProfessor - esta tela so os aciona. */
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

  const [itemAbertoId, setItemAbertoId] = useState(null);
  // Fechar o bloco aberto (seta ⌃) nao pode reabrir ele sozinho de novo - so
  // controla se o efeito abaixo (1o passo ja vem aberto) pode agir; vira
  // false de novo ao trocar de modulo.
  const [fechadoManualmente, setFechadoManualmente] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState(() => new Set());
  const [loteConfirmacao, setLoteConfirmacao] = useState(null);
  const [loteExecutando, setLoteExecutando] = useState(false);
  const [loteFalhas, setLoteFalhas] = useState([]);
  const [questoesPorAvaliacaoId, setQuestoesPorAvaliacaoId] = useState(() => new Map());
  const [carregandoQuestoesId, setCarregandoQuestoesId] = useState(null);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;
  const moduloAnterior = indiceModuloAtual > 0 ? modulosOrdenados[indiceModuloAtual - 1] : null;
  const moduloProximo =
    indiceModuloAtual >= 0 && indiceModuloAtual < modulosOrdenados.length - 1 ? modulosOrdenados[indiceModuloAtual + 1] : null;

  const { conteudosDoModulo, quizzesDoModulo, quizzesPorConteudoId, quizzesSoltos } = useMemo(
    () => montarDadosDoModulo(moduloId, conteudos, avaliacoes),
    [moduloId, conteudos, avaliacoes]
  );
  const itensOrdenados = useMemo(
    () => montarItensOrdenados(conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos),
    [conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos]
  );
  const resumosPorModuloId = useMemo(
    () => montarResumosPorModuloId(modulosOrdenados, conteudos, avaliacoes),
    [modulosOrdenados, conteudos, avaliacoes]
  );

  useEffect(() => {
    setItemAbertoId(null);
    setFechadoManualmente(false);
    setModoSelecao(false);
    setItensSelecionados(new Set());
    setLoteFalhas([]);
  }, [moduloId]);

  // O 1o passo ja vem aberto ao entrar no modulo - sem gate de largura: no
  // roteiro o bloco abre no lugar em qualquer tamanho de tela, sem mais a
  // tela cheia separada da versao B (item 4 do prompt do roteiro). So nao
  // reabre sozinho se o professor fechou o bloco de proposito (seta ⌃).
  useEffect(() => {
    if (fechadoManualmente || itemAbertoId || itensOrdenados.length === 0) {
      return;
    }

    setItemAbertoId(itensOrdenados[0].id);
  }, [fechadoManualmente, itemAbertoId, itensOrdenados]);

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
  const totalItensModulo = totalConteudos + totalQuizzes;
  const totalRascunhos = [...conteudosDoModulo, ...quizzesDoModulo].filter(
    (item) => Number(item.statusPublicacao) === STATUS_RASCUNHO
  ).length;
  const percentualPublicado = totalItensModulo
    ? Math.round(((totalItensModulo - totalRascunhos) / totalItensModulo) * 100)
    : 0;
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

  function alternarPublicacaoDoItem(item) {
    if (item.tipo === "material") {
      onAlternarPublicacao(item.conteudo);
    } else {
      onAlternarPublicacaoQuiz(item.quiz);
    }
  }

  function abrirEdicaoDoItem(item) {
    if (item.tipo === "material") {
      onAbrirEdicao(item.conteudo);
    } else {
      onGerenciarQuizModulo(moduloAtual, item.quiz);
    }
  }

  const nomesQuizzesSoltos = montarNomesExibicaoQuizzesVinculados(quizzesSoltos, moduloAtual.titulo);
  const nomesQuizzesPorConteudoId = new Map(
    conteudosDoModulo.map((conteudo) => [
      conteudo.id,
      montarNomesExibicaoQuizzesVinculados(quizzesPorConteudoId.get(conteudo.id) || [], conteudo.titulo)
    ])
  );

  function tituloExibicaoItem(item) {
    if (item.tipo === "material") {
      return item.conteudo.titulo;
    }
    if (item.conteudoVinculado) {
      return nomesQuizzesPorConteudoId.get(item.conteudoVinculado.id)?.get(item.quiz.id) || item.quiz.titulo;
    }
    return nomesQuizzesSoltos.get(item.quiz.id) || item.quiz.titulo;
  }

  // Numeracao dos passos: materiais e quizzes soltos contam (na ordem de
  // itensOrdenados, ja = OrdemExibicao dos conteudos + quizzes do modulo no
  // fim); o quiz vinculado a um material fica "pendurado", sem numero
  // proprio (docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-
  // roteiro.md, item 1).
  let proximoNumero = 0;
  const passos = itensOrdenados.map((item) => {
    const pendurado = item.tipo === "quiz" && Boolean(item.conteudoVinculado);
    if (!pendurado) {
      proximoNumero += 1;
    }

    const dado = item.tipo === "material" ? item.conteudo : item.quiz;
    const publicado = Number(dado.statusPublicacao) === STATUS_PUBLICADO;
    const tituloReal = item.tipo === "material" ? item.conteudo.titulo : item.quiz.titulo;
    const tituloExibicao = tituloExibicaoItem(item);
    const menuItens =
      item.tipo === "material"
        ? itensMenuMaterial(item.conteudo, conteudosDoModulo.indexOf(item.conteudo))
        : itensMenuQuiz(item.quiz);
    const detalhe =
      item.tipo === "quiz"
        ? `Quiz${item.quiz.totalQuestoes ? ` · ${item.quiz.totalQuestoes} questão${item.quiz.totalQuestoes === 1 ? "" : "ões"}` : ""}`
        : normalizeContentType(item.conteudo.tipoConteudo);

    return {
      id: item.id,
      numero: pendurado ? null : proximoNumero,
      pendurado,
      renderFechado: () => (
        <div
          aria-label={`Ver ${tituloReal}`}
          className="roteiro-passo__fechado"
          onClick={() => setItemAbertoId(item.id)}
          onKeyDown={(evento) => {
            if (evento.target !== evento.currentTarget || (evento.key !== "Enter" && evento.key !== " ")) {
              return;
            }
            evento.preventDefault();
            setItemAbertoId(item.id);
          }}
          role="button"
          tabIndex={0}
        >
          {modoSelecao ? (
            <span className="atividades-curso__checkbox-alvo" onClick={(evento) => evento.stopPropagation()}>
              <input
                aria-label={`Selecionar ${tituloReal}`}
                checked={itensSelecionados.has(item.id)}
                className="tabela-checkbox"
                onChange={() => alternarSelecaoItem(item.tipo, dado.id)}
                type="checkbox"
              />
            </span>
          ) : null}
          <MiniaturaPasso item={item} />
          <div className="roteiro-passo__fechado-texto">
            <strong className="roteiro-passo__fechado-titulo" title={tituloReal}>
              {tituloExibicao}
            </strong>
            <span className="roteiro-passo__fechado-meta">{detalhe}</span>
          </div>
          <div className="roteiro-passo__fechado-direita" onClick={(evento) => evento.stopPropagation()}>
            <Insignia texto={publicado ? "Publicado" : "Rascunho"} />
            <MenuAcoes itens={menuItens} rotulo={`Opções de ${tituloReal}`} />
          </div>
        </div>
      ),
      renderAberto: () => (
        <>
          <div className="roteiro-passo__aberto-topo">
            {modoSelecao ? (
              <span className="atividades-curso__checkbox-alvo">
                <input
                  aria-label={`Selecionar ${tituloReal}`}
                  checked={itensSelecionados.has(item.id)}
                  className="tabela-checkbox"
                  onChange={() => alternarSelecaoItem(item.tipo, dado.id)}
                  type="checkbox"
                />
              </span>
            ) : null}
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
          </div>
          <PreviaItemAluno
            acoesCabecalho={
              <div className="previa-item-aluno__acoes-professor">
                <Botao disabled={edicaoTravada} onClick={() => alternarPublicacaoDoItem(item)} tamanho="pequeno" variante="fantasma">
                  {publicado ? "Voltar para rascunho" : "Publicar"}
                </Botao>
                <Botao disabled={edicaoTravada} onClick={() => abrirEdicaoDoItem(item)} tamanho="pequeno" variante="secundario">
                  Editar
                </Botao>
              </div>
            }
            alturaMidia={ALTURA_MIDIA_ROTEIRO}
            aviso={!publicado ? "Rascunho — os alunos ainda não veem este item." : undefined}
            item={item}
            questoes={item.tipo === "quiz" ? questoesPorAvaliacaoId.get(item.quiz.id) : undefined}
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
            selo={publicado ? "Publicado" : "Rascunho"}
          />
        </>
      )
    };
  });

  return (
    <div className="modulo-gestao roteiro-tela">
      <div className="roteiro-tela__topo">
        <button className="roteiro-tela__voltar" onClick={voltarParaModulos} type="button">
          <TbArrowLeft aria-hidden="true" size={16} /> {cursoAtivo.curso.titulo}
        </button>

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
      </div>

      {edicaoTravada ? (
        <InlineMessage tone="warning">A edição deste curso está travada. A prévia continua funcionando.</InlineMessage>
      ) : null}

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
              {!moduloVazio ? (
                <BarraProgresso
                  percentual={percentualPublicado}
                  rotuloAria={`${percentualPublicado}% publicado em ${moduloAtual.titulo}`}
                />
              ) : null}
            </div>
            {!edicaoTravada && !modoSelecao && !moduloVazio ? (
              <button className="roteiro-modulo__selecionar" onClick={() => setModoSelecao(true)} type="button">
                <TbListCheck aria-hidden="true" size={15} /> Selecionar
              </button>
            ) : null}
          </header>

          {moduloVazio ? (
            <div className="roteiro-tela__vazio">
              <p className="texto-vazio" role="status">
                Este módulo ainda não tem conteúdo. Use os botões no topo para criar o primeiro.
              </p>
            </div>
          ) : (
            <RoteiroModulo
              barraSelecao={
                modoSelecao || loteFalhas.length > 0 ? (
                  <>
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
                  </>
                ) : null
              }
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
